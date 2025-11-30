import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import MangaList from '../common/MangaList';
import SearchMangaCard from '../smallComponents/SearchMangaCard';

export default function AdvancedSearchPage() {
  const navigate = useNavigate();
  const [local, setLocal] = useState({ status: 'any', minChapter: '', ordering: 'publication_status', q: '' });
  const [showFilters, setShowFilters] = useState(true);
  const [contentRating, setContentRating] = useState('any');
  const [genres, setGenres] = useState([]);
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  // Toggle to use mock data instead of calling the backend.
  const USE_MOCK = true;

  // Small mock dataset used for local UI work and testing.
  const MOCK_MANGAS = [
    { id: 1, title: 'One Piece', image: '/assets/placeholders/onepiece.png', latest_chapter: 'Ch. 1090', status: 'Ongoing', genres: ['Action','Adventure'], author: 'Oda' },
    { id: 2, title: 'Berserk', image: '/assets/placeholders/berserk.png', latest_chapter: 'Ch. 364', status: 'Finished', genres: ['Fantasy','Drama'], author: 'Miura' },
    { id: 3, title: 'Naruto', image: '/assets/placeholders/naruto.png', latest_chapter: 'Ch. 700', status: 'Finished', genres: ['Action','Adventure'], author: 'Kishimoto' },
    { id: 4, title: 'My Hero Academia', image: '/assets/placeholders/mha.png', latest_chapter: 'Ch. 400', status: 'Ongoing', genres: ['Action','Comedy'], author: 'Horikoshi' },
    { id: 5, title: 'Komi Can’t Communicate', image: '/assets/placeholders/komi.png', latest_chapter: 'Ch. 350', status: 'Ongoing', genres: ['Comedy','Romance','Slice of Life'], author: 'Tomo' },
    { id: 6, title: 'Vagabond', image: '/assets/placeholders/vagabond.png', latest_chapter: 'Ch. 327', status: 'Dropped', genres: ['Drama','Action'], author: 'Inoue' },
    { id: 7, title: 'Solo Leveling', image: '/assets/placeholders/sololeveling.png', latest_chapter: 'Ch. 179', status: 'Finished', genres: ['Fantasy','Action'], author: 'Chugong' },
    { id: 8, title: 'Ao Haru Ride', image: '/assets/placeholders/aoharuride.png', latest_chapter: 'Ch. 100', status: 'Finished', genres: ['Romance','Drama'], author: 'Io Sakisaka' }
  ];

  // Build genre list from mock data when using mock, otherwise fall back to sensible defaults.
  const allGenres = USE_MOCK
    ? Array.from(new Set(MOCK_MANGAS.flatMap(m => (m.genres || []).map(g => g.trim())))).sort()
    : ['Action','Adventure','Comedy','Drama','Fantasy','Sci-Fi','Slice of Life','Romance','Yuri','Yaoi'];

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
    // If we're using mock data, perform client-side filtering and return results.
    if (USE_MOCK) {
      let items = MOCK_MANGAS.slice();
      // search by title (case-insensitive)
      if (term && String(term).trim()) {
        const t = String(term).toLowerCase();
        items = items.filter(m => m.title.toLowerCase().includes(t));
      }
      // status filter
      if (params.status && params.status !== 'any') {
        items = items.filter(m => String(m.status).toLowerCase() === String(params.status).toLowerCase());
      }
      // genre filter (params.genre may be CSV)
      if (params.genre) {
        const wanted = String(params.genre).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (wanted.length) {
          items = items.filter(m => (m.genres || []).some(g => wanted.includes(g.toLowerCase())));
        }
      }
      // author/name filter (minChapter field used as author input in UI)
      if (params.minChapter && String(params.minChapter).trim()) {
        const a = String(params.minChapter).toLowerCase();
        items = items.filter(m => (m.author || '').toLowerCase().includes(a));
      }
      return items;
    }

    try {
      const backendParams = { ...params };
      // Serialize genre array as comma-separated list (backend may expect this)
      if (Array.isArray(backendParams.genre)) backendParams.genre = backendParams.genre.join(',');
      // Only include search/q when a non-empty term is provided — sending an empty search param
      // can cause some backends to ignore filters and return all results.
      if (term && String(term).trim()) {
        backendParams.search = term;
        backendParams.q = term; // include alternative key in case backend expects `q`
      }

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
    const params = { status: local.status, minChapter: local.minChapter, ordering: local.ordering, contentRating, genre: Array.isArray(genres) ? genres.join(',') : genres };
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
          </>
        )}

        {/* Keep the Search button visible even when filters are hidden */}
        <div className="col-12 col-md-3 d-flex align-items-end">
          <button className="btn btn-primary w-100" type="submit">Search</button>
        </div>
      </form>

      <MangaList
        title={loading ? 'Searching…' : 'Search results'}
        items={results}
        loading={loading}
        error={null}
        viewAllPath={null}
        limit={1000}
        cardComponent={SearchMangaCard}
        className="search-results"
      />
    </div>
  );
}
