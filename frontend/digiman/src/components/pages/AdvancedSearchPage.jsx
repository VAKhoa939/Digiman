import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

export default function AdvancedSearchPage() {
  const navigate = useNavigate();
  const [local, setLocal] = useState({ status: 'any', minChapter: '', ordering: 'publication_status', q: '' });
  const [showFilters, setShowFilters] = useState(true);
  const [contentRating, setContentRating] = useState('any');
  const [genres, setGenres] = useState([]);
  const allGenres = ['Action','Adventure','Comedy','Drama','Fantasy','Sci-Fi','Slice of Life','Romance','Yuri','Yaoi'];
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // If the page is opened with query params (e.g. ?genre=Action&contentRating=PG),
  // initialize filters and run the search automatically.
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const q = qs.get('q') || '';
    const genreParam = qs.get('genre');
    const genresFromQs = genreParam ? genreParam.split(',').map(s => decodeURIComponent(s)) : [];
    const contentRatingParam = qs.get('contentRating') || 'any';
    const statusParam = qs.get('status') || 'any';
    const minChapterParam = qs.get('minChapter') || '';
    const orderingParam = qs.get('ordering') || 'relevance';

    // apply parsed params to local UI state
    setLocal((prev) => ({ ...prev, q, ordering: orderingParam, status: statusParam, minChapter: minChapterParam }));
    setGenres(genresFromQs);
    setContentRating(contentRatingParam);

    // only trigger search if any meaningful param present
    if (q || genresFromQs.length || (contentRatingParam && contentRatingParam !== 'any') || (statusParam && statusParam !== 'any') || minChapterParam) {
      (async () => {
        setLoading(true);
        const params = { status: statusParam, minChapter: minChapterParam, ordering: orderingParam, contentRating: contentRatingParam, genre: genresFromQs };
        const r = await searchBackend(q, params);
        setResults(r);
        setLoading(false);
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    // no-op
  }, []);

  // On mount, show all manga by default (backend if available, otherwise mock fallback).
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const all = await searchBackend('', {});
        if (mounted) setResults(all || []);
      } catch (err) {
        if (mounted) setResults([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const searchBackend = async (term, params = {}) => {
    try {
      const backendParams = { search: term, ...params };
      const res = await api.get('manga/', { params: backendParams });
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.results)) return res.data.results;
      return [];
    } catch (err) {
      // backend unavailable — return empty result set
      return [];
    }
  };

  const doSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    const params = { status: local.status, minChapter: local.minChapter, ordering: local.ordering, contentRating, genre: genres };
    const r = await searchBackend(local.q, params);
    setResults(r);
    setLoading(false);
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Advanced Search</h3>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>

      <form onSubmit={doSearch} className="row g-3 mb-4">
        <div className="col-12">
          <input className="form-control" placeholder="Search term" value={local.q} onChange={(e)=>setLocal({...local, q: e.target.value})} />
        </div>
        <div className="col-12 d-flex align-items-center justify-content-between">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="showFilters" checked={showFilters} onChange={(e)=>setShowFilters(e.target.checked)} />
            <label className="form-check-label ms-2" htmlFor="showFilters">Show filters</label>
          </div>
        </div>

        {showFilters && (
          <>
            <div className="col-md-3">
              <label className="small text-muted">Sort by</label>
              <select className="form-select" value={local.ordering} onChange={(e)=>setLocal({...local, ordering: e.target.value})}>
                <option value="publication_date">Publication date</option>
                <option value="title">Title</option>
                <option value="latest_chapter_date">Latest chapter</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="small text-muted">Publication status</label>
              <select className="form-select" value={local.status} onChange={(e)=>setLocal({...local, status: e.target.value})}>
                <option value="any">Any</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Finished">Finished</option>
                <option value="Dropped">Dropped</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="small text-muted">Genre</label>
              <div className="d-flex flex-wrap gap-2">
                {allGenres.map(g => (
                  <button key={g} type="button" className={`btn btn-sm ${genres.includes(g) ? 'btn-warning text-dark' : 'btn-outline-light'}`} onClick={() => {
                    setGenres(prev => prev.includes(g) ? prev.filter(x=>x!==g) : [...prev, g]);
                  }}>{g}</button>
                ))}
              </div>
            </div>

            <div className="col-md-3">
              <label className="small text-muted">Author name</label>
              <input className="form-control" value={local.minChapter} onChange={(e)=>setLocal({...local, minChapter: e.target.value})} placeholder="e.g Oda" />
            </div>

            <div className="col-md-3 d-flex align-items-end">
              <button className="btn btn-primary w-100" type="submit">Search</button>
            </div>
          </>
        )}
      </form>

      <div>
        {loading && <div>Loading...</div>}
        {!loading && results.length === 0 && <div className="text-muted">No results</div>}
        {!loading && results.length > 0 && (
          <div className="row g-3">
            {results.map((r, idx) => (
              <div key={r.id} className="col-6 col-md-4 col-lg-3">
                <div className="card bg-dark text-white border-0">
                  <div style={{ height: 220, background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={r.image || '/assets/placeholder-image.png'} alt={r.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'cover' }} />
                  </div>
                  <div className="card-body p-2">
                    <div className="fw-bold">{r.title}</div>
                    <div className="small text-muted">{r.latest_chapter || ''} • {r.status || ''}</div>
                    <div className="small text-muted">{(r.genres||[]).slice(0,3).join(', ')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
