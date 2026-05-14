import api from "./api";

/**
 * GET /api/recommendations/?manga_id=<uuid>
 * Returns a list of manga similar to the given manga.
 */
export async function fetchRecommendations(mangaId) {
  const res = await api.get("recommendations/", {
    params: { manga_id: mangaId },
  });
  return res.data; // array of MangaTitle objects
}

/**
 * GET /api/homepage/popular/
 * Returns manga sorted by average star rating (highest first).
 */
export async function fetchHomepagePopular() {
  const res = await api.get("homepage/popular/");
  return res.data; // array of MangaTitle objects
}

/**
 * GET /api/homepage/most-read/
 * Returns manga sorted by reader count (highest first).
 */
export async function fetchHomepageMostRead() {
  const res = await api.get("homepage/most-read/");
  return res.data; // array of MangaTitle objects
}

/**
 * GET /api/homepage/recommendation/
 * Returns personalised recommendation banners for the authenticated reader.
 * Requires a valid JWT (caller must ensure user is authenticated).
 *
 * Response: { banners: [ { source_manga, recommendations[] }, ... ] }
 */
export async function fetchHomepageRecommendation() {
  const res = await api.get("homepage/recommendation/");
  return res.data; // { banners: [...] }
}
