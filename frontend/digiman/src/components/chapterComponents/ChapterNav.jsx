import React from 'react';

export default function ChapterNav({ chapters = [], currentId, onNavigate = () => {} }) {
  return (
    <div className="chapter-nav">
      <select className="form-select" value={currentId} onChange={(e) => onNavigate(e.target.value)}>
        {chapters.map((c) => (
          <option key={c.id} value={c.id}>{c.number ? `Ch ${c.number}` : c.title}</option>
        ))}
      </select>
    </div>
  );
}
