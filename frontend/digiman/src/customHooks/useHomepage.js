import { useQuery } from "@tanstack/react-query";
import {
  fetchHomepageMostRead,
  fetchHomepagePopular,
  fetchHomepageRecommendation,
  fetchRecommendations,
} from "../services/homepageService";
import { mapMangaTitle } from "../utils/transform";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === "true";

/** Map a raw MangaTitle API object, with safe fallback. */
function safe(raw) {
  try {
    return mapMangaTitle(raw);
  } catch (_) {
    return raw;
  }
}

/**
 * Returns manga sorted by average star rating.
 * Data is stable for 10 minutes.
 */
export function usePopular() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["homepage", "popular"],
    queryFn: fetchHomepagePopular,
    enabled: !USE_MOCK,
    staleTime: 1000 * 60 * 10,
  });
  return {
    popular: (Array.isArray(data) ? data : []).map(safe),
    popularIsLoading: isLoading,
    popularError: error ? "Failed to load popular manga." : null,
  };
}

/**
 * Returns manga sorted by read count.
 * Data is stable for 10 minutes.
 */
export function useMostRead() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["homepage", "most-read"],
    queryFn: fetchHomepageMostRead,
    enabled: !USE_MOCK,
    staleTime: 1000 * 60 * 10,
  });
  return {
    mostRead: (Array.isArray(data) ? data : []).map(safe),
    mostReadIsLoading: isLoading,
    mostReadError: error ? "Failed to load most-read manga." : null,
  };
}

/**
 * Returns personalised recommendation banners for the logged-in reader.
 * Banners have the shape: { source_manga, recommendations[] }
 * Only fetches when isAuthenticated is true.
 */
export function useHomepageRecommendation(isAuthenticated) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["homepage", "recommendation"],
    queryFn: fetchHomepageRecommendation,
    enabled: !USE_MOCK && Boolean(isAuthenticated),
    staleTime: 1000 * 60 * 5,
  });

  const rawBanners = data?.banners ?? [];
  const banners = rawBanners.map((b) => ({
    sourceManga: safe(b.source_manga),
    recommendations: (b.recommendations ?? []).map(safe),
  }));

  return {
    banners,
    bannersIsLoading: isLoading,
    bannersError: error ? "Failed to load recommendations." : null,
  };
}

/**
 * Returns recommendations for a specific manga (same author / genres).
 * @param {string|null} mangaId  UUID of the seed manga.
 */
export function useRecommendations(mangaId) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["recommendations", mangaId],
    queryFn: () => fetchRecommendations(mangaId),
    enabled: !USE_MOCK && Boolean(mangaId),
    staleTime: 1000 * 60 * 10,
  });
  return {
    recommendations: (Array.isArray(data) ? data : []).map(safe),
    recommendationsIsLoading: isLoading,
    recommendationsError: error ? "Failed to load recommendations." : null,
  };
}
