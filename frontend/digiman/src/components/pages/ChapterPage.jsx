import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import Spinner from '../smallComponents/Spinner';
import { mockChapter, mockList } from '../../data/chapterMock';
import { loadDownloadedChapter } from '../../utils/downloads';
import ChapterMeta from '../chapterComponents/ChapterMeta';
import ChapterControls from '../chapterComponents/ChapterControls';
import ChapterReader from '../chapterComponents/ChapterReader';
import ChapterNav from '../chapterComponents/ChapterNav';
import ChapterActions from '../chapterComponents/ChapterActions';
import CommentsPage from './CommentsPage';
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

          // local fallback
          if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
            if (!mounted) return;
            setChapter(mockChapter);
            setChaptersList(mockList);
            setLoading(false);
            return;
          }
          // Example endpoints - adapt to your backend routes
          const [{ data: chap }, { data: list }] = await Promise.all([
            api.get(`manga/${mangaId}/chapters/${chapterId}`),
            api.get(`manga/${mangaId}/chapters/`),
          ]);
          if (!mounted) return;
          setChapter(chap);
          setChaptersList(list || []);
      } catch (err) {
        console.error('Failed to load chapter from API, falling back to local mock if available', err);
        // Provide a graceful local fallback when backend is unavailable.
        // Prefer bundled mock data if present; otherwise surface the error.
        if (mockChapter) {
          // Ensure the mock has pages array
          setChapter({ ...mockChapter, pages: mockChapter.pages || [] });
          setChaptersList(mockList || []);
          setError(null);
        } else {
          setError(err);
        }
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
      <ChapterControls
        chapter={chapter}
        onOpenSettings={() => setShowSettings(true)}
      />
  <ChapterReader pages={chapter.pages || []} mode={readerMode} swipeAxis={swipeAxis} settings={readerSettings} />
      <div className="d-flex justify-content-between align-items-center mt-3">
        <ChapterNav chapters={chaptersList} currentId={chapter.id} onNavigate={(id) => navigate(`/manga/${mangaId}/chapter/${id}`)} />
        <ChapterActions chapter={chapter} mangaId={mangaId} />
      </div>

      {/* Inline full comments section */}
      <div className="mt-4">
        <CommentsPage inline={true} />
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
