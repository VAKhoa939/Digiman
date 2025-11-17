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
    staleTime: 1000 * 60 * 5, // Cache result for 5 minutes
    retry: 1,
  });
  const items = Object.values(mangaData);
  const popular = [...items].sort((a, b) => {
    const da = a.dateUpdated ? new Date(a.dateUpdated).getTime() : 0;
    const db = b.dateUpdated ? new Date(b.dateUpdated).getTime() : 0;
    return db - da;
  }).slice(0, Math.min(items.length, 12));

  console.log(latest);

  return {
    latest: latest?.results?.map(mapMangaTitle) || [],
    latestIsLoading: latestIsLoading,
    latestError: latestError,
    popular: popular,
    popularIsLoading: false,
    popularError: null,
  };
}
