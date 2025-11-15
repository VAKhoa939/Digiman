import React from 'react';
import { useAuth } from '../../context/AuthContext';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate } from 'react-router-dom';
import { startDownload } from '../../utils/downloads';

export default function ChapterActions({ chapter, mangaId }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function handleDownload() {
    // Start backend download which will enqueue and fetch the chapter.
    startDownload(mangaId, chapter?.id || null, { chapterTitle: chapter?.title, mangaTitle: null })
      .then(()=> navigate('/downloads'))
      .catch(()=> navigate('/downloads'))
  }

  return (
    <div className="chapter-actions d-flex gap-2">
      <button className="btn btn-sm btn-outline-light d-flex align-items-center" onClick={handleDownload}>
        <DownloadIcon style={{ fontSize: 18, marginRight: 6 }} />
        Download
      </button>
      {isAuthenticated ? (
        <>
          <button className="btn btn-sm btn-warning">Bookmark</button>
        </>
      ) : (
        <button className="btn btn-sm btn-outline-light" disabled>Bookmark (Login)</button>
      )}
    </div>
  );
}
