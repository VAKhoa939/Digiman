import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import CircularProgress from '@mui/material/CircularProgress';
import HomeIcon from '@mui/icons-material/Home';
import { startDownload, loadDownloads, listDownloadedChapters, isChapterDownloaded } from '../../utils/downloads';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../smallComponents/Spinner';
import { getTimeAgo } from '../../utils/formatTime';
import CommentsPage from './CommentsPage';
import { markMangaVisited, setStarRating } from '../../services/readerService';
import RecommendationBlock from '../smallComponents/RecommendationBlock';
import { useRecommendations } from '../../customHooks/useHomepage';
import useMangaPage from '../../customHooks/useMangaPage';
import usePremiumModal from '../../customHooks/usePremiumModal';
import PremiumModal from '../smallComponents/PremiumModal';
import { toastError, toastSuccess, toastInfo } from '../../utils/toast';
import { useReport } from '../../customHooks/useReport';
import ReportModal from '../smallComponents/ReportModal';
import Pagination from '../smallComponents/Pagination';

const CHAPTERS_PAGE_SIZE = 20;

const MangaRoute = () => {
  const { mangaId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentChaptersPage = Math.max(1, Number(searchParams.get('chapters_page')) || 1);

  const { 
    mangaData, mangaIsLoading, mangaError,
    genresData, genresIsLoading, genresError,
    chaptersData, chaptersTotal, chaptersPageSize, firstChapterId, chaptersIsLoading, chaptersError
  } = useMangaPage(mangaId, { page: currentChaptersPage, pageSize: CHAPTERS_PAGE_SIZE });

  if (mangaError) return <div className="text-danger">No manga found.</div>;

  return (
    <>
      {mangaIsLoading ? <Spinner /> 
      : <MangaPage
        {...mangaData}
        genres={genresData}
        genresIsLoading={genresIsLoading}
        genresError={genresError}
        chapters={chaptersData}
        chaptersTotal={chaptersTotal}
        chaptersPage={currentChaptersPage}
        chaptersPageSize={chaptersPageSize}
        firstChapterId={firstChapterId}
        chaptersIsLoading={chaptersIsLoading}
        chaptersError={chaptersError}
        averageRating={mangaData.averageRating ?? 0}
        readCount={mangaData.readCount ?? 0}
      />}
    </>
  );
};

const MangaPage = ({
  id, title, altTitle, coverUrl, author, artist, synopsis, status,
  chapterCount, dateUpdated, publicationDate, isPremium,
  averageRating = 0, readCount = 0,
  genres, genresIsLoading, genresError,
  chapters, chaptersTotal = 0, chaptersPage = 1, chaptersPageSize = CHAPTERS_PAGE_SIZE, firstChapterId = null, chaptersIsLoading, chaptersError,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {isAuthenticated, user, subscription} = useAuth();
  const [imgSrc, setImgSrc] = useState(coverUrl);
  const [downloadedSet, setDownloadedSet] = useState(new Set());
  const [statuses, setStatuses] = useState({}); // chapterId -> { status, progress }
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [liveAvgRating, setLiveAvgRating] = useState(averageRating);
  const [liveReadCount, setLiveReadCount] = useState(readCount);

  const { recommendations, recommendationsIsLoading, recommendationsError } = useRecommendations(id);

  const { 
    showPremiumModal, clickedPremiumFeature, 
		onClosePremiumModal, hasPremiumChapterAccess, hasOfflineReadingAccess
  } = usePremiumModal();

  const mangaReport = useReport({ targetContentType: 'manga_title', targetContentId: id });

  useEffect(() => {
    setImgSrc(coverUrl);
  }, [coverUrl]);

  useEffect(() => {
    setLiveAvgRating(averageRating);
    setLiveReadCount(readCount);
  }, [averageRating, readCount]);

  // Mark visited once the manga page mounts (authenticated readers only)
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    markMangaVisited(id).catch(() => {/* silent — non-critical */});
  }, [isAuthenticated, id]);

  const handleStarClick = useCallback(async (star) => {
    if (!isAuthenticated) { requireLogin(); return; }
    try {
      const updated = await setStarRating(id, star);
      setUserRating(star);
      setLiveAvgRating(updated.average_rating ?? liveAvgRating);
      setLiveReadCount(updated.read_count ?? liveReadCount);
      toastSuccess(`Rated ${star} star${star > 1 ? 's' : ''}`);
    } catch (_) {
      toastError('Failed to save rating');
    }
  }, [isAuthenticated, id, liveAvgRating, liveReadCount]);

  useEffect(()=>{
    let mounted = true
    function onDownloadsChanged(){
      (async ()=>{
        try{
          const q = loadDownloads()
          const ns = {}
          // check each chapter individually using isChapterDownloaded for robust detection
          await Promise.all((chapters || []).map(async (c) => {
            try{
              const downloaded = await isChapterDownloaded(id, c.id)
              if (downloaded) ns[c.id] = { status: 'downloaded', progress: 100 }
              else {
                const it = q.find(x => String(x.mangaId) === String(id) && String(x.chapterId) === String(c.id))
                if (it) ns[c.id] = { status: it.status || 'downloading', progress: it.progress || 0 }
                else ns[c.id] = { status: 'idle', progress: 0 }
              }
            }catch(e){ ns[c.id] = { status: 'idle', progress: 0 } }
          }))
          if(!mounted) return
          // rebuild downloadedSet for quick checks elsewhere
          const s = new Set(Object.keys(ns).filter(k => ns[k] && ns[k].status === 'downloaded').map(k => `${id}_${k}`))
          setDownloadedSet(s)
          setStatuses(ns)
        }catch(e){ /* ignore */ }
      })()
    }
    onDownloadsChanged()
    window.addEventListener('digiman:downloadsChanged', onDownloadsChanged)
    return ()=>{ mounted=false; window.removeEventListener('digiman:downloadsChanged', onDownloadsChanged) }
  }, [id, chapters])

  
  const handleImageError = () => {
    // fallback to a safe remote placeholder if the provided URL fails to load
    setImgSrc('https://via.placeholder.com/300x450?text=No+Cover');
  };


  const onDownloadClick = (e, chapter) => {
    e.preventDefault();
    // If user not authenticated, require login first
    if (!isAuthenticated) { requireLogin(); return; }

    // Check subscription access
    if (!hasOfflineReadingAccess(subscription)) return;

    // optimistically mark as downloading
    console.log('MangaPage: download clicked', { mangaId: id, chapterId: chapter.id });
    setStatuses(s => ({ ...s, [chapter.id]: { status: 'downloading', progress: 0 } }));
    toastInfo('Download queued');
    startDownload(id, chapter.id, { chapterTitle: chapter.title || `Chapter ${chapter.number}`, mangaTitle: title })
      .then(() => {
        try{ window.dispatchEvent(new CustomEvent('digiman:downloadsChanged')) }catch(_){ }
        navigate('/downloads');
      })
      .catch((err) => {
        console.warn('startDownload failed (manga page)', err);
        toastError('Failed to start download');
      })
  }


  // Helper: call parent login handler if provided, otherwise navigate to login route
  const requireLogin = () => {
    try { navigate('/login', { state: { background: location } }); } catch (_) { /* ignore */ }
  };


  const onChapterClick = (e, chapter) => {
    e.preventDefault();

    // Determine the URL based on the chapter's download status
    const url = statuses[chapter.id] && statuses[chapter.id].status === 'downloaded'
      ? `/offline/mangas/${id}/chapter/${chapter.id}`
      : `/manga/${id}/chapter/${chapter.id}`;

    // Check authentication
    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    // Check subscription access
    if (!hasPremiumChapterAccess(subscription, chapter)) return;
    navigate(url);
  };

  return (
    <div className="manga-page container py-4">
      <div className="row">
        <div className="col-md-3 text-center">
          <img
            src={imgSrc}
            alt={`${title} cover`}
            className="img-fluid rounded manga-cover mb-3"
            onError={handleImageError}
          />
        </div>
        <div className="col-md-9">
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="manga-title">{title}</h1>
            {isAuthenticated && id && (
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-muted"
                title="Report this manga"
                onClick={mangaReport.openReport}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12 12 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A20 20 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a20 20 0 0 0 1.349-.476l.019-.007.004-.002h.001"/>
                </svg>
              </button>
            )}
          </div>
          
          {altTitle && <div className="text-muted small mb-2">{altTitle}</div>}

          <div className="d-flex align-items-center gap-3 mb-2">
            <span className="manga-rating-display">
              {'★'.repeat(Math.round(liveAvgRating))}{'☆'.repeat(5 - Math.round(liveAvgRating))}
              <span className="manga-rating-score">
                {liveAvgRating > 0 ? liveAvgRating.toFixed(1) : 'No ratings'}
              </span>
            </span>
            <span className="text-muted small">{liveReadCount} reads</span>
          </div>

          {isAuthenticated && (
            <div className="d-flex align-items-center mb-2">
              <span className="text-muted small me-2">Your rating:</span>
              {[1, 2, 3, 4, 5].map(star => (
                <span
                  key={star}
                  role="button"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={`rating-star ${star <= (hoverRating || userRating) ? 'active' : ''}`}
                >
                  ★
                </span>
              ))}
            </div>
          )}

          <div className="manga-meta d-flex flex-wrap align-items-center mb-3">
            <span className="badge bg-secondary me-2">{status}</span>
            {isPremium && <span className="badge bg-warning text-dark me-1">Premium</span>}
            <div className="me-3">Author: <strong>{author}</strong></div>
            <div className="me-3">Artist: <strong>{artist}</strong></div>
            <div className="genres">
              {genresIsLoading && <Spinner />}
              {genresError ? <div className="text-danger">Error loading genres.</div>:
              (genres && genres.length > 0 ? genres.map((g) => (
                <Link key={g.id} to={'#'/*`/search/advanced?genre=${encodeURIComponent(g)}`*/} 
                  className="text-decoration-none"
                >
                  <span className="badge bg-light text-dark border me-1">{g.name}</span>
                </Link>
              )) : <span className="text-muted">No genres added.</span>)}
            </div>
          </div>

          <div className="mb-3">
            {/* Read button */}
            { !isAuthenticated ? (
              <div className="tooltip-wrapper">
                <button
                  className="btn btn-primary me-2"
                  onClick={() => { /* guests: do nothing, require login shown via tooltip */ }}
                  aria-disabled={true}
                  disabled={true}
                >Read</button>
                <span className="tooltip-text">Login required</span>
              </div>
            ) : (
              <button
                className="btn btn-primary me-2"
                onClick={() => {
                  if (chapterCount > 0 && firstChapterId) navigate(`/manga/${id}/chapter/${firstChapterId}`);
                  else try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'info', message: 'No chapters available' } })); }catch(_){ }
                }}
              >Read</button>
            )}
          </div>

          <div className="manga-synopsis">
            <h5 className="mb-2">Description</h5>
            <p className="mb-0">{synopsis}</p>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <h4 className="mb-3">Chapters</h4>
          {chaptersIsLoading && <Spinner />}
          {chaptersError ? <div className="text-danger">Error loading chapters.</div> :
          (<ul className="list-group chapter-list">
            {chapters && chapters.length > 0 ? (
              chapters.map((c) => (
                <li key={c.id} 
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  {/* Chapter info */}
                  <div>
                    <div className="chapter-title">
                      <span
                        role="button"
                        className="fw-bold cursor-pointer"
                        onClick={(e) => onChapterClick(e, c)}
                      >{c.title ? `Chapter ${c.number}: ${c.title}` : `Chapter ${c.number}`}
                      </span>
                    </div>
                    <div className="small text-muted">{getTimeAgo(c.date)}</div>
                    {(c.isPremium) ?
                      <span className="badge bg-warning text-dark">Premium</span>
                      : <span className="badge">Free</span>
                    }
                  </div>
                  {/* Download button */}
                  <div>
                    {statuses[c.id] && statuses[c.id].status === 'downloaded' ? (
                      <button className="btn btn-sm btn-success d-flex align-items-center" disabled>
                        <CheckIcon style={{ fontSize: 16, marginRight: 6 }} />
                        Downloaded
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-light d-flex align-items-center"
                        onClick={(e) => onDownloadClick(e, c)}
                        disabled={statuses[c.id] && statuses[c.id].status === 'downloading'}
                        title={!isAuthenticated ? 'Login required' : ''}
                      >
                        {statuses[c.id] && statuses[c.id].status === 'downloading' ? (
                          <>
                            <CircularProgress size={16} thickness={5} style={{ marginRight: 6 }} />
                            Downloading{statuses[c.id].progress ? ` ${statuses[c.id].progress}%` : ''}
                          </>
                        ) : (
                          <>
                            <DownloadIcon style={{ fontSize: 16, marginRight: 6 }} />
                            Download
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </li>
              ))
            ) : <li className="list-group-item text-muted">No chapters found.</li>}
          </ul>)}
          <Pagination
            total={chaptersTotal}
            page={chaptersPage}
            pageSize={chaptersPageSize}
            pageParam="chapters_page"
            pageSizeParam="chapters_page_size"
            manageHeadLinks={false}
          />
        </div>
      </div>
      {/* You might also like */}
      <RecommendationBlock
        title="You Might Also Like"
        subtitle={title ? `Similar to "${title}"` : null}
        items={recommendations}
        isLoading={recommendationsIsLoading}
        error={recommendationsError}
      />

      {/* Inline full comments section */}
      <div className="mt-4">
        <CommentsPage inline={true} />
      </div>

      {/* Premium feature access modal */}
      <PremiumModal
        showPremiumModal={showPremiumModal}
        clickedPremiumFeature={clickedPremiumFeature}
        onClosePremiumModal={onClosePremiumModal}
      />
      <ReportModal
        show={mangaReport.show}
        onClose={mangaReport.closeReport}
        onSubmit={mangaReport.handleSubmit}
        loading={mangaReport.loading}
        error={mangaReport.error}
        success={mangaReport.success}
        categories={mangaReport.categories}
      />
    </div>
  );
};

export default MangaRoute;
