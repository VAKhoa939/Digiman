import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Spinner from '../smallComponents/Spinner';
import ChapterMeta from '../chapterComponents/ChapterMeta';
import ChapterControls from '../chapterComponents/ChapterControls';
import ChapterReader from '../chapterComponents/ChapterReader';
import ChapterNav from '../chapterComponents/ChapterNav';
import ChapterActions from '../chapterComponents/ChapterActions';
import CommentsPage from './CommentsPage';
import ReaderSettings from '../chapterComponents/ReaderSettings';
import useChapterPage from '../../customHooks/useChapterPage';

export default function ChapterPage() {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  
  const [readerMode, setReaderMode] = useState('vertical'); // reader mode state: 'vertical' (continuous) or 'paged'
  const [swipeAxis, setSwipeAxis] = useState('vertical'); // swipe axis state: 'vertical' (up/down) or 'horizontal' (left/right)

  const [showSettings, setShowSettings] = useState(false);
  const [readerSettings, setReaderSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('readerSettings');
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  });

  const { chapter, chaptersList, loading, error } = useChapterPage(chapterId, mangaId);

  // initialize readerMode/swipeAxis from persisted settings
  useEffect(() => {
    if (readerSettings && Object.keys(readerSettings).length) {
      setReaderMode(readerSettings.enablePaged ? 'paged' : 'vertical');
      setSwipeAxis(readerSettings.swipeAxis || 'vertical');
    }
  }, []);

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
        prevChapterId={chapter.prevChapterId}
        nextChapterId={chapter.nextChapterId}
        onNavigate={(id) => navigate(`/manga/${mangaId}/chapter/${id}`)}
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
