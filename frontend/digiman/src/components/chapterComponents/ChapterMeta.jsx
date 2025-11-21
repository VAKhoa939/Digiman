import React from 'react';
import { Link } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';


export default function ChapterMeta({ chapter }) {
  if (!chapter) return null;
  return (
    <div className="chapter-meta mb-3">
      <h4 className="mb-1">
        <Link to="/" className="home-link text-decoration-none me-2 d-inline-flex align-items-center">
          <HomeIcon fontSize="small" className="me-1" aria-hidden="true" />
          <span>Home</span>
        </Link>
        <span className="text-muted">/</span>
        <Link to={`/manga/${chapter.mangaTitleID}`} className="manga-link text-decoration-none ms-2 me-2">
          {chapter.mangaTitle}
        </Link>
        <span className="text-muted">/</span>
        <span className="ms-2">{chapter.title || `Chapter ${chapter.number}`}</span>
      </h4>
      <div className="text-muted small">{chapter.date ? ` • ${new Date(chapter.date).toLocaleString()}` : null}</div>
    </div>
  );
}
