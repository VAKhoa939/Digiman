import React from 'react';
import MangaCard from './MangaCard';

// Wrapper to adapt backend search result shape to MangaCard props
export default function SearchMangaCard(props) {
  // props may contain `image` instead of `coverUrl`, `latest_chapter` etc.
  const mapped = {
    id: props.id,
    title: props.title,
    status: props.status || props.publication_status,
    coverUrl: props.image || props.coverUrl || '',
    author: props.author || props.authors || '',
    chapter_count: props.chapter_count || props.chapters_count || 0,
    dateUpdated: props.latest_chapter_date || props.publication_date || null,
  };
  return <MangaCard {...mapped} />;
}
