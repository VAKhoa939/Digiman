// Simple local manga data store for development/demo purposes.
// Keyed by id string. Replace with API calls when ready.
//
// Cover images should be placed in the `public/images/` folder so they are
// served at `/images/<filename>`. For example, put `shangri-la.webp` at
// `frontend/digiman/public/images/shangri-la.webp` and use `/images/shangri-la.webp`.

const mangaData = {
  '25146': {
    id: '25146',
    title: 'Shangri-La Frontier: Kusoge Hunter',
    altTitle: 'Kusoge Hunter Kamige ni Idoman to Su',
    author: 'Hiroshi Yagi',
    artist: 'Boichi',
    genres: ['Action', 'Comedy', 'Game'],
    status: 'Ongoing',
    coverUrl: '/assets/shangri-la.webp', // prefer public/ images; fallback handled by component
    dateUpdated: '2025-11-05T00:00:00Z',
    synopsis: 'A high-quality action-comedy about a skilled gamer who specializes in kusoge (trash games) and becomes a top player in a brutal VR world.',
    chapters: [
      { id: 1, number: 1, title: 'Prologue', date: '2025-11-01', link: '#' },
      { id: 2, number: 2, title: 'First Hunt', date: '2025-11-05', link: '#' },
    ],
  },
  '1': {
    id: '1',
    title: 'Sample Manga',
    altTitle: '',
    author: 'Unknown',
    artist: 'Unknown',
    genres: ['Drama'],
    status: 'Completed',
    coverUrl: '/assets/shangri-la.webp',
    dateUpdated: '2025-10-01T00:00:00Z',
    synopsis: 'This is a sample manga used for development.',
    chapters: [],
  },
  '2': {
    id: '2',
    title: 'Sample Manga 2',
    altTitle: '',
    author: 'Unknown',
    artist: 'Unknown',
    genres: ['Drama'],
    status: 'Completed',
    coverUrl: '/assets/shangri-la.webp',
    dateUpdated: '2025-09-15T00:00:00Z',
    synopsis: 'This is a sample manga used for development.',
    chapters: [],
  },
  '3': {
    id: '3',
    title: 'Sample Manga 3',
    altTitle: '',
    author: 'Unknown',
    artist: 'Unknown',
    genres: ['Drama'],
    status: 'Completed',
    coverUrl: '/assets/shangri-la.webp',
    dateUpdated: '2025-09-15T00:00:00Z',
    synopsis: 'This is a sample manga used for development.',
    chapters: [],
  },
  '5': {
    id: '5',
    title: 'Sample Manga 5',
    altTitle: '',
    author: 'Unknown',
    artist: 'Unknown',
    genres: ['Drama'],
    status: 'Completed',
    coverUrl: '/assets/shangri-la.webp',
    dateUpdated: '2025-09-15T00:00:00Z',
    synopsis: 'This is a sample manga used for development.',
    chapters: [],
  },
  '8': {
    id: '8',
    title: 'Sample Manga 8',
    altTitle: '',
    author: 'Unknown',
    artist: 'Unknown',
    genres: ['Drama'],
    status: 'Completed',
    coverUrl: '/assets/shangri-la.webp',
    dateUpdated: '2025-09-15T00:00:00Z',
    synopsis: 'This is a sample manga used for development.',
    chapters: [],
  },
  '11': {
    id: '11',
    title: 'Sample Manga 11',
    altTitle: '',
    author: 'Unknown',
    artist: 'Unknown',
    genres: ['Drama'],
    status: 'Completed',
    coverUrl: '/assets/shangri-la.webp',
    dateUpdated: '2025-09-15T00:00:00Z',
    synopsis: 'This is a sample manga used for development.',
    chapters: [],
  }
};

export default mangaData;
