import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PSRecord, SnapshotEvent, PSMetrics, TimeWindow } from '../types';
import { calculatePSMetrics, getDeltaForWindow } from '../utils/metrics';
import { useWatchlist } from '../context/WatchlistContext';
import { DoodleStar, DoodleUnderline, DoodleTape } from '../utils/doodleIcons';
import { Flame, Clock, AlertTriangle } from 'lucide-react';

interface TrendingPageProps {
  records: PSRecord[];
  snapshots: SnapshotEvent[];
}

export const TrendingPage: React.FC<TrendingPageProps> = ({ records, snapshots }) => {
  const navigate = useNavigate();
  const { isWatchlisted, toggleWatchlist } = useWatchlist();

  // Active time window (default 24h per PRD)
  const [activeWindow, setActiveWindow] = useState<TimeWindow>('24h');

  // Metrics cache map
  const metricsMap = useMemo(() => {
    const map = new Map<string, PSMetrics>();
    for (const record of records) {
      map.set(record.ps_id, calculatePSMetrics(record, snapshots));
    }
    return map;
  }, [records, snapshots]);

  // Ranked descending by the delta for selected window
  const rankedRecords = useMemo(() => {
    return [...records]
      .map((r) => {
        const m = metricsMap.get(r.ps_id);
        const delta = m ? getDeltaForWindow(m, activeWindow) : null;
        return {
          record: r,
          metrics: m,
          delta: delta ?? 0,
          rawDelta: delta
        };
      })
      .sort((a, b) => b.delta - a.delta);
  }, [records, metricsMap, activeWindow]);

  // Top spikes count (> 5 in selected window)
  const spikingCount = useMemo(() => {
    return rankedRecords.filter((item) => item.delta >= 5).length;
  }, [rankedRecords]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Title Card with Doodle Note */}
      <div className="relative bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch p-6 sm:p-8 shadow-sketch">
        <DoodleTape
          className="absolute -top-3 left-10 w-28 h-6"
          color="#FECDD3"
          rotation="rotate-[-2deg]"
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#FECDD3] border-2 border-[#1E1E1E] rounded-sketch-sm flex items-center justify-center">
                <Flame size={24} className="text-[#F43F5E]" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#1E1E1E] tracking-tight">
                  Top Movers & Sudden Spikes
                </h1>
                <div className="relative inline-block">
                  <p className="font-hand text-lg text-[#555555]">
                    "What's heating up right now — avoid picking these if you want clean uncontested ground."
                  </p>
                  <DoodleUnderline color="#FECDD3" className="w-full h-2.5 -mt-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Time-Window Selector Buttons (6h / 12h / 24h / 48h) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[#FAF8F5] p-2 border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E1E1E] px-2">
              <Clock size={15} />
              <span>Window:</span>
            </div>

            <div className="flex items-center gap-1.5">
              {(['6h', '12h', '24h', '48h'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setActiveWindow(w)}
                  className={`sketch-btn px-3.5 py-1.5 text-xs font-black rounded-sketch-sm transition-all cursor-pointer ${
                    activeWindow === w
                      ? 'bg-[#E11D48] text-white shadow-[2px_2px_0px_#1E1E1E]'
                      : 'bg-white text-[#1E1E1E] hover:bg-[#FECDD3]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pro Tip Callout */}
        <div className="mt-5 p-3.5 bg-[#FEF08A]/40 border-2 border-dashed border-[#1E1E1E]/40 rounded-sketch-sm flex items-start gap-3 text-xs text-[#333333]">
          <AlertTriangle size={18} className="text-[#D97706] shrink-0 mt-0.5" />
          <div>
            <strong>Strategy Tip:</strong> A problem statement with <strong>0 submissions for 5 days</strong> that just gained <strong>+15 submissions in 24 hours</strong> has high viral traction and will likely be heavily contested. Prefer steady, quiet problem statements with near-zero delta.
          </div>
        </div>
      </div>

      {/* Spikes Summary Pill */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="font-hand text-xl font-bold text-[#1E1E1E]">
            Ranked by new submissions in the last {activeWindow}:
          </span>
          {spikingCount > 0 && (
            <span className="px-2.5 py-0.5 bg-[#FECDD3] border border-[#E11D48] text-[#9F1239] text-xs font-black rounded-full shadow-[1px_1px_0px_#1E1E1E]">
              {spikingCount} Spiking Fast
            </span>
          )}
        </div>
      </div>

      {/* Movers Table */}
      <div className="bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch shadow-sketch overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FEE2E2] border-b-2 border-[#1E1E1E] text-xs font-bold text-[#1E1E1E] uppercase tracking-wider select-none">
                <th className="py-3 px-3 w-12 text-center">Rank</th>
                <th className="py-3 px-3 w-10 text-center">⭐</th>
                <th className="py-3 px-4">PS ID</th>
                <th className="py-3 px-4 min-w-[280px]">Title & Organization</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Theme</th>
                <th className="py-3 px-4 text-right">Total Submissions</th>
                <th className="py-3 px-4 text-right bg-[#FECDD3] text-[#9F1239] border-l-2 border-[#1E1E1E]">
                  Δ {activeWindow} Surge
                </th>
                <th className="py-3 px-4 text-right">Remaining Slots</th>
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-[#1E1E1E]/10 text-sm">
              {rankedRecords.map(({ record: r, delta, rawDelta }, idx) => {
                const isStarred = isWatchlisted(r.ps_id);
                const isHighMover = delta >= 5;

                return (
                  <tr
                    key={r.ps_id}
                    onClick={() => navigate(`/ps/${r.ps_id}`)}
                    className={`group cursor-pointer transition-colors ${
                      isHighMover ? 'bg-[#FFF1F2] hover:bg-[#FFE4E6]' : 'hover:bg-[#FEFCE8]'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3 text-center font-black font-mono text-sm text-[#555555]">
                      #{idx + 1}
                    </td>

                    {/* Star */}
                    <td
                      className="py-3 px-3 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(r.ps_id);
                      }}
                    >
                      <button className="p-1 hover:scale-125 transition-transform">
                        <DoodleStar filled={isStarred} size={18} />
                      </button>
                    </td>

                    {/* PS ID */}
                    <td className="py-3 px-4 font-mono font-bold text-xs">
                      <span className="bg-[#FAF8F5] px-2 py-1 border border-[#1E1E1E] rounded">
                        {r.ps_id}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1E1E1E] group-hover:text-[#2563EB] transition-colors leading-snug">
                        {r.title}
                      </div>
                      <div className="text-xs text-[#666666] mt-0.5 line-clamp-1">
                        {r.organization}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 border rounded-full ${
                          r.category === 'Software'
                            ? 'bg-[#BAE6FD] border-[#0284C7] text-[#0369A1]'
                            : 'bg-[#FECDD3] border-[#E11D48] text-[#9F1239]'
                        }`}
                      >
                        {r.category}
                      </span>
                    </td>

                    {/* Theme */}
                    <td className="py-3 px-3 text-xs text-[#4A4A4A]">
                      {r.theme}
                    </td>

                    {/* Total Submitted */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#1E1E1E]">
                      {r.submitted_count}
                    </td>

                    {/* Surge Delta */}
                    <td className="py-3 px-4 text-right font-mono font-black text-sm bg-[#FECDD3]/40 border-l-2 border-[#1E1E1E]">
                      {rawDelta !== null ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                            delta > 0
                              ? isHighMover
                                ? 'bg-[#E11D48] text-white border-[#9F1239] shadow-[1px_1px_0px_#1E1E1E]'
                                : 'bg-[#FEF08A] text-[#854D0E] border-[#CA8A04]'
                              : 'bg-white text-[#6B7280] border-[#D1D5DB]'
                          }`}
                        >
                          {isHighMover && <Flame size={13} />}
                          <span>+{delta}</span>
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                    </td>

                    {/* Remaining Slots */}
                    <td className="py-3 px-4 text-right font-mono text-xs text-[#4A4A4A]">
                      {r.remaining_slots !== null ? r.remaining_slots : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
