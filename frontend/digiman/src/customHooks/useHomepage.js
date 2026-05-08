import mangaData from "../data/mangaData";
import { useQuery } from "@tanstack/react-query";
import { fetchLatestUpdatedMangaTitle } from "../services/mangaService";
import { mapMangaTitle } from "../utils/transform";

export default function useHomepage() {
  // --- Live API version ---
  const { 
		data: latest, 
		isLoading: latestIsLoading, 
		error: latestError 
	} = useQuery({
    queryKey: ["latestMangaTitles"],
    queryFn: fetchLatestUpdatedMangaTitle,
    staleTime: 1000 * 60 * 5,
  });
  
  // Helper: Fisher-Yates shuffle (returns new array)
  const shuffle = (arr) => {
    if (!Array.isArray(arr)) return [];
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  };

  // If API returned latest results, derive a randomized popular list from it.
  const popularFromApi = latest?.map(mapMangaTitle) || [];
  const randomizedPopular = shuffle(popularFromApi).slice(0, 12);

  return {
    latest: latest?.map(mapMangaTitle).slice(0, 12) || [],
    latestIsLoading: latestIsLoading,
    latestError: latestError,
    popular: randomizedPopular,
    popularIsLoading: latestIsLoading,
    popularError: latestError && 'Failed to fetch popular manga',
  };
}
