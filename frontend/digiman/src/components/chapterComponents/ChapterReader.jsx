import React, { useState, useEffect, useCallback, useRef } from 'react';
import ImageWithFallback from './ImageWithFallback';

// ChapterReader now supports pageDisplay modes and readingDirection.
export default function ChapterReader({ pages = [], mode = 'vertical', swipeAxis = 'vertical', startIndex = 0, onPageChange, settings = {} }) {
  const { pageDisplay = 'single', readingDirection = 'rtl', imageFit = 'both', progressBar = true, progressPosition = 'bottom' } = settings || {};

  // order pages according to reading direction
  const orderedPages = (readingDirection === 'rtl') ? [...pages].slice().reverse() : pages;

  // helper to render fallback message
  if (!orderedPages || orderedPages.length === 0) return <div className="py-4">No pages to display.</div>;

  // ---------- continuous long strip (vertical)
  if (pageDisplay === 'long_strip') {
    return (
      <div className="chapter-reader-vertical">
        {orderedPages.map((p, i) => (
          <div key={i} className="mb-3">
            <ImageWithFallback src={p.url} alt={p.alt || `Page ${i + 1}`} className="img-fluid" fit={imageFit} />
          </div>
        ))}
      </div>
    );
  }

  // ---------- continuous wide strip (horizontal scroll)
  if (pageDisplay === 'wide_strip') {
    return (
      <div className="chapter-reader-wide-strip overflow-auto" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        <div className="d-flex gap-3" style={{ whiteSpace: 'nowrap' }}>
          {orderedPages.map((p, i) => (
            <div key={i} className="d-inline-block" style={{ flex: '0 0 auto', scrollSnapAlign: 'center' }}>
              <ImageWithFallback src={p.url} alt={p.alt || `Page ${i + 1}`} className="img-fluid" fit={imageFit} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Determine effective mode from explicit mode and pageDisplay setting.
  // If the user selected a paged pageDisplay (single/double), treat reader as paged regardless
  // of the `mode` prop so pageDisplay controls take precedence.
  const effectiveMode = (pageDisplay === 'single' || pageDisplay === 'double') ? 'paged' : mode;

  // For paged behaviors (single/double), derive frames when needed
  const makeFrames = (arr, perFrame = 1) => {
    const frames = [];
    for (let i = 0; i < arr.length; i += perFrame) {
      frames.push(arr.slice(i, i + perFrame));
    }
    return frames;
  };

  const perFrame = (pageDisplay === 'double') ? 2 : 1;
  const frames = makeFrames(orderedPages, perFrame);

  // frame index state
  const [frameIndex, setFrameIndex] = useState(startIndex || 0);
  useEffect(() => { if (onPageChange) onPageChange(frameIndex); }, [frameIndex]);

  const next = useCallback(() => setFrameIndex(i => Math.min(i + 1, frames.length - 1)), [frames.length]);
  const prev = useCallback(() => setFrameIndex(i => Math.max(i - 1, 0)), [frames.length]);

  // keyboard navigation for paged mode
  useEffect(() => {
    function handler(e) {
      if (effectiveMode !== 'paged') return;
      // Arrow keys: respect reading direction. For RTL, Left arrow => next.
      const isRTL = readingDirection === 'rtl';
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (!isRTL) next(); else prev();
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (!isRTL) prev(); else next();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [effectiveMode, next, prev]);

  // touch swipe handlers for paged mode (supports vertical or horizontal axis)
  const touchStart = useRef({ x: null, y: null });
  const touchCurrent = useRef({ x: null, y: null });
  const SWIPE_THRESHOLD = 50; // px

  const onTouchStart = (e) => {
    if (effectiveMode !== 'paged') return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    touchStart.current.x = t.clientX;
    touchStart.current.y = t.clientY;
    touchCurrent.current.x = t.clientX;
    touchCurrent.current.y = t.clientY;
  };

  const onTouchMove = (e) => {
    if (effectiveMode !== 'paged') return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    touchCurrent.current.x = t.clientX;
    touchCurrent.current.y = t.clientY;
    const dx = touchCurrent.current.x - (touchStart.current.x || 0);
    const dy = touchCurrent.current.y - (touchStart.current.y || 0);
    const primary = swipeAxis === 'horizontal' ? dx : dy;
    if (Math.abs(primary) > 10) {
      try { e.preventDefault(); } catch (err) { }
    }
  };

  const onTouchEnd = () => {
    if (effectiveMode !== 'paged' || touchStart.current.x == null) return;
    const dx = (touchStart.current.x || 0) - (touchCurrent.current.x || 0);
    const dy = (touchStart.current.y || 0) - (touchCurrent.current.y || 0);
    if (swipeAxis === 'horizontal') {
      if (dx > SWIPE_THRESHOLD) next();
      else if (dx < -SWIPE_THRESHOLD) prev();
    } else {
      if (dy > SWIPE_THRESHOLD) next();
      else if (dy < -SWIPE_THRESHOLD) prev();
    }
    touchStart.current.x = null;
    touchStart.current.y = null;
    touchCurrent.current.x = null;
    touchCurrent.current.y = null;
  };

  // Render paged
  if (effectiveMode === 'paged') {
    // horizontal paged track
    if (swipeAxis === 'horizontal') {
      return (
        <div
          className="chapter-reader-paged chapter-reader-horizontal"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="chapter-reader-track" style={{ transform: `translateX(-${frameIndex * 100}vw)` }}>
            {frames.map((frame, fi) => (
              <div key={fi} className="chapter-reader-page d-flex justify-content-center align-items-start gap-3" style={{ width: '100vw', padding: '1rem' }}>
                {frame.map((p, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <ImageWithFallback src={p.url} alt={p.alt || `Page ${fi * perFrame + i + 1}`} className="img-fluid" fit={imageFit} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-between align-items-center mt-2">
            <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={prev} disabled={frameIndex === 0}>Prev</button>
            <div className="text-muted">Frame {frameIndex + 1} / {frames.length} ({pages.length} pages)</div>
            <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={next} disabled={frameIndex === frames.length - 1}>Next</button>
          </div>

          {progressBar && (
            <div className={`reader-progress mt-2 ${progressPosition === 'bottom' ? '' : 'position-static'}`} aria-hidden>
              <div className="reader-progress-bar" style={{ width: `${((frameIndex + 1) / frames.length) * 100}%` }} />
            </div>
          )}
        </div>
      );
    }

    // vertical single/double paged
    const currentFrame = frames[frameIndex];
    return (
      <div
        className="chapter-reader-paged text-center"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="d-flex justify-content-between mb-2">
          <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={prev} disabled={frameIndex === 0}>Prev</button>
          <div className="text-muted">Frame {frameIndex + 1} / {frames.length} ({pages.length} pages)</div>
          <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={next} disabled={frameIndex === frames.length - 1}>Next</button>
        </div>

        <div className="d-flex justify-content-center gap-3 mb-2">
          {currentFrame.map((p, i) => (
            <div key={i} style={{ flex: 1 }}>
              <ImageWithFallback src={p.url} alt={p.alt || `Page ${frameIndex * perFrame + i + 1}`} className="img-fluid" fit={imageFit} />
            </div>
          ))}
        </div>

        {progressBar && (
          <div className="reader-progress mt-2" aria-hidden>
            <div className="reader-progress-bar" style={{ width: `${((frameIndex + 1) / frames.length) * 100}%` }} />
          </div>
        )}
      </div>
    );
  }

  // fallback: treat as continuous vertical
  return (
    <div className="chapter-reader-vertical">
      {orderedPages.map((p, i) => (
        <div key={i} className="mb-3">
          <ImageWithFallback src={p.url} alt={p.alt || `Page ${i + 1}`} className="img-fluid" fit={imageFit} />
        </div>
      ))}
    </div>
  );
}
