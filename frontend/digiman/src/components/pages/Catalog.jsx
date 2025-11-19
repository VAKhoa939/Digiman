import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import MangaCard from '../../components/smallComponents/MangaCard';
import Banner from '../../components/smallComponents/Banner';
import useCatalog from '../../customHooks/useCatalog';
import Spinner from '../smallComponents/Spinner';

function Catalog() {
  const navigate = useNavigate();
  const {
    latest, latestIsLoading, latestError,
    popular, popularIsLoading, popularError
  } = useCatalog();

  if (popularError) console.log(popularError);
  if (latestError) console.log(latestError);

  return (
    <>
      <div style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-fg)' }}>
        <Container fluid className="py-5">

          {/* Hot updates banner (multi-card scroller) */}
          {popularIsLoading && <Spinner />}
          {popularError ? <p className="text-danger">Failed to load popular banner.</p>
          : <Banner slides={popular} visible={6} title="Popular" />}

          <div className="latest-updated my-4">
            <div className="d-flex align-items-center mb-2">
              <h5 className="mb-0">Latest Updated</h5>
              <div className="ms-auto">
                <button className="btn btn-sm catalog-btn outline" onClick={() => { navigate('/search/advanced'); }}>View All</button>
              </div>
            </div>
            {latestIsLoading && <Spinner />}
            {latestError 
            ? <p className="text-danger">Failed to load latest updates banner.</p>
            : <div className="d-flex flex-wrap gap-3">
              {latest.slice(0, 8).map(m => (
                <MangaCard key={m.id} {...m} />
              ))}
            </div>}
          </div>
        </Container>
      </div>
    </>
  )
}

export default Catalog