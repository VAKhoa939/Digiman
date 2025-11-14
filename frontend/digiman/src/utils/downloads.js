// Simple client-side downloads queue stored in localStorage for dev/demo.
const KEY = 'downloads_queue_v1'

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

export function updateDownload(id, patch){
  const list = loadDownloads()
  const next = list.map(it => it.id === id ? {...it, ...patch} : it)
  saveDownloads(next)
  return next
}

export function removeDownload(id){
  const list = loadDownloads()
  const next = list.filter(it => it.id !== id)
  saveDownloads(next)
  return next
}

export default {
  loadDownloads, saveDownloads, addDownload, updateDownload, removeDownload
}
