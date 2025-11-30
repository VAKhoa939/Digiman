import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useLocation } from 'react-router-dom';
import { fetchAllMangaTitles } from '../../services/mangaService';
import { mapMangaTitle } from '../../utils/transform';

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [hoveredId, setHoveredId] = useState(null);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const location = useLocation();
  const [searchParams, setSearchParams] = useState({});

  useEffect(() => {
    function onDoc(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const searchBackend = async (term, params = {}) => {
    try {
      const backendParams = { search: term, ...params };
      const res = await fetchAllMangaTitles(backendParams, 1);
      // assume API returns array of objects; normalize with mapMangaTitle
      if (Array.isArray(res)) return res.map(mapMangaTitle);
      // handle DRF paginated response
      if (res && Array.isArray(res.results)) return res.results.map(mapMangaTitle);
      return [];
    } catch (err) {
      // fallback: return empty results when backend is unavailable
      return [];
    }
  };

  const onChange = (e) => {
    const val = e.target.value;
    setQ(val);
    clearTimeout(timer.current);
    if (!val || val.trim().length === 0) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const r = await searchBackend(val.trim(), searchParams);
      setResults(r);
      setOpen(true);
    }, 250);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (results.length > 0) {
      navigate(`/manga/${results[0].id}`);
      setOpen(false);
      setQ('');
      setResults([]);
    }
  };

  return (
    <div ref={containerRef} className="searchbar position-relative me-2" style={{ minWidth: 240 }}>
      <form className="d-flex" onSubmit={onSubmit} role="search">
        <input value={q} onChange={onChange} className="form-control me-2" type="search" placeholder="Search manga..." aria-label="Search manga" />
  <button className="btn btn-secondary me-1" type="submit">Search</button>
      </form>

      {open && results && results.length > 0 && (
        <div className="card position-absolute mt-1 w-100" style={{ zIndex: 2000, backgroundColor: 'var(--app-bg)', color: 'var(--app-fg)' }}>
          <ul className="list-group list-group-flush">
            {results.map((r) => (
              <li
                key={r.id}
                className="list-group-item list-group-item-action d-flex align-items-center"
                style={{
                  cursor: 'pointer',
                  backgroundColor: hoveredId === r.id ? 'rgba(128,128,128,0.15)' : 'var(--app-bg)',
                  color: 'var(--app-fg)',
                  transition: 'background-color 120ms ease'
                }}
                onMouseEnter={() => setHoveredId(r.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => { navigate(`/manga/${r.id}`); setOpen(false); setQ(''); setResults([]); }}
              >
                <img src={r.coverUrl || '/assets/placeholder-image.png'} alt={r.title} style={{ width: 48, height: 64, objectFit: 'cover', marginRight: 12 }} />
                <div className="flex-grow-1">
                  <div className="fw-bold">{r.title}</div>
                  <div className="small text-muted">{r.latest_chapter || ''} • {r.status || ''}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && results && results.length === 0 && (
        <div className="card position-absolute mt-1 w-100 p-2 text-muted" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-fg)', zIndex: 2000 }}>No results</div>
      )}

      {/* advanced search is a full page now at /search/advanced */}
    </div>
  );
}
