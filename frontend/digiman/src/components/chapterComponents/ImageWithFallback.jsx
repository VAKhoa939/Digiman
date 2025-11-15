import React, { useState } from 'react';

export default function ImageWithFallback({ src, alt, className, fit = 'both', style = {} }) {
  const [errored, setErrored] = useState(false);
  const fallback = '/assets/placeholder-image.png';

  // map fit to inline styles (kept simple and override-able)
  const fitStyles = (() => {
    if (fit === 'fit-width') return { width: '100%', height: 'auto', objectFit: 'contain' };
    if (fit === 'fit-height') return { height: '80vh', width: 'auto', objectFit: 'contain' };
    // both: constrain to container but allow auto sizing
    return { maxWidth: '100%', maxHeight: '80vh', width: 'auto', height: 'auto', objectFit: 'contain' };
  })();

  return (
    <img
      src={errored ? fallback : src}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
      style={{ ...fitStyles, ...style }}
    />
  );
}
