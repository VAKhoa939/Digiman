// Simple mock data for ChapterPage while developing locally
export const mockChapter = {
  id: 'c1',
  number: 1,
  title: 'Chapter 1: Prologue',
  date: '2025-11-01T00:00:00Z',
  mangaTitle: 'Shangri-La Frontier: Kusoge Hunter',
  mangaTitleID: '25146',
  pages: [
    { id: '1', url: 'https://nmoilicfzoyfohmzkgiv.supabase.co/storage/v1/object/public/manga-content/4326be02-6f8f-4141-b8dd-bcfd09a9e709.jpg', alt: 'Page 1' },
    { id: '2', url: 'https://nmoilicfzoyfohmzkgiv.supabase.co/storage/v1/object/public/manga-content/8fbe4ada-0937-4e71-9872-053fff993414.jpg', alt: 'Page 2' },
    { id: '3', url: 'https://nmoilicfzoyfohmzkgiv.supabase.co/storage/v1/object/public/manga-content/d0b6fef8-a56b-4430-907c-28a75d7f7084.jpg', alt: 'Page 3' },
  ],
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
