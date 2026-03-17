import React from 'react';
import { useWatchlist, useToggleWatch } from '../../api/hooks';

interface WatchButtonProps {
  cveId: string;
  size?: 'sm' | 'md';
}

export default function WatchButton({ cveId, size = 'sm' }: WatchButtonProps) {
  const { data: watchlist = [] } = useWatchlist();
  const toggle = useToggleWatch();
  const isWatched = watchlist.includes(cveId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggle.mutate({ cveId, watched: isWatched });
  };

  const sizeClass = size === 'md' ? 'text-xl p-1' : 'text-base p-0.5';

  return (
    <button
      onClick={handleClick}
      disabled={toggle.isPending}
      title={isWatched ? 'Unwatch this CVE' : 'Watch this CVE'}
      aria-label={isWatched ? 'Unwatch this CVE' : 'Watch this CVE'}
      aria-pressed={isWatched}
      className={`${sizeClass} rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 ${
        isWatched
          ? 'text-yellow-400 hover:text-yellow-300'
          : 'text-gray-500 hover:text-yellow-400'
      }`}
    >
      {isWatched ? '★' : '☆'}
    </button>
  );
}
