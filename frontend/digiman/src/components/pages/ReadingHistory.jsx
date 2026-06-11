import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchReadingHistory, deleteReadingProgress } from '../../services/readerService';
import Spinner from '../smallComponents/Spinner';
import { getTimeAgo } from '../../utils/formatTime';
import Pagination from '../smallComponents/Pagination';

const HISTORY_PAGE_SIZE = 20;

export default function ReadingHistory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const currentPage = Math.max(1, Number(searchParams.get('history_page')) || 1);

  const setHistoryPage = useCallback((page) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (page <= 1) next.delete('history_page');
      else next.set('history_page', String(page));
      return next;
    });
  }, [setSearchParams]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchReadingHistory(currentPage, HISTORY_PAGE_SIZE);
      const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
      setHistory(items);
      setTotal(Number(data?.count) || items.length);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load reading history.');
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (progressId) => {
    setDeletingId(progressId);
    try {
      await deleteReadingProgress(progressId);
      setHistory(prev => prev.filter(entry => entry.id !== progressId));
      setTotal(prev => Math.max(0, prev - 1));
      if (history.length === 1 && currentPage > 1) {
        setHistoryPage(currentPage - 1);
      }
      try {
        window.dispatchEvent(new CustomEvent('digiman:toast', {
          detail: { type: 'success', message: 'Entry removed from history' },
        }));
      } catch (_) {}
    } catch (_) {
      try {
        window.dispatchEvent(new CustomEvent('digiman:toast', {
          detail: { type: 'error', message: 'Failed to remove entry' },
        }));
      } catch (_e) {}
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-4">
        <h2 className="mb-0">Reading History</h2>
        {total > 0 && !loading && (
          <span className="ms-3 text-muted small">{total} entr{total === 1 ? 'y' : 'ies'}</span>
        )}
      </div>

      {loading && <Spinner />}

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="text-center py-5 text-muted">
          <p className="mb-2" style={{ fontSize: '1.1rem' }}>No reading history yet.</p>
          <p className="small mb-4">Start reading a chapter and it will appear here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Browse Manga</button>
        </div>
      )}

      {!loading && !error && history.length > 0 && (
        <>
          <div className="d-flex flex-column gap-3">
            {history.map(entry => (
              <div
                key={entry.id}
                className="d-flex align-items-center gap-3 p-3 rounded"
                style={{
                  background: 'var(--app-bg, #111)',
                  border: '1px solid var(--app-fg, #222)',
                }}
              >
                <Link to={entry.manga_title_id ? `/manga/${entry.manga_title_id}` : '#'}>
                  <img
                    src={entry.manga_title_cover || 'https://via.placeholder.com/60x85?text=?'}
                    alt={entry.manga_title_title || 'Manga cover'}
                    style={{ width: 60, height: 85, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                    onError={e => { e.target.src = 'https://via.placeholder.com/60x85?text=?'; }}
                  />
                </Link>

                <div className="flex-grow-1 overflow-hidden">
                  <Link
                    to={entry.manga_title_id ? `/manga/${entry.manga_title_id}` : '#'}
                    className="text-decoration-none"
                    style={{ color: 'var(--app-fg)' }}
                  >
                    <div className="fw-semibold text-truncate" style={{ fontSize: '0.95rem' }}>
                      {entry.manga_title_title || 'Unknown Manga'}
                    </div>
                  </Link>
                  <div className="text-muted small mt-1">
                    {entry.chapter_number != null
                      ? `Chapter ${entry.chapter_number}${entry.chapter_title ? ` — ${entry.chapter_title}` : ''}`
                      : 'Chapter deleted'}
                  </div>
                  <div className="text-muted small">{getTimeAgo(entry.last_read_timestamp)}</div>
                </div>

                <div className="d-flex flex-column gap-2 align-items-end flex-shrink-0">
                  {entry.chapter_id && entry.manga_title_id && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/manga/${entry.manga_title_id}/chapter/${entry.chapter_id}`)}
                    >
                      Continue
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                  >
                    {deletingId === entry.id ? '…' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            total={total}
            page={currentPage}
            pageSize={HISTORY_PAGE_SIZE}
            pageParam="history_page"
            pageSizeParam="history_page_size"
          />
        </>
      )}
    </div>
  );
}
