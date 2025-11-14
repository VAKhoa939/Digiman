import React, { useRef } from 'react';
import MangaCard from './MangaCard';

// HotUpdates Banner: horizontal scroller showing multiple MangaCard items
// Props:
// - slides: array of manga objects
// - visible: how many items to show (controls responsive spacing)
// - title: header text
const Banner = ({ slides = [], visible = 6, title = 'HOT UPDATES' }) => {
  const trackRef = useRef(null);

  if (!slides || slides.length === 0) return null;

  const scrollByItem = (dir = 1) => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.querySelector('.dm-hot-item .card');
    const gap = 16; // gap defined in CSS (approx)
    const w = item ? item.offsetWidth + gap : 220 + gap;
    track.scrollBy({ left: dir * w, behavior: 'smooth' });
  };

  return (
    <section className="dm-hot-updates">
      <div className="dm-hot-header d-flex align-items-center justify-content-between">
        <div>
          <h5 className="mb-1">{title}</h5>
          <div className="dm-hot-underline"><span className="dm-hot-star">★</span><span className="dm-hot-line" /></div>
        </div>
        <div className="dm-hot-controls">
          <button className="dm-hot-btn" aria-label="Prev" onClick={() => scrollByItem(-1)}>‹</button>
          <button className="dm-hot-btn" aria-label="Next" onClick={() => scrollByItem(1)}>›</button>
        </div>
      </div>

      <div className="dm-hot-track-wrapper">
        <div className="dm-hot-track d-flex gap-3 overflow-auto" ref={trackRef}>
          {slides.map((s, i) => (
            <div key={s.id || i} className="dm-hot-item" style={{ flex: `0 0 calc(${100 / visible}% - 0.75rem)` }}>
              <MangaCard {...s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Banner;
