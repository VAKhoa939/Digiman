import api from "./api";

export async function fetchAllMangaTitles(params={}, page=1) {
  const res = await api.get(`manga-titles/`, { params: { page: page, ...params } });
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchLatestUpdatedMangaTitle(page=1) {
  const res = await api.get("manga-titles/",{ 
    params: { 
      ordering: "-updated_at", page: page 
    } 
  });
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchMangaTitle(mangaTitleId) {
  const res = await api.get(`manga-titles/${mangaTitleId}/`);
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchMangaTitleChapters(
  mangaTitleId, isAscending=true, page=1
) {
  const ordering = isAscending ? "chapter_number" : "-chapter_number";
  const res = await api.get("chapters/", {
    params: {
      manga_title_id: mangaTitleId,
      ordering: ordering,
      page: page,
    }
  });
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchMangaTitleGenres(mangaTitleId) {
  const res = await api.get("genres/", {
    params: {
      manga_title_id: mangaTitleId,
    }
  });
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchChapter(chapterId) {
  const res = await api.get(`chapters/${chapterId}/`);
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchChapterPages(chapterId) {
  const res = await api.get("pages/", {
    params: {
      chapter_id: chapterId,
      ordering: "page_number",
    }
  });
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}

export async function fetchGenres() {
  const res = await api.get("genres/", { params: { ordering: "name" } });
  if (res.data.detail) throw new Error(res.data.detail);
  return res.data;
}