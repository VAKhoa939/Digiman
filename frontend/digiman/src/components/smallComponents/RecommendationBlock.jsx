import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MangaCard from './MangaCard';
import Spinner from './Spinner';

/**
 * A horizontally-scrollable recommendation strip with prev/next arrow buttons.
 *
 * Props:
 *   title       {string}  Section heading.
 *   subtitle    {string?} Optional muted sub-heading (e.g. "Based on Naruto").
 *   items       {Array}   Array of mapped MangaTitle objects.
 *   isLoading   {bool}
 *   error       {string|null}
 *   viewAllPath {string?} If provided, shows a "View All" button.
 */
const RecommendationBlock = ({
  title = 'Recommended',
  subtitle = null,
  items = [],
  isLoading = false,
  error = null,
  viewAllPath = null,
}) => {
  const trackRef = useRef(null);
  const navigate = useNavigate();

  const scrollBy = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.querySelector('.dm-rec-item .card');
    const gap = 16;
    const w = item ? item.offsetWidth + gap : 220 + gap;
    track.scrollBy({ left: dir * w, behavior: 'smooth' });
  };

  // Don't render at all if loading is done and there's nothing to show
  if (!isLoading && !error && items.length === 0) return null;

  return (
    <section className="dm-hot-updates my-4">
      <div className="dm-hot-header d-flex align-items-center justify-content-between">
        <div>
          <h5 className="mb-0">{title}</h5>
          {subtitle && (
            <div className="text-muted small mt-1">{subtitle}</div>
          )}
          <div className="dm-hot-underline">
            <span className="dm-hot-star">★</span>
            <span className="dm-hot-line" />
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {viewAllPath && !isLoading && !error && (
            <button
              className="btn btn-sm catalog-btn outline"
              onClick={() => navigate(viewAllPath)}
            >
              View All
            </button>
          )}
          {!isLoading && !error && items.length > 0 && (
            <div className="dm-hot-controls">
              <button className="dm-hot-btn" aria-label="Prev" onClick={() => scrollBy(-1)}>‹</button>
              <button className="dm-hot-btn" aria-label="Next" onClick={() => scrollBy(1)}>›</button>
            </div>
          )}
        </div>
      </div>

      <div className="dm-hot-track-wrapper">
        {isLoading && <Spinner />}
        {error ? (
          <p className="text-danger">{error}</p>
        ) : (
          <div
            className="dm-hot-track d-flex gap-3 overflow-auto"
            ref={trackRef}
          >
            {items.map((item, i) => (
              <div key={item.id || i} className="dm-rec-item" style={{ flex: '0 0 auto' }}>
                <MangaCard {...item} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendationBlock;
