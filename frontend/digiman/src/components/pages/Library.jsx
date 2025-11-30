import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Library() {
  const { user, fetchUserLoading } = useAuth();
  const [list, setList] = useState([]);

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
      setList(arr);
      try { window.dispatchEvent(new CustomEvent('digiman:followChanged', { detail: { userId: user && user.id ? user.id : null } })); } catch(_) {}
      try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'info', message: 'Removed from your library' } })) }catch(_){ }
    } catch (err) { /* ignore */ }
  }

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
                <ul className="list-group">
                  {list.map(item => (
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
