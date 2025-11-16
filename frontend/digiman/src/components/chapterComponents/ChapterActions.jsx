import React from 'react';
import { useAuth } from '../../context/AuthContext';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate } from 'react-router-dom';
import { addDownload } from '../../utils/downloads';

export default function ChapterActions({ chapter, mangaId }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function handleDownload() {
    // enqueue the chapter into local downloads queue and navigate to downloads page
    const entry = {
      id: `d_${Date.now()}`,
      mangaId: mangaId || null,
      chapterId: chapter?.id || null,
      chapterTitle: chapter?.title || `Chapter ${chapter?.number || '?'}`,
      mangaTitle: null,
      status: 'downloading', // downloading | downloaded | failed
      progress: 0,
      created_at: new Date().toISOString()
    }
    addDownload(entry)
    navigate('/downloads')
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
