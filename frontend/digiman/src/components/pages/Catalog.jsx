import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import MangaCard from '../../components/smallComponents/MangaCard';
import Banner from '../../components/smallComponents/Banner';
import MangaList from '../common/MangaList';
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

          <MangaList
            title="Latest Updated"
            items={latest}
            loading={latestIsLoading}
            error={latestError}
            viewAllPath="/search/advanced"
            limit={8}
            cardComponent={MangaCard}
          />
        </Container>
      </div>
    </>
  )
}

export default Catalog