import mangaData from "../data/mangaData";
import { useQuery } from "@tanstack/react-query";
import { fetchLatestUpdatedMangaTitle } from "../services/mangaService";
import { mapMangaTitle } from "../utils/transform";

export default function useCatalog() {
  const use_mock_data = import.meta.env.VITE_USE_MOCK_DATA || 'true';
  if (use_mock_data === 'true') {
    // --- Mock data version ---
    const items = Object.values(mangaData);
    return {
      // Latest updated (sort by dateUpdated desc)
      latest: [...items].sort((a, b) => {
        const da = a.dateUpdated ? new Date(a.dateUpdated).getTime() : 0;
        const db = b.dateUpdated ? new Date(b.dateUpdated).getTime() : 0;
        return db - da;
      }),
      latestIsLoading: false,
      latestError: null,
      // Popular placeholder: sort by dateUpdated desc as a proxy for popularity for now.
      // Replace with a real `views`/`score` metric when available from the API.
      popular: [...items].sort((a, b) => {
        const da = a.dateUpdated ? new Date(a.dateUpdated).getTime() : 0;
        const db = b.dateUpdated ? new Date(b.dateUpdated).getTime() : 0;
        return db - da;
      }).slice(0, Math.min(items.length, 12)),
      popularIsLoading: false,
      popularError: null,
    };
  }

  // --- Live API version ---
  const { 
		data: latest, 
		isLoading: latestIsLoading, 
		error: latestError 
	} = useQuery({
    queryKey: ["latestMangaTitles"],
    queryFn: fetchLatestUpdatedMangaTitle,
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
  const popularFromApi = latest?.results?.map(mapMangaTitle) || [];
  const randomizedPopular = shuffle(popularFromApi).slice(0, Math.min(popularFromApi.length, 12));

  return {
    latest: latest?.results?.map(mapMangaTitle) || [],
    latestIsLoading: latestIsLoading,
    latestError: latestError,
    popular: randomizedPopular,
    popularIsLoading: latestIsLoading,
    popularError: latestError && 'Failed to fetch popular manga',
  };
}
