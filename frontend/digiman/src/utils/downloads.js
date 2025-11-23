import api from '../services/api'
import { openDB } from 'idb'

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
  return list
}

export function saveDownloadedChapter(mangaId, chapterId, data){
  // persist to IndexedDB; keep localStorage fallback for compatibility
  (async ()=>{
    try{
      const db = await getDB()
      const key = `${mangaId}_${chapterId}`
      await db.put(STORE_CHAPTERS, { key, data })
    }catch(e){
      try{ const key = `download_chapter_${mangaId}_${chapterId}`; localStorage.setItem(key, JSON.stringify(data)) }catch(_){ console.error('saveDownloadedChapter failed', e) }
    }
  })()
}

export function loadDownloadedChapter(mangaId, chapterId){
  // return a Promise that resolves to the chapter object or null
  return (async ()=>{
    try{
      const db = await getDB()
      const key = `${mangaId}_${chapterId}`
      const row = await db.get(STORE_CHAPTERS, key)
      if (row && row.data){
        // attempt to load blobs for pages and return object URLs for rendering
        const pages = row.data.pages || []
        const blobUrls = []
        for (let i=0;i<pages.length;i++){
          try{
            const imgKey = `${mangaId}_${chapterId}_page_${i}`
            const blobRow = await db.get(STORE_IMAGES, imgKey)
            if (blobRow && blobRow.blob){
              const url = URL.createObjectURL(blobRow.blob)
              blobUrls.push(url)
            } else {
              blobUrls.push(pages[i])
            }
          }catch(e){ blobUrls.push(pages[i]) }
        }
        return { chapter: row.data, blobUrls }
      }
    }catch(e){ /* fallback to localStorage below */ }
    try{
      const key = `download_chapter_${mangaId}_${chapterId}`
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }catch(e){ console.error('loadDownloadedChapter failed', e); return null }
  })()
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
    // fallback to scanning localStorage keys
    try{
      const matches = []
      for (let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i)
        if (k && k.startsWith('download_chapter_')){
          const parts = k.replace('download_chapter_','').split('_')
          matches.push({ mangaId: parts[0], chapterId: parts[1] })
        }
      }
      return matches
    }catch(_){ return [] }
  }
}

// Remove a downloaded chapter and all its stored image blobs from IndexedDB
export async function removeDownloadedChapter(mangaId, chapterId){
  try{
    const db = await getDB()
    const key = `${mangaId}_${chapterId}`
    // delete chapter record
    try{ await db.delete(STORE_CHAPTERS, key) }catch(e){ console.warn('failed to delete chapter record', e) }

    // delete image blobs with matching prefix
    try{
      // get all keys in images store and remove those that belong to this chapter
      if (typeof db.getAllKeys === 'function'){
        const keys = await db.getAllKeys(STORE_IMAGES)
        const prefix = `${mangaId}_${chapterId}_page_`
        const toDelete = keys.filter(k => typeof k === 'string' && k.indexOf(prefix) === 0)
        for (const k of toDelete) await db.delete(STORE_IMAGES, k)
      } else {
        // fallback: iterate via getAll and inspect key property
        const all = await db.getAll(STORE_IMAGES)
        const prefix = `${mangaId}_${chapterId}_page_`
        for (const item of all){ if (item && String(item.key).indexOf(prefix) === 0) await db.delete(STORE_IMAGES, item.key) }
      }
    }catch(e){ console.warn('failed to delete image blobs', e) }

    // also remove any localStorage fallback key
    try{ localStorage.removeItem(`download_chapter_${mangaId}_${chapterId}`) }catch(_){ }

    // notify UI
    try{ window.dispatchEvent(new CustomEvent('digiman:downloadsChanged')) }catch(_){ }
    try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'success', message: 'Removed downloaded chapter' } })) }catch(_){ }
    return true
  }catch(e){ console.error('removeDownloadedChapter failed', e); return false }
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
  }catch(e){ /* fallback below */ }
  try{
    const key = `download_chapter_${mangaId}_${chapterId}`
    return !!localStorage.getItem(key)
  }catch(e){ return false }
}

