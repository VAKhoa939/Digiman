import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Small presentational card used in lists/catalogs. Clicking the card navigates to /manga/:id
const MangaCard = ({ id, title, status, coverUrl, author, chapter_count, genres = [], dateUpdated, cardWidth = '210px', imgHeight = '300px' }) => {
  const [imgSrc, setImgSrc] = useState(coverUrl || `https://via.placeholder.com/${parseInt(cardWidth,10) || 210}x${parseInt(imgHeight,10) || 300}?text=No+Cover`);

  const onError = () => setImgSrc('https://via.placeholder.com/210x300?text=No+Cover');

  // Compute latest update date from chapters if not provided explicitly
  let latestDate = new Date(dateUpdated);

  // Produce a human-friendly relative time like "3 days ago".
  const timeAgo = (d) => {
    if (!d) return null;
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const intervals = [
      { unit: 'year', secs: 31536000 },
      { unit: 'month', secs: 2592000 },
      { unit: 'day', secs: 86400 },
      { unit: 'hour', secs: 3600 },
      { unit: 'minute', secs: 60 },
    ];
    for (const { unit, secs } of intervals) {
      const value = Math.floor(seconds / secs);
      if (value >= 1) return `${value} ${unit}${value > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  };

  const relativeTime = latestDate ? timeAgo(latestDate) : null;

  return (
    <Link to={`/manga/${id}`} className="manga-card text-decoration-none">
      <div className="card bg-card text-white" style={{ width: cardWidth }}>
        <img
          src={imgSrc}
          alt={`${title} cover`}
          className="card-img-top"
          onError={onError}
          loading="lazy"
          style={{ height: imgHeight, objectFit: 'cover' }}
        />
        <div className="card-body p-2">
          <h6 className="card-title mb-1" style={{ fontSize: '0.95rem', color: 'var(--app-fg)' }}>{title}</h6>
          {author && <div className="text-muted small mb-1">{author}</div>}
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">{chapter_count} chapters</small>
            {status ? (
              <span className="badge bg-warning text-dark">{status}</span>
            ) : null}
          </div>
          {relativeTime && (
            <div className="text-muted small mb-1"> {relativeTime}</div>
          )}
          
        </div>
      </div>
    </Link>
  );
};

export default MangaCard;
