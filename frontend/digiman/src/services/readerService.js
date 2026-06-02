import api from "./api";

// ---------------------------------------------------------------------------
// Reading Progress
// ---------------------------------------------------------------------------

/**
 * Upsert a reading-progress entry for the given chapter.
 * Call this when the user opens a chapter reader.
 * The backend signal will automatically mark is_reader_visited and is_reader_read.
 * @param {string} chapterId
 * @returns {Promise<object>} ReadingProgress entry
 */
export async function saveReadingProgress(chapterId) {
  const res = await api.post("reading-progress/", { chapter_id: chapterId });
  return res.data;
}

/**
 * Fetch all reading-progress entries for the logged-in reader.
 * Results are ordered by most recently read.
 * @returns {Promise<object[]>}
 */
export async function fetchReadingHistory() {
  const res = await api.get("reading-progress/");
  return res.data?.results ?? res.data;
}

/**
 * Delete a single reading-progress entry.
 * @param {string} progressId
 */
export async function deleteReadingProgress(progressId) {
  await api.delete(`reading-progress/${progressId}/`);
}

// ---------------------------------------------------------------------------
// Manga Reader Statistics
// ---------------------------------------------------------------------------

/**
 * Mark the reader as having visited a manga page.
 * Call this on mount of the manga detail page.
 * @param {string} mangaTitleId
 * @returns {Promise<object>} MangaReaderStatistics entry
 */
export async function markMangaVisited(mangaTitleId) {
  const res = await api.post("manga-reader-statistics/mark-visited/", {
    manga_title_id: mangaTitleId,
  });
  return res.data;
}

/**
 * Set the reader's personal star rating (1–5) for a manga.
 * @param {string} mangaTitleId
 * @param {number} rating  1–5
 * @returns {Promise<object>} MangaReaderStatistics entry (includes average_rating, read_count)
 */
export async function setStarRating(mangaTitleId, rating) {
  const res = await api.post("manga-reader-statistics/set-rating/", {
    manga_title_id: mangaTitleId,
    rating,
  });
  return res.data;
}
