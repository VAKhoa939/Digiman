import React from 'react';
import { Container } from 'react-bootstrap';
import MangaCard from '../../components/smallComponents/MangaCard';
import Banner from '../../components/smallComponents/Banner';
import RecommendationBlock from '../../components/smallComponents/RecommendationBlock';
import MangaList from '../common/MangaList';
import useHomepage from '../../customHooks/useHomepage';
import { usePopular, useMostRead, useHomepageRecommendation } from '../../customHooks/useHomepage';
import { useAuth } from '../../context/AuthContext';

function Homepage() {
  const {
    latest, latestIsLoading, latestError,
  } = useHomepage();

  const { isAuthenticated } = useAuth();
  const { popular, popularIsLoading, popularError } = usePopular();
  const { mostRead, mostReadIsLoading, mostReadError } = useMostRead();
  const { banners, bannersIsLoading } = useHomepageRecommendation(isAuthenticated);

  return (
    <>
      <div style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-fg)' }}>
        <Container fluid className="py-5">

          {/* Popular — sorted by avg star rating */}
          <Banner
            isLoading={popularIsLoading}
            error={popularError}
            slides={popular}
            visible={6}
            title="Popular"
          />

          {/* Most Read — sorted by reader count */}
          <RecommendationBlock
            title="Most Read"
            items={mostRead}
            isLoading={mostReadIsLoading}
            error={mostReadError}
            viewAllPath="/search/advanced?ordering=-read_count"
          />

          {/* Personalised recommendation (authenticated readers only) — based on last read manga */}
          {isAuthenticated && banners.length > 0 && (
            <RecommendationBlock
              title="Recommended for You"
              subtitle={banners[0].sourceManga ? `Based on "${banners[0].sourceManga.title}"` : null}
              items={banners[0].recommendations}
              isLoading={bannersIsLoading}
            />
          )}

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

export default Homepage