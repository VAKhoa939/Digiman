import React from 'react';

export default function ChapterMeta({ chapter }) {
  if (!chapter) return null;
  return (
    <div className="chapter-meta mb-3">
      <h4 className="mb-1">{chapter.title || `Chapter ${chapter.number}`}</h4>
      <div className="text-muted small">{chapter.scanlator ? `Scanlator: ${chapter.scanlator}` : null} {chapter.date ? ` • ${new Date(chapter.date).toLocaleString()}` : null}</div>
    </div>
  );
}
