import React from 'react';
import SettingsIcon from '@mui/icons-material/Settings';

export default function ChapterControls({ chapter, mode = 'vertical', swipeAxis = 'vertical', onToggleMode = () => {}, onToggleAxis = () => {}, onOpenSettings = () => {} }) {
  return (
    <div className="chapter-controls d-flex justify-content-between align-items-center my-3">
      <div>
        <button className="btn btn-sm btn-outline-light me-2">Prev Chapter</button>
        <button className="btn btn-sm btn-outline-light">Next Chapter</button>
      </div>
      <div className="d-flex align-items-center gap-2">
        <button className="btn btn-sm btn-outline-light ms-2" onClick={onOpenSettings} title="Reader settings" aria-label="Open reader settings">
          <SettingsIcon fontSize="small" />
        </button>
      </div>
    </div>
  );
}
