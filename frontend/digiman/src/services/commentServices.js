import api from "./api";

export async function fetchCommentsByMangaTitle(mangaTitleId) {
    const res = await api.get("comments/", { params: { manga_title_id: mangaTitleId }});
    if (res.data.detail) throw new Error(res.data.detail);
    return res.data;
}

export async function fetchCommentsByChapter(chapterId) {
    const res = await api.get("comments/", { params: { chapter_id: chapterId }});
    if (res.data.detail) throw new Error(res.data.detail);
    return res.data;
}
