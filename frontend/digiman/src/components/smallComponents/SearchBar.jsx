import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { mangaMock } from '../../data/mangaMock';
import { useLocation } from 'react-router-dom';

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
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
      const res = await api.get('manga/', { params: backendParams });
      // assume API returns array of objects with id, title, image, latest_chapter, status
      if (Array.isArray(res.data)) return res.data;
      // handle DRF paginated response
      if (res.data && Array.isArray(res.data.results)) return res.data.results;
      return [];
    } catch (err) {
      // fallback to mock
      // apply filter logic for mock data based on params
      const termLower = (term || '').toLowerCase();
      return mangaMock.filter(m => {
        if (termLower && !m.title.toLowerCase().includes(termLower)) return false;
        if (params.status && params.status !== 'any' && m.status !== params.status) return false;
        if (params.contentRating && params.contentRating !== 'any' && m.content_rating !== params.contentRating) return false;
        if (params.genre && Array.isArray(params.genre) && params.genre.length > 0) {
          // require that manga has at least one of requested genres
          const has = params.genre.some(g => (m.genres || []).includes(g));
          if (!has) return false;
        }
        if (params.minChapter) {
          const num = parseInt((m.latest_chapter || '').replace(/[^0-9]/g, ''), 10) || 0;
          const min = parseInt(params.minChapter, 10) || 0;
          if (num < min) return false;
        }
        return true;
      }).sort((a,b) => {
        if (params.ordering === 'title') return a.title.localeCompare(b.title);
        if (params.ordering === 'latest_chapter') {
          const na = parseInt((a.latest_chapter||'').replace(/[^0-9]/g,''),10)||0;
          const nb = parseInt((b.latest_chapter||'').replace(/[^0-9]/g,''),10)||0;
          return nb - na;
        }
        return 0;
      });
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
    }
  };

  return (
    <div ref={containerRef} className="searchbar position-relative me-2" style={{ minWidth: 240 }}>
      <form className="d-flex" onSubmit={onSubmit} role="search">
        <input value={q} onChange={onChange} className="form-control me-2" type="search" placeholder="Search manga..." aria-label="Search manga" />
  <button className="btn btn-secondary me-1" type="submit">Search</button>
      </form>

      {open && results && results.length > 0 && (
        <div className="card position-absolute mt-1 w-100" style={{ zIndex: 2000 }}>
          <ul className="list-group list-group-flush">
            {results.map((r) => (
              <li key={r.id} className="list-group-item list-group-item-action d-flex align-items-center" style={{ cursor: 'pointer' }} onClick={() => { navigate(`/manga/${r.id}`); setOpen(false); }}>
                <img src={r.image || '/assets/placeholder-image.png'} alt={r.title} style={{ width: 48, height: 64, objectFit: 'cover', marginRight: 12 }} />
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
        <div className="card position-absolute mt-1 w-100 p-2 text-muted">No results</div>
      )}

      {/* advanced search is a full page now at /search/advanced */}
    </div>
  );
}
