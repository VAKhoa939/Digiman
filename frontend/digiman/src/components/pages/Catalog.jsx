import React from 'react';
import { Container } from 'react-bootstrap';
import mangaData from '../../data/mangaData';
import MangaCard from '../../components/smallComponents/MangaCard';
import Banner from '../../components/smallComponents/Banner';

function Catalog() {
  const items = Object.values(mangaData);
  // Latest updated (sort by dateUpdated desc)
  const latest = [...items].sort((a, b) => {
    const da = a.dateUpdated ? new Date(a.dateUpdated).getTime() : 0;
    const db = b.dateUpdated ? new Date(b.dateUpdated).getTime() : 0;
    return db - da;
  });

  // Popular (simple heuristic: most chapters)
  const popular = [...items].sort((a, b) => (b.chapters?.length || 0) - (a.chapters?.length || 0));

  // Limit popular section to 6 items
  const popularLimit = 6;

  return (
    <>
      <div className="bg-dark text-white">
        <Container fluid className="py-5">

          {/* Hot updates banner (multi-card scroller) */}
          <Banner slides={popular} visible={6} title="HOT UPDATES" />

          {/* Popular banner - auto scrolling */}
          <div className="popular-section my-4">
            <div className="d-flex align-items-center mb-2">
              <h5 className="mb-0">Popular</h5>
            </div>
            <div className="manga-grid">
              {popular.slice(0, popularLimit).map(m => (
                <div key={m.id} className="manga-grid-item">
                  <MangaCard {...m} />
                </div>
              ))}
            </div>
          </div>

          {/* Latest Updated section */}
          <div className="latest-updated my-4">
            <div className="d-flex align-items-center mb-2">
              <h5 className="mb-0">Latest Updated</h5>
            </div>
            <div className="d-flex flex-wrap gap-3">
              {latest.slice(0, 8).map(m => (
                <MangaCard key={m.id} {...m} />
              ))}
            </div>
          </div>
        </Container>
      </div>

      <div className="bg-secondary text-white">
        <Container className="py-5">
          <h3>Second Section</h3>
          <p>More content below the first section. Stacked automatically.</p>
        </Container>
      </div>
    </>
  )
}

export default Catalog