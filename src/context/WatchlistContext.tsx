import React, { createContext, useContext, useState, useEffect } from 'react';

interface WatchlistContextType {
  watchlist: Set<string>;
  toggleWatchlist: (psId: string) => void;
  isWatchlisted: (psId: string) => boolean;
  watchlistCount: number;
}

const STORAGE_KEY = 'sih2026_watchlist';

const WatchlistContext = createContext<WatchlistContextType>({
  watchlist: new Set(),
  toggleWatchlist: () => {},
  isWatchlisted: () => false,
  watchlistCount: 0
});

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load watchlist from localStorage', e);
    }
    return new Set<string>();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(watchlist)));
    } catch (e) {
      console.error('Failed to save watchlist to localStorage', e);
    }
  }, [watchlist]);

  const toggleWatchlist = (psId: string) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(psId)) {
        next.delete(psId);
      } else {
        next.add(psId);
      }
      return next;
    });
  };

  const isWatchlisted = (psId: string) => watchlist.has(psId);

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        toggleWatchlist,
        isWatchlisted,
        watchlistCount: watchlist.size
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => useContext(WatchlistContext);
