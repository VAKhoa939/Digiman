import React from 'react';

export default function ChapterNav({ 
  chapters = [], 
  currentId, 
  onNavigate = () => {},
  subscription,
  hasPremiumChapterAccess = () => false,
}) {
  const onSelectChange = (event) => {
    event.preventDefault();

    const chapterId = event.target.value;
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!hasPremiumChapterAccess(subscription, chapter)) return;

    onNavigate(chapterId);
  } 

  return (
    <div className="chapter-nav">
      <select disabled={!navigator.onLine} className="form-select" value={currentId} onChange={(e) => onSelectChange(e)}>
        {chapters.map((c) => (
          <option key={c.id} value={c.id}>
            {(c.isPremium) ? "(Premium) " : "(Free) "} 
            {c.title ? `Chapter ${c.number}: ${c.title}` : `Chapter ${c.number}`}
          </option>
        ))}
      </select>
    </div>
  );
}
