import { useQuery } from "@tanstack/react-query";
import { fetchMangaTitle, fetchMangaTitleChapters, fetchMangaTitleGenres } from "../services/mangaService";
import { mapMangaTitle, mapChapter } from "../utils/transform";

export default function useMangaPage(id, { page = 1, pageSize = 20 } = {}) {
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
    queryKey: ['chapters', id, page, pageSize],
    queryFn: () => fetchMangaTitleChapters(id, true, page, pageSize),
    staleTime: staleTime,
    retry: 1,
  });

  const {
    data: firstChapterData,
  } = useQuery({
    queryKey: ['chapters', id, 'first'],
    queryFn: () => fetchMangaTitleChapters(id, true, 1, 1),
    staleTime: staleTime,
    retry: 1,
  });

  const chapterItems = Array.isArray(chaptersData)
    ? chaptersData
    : (Array.isArray(chaptersData?.results) ? chaptersData.results : []);
  const firstChapterItems = Array.isArray(firstChapterData)
    ? firstChapterData
    : (Array.isArray(firstChapterData?.results) ? firstChapterData.results : []);

  return { 
    mangaData: mangaData ? mapMangaTitle(mangaData) : {}, 
    mangaIsLoading, mangaError, 
    genresData: genresData || [], 
    genresIsLoading, genresError, 
    chaptersData: chapterItems.map(mapChapter), 
    chaptersTotal: typeof chaptersData?.count === 'number' ? chaptersData.count : chapterItems.length,
    chaptersPageSize: pageSize,
    currentChaptersPage: page,
    firstChapterId: firstChapterItems[0]?.id ?? null,
    chaptersIsLoading, chaptersError
  };
}