import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { PSRecord, SnapshotEvent } from '../types';
import { calculatePSMetrics } from '../utils/metrics';
import { useWatchlist } from '../context/WatchlistContext';
import { DoodleStar, DoodleUnderline, DoodleTape } from '../utils/doodleIcons';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Flame,
  Clock,
  CheckCircle2,
  Lock,
  FileText,
  TrendingUp,
  BarChart3,
  HelpCircle
} from 'lucide-react';

interface PSDetailPageProps {
  records: PSRecord[];
  snapshots: SnapshotEvent[];
}

export const PSDetailPage: React.FC<PSDetailPageProps> = ({ records, snapshots }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isWatchlisted, toggleWatchlist } = useWatchlist();

  const record = useMemo(() => {
    return records.find((r) => r.ps_id.toLowerCase() === id?.toLowerCase());
  }, [records, id]);

  const metrics = useMemo(() => {
    if (!record) return null;
    return calculatePSMetrics(record, snapshots);
  }, [record, snapshots]);

  const psSnapshots = useMemo(() => {
    if (!record) return [];
    const sorted = snapshots
      .filter((s) => s.ps_id.toLowerCase() === record.ps_id.toLowerCase())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Deduplicate snapshots that are within 1 hour of each other to filter out rapid test runs
    const deduped: SnapshotEvent[] = [];
    for (const snap of sorted) {
      if (deduped.length === 0) {
        deduped.push(snap);
      } else {
        const lastMs = new Date(deduped[deduped.length - 1].timestamp).getTime();
        const currMs = new Date(snap.timestamp).getTime();
        if (currMs - lastMs < 60 * 60 * 1000) {
          deduped[deduped.length - 1] = snap;
        } else {
          deduped.push(snap);
        }
      }
    }
    return deduped;
  }, [record, snapshots]);

  // Transform snapshots for Cumulative Line Chart (12-hour IST format with cadence tracking)
  const lineChartData = useMemo(() => {
    return psSnapshots.map((s, idx) => {
      const d = new Date(s.timestamp);
      const timeStr = `${d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'numeric',
        day: 'numeric'
      })} ${d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;

      const fullTimeStr = `${d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric'
      })}, ${d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })} IST`;

      let note = '';
      if (idx > 0) {
        const prevMs = new Date(psSnapshots[idx - 1].timestamp).getTime();
        const currMs = d.getTime();
        const diffHours = (currMs - prevMs) / (60 * 60 * 1000);
        if (Math.abs(diffHours - 6) > 1.5) {
          note = `Interval ~${diffHours.toFixed(1)}h (runner queue delay)`;
        } else {
          note = `Standard ~${diffHours.toFixed(1)}h scrape interval`;
        }
      } else {
        note = 'Initial recorded scrape baseline';
      }

      return {
        timestamp: timeStr,
        fullTimeStr,
        submitted: s.submitted_count,
        note
      };
    });
  }, [psSnapshots]);

  // Aggregate by Indian Standard Time (IST) calendar day for Daily Delta Bar Chart
  const barChartData = useMemo(() => {
    const dailyMap = new Map<string, number[]>();
    for (const s of psSnapshots) {
      const dateKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(s.timestamp));

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }
      dailyMap.get(dateKey)!.push(s.submitted_count);
    }

    const result: { date: string; delta: number; count: number }[] = [];
    const sortedDates = Array.from(dailyMap.keys()).sort();

    let prevDayFinal = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const counts = dailyMap.get(date)!;
      const dayEndCount = counts[counts.length - 1];
      const delta = i === 0 ? counts[0] : Math.max(0, dayEndCount - prevDayFinal);
      prevDayFinal = dayEndCount;

      const [y, m, d] = date.split('-');
      result.push({
        date: `${Number(m)}/${Number(d)}`,
        delta,
        count: dayEndCount
      });
    }

    return result;
  }, [psSnapshots]);

  if (!record) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-3xl font-black text-[#1E1E1E]">Problem Statement Not Found</h1>
        <p className="text-sm text-[#666666]">
          No problem statement exists with ID: <strong>{id}</strong>
        </p>
        <Link
          to="/"
          className="sketch-btn inline-flex items-center gap-2 px-5 py-2.5 bg-[#FEF08A] font-bold rounded-sketch-sm"
        >
          <ArrowLeft size={16} /> Return to Leaderboard
        </Link>
      </div>
    );
  }

  const isStarred = isWatchlisted(record.ps_id);
  const percentFilled = record.cap
    ? Math.min(100, (record.submitted_count / record.cap) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="sketch-btn inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#FAF8F5] text-xs font-bold rounded-sketch-sm hover:bg-[#EFE7DA] cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to List
        </button>

        <button
          onClick={() => toggleWatchlist(record.ps_id)}
          className={`sketch-btn inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-sketch-sm cursor-pointer ${
            isStarred ? 'bg-[#FACC15] text-[#1E1E1E]' : 'bg-[#FAF8F5] text-[#1E1E1E]'
          }`}
        >
          <DoodleStar filled={isStarred} size={18} />
          <span>{isStarred ? 'Saved in Watchlist' : 'Add to Watchlist'}</span>
        </button>
      </div>

      {/* Main PS Card */}
      <div className="relative bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch p-6 sm:p-8 shadow-sketch space-y-6">
        <DoodleTape
          className="absolute -top-3 left-12 w-32 h-6"
          color="#FEF08A"
          rotation="rotate-[-1.5deg]"
        />

        {/* Header Badges */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <span className="font-mono text-xs font-black px-2.5 py-1 bg-[#FAF8F5] border-2 border-[#1E1E1E] rounded shadow-[1px_1px_0px_#1E1E1E]">
            {record.ps_id}
          </span>
          <span
            className={`text-xs font-bold px-3 py-1 border-2 border-[#1E1E1E] rounded-full shadow-[1px_1px_0px_#1E1E1E] ${
              record.category === 'Software' ? 'bg-[#BAE6FD]' : 'bg-[#FECDD3]'
            }`}
          >
            {record.category}
          </span>
          <span className="text-xs font-bold px-3 py-1 bg-[#E9D5FF] border-2 border-[#1E1E1E] rounded-full shadow-[1px_1px_0px_#1E1E1E]">
            {record.theme}
          </span>
          {record.is_frozen ? (
            <span className="text-xs font-bold px-3 py-1 bg-[#FEE2E2] text-[#991B1B] border-2 border-[#EF4444] rounded-full flex items-center gap-1">
              <Lock size={12} /> Closed / Frozen
            </span>
          ) : (
            <span className="text-xs font-bold px-3 py-1 bg-[#DCFCE7] text-[#166534] border-2 border-[#22C55E] rounded-full flex items-center gap-1">
              <CheckCircle2 size={12} /> Open for Submissions
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1E1E] tracking-tight leading-tight">
            {record.title}
          </h1>
          <DoodleUnderline color="#BAE6FD" className="w-48 h-3 mt-1" />
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Organization */}
          <div className="p-3.5 bg-[#FAF8F5] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#666666]">
              <Building2 size={14} /> Organization
            </div>
            <div className="mt-1 font-bold text-sm text-[#1E1E1E] line-clamp-2">
              {record.organization}
            </div>
            {record.department && record.department !== record.organization && (
              <div className="text-xs text-[#555555] mt-0.5">{record.department}</div>
            )}
          </div>

          {/* Submitted vs Cap */}
          <div className="p-3.5 bg-[#FFF9C4] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm">
            <div className="flex items-center justify-between text-xs font-bold text-[#666666]">
              <span>Submissions</span>
              <span>{record.cap ? `Cap: ${record.cap}` : 'No Cap'}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono font-black text-2xl text-[#1E1E1E]">
                {record.submitted_count}
              </span>
              <span className="text-xs font-bold text-[#555555]">
                ({percentFilled.toFixed(1)}% full)
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-white border border-[#1E1E1E] rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full ${
                  record.submitted_count > 350
                    ? 'bg-[#EF4444]'
                    : record.submitted_count > 150
                    ? 'bg-[#F59E0B]'
                    : 'bg-[#10B981]'
                }`}
                style={{ width: `${percentFilled}%` }}
              />
            </div>
          </div>

          {/* Velocity & Spikes */}
          <div className="p-3.5 bg-[#FECDD3] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#9F1239]">
              <Flame size={14} /> 24h & 7d Velocity
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <div>
                <span className="text-[11px] font-bold text-[#888888] block">24h Delta</span>
                <span className="font-mono font-black text-lg text-[#1E1E1E]">
                  {metrics?.delta_24h !== null ? `+${metrics?.delta_24h}` : '—'}
                </span>
              </div>
              <div className="border-l border-[#1E1E1E]/20 pl-3">
                <span className="text-[11px] font-bold text-[#888888] block">7d Delta</span>
                <span className="font-mono font-black text-lg text-[#1E1E1E]">
                  {metrics?.delta_7d !== null ? `+${metrics?.delta_7d}` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Days to Cap Projection */}
          <div className="p-3.5 bg-[#BBF7D0] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#166534]">
              <Clock size={14} /> Days to Cap (500)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono font-black text-2xl text-[#1E1E1E]">
                {metrics?.days_to_cap !== null && metrics?.days_to_cap !== undefined
                  ? `${metrics.days_to_cap} d`
                  : '—'}
              </span>
              <span className="text-xs font-medium text-[#166534]">
                {metrics?.avg_daily_rate ? `~${metrics.avg_daily_rate}/day` : 'Quiet'}
              </span>
            </div>
            <div className="text-[11px] text-[#4A4A4A] mt-0.5">
              {record.remaining_slots !== null ? `${record.remaining_slots} slots remaining` : ''}
            </div>
          </div>
        </div>

        {/* Dataset / Links if present */}
        {record.dataset_link && (
          <div className="pt-2">
            <a
              href={record.dataset_link}
              target="_blank"
              rel="noreferrer"
              className="sketch-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FEF08A] text-xs font-bold rounded-sketch-sm"
            >
              <ExternalLink size={13} /> View Attached Dataset
            </a>
          </div>
        )}
      </div>

      {/* Analytics Charts Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-3.5 py-2 bg-[#FAF8F5] border-2 border-[#1E1E1E] rounded-sketch-sm text-xs text-[#555555]">
          <Clock size={14} className="text-[#2563EB] shrink-0" />
          <span>
            <strong>IST Scrape Cadence:</strong> Timestamps show real fetch executions in Indian Standard Time (IST). Early runs reflect slight timing variance due to GitHub CI runner queues before settling into regular 6-hour slots.
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cumulative Submissions Line Chart */}
          <div className="bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch p-5 sm:p-6 shadow-sketch space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#1E1E1E] flex items-center gap-2">
                <TrendingUp size={18} className="text-[#2563EB]" />
                Cumulative Submissions Over Time
              </h3>
              <span className="font-hand text-sm text-[#666666]">Recharts Timeline</span>
            </div>

            <p className="text-xs text-[#666666]">
              Tracks how total submitted ideas grow across consecutive scrape snapshots in IST.
            </p>

            <div className="h-64 w-full pt-2">
              {lineChartData.length > 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#1E1E1E"
                      fontSize={10}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="#1E1E1E" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="bg-[#FAF8F5] border-2 border-[#1E1E1E] rounded-sketch-sm p-3 shadow-sketch-sm text-xs space-y-1">
                            <div className="font-bold text-[#1E1E1E]">{item.fullTimeStr}</div>
                            <div className="font-mono font-black text-sm text-[#2563EB]">
                              {item.submitted} total submissions
                            </div>
                            {item.note && (
                              <div className="font-hand text-[11px] text-[#666666] border-t border-[#1E1E1E]/20 pt-1">
                                {item.note}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="submitted"
                      name="Submissions"
                      stroke="#2563EB"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#FEF08A', stroke: '#1E1E1E', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#2563EB', stroke: '#1E1E1E' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2 bg-[#FAF8F5] border-2 border-dashed border-[#D1D5DB] rounded-sketch-sm">
                  <HelpCircle size={32} className="text-[#9CA3AF]" />
                  <p className="font-sketch font-bold text-base text-[#1E1E1E]">
                    Only {lineChartData.length} snapshot{lineChartData.length === 1 ? '' : 's'} recorded so far.
                  </p>
                  <p className="font-hand text-xs text-[#666666] max-w-sm">
                    What do you want me to draw, a single dot? Real trajectories need consecutive scrape cycles. Check back once the cron accumulates data.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Daily Delta New Submissions Bar Chart */}
          <div className="bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch p-5 sm:p-6 shadow-sketch space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#1E1E1E] flex items-center gap-2">
                <BarChart3 size={18} className="text-[#F43F5E]" />
                Daily New Submissions (Spike Detection)
              </h3>
              <span className="font-hand text-sm text-[#666666]">Velocity View</span>
            </div>

            <p className="text-xs text-[#666666]">
              New submissions grouped by Indian Standard Time (IST) calendar day.
            </p>

            <div className="h-64 w-full pt-2">
              {barChartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" />
                    <XAxis dataKey="date" stroke="#1E1E1E" fontSize={11} tickLine={false} />
                    <YAxis stroke="#1E1E1E" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="bg-[#FAF8F5] border-2 border-[#1E1E1E] rounded-sketch-sm p-3 shadow-sketch-sm text-xs space-y-1">
                            <div className="font-bold text-[#1E1E1E]">Date: {item.date} (IST)</div>
                            <div className="font-mono font-black text-sm text-[#F43F5E]">
                              +{item.delta} new ideas
                            </div>
                            <div className="text-[11px] text-[#666666]">
                              Day-end total: {item.count}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="delta" name="New Submissions" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2 bg-[#FAF8F5] border-2 border-dashed border-[#D1D5DB] rounded-sketch-sm">
                  <BarChart3 size={32} className="text-[#9CA3AF]" />
                  <p className="font-sketch font-bold text-base text-[#1E1E1E]">
                    No velocity spikes detected yet.
                  </p>
                  <p className="font-hand text-xs text-[#666666] max-w-sm">
                    Daily delta requires at least 2 distinct calendar days. Right now everyone is still procrastinating their idea submission anyway.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Problem Statement Full Description Card */}
      <div className="relative bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch p-6 sm:p-8 shadow-sketch space-y-4">
        <div className="flex items-center gap-2 font-black text-lg text-[#1E1E1E]">
          <FileText size={20} className="text-[#2563EB]" />
          <h2>Problem Statement Description</h2>
        </div>

        <div className="prose max-w-none text-sm leading-relaxed text-[#2D2D2D] bg-[#FAF8F5] p-5 border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm whitespace-pre-wrap">
          {record.description || 'No detailed description provided by the official portal.'}
        </div>
      </div>
    </div>
  );
};
