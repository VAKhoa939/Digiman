import React from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../smallComponents/Spinner';
import MangaCard from '../smallComponents/MangaCard';

export default function MangaList({
  title = 'List',
  items = [],
  loading = false,
  error = null,
  viewAllPath = null,
  limit = 8,
  cardComponent: Card = MangaCard,
  className = ''
}) {
  const navigate = useNavigate();

  return (
    <div className={`manga-list my-4 ${className}`}>
      <div className="d-flex align-items-center mb-2">
        <h5 className="mb-0">{title}</h5>
        {viewAllPath && (
          <div className="ms-auto">
            <button className="btn btn-sm catalog-btn outline" onClick={() => navigate(viewAllPath)}>View All</button>
          </div>
        )}
      </div>

      {loading && <Spinner />}

      {error ? (
        <p className="text-danger">{typeof error === 'string' ? error : `Failed to load ${title.toLowerCase()}.`}</p>
      ) : (
        <div className="d-flex flex-wrap gap-3">
          {(items || []).slice(0, limit).map(i => (
            <Card key={i.id} {...i} />
          ))}
        </div>
      )}
    </div>
  );
}
