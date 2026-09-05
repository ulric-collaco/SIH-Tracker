import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { GemAnalysis } from '../types';
import { useWatchlist } from '../context/WatchlistContext';
import { DoodleStar } from '../utils/doodleIcons';
import { Flame, ShieldCheck, ShieldAlert, Users, Layers, ExternalLink } from 'lucide-react';

interface PSGemCardProps {
  analysis: GemAnalysis;
}

export const PSGemCard: React.FC<PSGemCardProps> = ({ analysis }) => {
  const navigate = useNavigate();
  const { watchlist, toggleWatchlist } = useWatchlist();
  const { record, safetyScore, isSurging, surgeReason, reasonTag } = analysis;

  const isStarred = watchlist.has(record.ps_id);
  const isRecentlyAdded =
    Date.now() - new Date(record.first_seen_at).getTime() < 48 * 60 * 60 * 1000;

  const getScoreColor = (score: number) => {
    if (score >= 75) {
      return {
        bg: 'bg-[#BBF7D0]',
        border: 'border-[#16A34A]',
        text: 'text-[#15803D]',
        label: 'Prime Pick'
      };
    }
    if (score >= 45) {
      return {
        bg: 'bg-[#FEF08A]',
        border: 'border-[#CA8A04]',
        text: 'text-[#854D0E]',
        label: 'Moderate Pick'
      };
    }
    return {
      bg: 'bg-[#FECDD3]',
      border: 'border-[#E11D48]',
      text: 'text-[#9F1239]',
      label: 'Watchlist'
    };
  };

  const scoreMeta = getScoreColor(safetyScore);

  return (
    <div
      onClick={() => navigate(`/ps/${record.ps_id}`)}
      className={`group relative rounded-sketch p-5 transition-all cursor-pointer flex flex-col justify-between ${
        isSurging
          ? 'bg-[#FFF5F5] border-3 border-[#E11D48] shadow-[3px_3px_0px_#E11D48] hover:shadow-[5px_5px_0px_#E11D48]'
          : 'bg-[#FFFDF9] border-2 border-[#1E1E1E] shadow-[2px_2px_0px_#1E1E1E] hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#1E1E1E]'
      }`}
    >
      {/* Surge Warning Ribbon if surging */}
      {isSurging && (
        <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1 bg-[#FEE2E2] border border-[#E11D48] rounded text-xs font-black text-[#9F1239]">
          <Flame size={14} className="text-[#E11D48] fill-[#FCA5A5] shrink-0" />
          <span className="truncate">Getting Caught On: {surgeReason}</span>
        </div>
      )}

      {/* Top row: ID, Badges, Watchlist */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono font-bold text-xs bg-[#FAF8F5] px-2 py-0.5 border border-[#1E1E1E] rounded shadow-[1px_1px_0px_#1E1E1E]">
            {record.ps_id}
          </span>
          {isRecentlyAdded && (
            <span className="px-1.5 py-0.5 bg-[#BBF7D0] border border-[#16A34A] text-[#15803D] font-extrabold text-[9px] uppercase tracking-wider rounded animate-pulse">
              NEW
            </span>
          )}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${
              record.category === 'Software'
                ? 'bg-[#BAE6FD] border-[#0284C7] text-[#0369A1]'
                : 'bg-[#FECDD3] border-[#E11D48] text-[#9F1239]'
            }`}
          >
            {record.category}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Safety Score Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-xs font-black shadow-[1px_1px_0px_#1E1E1E] ${scoreMeta.bg} ${scoreMeta.border} ${scoreMeta.text}`}
            title="Composite safety score (lower competition + higher slots buffer + low velocity = higher score)"
          >
            {safetyScore >= 75 ? (
              <ShieldCheck size={13} className="shrink-0" />
            ) : (
              <ShieldAlert size={13} className="shrink-0" />
            )}
            <span>{safetyScore}/100</span>
          </div>

          {/* Star Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWatchlist(record.ps_id);
            }}
            title={isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}
            className="p-1 hover:scale-125 transition-transform"
          >
            <DoodleStar filled={isStarred} size={20} />
          </button>
        </div>
      </div>

      {/* Title & Organization */}
      <div className="space-y-1 mb-3">
        <h3 className="font-bold text-base text-[#1E1E1E] group-hover:text-[#2563EB] transition-colors line-clamp-2 leading-snug">
          {record.title}
        </h3>
        <p className="text-xs text-[#666666] line-clamp-1">
          {record.organization}
        </p>
      </div>

      {/* Theme Pill */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4A4A4A] bg-[#FAF8F5] border border-[#1E1E1E]/30 px-2 py-0.5 rounded">
          <Layers size={11} className="text-[#666666]" />
          <span className="truncate max-w-[200px]">{record.theme}</span>
        </span>
      </div>

      {/* Metrics Row & Reason Tag Footer */}
      <div className="pt-3 border-t border-[#1E1E1E]/15 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#1E1E1E] font-medium">
            <Users size={13} className="text-[#666666]" />
            <span>Submissions:</span>
            <span className="font-bold font-mono text-[#1E1E1E]">
              {record.submitted_count}
              {record.cap ? `/${record.cap}` : ''}
            </span>
          </div>

          <div className="text-xs text-[#555555]">
            {record.remaining_slots !== null ? (
              <span className="font-semibold text-[#15803D]">
                {record.remaining_slots} slots open
              </span>
            ) : (
              <span className="text-[#888888]">No cap</span>
            )}
          </div>
        </div>

        {/* Reason Tag */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="font-mono text-[10px] text-[#666666] bg-[#FAF8F5] border border-[#E5E0D8] px-2 py-0.5 rounded truncate">
            {reasonTag}
          </span>
          <span className="text-[11px] font-bold text-[#2563EB] flex items-center gap-0.5 group-hover:underline shrink-0">
            Details <ExternalLink size={10} />
          </span>
        </div>
      </div>
    </div>
  );
};
