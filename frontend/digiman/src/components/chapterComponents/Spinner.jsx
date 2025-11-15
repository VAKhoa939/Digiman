import React from 'react';

export default function Spinner() {
  return (
    <div className="d-flex justify-content-center align-items-center p-5">
      <div className="spinner-border text-warning" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
}
