import React, { useState, useEffect } from 'react';

export default function AdvancedSearch({ show = false, options = {}, onClose = () => {}, onSave = () => {} }) {
  const [local, setLocal] = useState({
    status: options.status || 'any',
    minChapter: options.minChapter || '',
    ordering: options.ordering || 'relevance',
  });

  useEffect(() => setLocal({ status: options.status || 'any', minChapter: options.minChapter || '', ordering: options.ordering || 'relevance' }), [options, show]);

  if (!show) return null;

  return (
    <div className="advanced-search-overlay" role="dialog" aria-modal="true">
      <div className="advanced-search-panel bg-dark text-white p-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">Advanced search</h5>
          <button className="btn btn-sm btn-outline-light" onClick={onClose} aria-label="Close advanced search">✕</button>
        </div>

        <div className="mb-2">
          <label className="small text-muted">Status</label>
          <select className="form-select form-select-sm" value={local.status} onChange={(e) => setLocal({...local, status: e.target.value })}>
            <option value="any">Any</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Finished">Finished</option>s
            <option value="Dropped">Dropped</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="small text-muted">Sort by</label>
          <select className="form-select form-select-sm" value={local.ordering} onChange={(e) => setLocal({...local, ordering: e.target.value })}>
            <option value="publication_date">Publication Date</option>
            <option value="title">Title</option>
            <option value="latest_chapter_date">Latest chapter</option>
          </select>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-sm btn-outline-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-sm btn-warning text-dark" onClick={() => { onSave(local); onClose(); }}>Apply</button>
        </div>
      </div>

      <style>{`
        .advanced-search-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; padding:16px; z-index:2100; }
        .advanced-search-panel { width: min(560px, 96%); border-radius: 8px; }
      `}</style>
    </div>
  );
}
