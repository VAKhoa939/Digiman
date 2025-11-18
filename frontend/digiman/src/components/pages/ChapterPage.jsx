import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import Spinner from '../smallComponents/Spinner';
import { mockChapter, mockList } from '../../data/chapterMock';
import ChapterMeta from '../chapterComponents/ChapterMeta';
import ChapterControls from '../chapterComponents/ChapterControls';
import ChapterReader from '../chapterComponents/ChapterReader';
import ChapterNav from '../chapterComponents/ChapterNav';
import ChapterActions from '../chapterComponents/ChapterActions';
import Comment from '../smallComponents/Comment';
import { loadComments } from '../../utils/comments';
import ReaderSettings from '../chapterComponents/ReaderSettings';

export default function ChapterPage() {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chaptersList, setChaptersList] = useState([]);
  // reader mode state: 'vertical' (continuous) or 'paged'
  const [readerMode, setReaderMode] = useState('vertical');
  // swipe axis for paged mode: 'vertical' or 'horizontal'
  const [swipeAxis, setSwipeAxis] = useState('vertical');
  const [showSettings, setShowSettings] = useState(false);
  const [readerSettings, setReaderSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('readerSettings');
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  });

  // initialize readerMode/swipeAxis from persisted settings
  useEffect(() => {
    if (readerSettings && Object.keys(readerSettings).length) {
      setReaderMode(readerSettings.enablePaged ? 'paged' : 'vertical');
      setSwipeAxis(readerSettings.swipeAxis || 'vertical');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // track object URLs created from downloaded blobs, so we can revoke them
    const createdUrls = []
    async function load() {
      setLoading(true);
      setError(null);
      try {
          // If a downloaded copy exists locally (from Downloads), prefer that
          // so users can read offline copies they've downloaded.
          try{
            const saved = await loadDownloadedChapter(mangaId, chapterId)
            if (saved){
              if (mounted){
                // saved is { chapter, blobUrls }
                const pages = saved.blobUrls || saved.chapter.pages || []
                // remember urls so we can revoke them on cleanup
                if (Array.isArray(saved.blobUrls)) createdUrls.push(...saved.blobUrls)
                setChapter({...saved.chapter, pages})
                setChaptersList([]);
                setLoading(false);
                return
              }
            }
          }catch(e){ /* ignore and fall back to backend */ }

          // no local mock fallback here; rely on backend

          // Example endpoints - adapt to your backend routes
          const [{ data: chap }, { data: list }] = await Promise.all([
            api.get(`manga/${mangaId}/chapters/${chapterId}`),
            api.get(`manga/${mangaId}/chapters/`),
          ]);
          if (!mounted) return;
          setChapter(chap);
          setChaptersList(list || []);
      } catch (err) {
        console.error('Failed to load chapter', err);
        setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; createdUrls.forEach(u=>{ try{ URL.revokeObjectURL(u) }catch(_){}}) };
  }, [mangaId, chapterId]);

  if (loading) return <Spinner />;
  if (error) return (
    <div className="container py-5">
      <h3>Could not load chapter</h3>
      <p className="text-muted">{error.message || String(error)}</p>
    </div>
  );
  if (!chapter) return (
    <div className="container py-5">
      <h3>Chapter not found</h3>
    </div>
  );

  return (
    <div className="chapter-page container py-4">
      <ChapterMeta chapter={chapter} />
      <div className="mt-2 mb-3">
        <Link
          to={`/manga/${mangaId}/chapter/${chapterId}/comments`}
          className="btn btn-sm"
          style={{ backgroundColor: '#FFD400', color: '#111', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }}
        >
          Comments
        </Link>
      </div>
      <ChapterControls
        chapter={chapter}
        onOpenSettings={() => setShowSettings(true)}
      />
  <ChapterReader pages={chapter.pages || []} mode={readerMode} swipeAxis={swipeAxis} settings={readerSettings} />
      <div className="d-flex justify-content-between align-items-center mt-3">
        <ChapterNav chapters={chaptersList} currentId={chapter.id} onNavigate={(id) => navigate(`/manga/${mangaId}/chapter/${id}`)} />
        <ChapterActions chapter={chapter} mangaId={mangaId} />
      </div>

      {/* Inline comments preview (top 3) */}
      <div className="mt-4">
        <h5>Comments</h5>
        {(() => {
          const all = loadComments(mangaId, chapterId) || []
          if (all.length === 0) return <div className="text-muted">No comments yet. <Link to={`/manga/${mangaId}/chapter/${chapterId}/comments`}>Be the first</Link>.</div>
          const top = all.slice(0,3)
          return (
            <div>
              {top.map(c => (
                <div key={c.id} className="mb-2">
                  <Comment name={c.name} text={c.text} created_at={c.created_at} />
                </div>
              ))}
              {all.length > 3 && <div className="mt-2"><Link to={`/manga/${mangaId}/chapter/${chapterId}/comments`}>View all comments ({all.length})</Link></div>}
            </div>
          )
        })()}
  </div>
      <ReaderSettings show={showSettings} settings={readerSettings} onClose={() => setShowSettings(false)} onSave={(s) => {
        // apply select settings to reader and persist them
        try { localStorage.setItem('readerSettings', JSON.stringify(s)); } catch (err) { /* ignore */ }
        setReaderSettings(s);
        setReaderMode(s.enablePaged ? 'paged' : 'vertical');
        setSwipeAxis(s.swipeAxis || 'vertical');
      }} />
    </div>
  );
}
