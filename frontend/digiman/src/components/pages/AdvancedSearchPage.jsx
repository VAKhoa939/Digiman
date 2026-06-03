import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchAllMangaTitles, fetchGenres } from '../../services/mangaService';
import { mapMangaTitle } from '../../utils/transform';
import MangaList from '../smallComponents/MangaList';
import Pagination from '../smallComponents/Pagination';

const SEARCH_PAGE_SIZE = 20;

export default function AdvancedSearchPage() {
  const navigate = useNavigate();
  const [local, setLocal] = useState({ publication_status: '', ordering: 'publication_date', q: '' });
  const [showFilters, setShowFilters] = useState(true);
  const [genres, setGenres] = useState([]);
  
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
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
        const data = await fetchGenres();
        if (!mounted) return;
        const list = data || [];
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
    const currentPage = Math.max(1, Number(qs.get('page')) || 1);
    const genreParam = qs.get('genre_names');
    const genresFromQs = genreParam ? genreParam.split(',').map(s => normalizeName(decodeURIComponent(s))) .filter(Boolean) : [];
    const statusParam = qs.get('publication_status') || '';
    const orderingParam = qs.get('ordering') || 'relevance';

    // apply parsed params to local UI state
    setLocal((prev) => ({ ...prev, q, ordering: orderingParam, publication_status: statusParam }));
    setGenres(genresFromQs);

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const mappedGenreNames = genresFromQs.map(key => {
          const match = allGenres.find(g => normalizeName(g && g.name ? g.name : String(g)) === key);
          return match ? (match.name || String(match)) : key;
        });
        const params = { publication_status: statusParam, ordering: orderingParam, genre_names: mappedGenreNames };
        const r = await searchBackend(q, params, currentPage);
        if (!mounted) return;
        setResults(r.items);
        setTotal(r.total);
      } catch (err) {
        if (!mounted) return;
        setResults([]);
        setTotal(0);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, allGenres]);

  const searchBackend = async (term, params = {}, page = 1) => {
    try {
      const backendParams = { ...params };
      // If ordering requests the latest updated list, prefer the paginated "all titles" API
      if (String(backendParams.ordering) === '-updated_at') {
        try {
          const data = await fetchAllMangaTitles({ ordering: backendParams.ordering }, page, SEARCH_PAGE_SIZE);
          const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
          return { items: items.map(mapMangaTitle), total: Number(data?.count) || items.length };
        } catch (err) {
          return { items: [], total: 0 };
        }
      }

      if (Array.isArray(backendParams.genre_names)) {
        backendParams.genre_names = backendParams.genre_names.join(',');
      }
      // Only include search/q when a non-empty term is provided — sending an empty search param
      // can cause some backends to ignore filters and return all results.
      if (term && String(term).trim()) {
        backendParams.search = term;
        backendParams.q = term; // include alternative key in case backend expects `q`
      }

      const data = await fetchAllMangaTitles(backendParams, page, SEARCH_PAGE_SIZE);
      const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
      return { items: items.map(mapMangaTitle), total: Number(data?.count) || items.length };
    } catch (err) {
      // backend unavailable — return empty result set
      return { items: [], total: 0 };
    }
  };

  const doSearch = async (e) => {
    if (e) e.preventDefault();

    const params = new URLSearchParams();
    if (local.q && String(local.q).trim()) params.set('q', String(local.q).trim());
    if (local.ordering) params.set('ordering', local.ordering);
    if (local.publication_status && local.publication_status !== '') params.set('publication_status', local.publication_status);
    if (genres.length) {
      // Map normalized keys back to display names when serializing
      const displayNames = genres.map(key => {
        const match = allGenres.find(g => normalizeName(g && g.name ? g.name : String(g)) === key);
        return match ? (match.name || String(match)) : key;
      });
      params.set('genre_names', displayNames.join(','));
    }
    params.delete('page');

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
      <Pagination total={total} page={Math.max(1, Number(new URLSearchParams(location.search).get('page')) || 1)} pageSize={SEARCH_PAGE_SIZE} />
    </div>
  );
}
