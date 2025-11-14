// Simple mock data for ChapterPage while developing locally
export const mockChapter = {
  id: 'c1',
  number: 1,
  title: 'Chapter 1: Prologue',
  date: '2025-11-01T00:00:00Z',
  scanlator: 'ExampleScan',
  pages: Array.from({ length: 6 }).map((_, i) => ({
    index: i,
    url: `https://via.placeholder.com/800x1200?text=Page+${i + 1}`,
    alt: `Page ${i + 1}`,
  })),
  prevChapterId: null,
  nextChapterId: 'c2',
};

export const mockList = Array.from({ length: 8 }).map((_, i) => ({
  id: `c${i + 1}`,
  number: i + 1,
  title: `Chapter ${i + 1}`,
  date: `2025-11-${String(1 + i).padStart(2, '0')}T00:00:00Z`,
}));

export default { mockChapter, mockList };
