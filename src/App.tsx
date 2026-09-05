import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WatchlistProvider } from './context/WatchlistContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { TrendingPage } from './pages/TrendingPage';
import { PSDetailPage } from './pages/PSDetailPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { GemsPage } from './pages/GemsPage';
import { latestPSData, loadAllSnapshots } from './utils/dataLoader';
import { Analytics } from '@vercel/analytics/react';

export const App: React.FC = () => {
  const records = useMemo(() => latestPSData, []);
  const snapshots = useMemo(() => loadAllSnapshots(), []);

  const lastScrapedAt = useMemo(() => {
    if (records.length > 0) {
      return records[0].last_scraped_at;
    }
    return undefined;
  }, [records]);

  return (
    <WatchlistProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col justify-between bg-[#FAF8F5] selection:bg-[#FEF08A]">
          <div>
            <Header lastScrapedAt={lastScrapedAt} />
            <main>
              <Routes>
                <Route
                  path="/"
                  element={<LeaderboardPage records={records} snapshots={snapshots} />}
                />
                <Route
                  path="/trending"
                  element={<TrendingPage records={records} snapshots={snapshots} />}
                />
                <Route
                  path="/gems"
                  element={<GemsPage records={records} snapshots={snapshots} />}
                />
                <Route
                  path="/watchlist"
                  element={<WatchlistPage records={records} snapshots={snapshots} />}
                />
                <Route
                  path="/ps/:id"
                  element={<PSDetailPage records={records} snapshots={snapshots} />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <Footer />
        </div>
        <Analytics debug={import.meta.env.DEV} />
      </BrowserRouter>
    </WatchlistProvider>
  );
};

export default App;
