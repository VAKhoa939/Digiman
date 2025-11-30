import React, { useState, useEffect, useCallback, useRef } from 'react';
import ImageWithFallback from './ImageWithFallback';

// ChapterReader now supports pageDisplay modes and readingDirection.
export default function ChapterReader({
  pages = [],
  mode = 'vertical',
  swipeAxis = 'vertical',
  startIndex = 0,
  onPageChange,
  settings = {}
}) {
  const {
    pageDisplay = 'single',
    readingDirection = 'ltr', // 'ltr' or 'rtl'
    imageFit = 'both',
    progressBar = true,
    progressPosition = 'bottom',
    // rtlMode: 'mangadex' -> start at last page and navigate backwards
    // 'simple' -> only swap button positions, keep normal navigation
    rtlMode = 'mangadex',
    // (legacy) reversePages removed; we derive reversal from readingDirection
  } = settings || {};

  const isRTL = readingDirection === 'rtl';
  const isMangadexRTL = isRTL && rtlMode === 'mangadex';
  const isSimpleRTL = isRTL && rtlMode === 'simple';
  const shouldReverse = isSimpleRTL; // only simple RTL reverses the display order

  // helper to render fallback message
  if (!pages || pages.length === 0) return <div className="py-4">No pages to display.</div>;

  // ---------- continuous long strip (vertical)
  if (pageDisplay === 'long_strip') {
    const ordered = shouldReverse ? [...pages].reverse() : pages;
    return (
      <div className="chapter-reader-vertical">
        {ordered.map((p, i) => (
          <div key={i} className="mb-3">
            <ImageWithFallback src={p.url} alt={p.alt || `Page ${i + 1}`} className="img-fluid" fit={imageFit} />
          </div>
        ))}
      </div>
    );
  }

  // ---------- continuous wide strip (horizontal scroll)
  if (pageDisplay === 'wide_strip') {
    const ordered = shouldReverse ? [...pages].reverse() : pages;
    return (
      <div className="chapter-reader-wide-strip overflow-auto" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        <div className="d-flex gap-3" style={{ whiteSpace: 'nowrap' }}>
          {ordered.map((p, i) => (
            <div key={i} className="d-inline-block" style={{ flex: '0 0 auto', scrollSnapAlign: 'center' }}>
              <ImageWithFallback src={p.url} alt={p.alt || `Page ${i + 1}`} className="img-fluid" fit={imageFit} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Determine effective mode from explicit mode and pageDisplay setting.
  const effectiveMode = (pageDisplay === 'single' || pageDisplay === 'double') ? 'paged' : mode;

  // For paged behaviors (single/double), create frames
  const makeFrames = (arr, perFrame = 1) => {
    const frames = [];
    for (let i = 0; i < arr.length; i += perFrame) {
      const frame = arr.slice(i, i + perFrame);
      // For double-page RTL display we may want the right page first visually
      if (perFrame === 2 && isRTL && frame.length === 2) {
        frames.push([frame[1], frame[0]]);
      } else {
        frames.push(frame);
      }
    }
    return frames;
  };

  const perFrame = (pageDisplay === 'double') ? 2 : 1;
  const frames = makeFrames(pages, perFrame);

  // Build frames in display order.
  // - 'simple' RTL reverses frame order so navigation can remain normal
  // - 'mangadex' RTL keeps frame order but will reverse navigation semantics
  const displayFrames = shouldReverse ? [...frames].reverse() : frames;

  // Start index: map provided startIndex to displayFrames if needed.
  const normalizedStart = (() => {
    // Treat only null/undefined as "no startIndex provided" so 0 is valid.
    if (startIndex == null) {
      // default: for mangadex RTL start at last frame, otherwise at first
      return isMangadexRTL ? Math.max(0, frames.length - 1) : 0;
    }
    // startIndex was given in logical frame order (0..frames.length-1).
    if (isMangadexRTL) {
      // For mangadex RTL the initial display index should point to the mapped frame
      const mapped = frames.length - 1 - startIndex;
      return Math.max(0, Math.min(mapped, frames.length - 1));
    }
    // For simple RTL we reversed displayFrames above and map accordingly
    if (!shouldReverse) return Math.min(startIndex, displayFrames.length - 1);
    const mapped = frames.length - 1 - startIndex;
    return Math.max(0, Math.min(mapped, displayFrames.length - 1));
  })();

  const [frameIndex, setFrameIndex] = useState(normalizedStart);

  useEffect(() => { if (onPageChange) onPageChange(frameIndex); }, [frameIndex, onPageChange]);

  // Navigation functions operate on displayFrames, but for mangadex RTL
  // the semantic "next" should move to an earlier frame (index - 1).
  const next = useCallback(() => {
    if (isMangadexRTL) {
      setFrameIndex(i => Math.max(i - 1, 0));
    } else {
      setFrameIndex(i => Math.min(i + 1, displayFrames.length - 1));
    }
  }, [displayFrames.length, isMangadexRTL]);

  const prev = useCallback(() => {
    if (isMangadexRTL) {
      setFrameIndex(i => Math.min(i + 1, displayFrames.length - 1));
    } else {
      setFrameIndex(i => Math.max(i - 1, 0));
    }
  }, [displayFrames.length, isMangadexRTL]);

  // keyboard navigation for paged mode
  useEffect(() => {
    function handler(e) {
      if (effectiveMode !== 'paged') return;
      // Map arrows to user-expected direction:
      // LTR: Right = next, Left = prev
      // Mangadex RTL: Left = next, Right = prev
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (isMangadexRTL) prev(); else next();
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (isMangadexRTL) next(); else prev();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [effectiveMode, next, prev, isRTL]);

  // touch swipe handlers for paged mode
  const touchStart = useRef({ x: null, y: null });
  const touchCurrent = useRef({ x: null, y: null });
  const SWIPE_THRESHOLD = 50;

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
      // dx > 0 => finger moved left (typical LTR next). For RTL we invert mapping.
      if (dx > SWIPE_THRESHOLD) {
        isRTL ? prev() : next();
      } else if (dx < -SWIPE_THRESHOLD) {
        isRTL ? next() : prev();
      }
    } else {
      // Vertical: swipe up/down -> next/prev (keep same)
      if (dy > SWIPE_THRESHOLD) next();
      else if (dy < -SWIPE_THRESHOLD) prev();
    }

    touchStart.current.x = null;
    touchStart.current.y = null;
    touchCurrent.current.x = null;
    touchCurrent.current.y = null;
  };

  // Edge click handlers: clicking on left/right edge should act like arrow keys
  const onLeftEdgeClick = useCallback(() => {
    // left-edge behaves like ArrowLeft press: for mangadex RTL, left = next
    if (isMangadexRTL) next(); else prev();
  }, [isMangadexRTL, next, prev]);

  const onRightEdgeClick = useCallback(() => {
    // right-edge behaves like ArrowRight press: for mangadex RTL, right = prev
    if (isMangadexRTL) prev(); else next();
  }, [isMangadexRTL, next, prev]);

  // Check if at boundaries
  const isAtStart = frameIndex === 0;
  const isAtEnd = frameIndex === displayFrames.length - 1;

  // Render paged - horizontal paged track
  if (effectiveMode === 'paged' && swipeAxis === 'horizontal') {
    return (
      <div
        className="chapter-reader-paged chapter-reader-horizontal"
        style={{ position: 'relative' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Left/Right edge hotspots */}
        <div
          onClick={onLeftEdgeClick}
          role="button"
          aria-label="Left page edge"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '18%', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto', background: 'linear-gradient(90deg, rgba(0,0,0,0.06), transparent)' }}
        >
          <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>{isMangadexRTL ? '›' : '‹'}</div>
        </div>
        <div
          onClick={onRightEdgeClick}
          role="button"
          aria-label="Right page edge"
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '18%', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto', background: 'linear-gradient(270deg, rgba(0,0,0,0.06), transparent)' }}
        >
          <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>{isMangadexRTL ? '‹' : '›'}</div>
        </div>
        <div className="chapter-reader-track" style={{ transform: `translateX(-${frameIndex * 100}vw)` }}>
          {displayFrames.map((frame, fi) => (
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
          {/* Swap button positions visually for RTL, labels remain semantic */}
          {isRTL ? (
            <>
              <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={next} disabled={isAtEnd}>Next</button>
              <div className="text-muted">Frame {frameIndex + 1} / {displayFrames.length} ({pages.length} pages)</div>
              <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={prev} disabled={isAtStart}>Prev</button>
            </>
          ) : (
            <>
              <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={prev} disabled={isAtStart}>Prev</button>
              <div className="text-muted">Frame {frameIndex + 1} / {displayFrames.length} ({pages.length} pages)</div>
              <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={next} disabled={isAtEnd}>Next</button>
            </>
          )}
        </div>

        {progressBar && (
          <div className={`reader-progress mt-2 ${progressPosition === 'bottom' ? '' : 'position-static'}`} aria-hidden>
            <div className="reader-progress-bar" style={{
              width: `${((frameIndex + 1) / displayFrames.length) * 100}%`
            }} />
          </div>
        )}
      </div>
    );
  }

  // Render paged - vertical single/double paged
  if (effectiveMode === 'paged') {
    const currentFrame = displayFrames[frameIndex];
    return (
      <div
        className="chapter-reader-paged text-center"
        style={{ position: 'relative' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Edge hotspots for vertical paged view */}
        <div onClick={onLeftEdgeClick} role="button" aria-label="Left page edge" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20%', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'linear-gradient(90deg, rgba(0,0,0,0.06), transparent)' }}>
          <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>{isMangadexRTL ? '›' : '‹'}</div>
        </div>
        <div onClick={onRightEdgeClick} role="button" aria-label="Right page edge" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20%', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'linear-gradient(270deg, rgba(0,0,0,0.06), transparent)' }}>
          <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>{isMangadexRTL ? '‹' : '›'}</div>
        </div>
        <div className="d-flex justify-content-between mb-2">
          {isRTL ? (
            <>
              <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={next} disabled={isAtEnd}>Next</button>
              <div className="text-muted">Frame {frameIndex + 1} / {displayFrames.length} ({pages.length} pages)</div>
              <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={prev} disabled={isAtStart}>Prev</button>
            </>
          ) : (
            <>
              <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={prev} disabled={isAtStart}>Prev</button>
              <div className="text-muted">Frame {frameIndex + 1} / {displayFrames.length} ({pages.length} pages)</div>
              <button className="btn btn-sm btn-light reader-nav-btn outline" onClick={next} disabled={isAtEnd}>Next</button>
            </>
          )}
        </div>

        <div className="d-flex justify-content-center gap-3 mb-2">
          {currentFrame.map((p, i) => (
            <div key={i} style={{ flex: 1 }}>
              <ImageWithFallback src={p.url} alt={p.alt} className="img-fluid" fit={imageFit} />
            </div>
          ))}
        </div>

        {progressBar && (
          <div className="reader-progress mt-2" aria-hidden>
            <div className="reader-progress-bar" style={{
              width: `${((frameIndex + 1) / displayFrames.length) * 100}%`
            }} />
          </div>
        )}
      </div>
    );
  }

  // fallback: treat as continuous vertical
  const ordered = shouldReverse ? [...pages].reverse() : pages;
  return (
    <div className="chapter-reader-vertical">
      {ordered.map((p, i) => (
        <div key={i} className="mb-3">
          <ImageWithFallback src={p.url} alt={p.alt || `Page ${i + 1}`} className="img-fluid" fit={imageFit} />
        </div>
      ))}
    </div>
  );
}