// Start a backend download for the given chapter. This will create a queue
// entry, simulate progress, fetch the chapter via API, save the chapter data
// locally and mark the queue item as downloaded/failed.
export async function startDownload(mangaId, chapterId, opts = {}){
  const id = `d_${Date.now()}`
  const entry = {
    id,
    mangaId: mangaId || null,
    chapterId: chapterId || null,
    chapterTitle: opts.chapterTitle || `Chapter ${chapterId}`,
    mangaTitle: opts.mangaTitle || null,
    status: 'downloading', // downloading | downloaded | failed
    progress: 0,
    created_at: new Date().toISOString()
  }
  addDownload(entry)

  // start a progress simulation
  _timers[id] = setInterval(()=>{
    try{
      const state = loadDownloads()
      const it = state.find(x=>x.id===id)
      if(!it) { clearInterval(_timers[id]); delete _timers[id]; return }
      const next = Math.min(95, (it.progress || 0) + Math.floor(Math.random()*10)+5)
      updateDownload(id, { progress: next })
    }catch(e){ /* ignore */ }
  }, 700)

  try{
    // Try fetching chapter metadata. If the API returns 404, retry with a trailing slash.
    let res
    const attemptPath = `manga/${mangaId}/chapters/${chapterId}`
    try{
      res = await api.get(attemptPath)
    }catch(e){
      const status = e?.response?.status
      const triedUrl = (e?.config && api.defaults && api.defaults.baseURL) ? `${api.defaults.baseURL}${e.config.url}` : attemptPath
      console.warn('startDownload: chapter metadata request failed', triedUrl, status)
      // If 404, try with trailing slash as some backends require it
      if (status === 404){
        try{
          const alt = `${attemptPath}/`
          res = await api.get(alt)
        }catch(e2){
          const tried2 = (e2?.config && api.defaults && api.defaults.baseURL) ? `${api.defaults.baseURL}${e2.config.url}` : `${attemptPath}/`
          console.error('startDownload: retry with trailing slash also failed', tried2, e2?.response?.status)
          const msg = `Failed to fetch chapter metadata (404). Tried: ${triedUrl} and ${tried2}. Check VITE_API_URL and backend routes.`
          try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: msg } })) }catch(_){ }
          throw e2
        }
      } else {
        const msg = `Failed to fetch chapter metadata: ${status || 'network error'} (${triedUrl})`
        try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: msg } })) }catch(_){ }
        throw e
      }
    }
    const chap = res.data
    // save chapter metadata for offline reading
    saveDownloadedChapter(mangaId, chapterId, chap)

    // if chapter includes page URLs, fetch and store each image blob
    const pages = Array.isArray(chap.pages) ? chap.pages : []
    for (let i=0;i<pages.length;i++){
      try{
        const pageUrl = pages[i]
        // Ensure we fetch with credentials in case images require auth
        const imgRes = await fetch(pageUrl, { credentials: 'include' })
        if (!imgRes.ok){
          console.warn('startDownload: image fetch failed', pageUrl, imgRes.status)
          try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: `Failed to fetch image ${imgRes.status}: ${pageUrl}` } })) }catch(_){ }
          continue
        }
        const blob = await imgRes.blob()
        await saveImageBlob(mangaId, chapterId, i, blob)
        // update progress proportionally: 30% for metadata + 60% for images
        const pct = 30 + Math.floor(((i+1) / Math.max(1, pages.length)) * 60)
        updateDownload(id, { progress: Math.min(95, pct) })
      }catch(e){
        console.warn('failed to fetch/store page', pages[i], e)
        try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: `Failed to fetch image: ${pages[i]}` } })) }catch(_){ }
      }
    }

    // finalize progress and mark downloaded
    updateDownload(id, { progress: 100, status: 'downloaded', chapterTitle: chap.title || entry.chapterTitle, mangaTitle: chap.mangaTitle || entry.mangaTitle })
    // notify listeners that downloads changed
    try{ window.dispatchEvent(new CustomEvent('digiman:downloadsChanged')) }catch(_){ }
    // toast success
    try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'success', message: 'Download complete' } })) }catch(_){ }
  }catch(err){
    console.error('startDownload failed', err)
    const msg = err?.response?.data?.detail || err?.message || String(err)
    updateDownload(id, { status: 'failed', error: msg })
    try{ window.dispatchEvent(new CustomEvent('digiman:downloadsChanged')) }catch(_){ }
    try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: `Download failed: ${msg}` } })) }catch(_){ }
  }finally{
    if(_timers[id]){ clearInterval(_timers[id]); delete _timers[id] }
  }

  return id
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

export default {
  loadDownloads, saveDownloads, addDownload, updateDownload, removeDownload,
  saveDownloadedChapter, loadDownloadedChapter, startDownload,
  removeDownloadedChapter, getDownloadedChapterSize, isChapterDownloaded
}



