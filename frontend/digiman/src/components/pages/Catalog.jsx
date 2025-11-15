import React from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import mangaData from '../../data/mangaData';
import MangaCard from '../../components/smallComponents/MangaCard';
import Banner from '../../components/smallComponents/Banner';

function Catalog() {
  const items = Object.values(mangaData);
  // Latest updated (sort by dateUpdated desc)
  const latest = [...items].sort((a, b) => {
    const da = a.dateUpdated ? new Date(a.dateUpdated).getTime() : 0;
    const db = b.dateUpdated ? new Date(b.dateUpdated).getTime() : 0;
    return db - da;
  });
  // Popular placeholder: sort by dateUpdated desc as a proxy for popularity for now.
  // Replace with a real `views`/`score` metric when available from the API.
  const popular = [...items].sort((a, b) => {
    const da = a.dateUpdated ? new Date(a.dateUpdated).getTime() : 0;
    const db = b.dateUpdated ? new Date(b.dateUpdated).getTime() : 0;
    return db - da;
  }).slice(0, Math.min(items.length, 12));
  const navigate = useNavigate();

  return (
    <>
      <div style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-fg)' }}>
        <Container fluid className="py-5">

          {/* Hot updates banner (multi-card scroller) */}
          <Banner slides={popular} visible={6} title="Popular" />


          {/* Latest Updated section */}
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