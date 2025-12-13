import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchAllMangaTitles, fetchGenres } from '../../services/mangaService';
import { mapMangaTitle } from '../../utils/transform';
import MangaList from '../common/MangaList';

export default function AdvancedSearchPage() {
  const navigate = useNavigate();
  const [local, setLocal] = useState({ publication_status: '', ordering: 'publication_date', q: '' });
  const [showFilters, setShowFilters] = useState(true);
  const [genres, setGenres] = useState([]);
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Build genre list from API
  const [allGenres, setAllGenres] = useState([]);
  const normalizeName = (s) => {
    if (s === undefined || s === null) return '';
    try {
      // Normalize unicode, replace NBSP, collapse whitespace, trim and lowercase
      return String(s)
        .normalize('NFKC')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    } catch (err) {
      return String(s || '').trim().toLowerCase();
    }
  };
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchGenres();
        if (!mounted) return;
        const list = Array.isArray(res) ? res : (res && Array.isArray(res.results) ? res.results : []);
        setAllGenres(list);
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the page is opened with query params (e.g. ?genre_names=Action&contentRating=PG),
  // initialize filters and run the search automatically.
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const q = qs.get('q') || '';
    const genreParam = qs.get('genre_names');
    const genresFromQs = genreParam ? genreParam.split(',').map(s => normalizeName(decodeURIComponent(s))) .filter(Boolean) : [];
    const statusParam = qs.get('publication_status') || '';
    const orderingParam = qs.get('ordering') || 'relevance';

    // apply parsed params to local UI state
    setLocal((prev) => ({ ...prev, q, ordering: orderingParam, publication_status: statusParam }));
    setGenres(genresFromQs);

    // trigger search when any query params are present (Search button navigates
    // to a URL with query params) or when ordering explicitly requests latest-updated
    const hasQs = Boolean(location.search && String(location.search).length > 0);
    const shouldTrigger = hasQs || orderingParam === '-updated_at';
    if (shouldTrigger) {
      (async () => {
        setLoading(true);
        // If ordering requests latest-updated from Catalog's "View All", only send ordering param
        // Map normalized keys back to display names when possible
        const mappedGenreNames = genresFromQs.map(key => {
          const match = allGenres.find(g => normalizeName(g && g.name ? g.name : String(g)) === key);
          return match ? (match.name || String(match)) : key;
        });
        const params = { publication_status: statusParam, ordering: orderingParam, genre_names: mappedGenreNames };
        const r = await searchBackend(q, params);
        setResults(r);
        setLoading(false);
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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
      const backendParams = { ...params };
      // If ordering requests the latest updated list, prefer the paginated "all titles" API
      if (String(backendParams.ordering) === '-updated_at') {
        try {
          const res = await fetchAllMangaTitles({ ordering: backendParams.ordering }, 1);
          if (Array.isArray(res)) return res.map(mapMangaTitle);
          if (res && Array.isArray(res.results)) return res.results.map(mapMangaTitle);
          return [];
        } catch (err) {
          return [];
        }
      }

      // Serialize genre_names array as comma-separated list (backend may expect this)
      if (Array.isArray(backendParams.genre_names)) backendParams.genre_names = backendParams.genre_names.join(',');
      // Only include search/q when a non-empty term is provided — sending an empty search param
      // can cause some backends to ignore filters and return all results.
      if (term && String(term).trim()) {
        backendParams.search = term;
        backendParams.q = term; // include alternative key in case backend expects `q`
      }

      const res = await fetchAllMangaTitles(backendParams, 1);
      if (Array.isArray(res)) return res.map(mapMangaTitle);
      if (res && Array.isArray(res.results)) return res.results.map(mapMangaTitle);
      return [];
    } catch (err) {
      // backend unavailable — return empty result set
      return [];
    }
  };

  const doSearch = async (e) => {
    if (e) e.preventDefault();

    const params = new URLSearchParams();
    if (local.q && String(local.q).trim()) params.set('q', String(local.q).trim());
    if (local.ordering) params.set('ordering', local.ordering);
    if (local.publication_status && local.publication_status !== '') params.set('publication_status', local.publication_status);
    if (Array.isArray(genres) && genres.length) {
      // Map normalized keys back to display names when serializing
      const displayNames = genres.map(key => {
        const match = allGenres.find(g => normalizeName(g && g.name ? g.name : String(g)) === key);
        return match ? (match.name || String(match)) : key;
      });
      params.set('genre_names', displayNames.join(','));
    }

    // Update the URL with current search/filter params; use navigate so
    // the existing effect that watches `location.search` will run the search.
    // Clear current results and show loading state immediately
    setResults([]);
    setLoading(true);

    navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
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
                <option value="publication_date">Publication date ascending</option>
                <option value="-publication_date">Publication date descending</option>
                <option value="title">Title ascending</option>
                <option value="-title">Title descending</option>
                <option value="-updated_at">Latest chapter</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="small text-muted">Publication status</label>
                  <select className="form-select" value={local.publication_status} onChange={(e)=>setLocal({...local, publication_status: e.target.value})}>
                    <option value="">Any</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="finished">Finished</option>
                    <option value="dropped">Dropped</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="small text-muted">Genre</label>
              <div className="d-flex flex-wrap gap-2">
                {allGenres.map((g) => {
                  const display = g && g.name ? g.name : String(g);
                  const n = normalizeName(display);
                  const key = n || display;
                  const selected = genres.includes(n);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`btn btn-sm ${selected ? 'btn-warning text-dark' : 'btn-outline-light'}`}
                      onClick={() => {
                        setGenres(prev => {
                          const has = prev.includes(n);
                          const next = has ? prev.filter(x => x !== n) : [...prev, n];
                          return next;
                        });
                      }}
                    >{display}</button>
                  );
                })}
              </div>
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
        className="search-results"
      />
    </div>
  );
}
