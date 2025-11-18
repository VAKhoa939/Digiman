import api from "./api";

export async function fetchAllMangaTitles(page) {
  const res = await api.get(`manga_titles/?page=${page}`);
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchLatestUpdatedMangaTitle() {
  const res = await api.get("manga-titles/?ordering=-latest_chapter_date");
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchMangaTitle(manga_title_id) {
  const res = await api.get(`manga-titles/${manga_title_id}/`);
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchMangaTitleChapters(manga_title_id) {
  const res = await api.get(
    `chapters/?manga_title_id=${manga_title_id}&ordering=chapter_number`
  );
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchMangaTitleGenres(manga_title_id) {
  const res = await api.get(
    `genres/?manga_title_id=${manga_title_id}`
  );
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchChapter(chapter_id) {
  const res = await api.get(`chapters/${chapter_id}/`);
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchChapterPages(chapter_id) {
  const res = await api.get(
    `pages/?chapter_id=${chapter_id}&ordering=page_number`
  );
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchGenres() {
  const res = await api.get("genres/");
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}