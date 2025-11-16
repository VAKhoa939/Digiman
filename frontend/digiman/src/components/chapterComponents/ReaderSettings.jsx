import React, { useState, useEffect, useRef } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';

export default function ReaderSettings({ show = false, settings = {}, onClose = () => {}, onSave = () => {} }) {
  const panelRef = useRef(null);
  const [local, setLocal] = useState({
    imageFit: settings.imageFit || 'both',
    pageDisplay: settings.pageDisplay || 'single',
    readingDirection: settings.readingDirection || 'rtl',
    enablePaged: settings.enablePaged || false,
    swipeAxis: settings.swipeAxis || 'vertical',
    progressBar: settings.progressBar ?? true,
    progressPosition: settings.progressPosition || 'bottom',
  });

  useEffect(() => setLocal({
    imageFit: settings.imageFit || 'both',
    pageDisplay: settings.pageDisplay || 'single',
    readingDirection: settings.readingDirection || 'rtl',
    enablePaged: settings.enablePaged || false,
    swipeAxis: settings.swipeAxis || 'vertical',
    progressBar: settings.progressBar ?? true,
    progressPosition: settings.progressPosition || 'bottom',
  }), [settings, show]);

  useEffect(() => {
    if (!show) return;
    // focus first interactive element inside panel for accessibility
    const node = panelRef.current;
    const btn = node && node.querySelector('button, input, [tabindex]');
    if (btn && typeof btn.focus === 'function') btn.focus();

    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="reader-settings-overlay" role="dialog" aria-modal="true">
      <div ref={panelRef} className="reader-settings-panel bg-dark text-white p-4">
        <div className="d-flex align-items-start justify-content-between mb-3">
          <h4 className="mb-0"><SettingsIcon fontSize="small" className="me-2" />Reader settings</h4>
          <button className="btn btn-sm btn-outline-light" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <div className="mb-3">
          <div className="small text-muted mb-2">Image Fit Mode</div>
          <div className="btn-group" role="group">
            {['fit-width','fit-height','both'].map((v) => (
              <button key={v} className={`btn btn-sm ${local.imageFit===v? 'btn-warning text-dark': 'btn-outline-light'}`} onClick={() => setLocal({...local, imageFit: v})}>
                {v=== 'fit-width' ? 'Fit Width' : v==='fit-height' ? 'Fit Height' : 'Both'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="small text-muted mb-2">Page display style</div>
          <div className="btn-group" role="group">
            {['single','double','long_strip','wide_strip'].map((v) => (
              <button key={v} className={`btn btn-sm ${local.pageDisplay===v? 'btn-warning text-dark': 'btn-outline-light'}`} onClick={() => setLocal({...local, pageDisplay: v})}>
                {v === 'single' ? 'Single Page' : v === 'double' ? 'Double Page' : v === 'long_strip' ? 'Long Strip' : 'Wide Strip'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="small text-muted mb-2">Reading direction</div>
          <div className="btn-group" role="group">
            <button className={`btn btn-sm ${local.readingDirection==='ltr' ? 'btn-warning text-dark' : 'btn-outline-light'}`} onClick={() => setLocal({...local, readingDirection: 'ltr'})}>Left to Right</button>
            <button className={`btn btn-sm ${local.readingDirection==='rtl' ? 'btn-warning text-dark' : 'btn-outline-light'}`} onClick={() => setLocal({...local, readingDirection: 'rtl'})}>Right to Left</button>
          </div>
        </div>

        <div className="mb-3">
          <div className="small text-muted mb-2">Swipe axis</div>
          <div className="btn-group" role="group">
            <button className={`btn btn-sm ${local.swipeAxis==='vertical' ? 'btn-warning text-dark' : 'btn-outline-light'}`} onClick={() => setLocal({...local, swipeAxis: 'vertical'})}>Vertical</button>
            <button className={`btn btn-sm ${local.swipeAxis==='horizontal' ? 'btn-warning text-dark' : 'btn-outline-light'}`} onClick={() => setLocal({...local, swipeAxis: 'horizontal'})}>Horizontal</button>
          </div>
        </div>

        <div className="mb-3">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="progressBar" checked={local.progressBar} onChange={(e)=>setLocal({...local, progressBar: e.target.checked})} />
            <label className="form-check-label ms-2" htmlFor="progressBar">Progressive bar</label>
          </div>
          <div className="small text-muted mt-2">Position</div>
          <div className="btn-group mt-1" role="group">
            {['left','right','bottom'].map(p => (
              <button key={p} className={`btn btn-sm ${local.progressPosition===p ? 'btn-warning text-dark' : 'btn-outline-light'}`} onClick={() => setLocal({...local, progressPosition: p})}>{p[0].toUpperCase()+p.slice(1)}</button>
            ))}
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-sm btn-outline-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-sm btn-warning text-dark" onClick={() => { onSave(local); onClose(); }}>Save</button>
        </div>
      </div>

      <style>{`
        .reader-settings-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; padding:24px; z-index:1050; }
        .reader-settings-panel { width: min(920px, 96%); border-radius: 10px; border-left: none; box-shadow: 0 8px 40px rgba(0,0,0,0.7); transform-origin: center; animation: rs-in 220ms ease; }
        @keyframes rs-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .reader-settings-panel h4 { font-weight: 700; }
      `}</style>
    </div>
  );
}
