import React, { useEffect, useRef, useState } from 'react'
import { loadDownloads, updateDownload, removeDownload, startDownload } from '../../utils/downloads'
import { Link } from 'react-router-dom'
import CloseIcon from '@mui/icons-material/Close'

export default function DownloadsPage(){
  const [downloads, setDownloads] = useState(() => loadDownloads())
  const timers = useRef({})

  useEffect(()=>{
    setDownloads(loadDownloads())
  }, [])

  useEffect(()=>{
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
    // mark failed
    updateDownload(id, { status: 'failed' })
    setDownloads(loadDownloads())
    if(timers.current[id]){ clearInterval(timers.current[id]); delete timers.current[id] }
  }

  function handleRemove(id){
    removeDownload(id)
    setDownloads(loadDownloads())
  }

  async function handleRetry(item){
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

  return (
    <div className="container py-4">
      <h3>Download chapter(s)</h3>

      <section className="mt-3">
        <h5>Downloading</h5>
        {downloading.length===0 ? <div className="text-muted">No active downloads.</div> : (
          downloading.map(d => (
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
      </section>

      <section className="mt-4">
        <h5>Downloaded</h5>
        {downloaded.length===0 ? <div className="text-muted">No downloaded items yet.</div> : (
          downloaded.map(d => (
            <div key={d.id} className="d-flex align-items-center bg-light p-2 rounded mb-2">
              <div className="flex-grow-1">
                <div className="fw-bold">{d.chapterTitle} {d.mangaTitle ? `– ${d.mangaTitle}` : ''} <span className="badge bg-success ms-2">Downloaded</span></div>
                <div className="text-success small">Successfully downloaded</div>
              </div>
              <div className="ms-3">
                <Link to={`/manga/${d.mangaId}/chapter/${d.chapterId}`} className="btn btn-sm btn-warning me-2">Read</Link>
                <button className="btn btn-sm btn-outline-danger" onClick={()=>handleRemove(d.id)}><CloseIcon /></button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="mt-4">
        <h5>Failed</h5>
        {failed.length===0 ? <div className="text-muted">No failed downloads.</div> : (
          failed.map(d => (
            <div key={d.id} className="d-flex align-items-center bg-light p-2 rounded mb-2">
              <div className="flex-grow-1">
                <div className="fw-bold">{d.chapterTitle} {d.mangaTitle ? `– ${d.mangaTitle}` : ''}</div>
                <div className="text-danger small">Failed to download{d.error ? ` — ${d.error}` : ''}</div>
              </div>
              <div className="ms-3">
                <Link to={`/manga/${d.mangaId}/chapter/${d.chapterId}`} className="btn btn-sm btn-warning me-2">Read</Link>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>handleRetry(d)}>Retry</button>
                <button className="btn btn-sm btn-outline-danger" onClick={()=>handleRemove(d.id)}><CloseIcon /></button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
