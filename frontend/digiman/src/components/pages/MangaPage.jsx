import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import CircularProgress from '@mui/material/CircularProgress';
import HomeIcon from '@mui/icons-material/Home';
import { startDownload, loadDownloads, listDownloadedChapters, isChapterDownloaded } from '../../utils/downloads';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../smallComponents/Spinner';
import { getTimeAgo } from '../../utils/formatTime';
import CommentsPage from './CommentsPage';

const MangaPage = ({
  id, title, altTitle, coverUrl, author, artist, synopsis, status, 
  chapterCount, dateUpdated, publicationDate, previewChapterId,
  genres, genresIsLoading, genresError,
  chapters, chaptersIsLoading, chaptersError,
  // If not logged in parent can provide this to open the login modal
  onRequireLogin,
}) => {
  const navigate = useNavigate();
  const {isAuthenticated} = useAuth();
  const [imgSrc, setImgSrc] = useState(coverUrl);
  const [followed, setFollowed] = useState(false);
  const [downloadedSet, setDownloadedSet] = useState(new Set())
  const [statuses, setStatuses] = useState({}) // chapterId -> { status, progress }

  useEffect(() => {
    setImgSrc(coverUrl);
  }, [coverUrl]);

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

  const onFollowClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      // toggle follow state locally (could call API)
      setFollowed(!followed);
    } else {
      onRequireLogin();
    }
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
          <h1 className="manga-title mb-1">{title}</h1>
          
          {altTitle && <div className="text-muted small mb-2">{altTitle}</div>}

          <div className="manga-meta d-flex flex-wrap align-items-center mb-3">
            <span className="badge bg-secondary me-2">{status}</span>
            <div className="me-3">Author: <strong>{author}</strong></div>
            <div className="me-3">Artist: <strong>{artist}</strong></div>
            <div className="genres">
              {genresIsLoading && <Spinner />}
              {genresError ? <div className="text-danger">Error loading genres.</div>:
              (genres && genres.length > 0 ? genres.map((g) => (
                <Link key={g.id} to={'#'/*`/search/advanced?genre=${encodeURIComponent(g)}`*/} 
                  className="text-decoration-none"
                >
                  <span className="badge bg-light text-dark me-1">{g.name}</span>
                </Link>
              )) : <span className="text-muted">No genres added.</span>)}
            </div>
          </div>

          <div className="mb-3">
            <button className="btn btn-primary me-2" onClick={() => {
              // Navigate to first chapter if available
              if (chapterCount > 0) navigate(`/manga/${id}/chapter/${chapters[0].id}`);
              else alert('No chapters available');
            }}>Read</button>
            <button
              className={followed ? 'btn btn-success btn-follow' : 'btn btn-outline-light btn-follow'}
              onClick={onFollowClick}
            >
              {followed ? 'Following' : 'Follow'}
            </button>
          </div>

          <div className="manga-synopsis bg-dark p-3 rounded text-white-50">
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
                  <div>
                    <div className="fw-bold chapter-title">
                      <Link to={statuses[c.id] && statuses[c.id].status === 'downloaded' ? `/offline/mangas/${id}/chapter/${c.id}` : `/manga/${id}/chapter/${c.id}`} 
                        className="text-decoration-none text-white"
                      >{c.title ? `${c.number}. ${c.title}` : `${c.number}. Chapter ${c.number}`}
                      </Link>
                    </div>
                    <div className="small text-muted">{getTimeAgo(c.date)}</div>
                  </div>
                  <div>
                    {statuses[c.id] && statuses[c.id].status === 'downloaded' ? (
                      <button className="btn btn-sm btn-success d-flex align-items-center" disabled>
                        <CheckIcon style={{ fontSize: 16, marginRight: 6 }} />
                        Downloaded
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-light d-flex align-items-center"
                        onClick={() => {
                          // optimistically mark as downloading
                          console.log('MangaPage: download clicked', { mangaId: id, chapterId: c.id });
                          setStatuses(s => ({ ...s, [c.id]: { status: 'downloading', progress: 0 } }))
                          try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'info', message: 'Download queued' } })) }catch(_){ }
                          startDownload(id, c.id, { chapterTitle: c.title || `Chapter ${c.number}`, mangaTitle: title })
                            .then(() => {
                              try{ window.dispatchEvent(new CustomEvent('digiman:downloadsChanged')) }catch(_){ }
                              navigate('/downloads')
                            })
                            .catch((err) => {
                              console.warn('startDownload failed (manga page)', err)
                              try{ window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: 'Failed to start download' } })) }catch(_){ }
                              navigate('/downloads')
                            })
                        }}
                        disabled={statuses[c.id] && statuses[c.id].status === 'downloading'}
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
        </div>
      </div>
      {/* Inline full comments section */}
      <div className="mt-4">
        <CommentsPage inline={true} />
      </div>
    </div>
  );
};

export default MangaPage;
