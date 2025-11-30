import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ChapterNav({ chapters = [], currentId, onNavigate = () => {} }) {
  const {isAuthenticated} = useAuth();
  return (
    <div className="chapter-nav">
      <select disabled={!isAuthenticated} className="form-select" value={currentId} onChange={(e) => onNavigate(e.target.value)}>
        {chapters.map((c) => (
          <option key={c.id} value={c.id}>{c.number ? `Ch ${c.number}` : c.title}</option>
        ))}
      </select>
    </div>
  );
}
