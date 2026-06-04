import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import Pagination from '../smallComponents/Pagination';

const LIBRARY_PAGE_SIZE = 20;

export default function Library() {
  const { user, fetchUserLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [list, setList] = useState([]);
  const currentPage = Math.max(1, Number(searchParams.get('library_page')) || 1);

  const key = `followed_mangas_${user && user.id ? user.id : 'guest'}`;

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        setList(arr);
      } catch (err) { setList([]); }
    }
    load();
    const onChange = () => load();
    window.addEventListener('digiman:followChanged', onChange);
    return () => window.removeEventListener('digiman:followChanged', onChange);
  }, [key]);

  function unfollow(mangaId) {
    try {
      const raw = localStorage.getItem(key);
      let arr = raw ? JSON.parse(raw) : [];
      arr = arr.filter(x => String(x.mangaId) !== String(mangaId));
      localStorage.setItem(key, JSON.stringify(arr));
      const nextTotal = arr.length;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / LIBRARY_PAGE_SIZE));
      if (currentPage > nextTotalPages) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (nextTotalPages <= 1) next.delete('library_page');
          else next.set('library_page', String(nextTotalPages));
          return next;
        });
      }
      setList(arr);
      try { window.dispatchEvent(new CustomEvent('digiman:followChanged', { detail: { userId: user && user.id ? user.id : null } })); } catch(_) {}
      try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'info', message: 'Removed from your library' } })) }catch(_){ }
    } catch (err) { /* ignore */ }
  }

  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * LIBRARY_PAGE_SIZE;
    return list.slice(start, start + LIBRARY_PAGE_SIZE);
  }, [list, currentPage]);

  return (
    <div className="container py-4">
      <div className="profile-page">
        <div className="profile-header" />
        <div className="profile-content" style={{ padding: '0 8px' }}>
          {fetchUserLoading ? (
            <div style={{ padding: 24 }}>Loading library…</div>
          ) : (
            <>
              <h2>My Library</h2>
              {(!list || list.length === 0) ? (
                <div className="text-muted">You are not following any manga yet.</div>
              ) : (
                <>
                  <ul className="list-group">
                    {pagedList.map(item => (
                      <li key={item.mangaId} className="list-group-item d-flex align-items-center justify-content-between">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {item.coverUrl ? <img src={item.coverUrl} alt={item.title} style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width:48, height:68, background:'rgba(0,0,0,0.06)', borderRadius:4 }} />}
                          <div>
                            <Link to={`/manga/${item.mangaId}`} className="text-decoration-none"><strong>{item.title || `Manga ${item.mangaId}`}</strong></Link>
                          </div>
                        </div>
                        <div>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => unfollow(item.mangaId)}>Unfollow</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    total={list.length}
                    page={currentPage}
                    pageSize={LIBRARY_PAGE_SIZE}
                    pageParam="library_page"
                    pageSizeParam="library_page_size"
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
