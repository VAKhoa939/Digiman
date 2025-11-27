export function mapMangaTitle(fetchedData) {
  return {
    id: fetchedData.id,
    title: fetchedData.title,
    altTitle: fetchedData.alternative_title,
    coverUrl: fetchedData.cover_image,
    author: fetchedData.author_name,
    artist: fetchedData.author_name, // same as author for now
    synopsis: fetchedData.description,
    status: fetchedData.publication_status,
    chapterCount: fetchedData.chapter_count,
    dateUpdated: fetchedData.latest_chapter_date,
    publicationDate: fetchedData.publication_date,
    previewChapterId: fetchedData.preview_chapter_id,
  };
}

export function mapChapter(fetchedData) {
  return {
    id: fetchedData.id,
    number: fetchedData.chapter_number,
    title: fetchedData.title,
    mangaTitle: fetchedData.manga_title,
    mangaTitleID: fetchedData.manga_title_id,
    date: fetchedData.upload_date,
    pageCount: fetchedData.page_count,
    prevChapterId: fetchedData.previous_chapter_id,
    nextChapterId: fetchedData.next_chapter_id,
  };
}

export function mapPage(fetchedData) {
  return {
    id: fetchedData.id,
    index: fetchedData.page_number,
    url: fetchedData.image_url,
    alt: `Page ${fetchedData.page_number}`,
  };
}

export function mapComment(fetchedData) {
  return {
    id: fetchedData.id,
    name: fetchedData.owner_name,
    avatar: fetchedData.owner_avatar,
    ownerId: fetchedData.owner_id,
    text: fetchedData.text,
    imageUrl: fetchedData.attached_image_url,
    created_at: fetchedData.created_at,
    status: fetchedData.status,
    isEdited: fetchedData.is_edited,
    hiddenReasons: fetchedData.hidden_reasons,
  };
}

export function mapInputCommentData(
  text, mangaId, chapterId, editPreview = null, isDeleted = false
) {
  // if isDeleted, only status should be set
  if (isDeleted) return { status: "deleted" };
  // only one of manga_title_id or chapter_id should be set
  let manga_title = mangaId;
  if (chapterId !== undefined && chapterId !== null) manga_title = null;

  let attached_image_url = undefined;
  if (editPreview === null || editPreview.length === 0) 
    attached_image_url = ''; 
  return {
    text: text.trim(),
    manga_title: manga_title,
    chapter: chapterId ?? null,
    attached_image_url: attached_image_url
  };
}