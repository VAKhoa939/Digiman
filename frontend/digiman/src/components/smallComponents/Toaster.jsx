import React, { useEffect, useState } from 'react'

export default function Toaster(){
  const [toasts, setToasts] = useState([])

  useEffect(()=>{
    function onToast(e){
      const id = `t_${Date.now()}`
      const t = { id, type: e.detail?.type || 'info', message: e.detail?.message || '' }
      setToasts(s => [...s, t])
      // auto remove
      setTimeout(()=>{
        setToasts(s => s.filter(x=>x.id!==id))
      }, 4500)
    }
    window.addEventListener('digiman:toast', onToast)
    return ()=> window.removeEventListener('digiman:toast', onToast)
  }, [])


  return (
    <div style={{ position: 'fixed', left: 16, top: 16, zIndex: 2000 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast show mb-2 align-items-center text-bg-${t.type==='error'?'danger': t.type==='success'?'success':'secondary'}`} role="alert" aria-live="assertive" aria-atomic="true">
          <div className="d-flex">
            <div className="toast-body">{t.message}</div>
            <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Close" onClick={()=>setToasts(s=>s.filter(x=>x.id!==t.id))}></button>
          </div>
        </div>
      ))}
    </div>
  )
}