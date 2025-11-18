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
    date: fetchedData.upload_date,
    prevChapterId: fetchedData.prev_chapter_id,
    nextChapterId: fetchedData.next_chapter_id,
  };
}

export function mapPage(fetchedData) {
  return {
    index: fetchedData.index,
    url: fetchedData.url,
    alt: fetchedData.alt,
  };
}