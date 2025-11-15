import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import MangaCard from '../../components/smallComponents/MangaCard';
import Banner from '../../components/smallComponents/Banner';
import api from '../../services/api';

function Catalog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('manga/');
        if (!mounted) return;
        // assume API returns array of manga
        setItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.warn('Catalog: failed to fetch from API.', err);
        if (mounted) setItems([]);
        setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false };
  }, []);

  // Latest updated (sort by dateUpdated desc)
  const latest = [...items].sort((a, b) => {
    const da = a.dateUpdated ? new Date(a.dateUpdated).getTime() : 0;
    const db = b.dateUpdated ? new Date(b.dateUpdated).getTime() : 0;
    return db - da;
  });
  const popular = [...items].sort((a, b) => {
    const da = a.dateUpdated ? new Date(a.dateUpdated).getTime() : 0;
    const db = b.dateUpdated ? new Date(b.dateUpdated).getTime() : 0;
    return db - da;
  }).slice(0, Math.min(items.length, 12));

  return (
    <>
      <div style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-fg)' }}>
        <Container fluid className="py-5">

          <Banner slides={popular} visible={6} title="Popular" />

          <div className="latest-updated my-4">
            <div className="d-flex align-items-center mb-2">
              <h5 className="mb-0">Latest Updated</h5>
              <div className="ms-auto">
                <button className="btn btn-sm catalog-btn outline" onClick={() => { navigate('/search/advanced'); }}>View All</button>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-3">
              {latest.slice(0, 8).map(m => (
                <MangaCard key={m.id} {...m} />
              ))}
            </div>
          </div>
        </Container>
      </div>
    </>
  )
}

export default Catalog