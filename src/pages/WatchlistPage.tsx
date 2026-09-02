import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { PSRecord, SnapshotEvent, PSMetrics } from '../types';
import { calculatePSMetrics } from '../utils/metrics';
import { useWatchlist } from '../context/WatchlistContext';
import { DoodleUnderline, DoodleTape } from '../utils/doodleIcons';
import { Trash2, Flame, ArrowRight } from 'lucide-react';

interface WatchlistPageProps {
  records: PSRecord[];
  snapshots: SnapshotEvent[];
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({ records, snapshots }) => {
  const navigate = useNavigate();
  const { watchlist, toggleWatchlist } = useWatchlist();

  // Metrics cache map
  const metricsMap = useMemo(() => {
    const map = new Map<string, PSMetrics>();
    for (const record of records) {
      map.set(record.ps_id, calculatePSMetrics(record, snapshots));
    }
    return map;
  }, [records, snapshots]);

  // Starred records
  const starredRecords = useMemo(() => {
    return records.filter((r) => watchlist.has(r.ps_id));
  }, [records, watchlist]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Title Card */}
      <div className="relative bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch p-6 sm:p-8 shadow-sketch">
        <DoodleTape
          className="absolute -top-3 left-10 w-28 h-6"
          color="#FEF08A"
          rotation="rotate-[-2.5deg]"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1E1E1E] tracking-tight">
                My Candidate Watchlist
              </h1>
            </div>
            <div className="relative inline-block">
              <p className="font-hand text-lg text-[#555555]">
                Pinned problem statements saved locally in your browser for fast repeated checking.
              </p>
              <DoodleUnderline color="#FEF08A" className="w-full h-2.5 -mt-1" />
            </div>
          </div>

          <div className="px-3.5 py-1.5 bg-[#FEF08A] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm font-mono text-xs font-black">
            {starredRecords.length} Saved {starredRecords.length === 1 ? 'PS' : 'PSs'}
          </div>
        </div>
      </div>

      {starredRecords.length === 0 ? (
        <div className="bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch p-12 text-center shadow-sketch space-y-4">
          <div className="text-5xl">✨</div>
          <h2 className="text-xl font-black text-[#1E1E1E]">Your Watchlist is Empty!</h2>
          <p className="text-sm text-[#666666] max-w-md mx-auto">
            Click the ⭐ icon beside any problem statement on the leaderboard to pin your candidate options here for easy side-by-side comparison.
          </p>
          <Link
            to="/"
            className="sketch-btn inline-flex items-center gap-2 px-5 py-2.5 bg-[#FEF08A] font-bold text-sm rounded-sketch-sm mt-2"
          >
            Explore Leaderboard <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {starredRecords.map((r) => {
            const m = metricsMap.get(r.ps_id);
            const isSpiking = m?.delta_24h && m.delta_24h >= 5;

            return (
              <div
                key={r.ps_id}
                onClick={() => navigate(`/ps/${r.ps_id}`)}
                className="group relative bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch p-5 shadow-sketch hover:-translate-y-1 hover:shadow-sketch-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 bg-[#FAF8F5] border border-[#1E1E1E] rounded">
                      {r.ps_id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${
                          r.category === 'Software'
                            ? 'bg-[#BAE6FD] border-[#0284C7] text-[#0369A1]'
                            : 'bg-[#FECDD3] border-[#E11D48] text-[#9F1239]'
                        }`}
                      >
                        {r.category}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(r.ps_id);
                        }}
                        title="Remove from Watchlist"
                        className="p-1 hover:bg-[#FEE2E2] rounded transition-colors"
                      >
                        <Trash2 size={15} className="text-[#EF4444]" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Theme */}
                  <h3 className="font-bold text-base text-[#1E1E1E] group-hover:text-[#2563EB] transition-colors line-clamp-2 leading-snug">
                    {r.title}
                  </h3>
                  <div className="text-xs text-[#666666] mt-1 line-clamp-1">{r.organization}</div>
                  <div className="mt-2 text-[11px] font-medium text-[#4A4A4A] bg-[#FAF8F5] px-2 py-1 rounded border border-[#1E1E1E]/20 inline-block">
                    🏷️ {r.theme}
                  </div>
                </div>

                {/* Submissions & Velocity stats */}
                <div className="mt-4 pt-3 border-t-2 border-dashed border-[#1E1E1E]/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#666666]">Total Submitted:</span>
                    <span className="font-mono font-black text-sm text-[#1E1E1E]">
                      {r.submitted_count} {r.cap ? `/ ${r.cap}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#666666]">24h Velocity:</span>
                    <span
                      className={`font-mono font-bold inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded border ${
                        isSpiking
                          ? 'bg-[#FECDD3] text-[#9F1239] border-[#F43F5E]'
                          : 'bg-[#FAF8F5] text-[#1E1E1E] border-[#D1D5DB]'
                      }`}
                    >
                      {isSpiking && <Flame size={12} />}
                      {m?.delta_24h !== null ? `+${m?.delta_24h}` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#666666]">Days to Cap:</span>
                    <span className="font-mono font-bold text-[#1E1E1E]">
                      {m?.days_to_cap !== null && m?.days_to_cap !== undefined
                        ? `~${m.days_to_cap} days`
                        : 'Quiet / N/A'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
