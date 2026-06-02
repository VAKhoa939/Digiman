import { useQuery } from "@tanstack/react-query";
import { fetchMangaTitle, fetchMangaTitleChapters, fetchMangaTitleGenres } from "../services/mangaService";
import { mapMangaTitle, mapChapter } from "../utils/transform";

export default function useMangaPage(id) {
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
    genresData: genresData || [], 
    genresIsLoading, genresError, 
    chaptersData: chaptersData?.map(mapChapter) || [], 
    chaptersIsLoading, chaptersError
  };
}