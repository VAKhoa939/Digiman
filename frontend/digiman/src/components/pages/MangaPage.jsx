import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Comment from '../smallComponents/Comment';
import { loadComments } from '../../utils/comments';
import DownloadIcon from '@mui/icons-material/Download';
import { addDownload } from '../../utils/downloads';

const MangaPage = ({
  id,
  title = 'Shangri-La Frontier',
  altTitle = 'Kusoge Hunter Kamige ni Idoman to Su',
  author = 'Hiroshi Yagi',
  artist = 'Boichi',
  genres = ['Action', 'Adventure', 'Comedy'],
  status = 'Ongoing',
  // Default to a remote placeholder so the component always displays an image
  // Replace with a local import or a public/ URL in your app as described in the docs below
  coverUrl = 'https://via.placeholder.com/300x450?text=Cover',
  synopsis = 'A high-quality action-comedy about a skilled gamer who specializes in "kusoge" (trash games) and becomes a top player in a brutal VR world.',
  chapters = [],
  onFollowClick,
  // Optional prop: parent can tell whether user is logged in
  isLoggedIn = false,
  // If not logged in parent can provide this to open the login modal
  onRequireLogin,
}) => {
  const navigate = useNavigate();
  const [imgSrc, setImgSrc] = useState(coverUrl);
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    setImgSrc(coverUrl);
  }, [coverUrl]);

  const handleImageError = () => {
    // fallback to a safe remote placeholder if the provided URL fails to load
    setImgSrc('https://via.placeholder.com/300x450?text=No+Cover');
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
              {genres.map((g) => (
                <Link key={g} to={`/search/advanced?genre=${encodeURIComponent(g)}`} className="text-decoration-none">
                  <span className="badge bg-light text-dark me-1">{g}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <button className="btn btn-primary me-2" onClick={() => {
              // Navigate to first chapter if available
              if (chapters && chapters.length > 0) {
                const first = chapters[0];
                const cid = first.id || first.number;
                if (id && cid) navigate(`/manga/${id}/chapter/${cid}`);
              }
            }}>Read</button>
            <button
              className={followed ? 'btn btn-success btn-follow' : 'btn btn-outline-light btn-follow'}
              onClick={(e) => {
                e.preventDefault();
                if (isLoggedIn) {
                  // toggle follow state locally (could call API)
                  setFollowed((f) => !f);
                } else {
                  // if parent provided onRequireLogin use it, otherwise fall back to onFollowClick
                  if (onRequireLogin) onRequireLogin();
                  else if (onFollowClick) onFollowClick();
                }
              }}
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
          <ul className="list-group chapter-list">
            {chapters && chapters.length > 0 ? (
              chapters.map((c) => (
                <li key={c.id || c.number} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold chapter-title"><Link to={`/manga/${id}/chapter/${c.id || c.number}`} className="text-decoration-none text-white">{c.number}. {c.title}</Link></div>
                    <div className="small text-muted">{c.date}</div>
                  </div>
                  <div>
                    <button
                      className="btn btn-sm btn-outline-light d-flex align-items-center"
                      onClick={() => {
                        const entry = {
                          id: `d_${Date.now()}`,
                          mangaId: id || null,
                          chapterId: c.id || c.number,
                          chapterTitle: c.title || `Chapter ${c.number}`,
                          mangaTitle: title || null,
                          status: 'downloading',
                          progress: 0,
                          created_at: new Date().toISOString()
                        }
                        addDownload(entry)
                        navigate('/downloads')
                      }}
                    >
                      <DownloadIcon style={{ fontSize: 16, marginRight: 6 }} />
                      Download
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li className="list-group-item">No chapters found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MangaPage;
