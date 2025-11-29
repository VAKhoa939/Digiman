import React, { useEffect } from 'react'

export default function AdminModal({ show, onClose, src = '/admin/' }){
  useEffect(()=>{
    if(!show) return
    function onKey(e){ if(e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return ()=> document.removeEventListener('keydown', onKey)
  }, [show, onClose])

  if(!show) return null

  return (
    <div>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000 }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Admin panel" style={{ position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 1200, height: '90%', zIndex: 2100, display: 'flex', flexDirection: 'column', background: 'var(--bs-body-bg, #111)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: 'var(--bs-body-color, #fff)', fontWeight: 600 }}>Admin</div>
          <div>
            <button className="btn btn-sm btn-outline-light" onClick={onClose} aria-label="Close admin panel">Close</button>
          </div>
        </div>
        <div style={{ flex: 1, background: '#000' }}>
          <iframe title="Admin panel" src={src} style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
      </div>
    </div>
  )
}
