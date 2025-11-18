export const getTimeAgo = (date) => {
    const d = new Date(date);
    if (!d) return null;
    
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const intervals = [
      { unit: 'year', secs: 31536000 },
      { unit: 'month', secs: 2592000 },
      { unit: 'day', secs: 86400 },
      { unit: 'hour', secs: 3600 },
      { unit: 'minute', secs: 60 },
    ];
    for (const { unit, secs } of intervals) {
      const value = Math.floor(seconds / secs);
      if (value >= 1) return `${value} ${unit}${value > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  };