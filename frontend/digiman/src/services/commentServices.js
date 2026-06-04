import api from "./api";

export async function fetchCommentsByMangaTitle(mangaTitleId, page = 1, pageSize = 20, ordering = '-created_at') {
    const res = await api.get("comments/", {
        params: {
            manga_title_id: mangaTitleId,
            page,
            page_size: pageSize,
            ordering,
        }
    });
    if (res.data.detail) throw new Error(res.data.detail);
    return res.data;
}

export async function fetchCommentsByChapter(chapterId, page = 1, pageSize = 20, ordering = '-created_at') {
    const res = await api.get("comments/", {
        params: {
            chapter_id: chapterId,
            page,
            page_size: pageSize,
            ordering,
        }
    });
    if (res.data.detail) throw new Error(res.data.detail);
    return res.data;
}

export async function postComment(
    commentData, attachedImage = null, onUploadProgress = null
) {
    const config = { timeout: attachedImage ? 180000 : 60000 };
    const payload = buildCommentPayload(commentData, attachedImage);

    if (payload instanceof FormData) {
        config.headers = { ...(config.headers || {}) };
        delete config.headers['Content-Type'];
    }

    if (onUploadProgress) config.onUploadProgress = onUploadProgress;

    const res = await api.post("comments/", payload, config);
    if (res.data && res.data.detail) throw new Error(res.data.detail);
    return res.data.results ?? res.data;
}

export async function editComment(
    comment, commentData, attachedImage = null, onUploadProgress = null
) {
    const config = { timeout: attachedImage ? 180000 : 60000 };
    const payload = buildCommentPayload(commentData, attachedImage);

    if (payload instanceof FormData) {
        config.headers = { ...(config.headers || {}) };
        delete config.headers['Content-Type'];
    }

    console.log("Editing comment with payload:", payload);

    if (onUploadProgress) config.onUploadProgress = onUploadProgress;

    const res = await api.patch(`comments/${comment}/`, payload, config);
    if (res.data && res.data.detail) throw new Error(res.data.detail);
    return res.data;
}

function buildCommentPayload(commentData = {}, attachedImage = null) {
    if (attachedImage) {
        const fd = new FormData();
        fd.append("attached_image_upload", attachedImage);

        Object.entries(commentData || {}).forEach(([k, v]) => {
            if (v == null) return; // skip null/undefined
            // append primitives as strings so DRF can coerce numbers
            if (typeof v === "object") fd.append(k, JSON.stringify(v));
            else fd.append(k, String(v));
        });

        return fd;
    }

    // No file: send JSON object as-is
    return commentData;
}