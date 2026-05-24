import React, { useEffect, useState } from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate } from 'react-router-dom';
import { startDownload, isChapterDownloaded, loadDownloads, removeDownloadedChapter, getDownloadedChapterSize, removeDownload } from '../../utils/downloads';
import CheckIcon from '@mui/icons-material/Check';
import CircularProgress from '@mui/material/CircularProgress';
import { toastError, toastInfo } from '../../utils/toast';

export default function ChapterActions({ 
  chapter, 
  mangaId,
  subscription,
  hasOfflineReadingAccess = () => false,
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle | downloading | downloaded | failed
  const [progress, setProgress] = useState(0);

  async function refreshStatus() {
    try{
      const exists = await isChapterDownloaded(mangaId, chapter?.id)
      if (exists) { setStatus('downloaded'); setProgress(100); return }
    }catch(_){ }

    // check queue for any in-progress or failed entries
    try{
      const q = loadDownloads();
      const it = q.find(x => String(x.mangaId) === String(mangaId) && String(x.chapterId) === String(chapter?.id));
      if (it) {
        setStatus(it.status || 'downloading');
        setProgress(it.progress || 0);
        return;
      }
    }catch(_){}

    setStatus('idle');
    setProgress(0);
  }

  useEffect(() => {
    refreshStatus();
    function onChange(){ refreshStatus(); }
    window.addEventListener('digiman:downloadsChanged', onChange);
    return () => window.removeEventListener('digiman:downloadsChanged', onChange);
  }, [mangaId, chapter?.id]);

  function handleDownload() {
    // Check subscription access
    if (!hasOfflineReadingAccess(subscription)) return;

    // Start backend download which will enqueue and fetch the chapter.
    setStatus('downloading');
    console.log('ChapterActions: download clicked', { mangaId, chapterId: chapter?.id });
    try{
      // immediate user feedback that download was queued
      toastInfo('Download queued');
      startDownload(mangaId, chapter?.id || null, { chapterTitle: chapter?.title, mangaTitle: null })
        .then(()=> {
          // navigation to downloads page; UI will update via event listener
          try{ window.dispatchEvent(new CustomEvent('digiman:downloadsChanged')) }catch(_){ }
          refreshStatus();
          navigate('/downloads');
        })
        .catch((err)=> {
          console.warn('startDownload failed (chapter)', err);
          setStatus('failed');
          try{ window.dispatchEvent(new CustomEvent('digiman:downloadsChanged')) }catch(_){ }
          toastError('Failed to start download');
          navigate('/downloads');
        })
    }catch(err){
      console.error('handleDownload unexpected error', err);
      setStatus('failed');
    }
  }

  return (
    <div className="chapter-actions d-flex gap-2">
      {status === 'downloaded'? (
        <>
          <button className="btn btn-sm btn-success d-flex align-items-center" disabled>
            <CheckIcon style={{ fontSize: 18, marginRight: 6 }} />
            Downloaded
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={async ()=>{
            try{
              const bytes = await getDownloadedChapterSize(mangaId, chapter?.id)
              const human = (function(b){ if(!b) return '0 B'; const u=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return `${(b/Math.pow(1024,i)).toFixed(i===0?0:2)} ${u[i]}` })(bytes)
              if (!window.confirm(`Remove downloaded chapter "${chapter?.title || chapter?.id}" (${human})?`)) return
              await removeDownloadedChapter(mangaId, chapter?.id)
              // remove any queue entry metadata
              try{ const q = loadDownloads(); const it = q.find(x=>String(x.mangaId)===String(mangaId) && String(x.chapterId)===String(chapter?.id)); if(it) removeDownload(it.id) }catch(_){ }
              try{ window.dispatchEvent(new CustomEvent('digiman:downloadsChanged')) }catch(_){ }
              refreshStatus()
            }catch(e){ 
              console.error('remove downloaded failed', e); 
              toastError('Failed to remove download');
            }
          }}>Remove</button>
        </>
      ) : (
        <button disabled={status === 'downloading'} className="btn btn-sm btn-outline-light d-flex align-items-center" onClick={handleDownload}>
          {status === 'downloading' ? (
            <>
              <CircularProgress size={16} thickness={5} style={{ marginRight: 6 }} />
              Downloading{progress ? ` ${progress}%` : ''}
            </>
          ) : (
            <>
              <DownloadIcon style={{ fontSize: 18, marginRight: 6 }} />
              Download
            </>
          )}
        </button>
      )}
    </div>
  );
}
