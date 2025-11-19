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
    const res = await api.get(`manga/${mangaId}/chapters/${chapterId}`)
    const chap = res.data
    // save chapter metadata for offline reading
    saveDownloadedChapter(mangaId, chapterId, chap)

    // if chapter includes page URLs, fetch and store each image blob
    const pages = Array.isArray(chap.pages) ? chap.pages : []
    for (let i=0;i<pages.length;i++){
      try{
        const imgRes = await fetch(pages[i])
        const blob = await imgRes.blob()
        await saveImageBlob(mangaId, chapterId, i, blob)
        // update progress proportionally: 30% for metadata + 60% for images
        const pct = 30 + Math.floor(((i+1) / Math.max(1, pages.length)) * 60)
        updateDownload(id, { progress: Math.min(95, pct) })
      }catch(e){
        console.warn('failed to fetch/store page', pages[i], e)
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
  saveDownloadedChapter, loadDownloadedChapter, startDownload
}
