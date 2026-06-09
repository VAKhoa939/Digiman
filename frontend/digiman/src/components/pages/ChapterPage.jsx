import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Spinner from '../smallComponents/Spinner';
import ChapterMeta from '../chapterComponents/ChapterMeta';
import ChapterControls from '../chapterComponents/ChapterControls';
import ChapterReader from '../chapterComponents/ChapterReader';
import ChapterNav from '../chapterComponents/ChapterNav';
import ChapterActions from '../chapterComponents/ChapterActions';
import CommentsPage from './CommentsPage';
import ReaderSettings from '../chapterComponents/ReaderSettings';
import useChapterPage from '../../customHooks/useChapterPage';
import { useAuth } from '../../context/AuthContext';
import { saveReadingProgress } from '../../services/readerService';
import usePremiumModal from '../../customHooks/usePremiumModal';
import PremiumModal from '../smallComponents/PremiumModal';
import { useReport } from '../../customHooks/useReport';
import ReportModal from '../smallComponents/ReportModal';

export default function ChapterPage() {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, subscription } = useAuth();
  
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

  const { 
    showPremiumModal, clickedPremiumFeature, 
    hasPremiumChapterAccess, hasOfflineReadingAccess, onClosePremiumModal 
  } = usePremiumModal();

  const chapterReport = useReport({ targetContentType: 'chapter', targetContentId: chapterId });

  // Save reading progress once the chapter data is loaded (authenticated readers only).
  // This also triggers the backend signal that marks is_reader_visited and is_reader_read.
  useEffect(() => {
    if (!isAuthenticated || !chapterId || loading || !chapter) return;
    saveReadingProgress(chapterId).catch(() => {/* silent — non-critical */});
  }, [isAuthenticated, chapterId, loading, chapter]);

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
      <div className="d-flex align-items-center justify-content-between mb-2">
        <ChapterMeta chapter={chapter} />
        {isAuthenticated && chapterId && (
          <button
            type="button"
            className="btn btn-sm btn-link p-0 text-muted"
            title="Report this chapter"
            onClick={chapterReport.openReport}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12 12 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A20 20 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a20 20 0 0 0 1.349-.476l.019-.007.004-.002h.001"/>
            </svg>
          </button>
        )}
      </div>
      <ChapterControls
        prevChapterId={chapter.prevChapterId}
        nextChapterId={chapter.nextChapterId}
        onNavigate={(id) => navigate(`/manga/${mangaId}/chapter/${id}`)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ChapterReader pages={chapter.pages || []} mode={readerMode} swipeAxis={swipeAxis} settings={readerSettings} />
      <div className="d-flex justify-content-between align-items-center mt-3">
        <ChapterNav  
          chapters={chaptersList} 
          currentId={chapter.id} 
          onNavigate={(id) => navigate(`/manga/${mangaId}/chapter/${id}`)} 
          subscription={subscription}
          hasPremiumChapterAccess={hasPremiumChapterAccess}
        />
        <ChapterActions 
          chapter={chapter} 
          mangaId={mangaId} 
          subscription={subscription}
          hasOfflineReadingAccess={hasOfflineReadingAccess}
        />
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

      <PremiumModal
        showPremiumModal={showPremiumModal}
        clickedPremiumFeature={clickedPremiumFeature}
        onClosePremiumModal={onClosePremiumModal}
      />
      <ReportModal
        show={chapterReport.show}
        onClose={chapterReport.closeReport}
        onSubmit={chapterReport.handleSubmit}
        loading={chapterReport.loading}
        error={chapterReport.error}
        success={chapterReport.success}
        categories={chapterReport.categories}
      />
    </div>
  );
}
