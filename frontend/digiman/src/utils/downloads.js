import { openDB } from 'idb'
import { fetchChapter, fetchChapterPages } from '../services/mangaService'
import { mapChapter, mapPage } from './transform'

// Simple client-side downloads queue stored in localStorage for dev/demo.
const KEY = 'downloads_queue_v1'
const DB_NAME = 'digiman_downloads_db'
const DB_VERSION = 1
const STORE_CHAPTERS = 'chapters' // object store for downloaded chapter JSON
const STORE_IMAGES = 'images' // object store for image blobs

async function getDB(){
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db){
      if (!db.objectStoreNames.contains(STORE_CHAPTERS)){
        db.createObjectStore(STORE_CHAPTERS, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)){
        db.createObjectStore(STORE_IMAGES, { keyPath: 'key' })
      }
    }
  })
}

// Internal timers for simulating progress while fetching from backend
const _timers = {};


/* Downloads queue localStorage */

export function loadDownloads(){
  try{
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  }catch(e){
    console.error('loadDownloads failed', e)
    return []
  }
}

export function saveDownloads(arr){
  try{
    localStorage.setItem(KEY, JSON.stringify(arr))
  }catch(e){
    console.error('saveDownloads failed', e)
  }
}

export function addDownload(entry){
  const list = loadDownloads()
  list.unshift(entry)
  saveDownloads(list)
  try {
    window.dispatchEvent(new CustomEvent("digiman:downloadsChanged"));
  } catch (_) {}
  return list;
}

export function updateDownload(id, patch){
  const list = loadDownloads()
  const next = list.map(it => it.id === id ? {...it, ...patch} : it)
  saveDownloads(next)
  try{ window.dispatchEvent(new CustomEvent('digiman:downloadsChanged')) }catch(_){ }
  return next
}

export function removeDownload(id){
  const list = loadDownloads()
  const next = list.filter(it => it.id !== id)
  saveDownloads(next)
  try{ window.dispatchEvent(new CustomEvent('digiman:downloadsChanged')) }catch(_){ }
  return next
}


/* IndexedDB download helper functions */

export function saveDownloadedChapter(mangaId, chapterId, data){
  // persist to IndexedDB; keep localStorage fallback for compatibility
  (async ()=>{
    try{
      const db = await getDB()
      const key = `${mangaId}_${chapterId}`
      await db.put(STORE_CHAPTERS, { key, data })
    }catch(e){
      console.error("saveDownloadedChapter failed", e);
    }
  })()
}

export function loadDownloadedChapter(mangaId, chapterId) {
  return (async () => {
    try {
      const db = await getDB();
      const key = `${mangaId}_${chapterId}`;
      const row = await db.get(STORE_CHAPTERS, key);
      if (row && row.data) {
        const chapter = row.data;

        // Replace `url` fields in pages with object URLs
        const pages = chapter.pages || [];
        const createdUrls = [];
        const updatedPages = [];
        for (let i = 0; i < pages.length; i++) {
          try {
            const imgKey = `${mangaId}_${chapterId}_page_${i}`;
            const blobRow = await db.get(STORE_IMAGES, imgKey);
            if (blobRow && blobRow.blob) {
              const objectUrl = URL.createObjectURL(blobRow.blob);
              createdUrls.push(objectUrl);
              updatedPages.push({ ...pages[i], url: objectUrl });
            } else {
              updatedPages.push(pages[i]);
            }
          } catch (e) {
            updatedPages.push(pages[i]);
          }
        }

        return { chapter, pages: updatedPages, createdUrls };
      }
    } catch (e) {
      console.error("loadDownloadedChapter failed", e);
    }
    return null;
  })();
}

export async function saveImageBlob(mangaId, chapterId, index, blob){
  try{
    const db = await getDB()
    const key = `${mangaId}_${chapterId}_page_${index}`
    await db.put(STORE_IMAGES, { key, blob })
  }catch(e){ console.error('saveImageBlob failed', e) }
}

export async function listDownloadedChapters(){
  try{
    const db = await getDB()
    const all = await db.getAll(STORE_CHAPTERS)
    return (all || []).map(r => {
      const [mangaId, chapterId] = r.key.split('_')
      return { mangaId, chapterId }
    })
  }catch(e){
    console.error("listDownloadedChapters failed", e);
    return [];
  }
}

// Remove a downloaded chapter and all its stored image blobs from IndexedDB
export async function removeDownloadedChapter(mangaId, chapterId) {
  try {
    const db = await getDB();
    const key = `${mangaId}_${chapterId}`;

    // delete chapter record
    try {
      await db.delete(STORE_CHAPTERS, key);
    } catch (e) {
      console.warn("failed to delete chapter record", e);
    }

    // delete image blobs with matching prefix
    try {
      if (typeof db.getAllKeys === "function") {
        const keys = await db.getAllKeys(STORE_IMAGES);
        const prefix = `${mangaId}_${chapterId}_page_`;
        const toDelete = keys.filter((k) => typeof k === "string" && k.indexOf(prefix) === 0);
        for (const k of toDelete) await db.delete(STORE_IMAGES, k);
      } else {
        const all = await db.getAll(STORE_IMAGES);
        const prefix = `${mangaId}_${chapterId}_page_`;
        for (const item of all) {
          if (item && String(item.key).indexOf(prefix) === 0) await db.delete(STORE_IMAGES, item.key);
        }
      }
    } catch (e) {
      console.warn("failed to delete image blobs", e);
    }

    // also remove any object URLs created during load
    try {
      const chapter = await loadDownloadedChapter(mangaId, chapterId);
      if (chapter?.createdUrls) {
        chapter.createdUrls.forEach((url) => {
          try {
            URL.revokeObjectURL(url);
          } catch (_) {}
        });
      }
    } catch (e) {
      console.warn("Failed to revoke object URLs", e);
    }

    // notify UI
    try {
      window.dispatchEvent(new CustomEvent("digiman:downloadsChanged"));
    } catch (_) {}
    try {
      window.dispatchEvent(
        new CustomEvent("digiman:toast", { detail: { type: "success", message: "Removed downloaded chapter" } })
      );
    } catch (_) {}
    return true;
  } catch (e) {
    console.error("removeDownloadedChapter failed", e);
    return false;
  }
}

