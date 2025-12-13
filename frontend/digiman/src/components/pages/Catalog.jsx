import React from 'react';
import { Container } from 'react-bootstrap';
import MangaCard from '../../components/smallComponents/MangaCard';
import Banner from '../../components/smallComponents/Banner';
import MangaList from '../common/MangaList';
import useCatalog from '../../customHooks/useCatalog';

function Catalog() {
  const {
    latest, latestIsLoading, latestError,
    popular, popularIsLoading, popularError
  } = useCatalog();

  return (
    <>
      <div style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-fg)' }}>
        <Container fluid className="py-5">

          {/* Hot updates banner (multi-card scroller) */}
          <Banner 
            isLoading={popularIsLoading} 
            error={popularError} 
            slides={popular} 
            visible={6} 
            title="Popular" 
          />

          <MangaList
            title="Latest Updated"
            items={latest}
            loading={latestIsLoading}
            error={latestError}
            viewAllPath="/search/advanced?ordering=-updated_at"
            cardComponent={MangaCard}
          />
        </Container>
      </div>
    </>
  )
}

export default Catalog