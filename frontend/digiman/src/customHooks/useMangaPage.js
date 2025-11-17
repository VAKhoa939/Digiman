import { useQuery } from "@tanstack/react-query";
import { fetchMangaTitle, fetchMangaTitleChapters, fetchMangaTitleGenres } from "../services/mangaService";
import { mapMangaTitle, mapChapter } from "../utils/transform";
import mangaMockData from "../data/mangaData";

export default function useMangaPage(id) {
  const use_mock_data = import.meta.env.VITE_USE_MOCK_DATA || 'true';
  if (use_mock_data === 'true') {
    // --- Mock data version ---
    const manga = (id && mangaMockData[id]) || Object.values(mangaMockData)[0];
    return {
      mangaData: {
        id: manga.id,
        title: manga.title,
        altTitle: manga.altTitle,
        coverUrl: manga.coverUrl,
        author: manga.author,
        artist: manga.artist,
        synopsis: manga.synopsis,
        status: manga.status,
        chapterCount: manga.chapterCount,
        dateUpdated: manga.dateUpdated,
        publicationDate: manga.publicationDate,
        previewChapterId: manga.previewChapterId,
      },
      mangaIsLoading: false,
      mangaError: null,
      genresData: manga.genres,
      genresIsLoading: false,
      genresError: null,
      chaptersData: manga.chapters,
      chaptersIsLoading: false,
      chaptersError: null,
    }
  }

  // --- Live API version ---
  const staleTime = 1000 * 60 * 5; // Cache result for 5 minutes
  const { 
    data: mangaData, isLoading: mangaIsLoading, error: mangaError 
  } = useQuery({
    queryKey: ['manga', id],
    queryFn: () => fetchMangaTitle(id),
    staleTime: staleTime,
    retry: 1,
  });

  const { 
    data: genresData, isLoading: genresIsLoading, error: genresError 
  } = useQuery({
    queryKey: ['genres', id],
    queryFn: () => fetchMangaTitleGenres(id),
    staleTime: staleTime,
    retry: 1,
  });

  const { 
    data: chaptersData, isLoading: chaptersIsLoading, error: chaptersError 
  } = useQuery({
    queryKey: ['chapters', id],
    queryFn: () => fetchMangaTitleChapters(id),
    staleTime: staleTime,
    retry: 1,
  });

  return { 
    mangaData: mangaData ? mapMangaTitle(mangaData) : {}, 
    mangaIsLoading, mangaError, 
    genresData: genresData?.results || [], 
    genresIsLoading, genresError, 
    chaptersData: chaptersData?.results?.map(mapChapter) || [], 
    chaptersIsLoading, chaptersError
  };
}