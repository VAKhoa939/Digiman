import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadDownloads, updateDownload, removeDownload, startDownload, removeDownloadedChapter, getDownloadedChapterSize } from '../../utils/downloads'
import { Link, useSearchParams } from 'react-router-dom'
import CloseIcon from '@mui/icons-material/Close'
import Pagination from '../smallComponents/Pagination'

const DOWNLOADS_PAGE_SIZE = 10

export default function DownloadsPage(){
  const [searchParams, setSearchParams] = useSearchParams()
  const [downloads, setDownloads] = useState(() => loadDownloads())
  const timers = useRef({})
  const [sizes, setSizes] = useState({}) // id -> bytes
  const downloadingPage = Math.max(1, Number(searchParams.get('downloads_active_page')) || 1)
  const downloadedPage = Math.max(1, Number(searchParams.get('downloads_done_page')) || 1)
  const failedPage = Math.max(1, Number(searchParams.get('downloads_failed_page')) || 1)

  useEffect(()=>{
    setDownloads(loadDownloads())
  }, [])

  useEffect(()=>{
    // return early if offline
    if (!navigator.onLine) return;
    // For demo: simulate progress for items with status 'downloading'
    const list = loadDownloads()
    list.forEach(item => {
      if (item.status === 'downloading' && !timers.current[item.id]){
        timers.current[item.id] = setInterval(()=>{
          const state = loadDownloads()
          const it = state.find(x=>x.id===item.id)
          if(!it) { clearInterval(timers.current[item.id]); delete timers.current[item.id]; return }
          const nextProgress = Math.min(100, (it.progress || 0) + Math.floor(Math.random()*15)+5)
          if (nextProgress >= 100){
            updateDownload(item.id, { progress: 100, status: 'downloaded' })
            clearInterval(timers.current[item.id]); delete timers.current[item.id]
          } else {
            updateDownload(item.id, { progress: nextProgress })
          }
          setDownloads(loadDownloads())
        }, 800)
      }
    })

    return ()=>{
      Object.values(timers.current).forEach(t=>clearInterval(t))
      timers.current = {}
    }
  }, [])

  function handleCancel(id){
    if (!navigator.onLine) {
        try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: 'You are offline. Cannot cancel download.' } })); } catch (_) {}
      return;
    }
    // mark failed
    updateDownload(id, { status: 'failed' })
    setDownloads(loadDownloads())
    if(timers.current[id]){ clearInterval(timers.current[id]); delete timers.current[id] }
  }

  function handleRemove(id){
    if (!navigator.onLine) {
        try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: 'You are offline. Cannot remove download.' } })); } catch (_) {}
      return;
    }
    // find the download entry
    const item = loadDownloads().find(x=>x.id===id)
    if (!item){ removeDownload(id); setDownloads(loadDownloads()); return }
    (async ()=>{
      try{
        const bytes = await getDownloadedChapterSize(item.mangaId, item.chapterId)
        const human = bytesToHuman(bytes)
        const ok = window.confirm(`Remove downloaded chapter "${item.chapterTitle}" (${human})? This will free up storage.`)
        if (!ok) return
        await removeDownloadedChapter(item.mangaId, item.chapterId)
      }catch(e){ console.warn('removeDownloadedChapter failed', e) }
      // remove the queue entry/meta
      removeDownload(id)
      setDownloads(loadDownloads())
    })()
  }

  async function handleRetry(item){
    if (!navigator.onLine) {
        try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: 'You are offline. Cannot retry download.' } })); } catch (_) {}
      return;
    }
    // start a fresh download for the same chapter then remove the old failed entry
    try{
      await startDownload(item.mangaId, item.chapterId, { chapterTitle: item.chapterTitle, mangaTitle: item.mangaTitle })
      removeDownload(item.id)
      setDownloads(loadDownloads())
    }catch(err){
      console.error('retry failed', err)
      // ensure UI updates
      setDownloads(loadDownloads())
    }
  }

  const downloading = downloads.filter(d=>d.status==='downloading')
  const downloaded = downloads.filter(d=>d.status==='downloaded')
  const failed = downloads.filter(d=>d.status==='failed')
  const pagedDownloading = useMemo(() => {
    const start = (downloadingPage - 1) * DOWNLOADS_PAGE_SIZE
    return downloading.slice(start, start + DOWNLOADS_PAGE_SIZE)
  }, [downloading, downloadingPage])
  const pagedDownloaded = useMemo(() => {
    const start = (downloadedPage - 1) * DOWNLOADS_PAGE_SIZE
    return downloaded.slice(start, start + DOWNLOADS_PAGE_SIZE)
  }, [downloaded, downloadedPage])
  const pagedFailed = useMemo(() => {
    const start = (failedPage - 1) * DOWNLOADS_PAGE_SIZE
    return failed.slice(start, start + DOWNLOADS_PAGE_SIZE)
  }, [failed, failedPage])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    let changed = false
    const clampPage = (param, totalItems) => {
      const totalPages = Math.max(1, Math.ceil(totalItems / DOWNLOADS_PAGE_SIZE))
      const current = Math.max(1, Number(searchParams.get(param)) || 1)
      if (current > totalPages) {
        if (totalPages <= 1) next.delete(param)
        else next.set(param, String(totalPages))
        changed = true
      }
    }
    clampPage('downloads_active_page', downloading.length)
    clampPage('downloads_done_page', downloaded.length)
    clampPage('downloads_failed_page', failed.length)
    if (changed) setSearchParams(next)
  }, [downloading.length, downloaded.length, failed.length, searchParams, setSearchParams])

  useEffect(()=>{
    let mounted = true
    async function loadSizes(){
      const next = {}
      for (const d of downloaded){
        try{ const bytes = await getDownloadedChapterSize(d.mangaId, d.chapterId); next[d.id] = bytes }catch(e){ next[d.id] = 0 }
      }
      if (mounted) setSizes(next)
    }
    if (downloaded.length > 0) loadSizes()
    return ()=>{ mounted = false }
  }, [downloaded])

  return (
    <div className="container py-4">
      <h3>Downloads</h3>

      <hr/>
      <section className="mt-4">
        <p>The chapter downloads and offline reading features are premium and require an active subscription.</p>
        <p>To download a chapter, please go to the <Link to="/pricing">Pricing page</Link> and subscribe to a plan first.</p>
        <p>However, you can still read your downloaded chapters offline without a subscription.</p>
        <p>Notes: The downloaded chapters are stored locally on your browser.</p>
      </section>
      <hr/>

      <section className="mt-4">
        <h5>Downloading</h5>
        {downloading.length===0 ? <div className="text-muted">No active downloads.</div> : (
          pagedDownloading.map(d => (
            <div key={d.id} className="d-flex align-items-center bg-light p-2 rounded mb-2">
              <div className="flex-grow-1">
                <div className="fw-bold">{d.chapterTitle} {d.mangaTitle ? `– ${d.mangaTitle}` : ''}</div>
                <div className="progress mt-2" style={{height:10}}>
                  <div className="progress-bar bg-success" role="progressbar" style={{width: `${d.progress || 0}%`}} aria-valuenow={d.progress||0} aria-valuemin="0" aria-valuemax="100"></div>
                </div>
              </div>
              <div className="ms-3">
                <button className="btn btn-sm btn-danger" onClick={()=>handleCancel(d.id)} title="Cancel download"><CloseIcon /></button>
              </div>
            </div>
          ))
        )}
        <Pagination total={downloading.length} page={downloadingPage} pageSize={DOWNLOADS_PAGE_SIZE} pageParam="downloads_active_page" pageSizeParam="downloads_active_page_size" manageHeadLinks={false} />
      </section>

      <section className="mt-4">
        <h5>Downloaded</h5>
        {downloaded.length===0 ? <div className="text-muted">No downloaded items yet.</div> : (
          pagedDownloaded.map(d => (
            <div key={d.id} className="d-flex align-items-center bg-light p-2 rounded mb-2">
              <div className="flex-grow-1">
                <div className="fw-bold">{d.chapterTitle} {d.mangaTitle ? `– ${d.mangaTitle}` : ''} <span className="badge bg-success ms-2">Downloaded</span></div>
                <div className="text-success small">Successfully downloaded</div>
                <div className="small text-muted">Size: {sizes[d.id] ? bytesToHuman(sizes[d.id]) : 'calculating...'}</div>
              </div>
              <div className="ms-3">
                { d.status !== 'failed' ? (
                <Link
                  to={`/offline/mangas/${d.mangaId}/chapter/${d.chapterId}`}
                  className="btn btn-sm btn-warning me-2"
                >
                  Read
                </Link>
                ) : null}
                <button className="btn btn-sm btn-outline-danger" onClick={()=>handleRemove(d.id)}><CloseIcon /></button>
              </div>
            </div>
          ))
        )}
        <Pagination total={downloaded.length} page={downloadedPage} pageSize={DOWNLOADS_PAGE_SIZE} pageParam="downloads_done_page" pageSizeParam="downloads_done_page_size" manageHeadLinks={false} />
      </section>

      <section className="mt-4">
        <h5>Failed</h5>
        {failed.length===0 ? <div className="text-muted">No failed downloads.</div> : (
          pagedFailed.map(d => (
            <div key={d.id} className="d-flex align-items-center bg-light p-2 rounded mb-2">
              <div className="flex-grow-1">
                <div className="fw-bold">{d.chapterTitle} {d.mangaTitle ? `– ${d.mangaTitle}` : ''}</div>
                <div className="text-danger small">Failed to download{d.error ? ` — ${d.error}` : ''}</div>
              </div>
              <div className="ms-3">
                <Link to={`/offline/mangas/${d.mangaId}/chapter/${d.chapterId}`} className="btn btn-sm btn-warning me-2">Read</Link>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>handleRetry(d)}>Retry</button>
                <button className="btn btn-sm btn-outline-danger" onClick={()=>handleRemove(d.id)}><CloseIcon /></button>
              </div>
            </div>
          ))
        )}
        <Pagination total={failed.length} page={failedPage} pageSize={DOWNLOADS_PAGE_SIZE} pageParam="downloads_failed_page" pageSizeParam="downloads_failed_page_size" manageHeadLinks={false} />
      </section>
    </div>
  )
}

function bytesToHuman(bytes){
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B','KB','MB','GB','TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i===0?0:2)} ${units[i]}`
}