// Return total size in bytes for a downloaded chapter (sum of image blob sizes)
export async function getDownloadedChapterSize(mangaId, chapterId){
  try{
    const db = await getDB()
    let total = 0
    // prefer getAllKeys if available
    if (typeof db.getAllKeys === 'function'){
      const keys = await db.getAllKeys(STORE_IMAGES)
      const prefix = `${mangaId}_${chapterId}_page_`
      const matches = keys.filter(k => typeof k === 'string' && k.indexOf(prefix) === 0)
      for (const k of matches){
        const row = await db.get(STORE_IMAGES, k)
        if (row && row.blob && typeof row.blob.size === 'number') total += row.blob.size
      }
    } else {
      const all = await db.getAll(STORE_IMAGES)
      const prefix = `${mangaId}_${chapterId}_page_`
      for (const item of all){ if (item && String(item.key).indexOf(prefix) === 0 && item.blob && typeof item.blob.size === 'number') total += item.blob.size }
    }
    return total
  }catch(e){ console.warn('getDownloadedChapterSize failed', e); return 0 }
}

// Check if a chapter has been downloaded (without creating object URLs)
export async function isChapterDownloaded(mangaId, chapterId){
  try{
    const db = await getDB()
    const key = `${mangaId}_${chapterId}`
    const row = await db.get(STORE_CHAPTERS, key)
    if (row && row.data) return true
  } catch (e) {
    console.error("isChapterDownloaded failed", e);
    return false;
  }
}

async function fetchChapterData(chapterId, mangaId) {
  try {
    const chapterMeta = await fetchChapter(chapterId);
    const pages = await fetchChapterPages(chapterId);
    return { 
			chapterMeta: mapChapter(chapterMeta), 
			pages: pages.map(mapPage)
		};
  } catch (error) {
    console.error("Failed to fetch chapter data", error);
    throw error;
  }
}

async function fetchWithRetry(url, retries = 3) {
	const options = { credentials: "omit", };
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (err) {
      if (i === retries - 1) throw err; // Throw error after max retries
    }
  }
}

// Start a backend download for the given chapter. This will create a queue
// entry, simulate progress, fetch the chapter via API, save the chapter data
// locally and mark the queue item as downloaded/failed.
export async function startDownload(mangaId, chapterId, opts = {}) {
  if (!navigator.onLine) {
    try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: 'You are offline. Cannot start download.' } })); } catch (_) {}
    return;
  }

  const id = `d_${Date.now()}`;
  const entry = {
    id,
    mangaId: mangaId || null,
    chapterId: chapterId || null,
    chapterTitle: opts.chapterTitle || `Chapter ${chapterId}`,
    mangaTitle: opts.mangaTitle || null,
    status: "downloading", // downloading | downloaded | failed
    progress: 0,
    created_at: new Date().toISOString(),
  };
  addDownload(entry);

  const createdUrls = [];
  try {
    // Fetch chapter metadata and pages
    const { chapterMeta, pages } = await fetchChapterData(chapterId, mangaId);

    // Save image blobs and update the `pages` array with object URLs
    const updatedPages = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const imgRes = await fetchWithRetry(page.url);
      if (!imgRes.ok) {
        throw new Error(`Image download failed for page ${i + 1} (status: ${imgRes.status})`);
      }
      const blob = await imgRes.blob();
      await saveImageBlob(mangaId, chapterId, i, blob);

      // Replace the `url` field with the object URL for offline use
      const objectUrl = URL.createObjectURL(blob);
      createdUrls.push(objectUrl); // Track the object URL
      updatedPages.push({ ...page, url: objectUrl });

      // Update progress proportionally: 30% for metadata + 60% for images
      const pct = 30 + Math.floor(((i + 1) / Math.max(1, pages.length)) * 60);
      updateDownload(id, { progress: Math.min(95, pct) });
    }

    // Save the entire mapped chapter object, including updated pages
    const fullChapterData = { ...chapterMeta, pages: updatedPages };
    saveDownloadedChapter(mangaId, chapterId, fullChapterData);

    // Finalize progress and mark as downloaded
    updateDownload(id, {
      progress: 100,
      status: "downloaded",
      chapterTitle: chapterMeta.title || entry.chapterTitle,
      mangaTitle: chapterMeta.mangaTitle || entry.mangaTitle,
    });
  } catch (err) {
    console.error(`startDownload failed for chapter ${chapterId}`, err);
    const msg = `Download failed for chapter ${chapterId}: ${err?.message || "Unknown error"}`;
    updateDownload(id, { status: "failed", error: msg });
  } finally {
    // Cleanup object URLs
    createdUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    });
  }

  return id;
}

export default {
  loadDownloads, saveDownloads, addDownload, updateDownload, removeDownload,
  saveDownloadedChapter, loadDownloadedChapter, startDownload,
  removeDownloadedChapter, getDownloadedChapterSize, isChapterDownloaded
}



