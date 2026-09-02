import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PSRecord, SnapshotEvent, PSMetrics } from '../types';
import { calculatePSMetrics } from '../utils/metrics';
import { useWatchlist } from '../context/WatchlistContext';
import { MetricCard } from '../components/MetricCard';
import { DoodleStar } from '../utils/doodleIcons';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Flame,
  Layers,
  Sparkles,
  TrendingDown,
  Lock,
  Unlock,
  Check
} from 'lucide-react';

interface LeaderboardPageProps {
  records: PSRecord[];
  snapshots: SnapshotEvent[];
}

type SortField = 'submitted_count' | 'delta_24h' | 'delta_7d' | 'remaining_slots' | 'ps_id';
type SortDirection = 'asc' | 'desc';

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ records, snapshots }) => {
  const navigate = useNavigate();
  const { isWatchlisted, toggleWatchlist } = useWatchlist();

  // Metrics cache map
  const metricsMap = useMemo(() => {
    const map = new Map<string, PSMetrics>();
    for (const record of records) {
      map.set(record.ps_id, calculatePSMetrics(record, snapshots));
    }
    return map;
  }, [records, snapshots]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Software' | 'Hardware'>('All');
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [orgQuery, setOrgQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Frozen'>('All');

  // Sort State (Default sort: submitted_count descending)
  const [sortField, setSortField] = useState<SortField>('submitted_count');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Unique Themes & Orgs
  const allThemes = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.theme) set.add(r.theme);
    });
    return Array.from(set).sort();
  }, [records]);

  // Summary Metrics for top cards
  const stats = useMemo(() => {
    const totalPs = records.length;
    let totalSubmissions = 0;
    let lowCompCount = 0;
    let spikingCount = 0;
    let frozenCount = 0;

    for (const r of records) {
      totalSubmissions += r.submitted_count;
      if (r.submitted_count < 10) lowCompCount++;
      if (r.is_frozen) frozenCount++;
      const m = metricsMap.get(r.ps_id);
      if (m?.delta_24h && m.delta_24h >= 5) spikingCount++;
    }

    return {
      totalPs,
      totalSubmissions,
      lowCompCount,
      spikingCount,
      frozenCount
    };
  }, [records, metricsMap]);

  // Handle header sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default to ascending for competition, descending for velocity
      setSortDirection(field === 'delta_24h' || field === 'delta_7d' ? 'desc' : 'asc');
    }
  };

  // Filtered & Sorted items
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        // Free text search (ID or Title)
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = r.title.toLowerCase().includes(q);
          const matchId = r.ps_id.toLowerCase().includes(q);
          const matchOrg = r.organization.toLowerCase().includes(q);
          if (!matchTitle && !matchId && !matchOrg) return false;
        }

        // Category filter
        if (categoryFilter !== 'All' && r.category !== categoryFilter) {
          return false;
        }

        // Theme filter
        if (selectedThemes.length > 0 && !selectedThemes.includes(r.theme)) {
          return false;
        }

        // Org query
        if (orgQuery && !r.organization.toLowerCase().includes(orgQuery.toLowerCase())) {
          return false;
        }

        // Status filter
        if (statusFilter === 'Open' && r.is_frozen) return false;
        if (statusFilter === 'Frozen' && !r.is_frozen) return false;

        return true;
      })
      .sort((a, b) => {
        const metricA = metricsMap.get(a.ps_id);
        const metricB = metricsMap.get(b.ps_id);

        let valA: number | string = 0;
        let valB: number | string = 0;

        switch (sortField) {
          case 'ps_id':
            valA = a.ps_id;
            valB = b.ps_id;
            break;
          case 'submitted_count':
            valA = a.submitted_count;
            valB = b.submitted_count;
            break;
          case 'delta_24h':
            valA = metricA?.delta_24h ?? -1;
            valB = metricB?.delta_24h ?? -1;
            break;
          case 'delta_7d':
            valA = metricA?.delta_7d ?? -1;
            valB = metricB?.delta_7d ?? -1;
            break;
          case 'remaining_slots':
            valA = a.remaining_slots ?? -1;
            valB = b.remaining_slots ?? -1;
            break;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return sortDirection === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      });
  }, [
    records,
    searchQuery,
    categoryFilter,
    selectedThemes,
    orgQuery,
    statusFilter,
    sortField,
    sortDirection,
    metricsMap
  ]);

  const toggleTheme = (theme: string) => {
    setSelectedThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Problem Statements"
          value={stats.totalPs}
          subtitle="Live from SIH official portal"
          bg="bg-[#FFF9C4]"
          pinColor="#EF4444"
          icon={<Layers size={22} />}
          rotation="rotate-[-1deg]"
        />
        <MetricCard
          title="Total Submissions"
          value={stats.totalSubmissions}
          subtitle="Accumulated across all tracks"
          bg="bg-[#BAE6FD]"
          pinColor="#2563EB"
          icon={<Sparkles size={22} />}
          rotation="rotate-[1deg]"
        />
        <MetricCard
          title="Low Competition PS"
          value={stats.lowCompCount}
          subtitle="< 10 submissions (best opportunities)"
          bg="bg-[#BBF7D0]"
          pinColor="#10B981"
          badge="Prime Picks"
          icon={<TrendingDown size={22} />}
          rotation="rotate-[-0.5deg]"
        />
        <MetricCard
          title="24h High Velocity"
          value={stats.spikingCount}
          subtitle="PS spiking fast in the last 24h"
          bg="bg-[#FECDD3]"
          pinColor="#F43F5E"
          badge="Watch Out"
          icon={<Flame size={22} className="text-[#F43F5E]" />}
          rotation="rotate-[0.5deg]"
        />
      </div>

      {/* Main Filter & Search Notebook Bar */}
      <div className="bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch p-5 sm:p-6 shadow-sketch space-y-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Free Text Search */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PS ID (e.g. SIH26001), keywords, or organization..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#FEF08A] font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-1.5 py-0.5 bg-[#EFE7DA] border border-[#1E1E1E] rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2">
            <span className="font-hand text-base font-bold text-[#4A4A4A]">Category:</span>
            {(['All', 'Software', 'Hardware'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`sketch-btn px-3 py-1.5 text-xs font-bold rounded-sketch-sm cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#1E1E1E] text-white'
                    : 'bg-[#FAF8F5] text-[#1E1E1E] hover:bg-[#FEF08A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Open / Frozen Status Toggle */}
          <div className="flex items-center gap-2">
            <span className="font-hand text-base font-bold text-[#4A4A4A]">Status:</span>
            {(['All', 'Open', 'Frozen'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`sketch-btn px-2.5 py-1.5 text-xs font-bold rounded-sketch-sm flex items-center gap-1 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#1E1E1E] text-white'
                    : 'bg-[#FAF8F5] text-[#1E1E1E] hover:bg-[#BBF7D0]'
                }`}
              >
                {st === 'Open' && <Unlock size={12} />}
                {st === 'Frozen' && <Lock size={12} />}
                <span>{st}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Pills Scroll */}
        <div className="pt-2 border-t-2 border-dashed border-[#1E1E1E]/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[#1E1E1E]" />
              <span className="font-hand text-base font-bold text-[#1E1E1E]">
                Filter by Theme ({selectedThemes.length ? `${selectedThemes.length} active` : 'All'}):
              </span>
            </div>
            {selectedThemes.length > 0 && (
              <button
                onClick={() => setSelectedThemes([])}
                className="text-xs font-bold text-[#EF4444] hover:underline"
              >
                Reset themes
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {allThemes.map((theme) => {
              const active = selectedThemes.includes(theme);
              return (
                <button
                  key={theme}
                  onClick={() => toggleTheme(theme)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    active
                      ? 'bg-[#FEF08A] border-[#1E1E1E] font-bold shadow-[2px_2px_0px_#1E1E1E]'
                      : 'bg-[#FAF8F5] border-[#1E1E1E]/40 text-[#4A4A4A] hover:border-[#1E1E1E]'
                  }`}
                >
                  {active && <Check size={11} className="stroke-[3]" />}
                  <span>{theme}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Header with Count & Active Sort Note */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#1E1E1E]">
            Problem Statements
          </h2>
          <span className="font-hand text-lg text-[#555555]">
            Showing <strong className="text-[#1E1E1E]">{filteredRecords.length}</strong> of{' '}
            {records.length}
          </span>
        </div>

        <div className="text-xs font-medium text-[#666666] flex items-center gap-1.5 bg-[#FAF8F5] px-3 py-1 rounded border border-[#1E1E1E]">
          <span>Sorted by:</span>
          <span className="font-bold text-[#1E1E1E] uppercase">
            {sortField.replace('_', ' ')} ({sortDirection})
          </span>
          <span className="text-[10px] text-[#888888]">(Click any column header to toggle)</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="relative bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch shadow-sketch overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#EFE7DA] border-b-2 border-[#1E1E1E] text-xs font-bold text-[#1E1E1E] uppercase tracking-wider select-none">
                <th className="py-3 px-3 w-12 text-center">⭐</th>
                <th
                  onClick={() => handleSort('ps_id')}
                  className="py-3 px-4 cursor-pointer hover:bg-[#E2D6C3] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>PS ID</span>
                    {sortField === 'ps_id' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[280px]">Title & Organization</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 min-w-[140px]">Theme</th>
                <th
                  onClick={() => handleSort('submitted_count')}
                  className="py-3 px-4 cursor-pointer hover:bg-[#E2D6C3] transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Submitted</span>
                    {sortField === 'submitted_count' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('delta_24h')}
                  className="py-3 px-3 cursor-pointer hover:bg-[#E2D6C3] transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Δ 24h</span>
                    {sortField === 'delta_24h' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('delta_7d')}
                  className="py-3 px-3 cursor-pointer hover:bg-[#E2D6C3] transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Δ 7d</span>
                    {sortField === 'delta_7d' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('remaining_slots')}
                  className="py-3 px-4 cursor-pointer hover:bg-[#E2D6C3] transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Remaining</span>
                    {sortField === 'remaining_slots' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-[#1E1E1E]/10 text-sm">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="text-4xl">🔍</span>
                      <p className="font-hand text-xl font-bold text-[#1E1E1E]">
                        No problem statements matched your filters!
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setCategoryFilter('All');
                          setSelectedThemes([]);
                          setStatusFilter('All');
                        }}
                        className="sketch-btn px-4 py-1.5 bg-[#FEF08A] text-xs font-bold rounded-sketch-sm"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const m = metricsMap.get(r.ps_id);
                  const isStarred = isWatchlisted(r.ps_id);

                  // Velocity highlight
                  const hasFastSpike = m?.delta_24h && m.delta_24h >= 5;
                  const isLowComp = r.submitted_count < 10;

                  return (
                    <tr
                      key={r.ps_id}
                      onClick={() => navigate(`/ps/${r.ps_id}`)}
                      className="group hover:bg-[#FEFCE8] cursor-pointer transition-colors"
                    >
                      {/* Star (Watchlist) */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(r.ps_id);
                        }}
                      >
                        <button
                          title={isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}
                          className="p-1 hover:scale-125 transition-transform"
                        >
                          <DoodleStar filled={isStarred} size={20} />
                        </button>
                      </td>

                      {/* PS ID */}
                      <td className="py-3 px-4 font-mono font-bold text-xs text-[#1E1E1E]">
                        <span className="bg-[#FAF8F5] px-2 py-1 border border-[#1E1E1E] rounded shadow-[1px_1px_0px_#1E1E1E]">
                          {r.ps_id}
                        </span>
                      </td>

                      {/* Title & Organization */}
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
                      <td className="py-3 px-3 text-xs font-medium text-[#4A4A4A]">
                        {r.theme}
                      </td>

                      {/* Submitted Count */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-mono font-extrabold text-sm ${
                              isLowComp ? 'text-[#15803D]' : 'text-[#1E1E1E]'
                            }`}
                          >
                            {r.submitted_count}
                          </span>
                          {/* Mini Progress Bar vs 500 cap */}
                          {r.cap && (
                            <div className="w-16 h-1.5 bg-[#E5E0D8] border border-[#1E1E1E] rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full ${
                                  r.submitted_count > 300
                                    ? 'bg-[#EF4444]'
                                    : r.submitted_count > 100
                                    ? 'bg-[#F59E0B]'
                                    : 'bg-[#10B981]'
                                }`}
                                style={{
                                  width: `${Math.min(100, (r.submitted_count / r.cap) * 100)}%`
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Delta 24h */}
                      <td className="py-3 px-3 text-right font-mono text-xs font-bold">
                        {m?.delta_24h !== null && m?.delta_24h !== undefined ? (
                          <span
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border ${
                              m.delta_24h > 0
                                ? hasFastSpike
                                  ? 'bg-[#FECDD3] border-[#F43F5E] text-[#BE123C]'
                                  : 'bg-[#FEF08A] border-[#CA8A04] text-[#854D0E]'
                                : 'bg-[#FAF8F5] border-[#D1D5DB] text-[#6B7280]'
                            }`}
                          >
                            {hasFastSpike && <Flame size={12} className="text-[#E11D48]" />}
                            <span>+{m.delta_24h}</span>
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>

                      {/* Delta 7d */}
                      <td className="py-3 px-3 text-right font-mono text-xs font-bold">
                        {m?.delta_7d !== null && m?.delta_7d !== undefined ? (
                          <span className="text-[#4A4A4A]">+{m.delta_7d}</span>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>

                      {/* Remaining Slots */}
                      <td className="py-3 px-4 text-right font-mono text-xs font-medium text-[#4A4A4A]">
                        {r.remaining_slots !== null ? r.remaining_slots : '—'}
                      </td>

                      {/* Status / Frozen Badge */}
                      <td className="py-3 px-3 text-center">
                        {r.is_frozen ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-[#FEE2E2] text-[#991B1B] border border-[#EF4444] rounded-full">
                            <Lock size={10} /> Frozen
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-[#DCFCE7] text-[#166534] border border-[#22C55E] rounded-full">
                            Open
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
