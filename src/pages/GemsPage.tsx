import React, { useMemo, useEffect, useState } from 'react';
import type { PSRecord, SnapshotEvent } from '../types';
import { computeGemAnalyses } from '../utils/metrics';
import { PSGemCard } from '../components/PSGemCard';
import { DoodleUnderline, DoodleTape } from '../utils/doodleIcons';
import { Gem, Flame, ShieldCheck, HelpCircle, Info } from 'lucide-react';

interface GemsPageProps {
  records: PSRecord[];
  snapshots: SnapshotEvent[];
}

export const GemsPage: React.FC<GemsPageProps> = ({ records, snapshots }) => {
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Software' | 'Hardware'>('All');

  // Remember and restore scroll position when navigating to detail and back
  useEffect(() => {
    const savedPos = sessionStorage.getItem('gems_scroll_pos');
    if (savedPos) {
      window.scrollTo(0, parseInt(savedPos, 10));
    }

    const handleScroll = () => {
      sessionStorage.setItem('gems_scroll_pos', window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Compute gem analyses
  const { safePicks, surgingPicks, p25Cutoff } = useMemo(() => {
    return computeGemAnalyses(records, snapshots);
  }, [records, snapshots]);

  // Filter picks by Software / Hardware
  const filteredSafePicks = useMemo(() => {
    if (categoryFilter === 'All') return safePicks;
    return safePicks.filter((p) => p.record.category === categoryFilter);
  }, [safePicks, categoryFilter]);

  const filteredSurgingPicks = useMemo(() => {
    if (categoryFilter === 'All') return surgingPicks;
    return surgingPicks.filter((p) => p.record.category === categoryFilter);
  }, [surgingPicks, categoryFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Title Card */}
      <div className="relative bg-[#FFFDF9] border-3 border-[#1E1E1E] rounded-sketch p-6 sm:p-8 shadow-sketch">
        <DoodleTape
          className="absolute -top-3 left-10 w-28 h-6 hidden sm:block"
          color="#BBF7D0"
          rotation="rotate-[-2deg]"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#BBF7D0] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-[2px_2px_0px_#1E1E1E]">
                <Gem size={24} className="text-[#15803D]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1E1E1E] tracking-tight">
                Prime Picks — Low Competition
              </h1>
            </div>
            <div className="relative inline-block">
              <p className="font-hand text-lg text-[#555555]">
                Curated problem statements in the bottom 25% of submissions, scored by low velocity and slot buffers.
              </p>
              <DoodleUnderline color="#BBF7D0" className="w-full h-2.5 -mt-1" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="px-3.5 py-1.5 bg-[#FEF08A] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm font-mono text-xs font-black">
              Cutoff: ≤ {p25Cutoff} Subs
            </div>
            <div className="px-3.5 py-1.5 bg-[#BBF7D0] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm font-mono text-xs font-black">
              {filteredSafePicks.length} Safe {filteredSafePicks.length === 1 ? 'Pick' : 'Picks'}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Bar (Software / Hardware) */}
      <div className="flex items-center gap-2 bg-[#FFFDF9] border-2 border-[#1E1E1E] rounded-sketch-sm p-2 shadow-sketch-sm w-fit">
        <span className="font-hand text-base font-bold text-[#4A4A4A] pl-2">Track:</span>
        {(['All', 'Software', 'Hardware'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`sketch-btn px-3 py-1.5 text-xs font-bold rounded-sketch-sm transition-all cursor-pointer ${
              categoryFilter === cat
                ? 'bg-[#1E1E1E] text-white shadow-[2px_2px_0px_#BBF7D0]'
                : 'bg-[#FAF8F5] text-[#1E1E1E] hover:bg-[#EFE7DA]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Safe Picks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#16A34A]" />
            <h2 className="text-xl font-black text-[#1E1E1E]">
              Safe Prime Picks ({filteredSafePicks.length})
            </h2>
          </div>
          <span className="text-xs text-[#666666] font-mono hidden sm:inline">
            Ranked by lowest competition &amp; slot buffer
          </span>
        </div>

        {filteredSafePicks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSafePicks.map((analysis) => (
              <PSGemCard key={analysis.record.ps_id} analysis={analysis} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#FFFDF9] border-2 border-dashed border-[#1E1E1E] rounded-sketch space-y-2">
            <HelpCircle size={32} className="mx-auto text-[#9CA3AF]" />
            <p className="font-bold text-[#1E1E1E]">No {categoryFilter !== 'All' ? categoryFilter : ''} safe picks available</p>
            <p className="text-xs text-[#666666]">
              All problem statements in this cutoff either have rapid velocity or insufficient snapshot history.
            </p>
          </div>
        )}
      </div>

      {/* Getting Caught On (Surging) Section */}
      {filteredSurgingPicks.length > 0 && (
        <div className="space-y-4 pt-6 border-t-3 border-dashed border-[#E11D48]/30">
          <div className="bg-[#FFF5F5] border-2 border-[#E11D48] rounded-sketch p-4 sm:p-5 shadow-[3px_3px_0px_#E11D48] space-y-1">
            <div className="flex items-center gap-2">
              <Flame size={20} className="text-[#E11D48] fill-[#FCA5A5]" />
              <h2 className="text-xl font-black text-[#9F1239]">
                Getting Caught On — Recent Surges ({filteredSurgingPicks.length})
              </h2>
            </div>
            <p className="text-xs text-[#7F1D1D] leading-relaxed">
              These problem statements fall within the low submission count cutoff (≤ {p25Cutoff} ideas),
              but experienced a <strong>recent velocity surge (&gt;20% in 12h or &gt;25% in 48h)</strong>.
              Flagged with red borders so you avoid walking into a sudden crowd trap.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSurgingPicks.map((analysis) => (
              <PSGemCard key={analysis.record.ps_id} analysis={analysis} />
            ))}
          </div>
        </div>
      )}

      {/* Methodology Explainer Footer */}
      <div className="bg-[#FAF8F5] border-2 border-[#1E1E1E] rounded-sketch p-6 shadow-sketch-sm space-y-3">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-[#2563EB]" />
          <h3 className="font-bold text-sm text-[#1E1E1E]">
            How Prime Picks &amp; Safety Scores Work
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-[#555555]">
          <div className="bg-white p-3 border border-[#1E1E1E]/20 rounded space-y-1">
            <div className="font-bold text-[#1E1E1E]">1. Submission Cutoff (40%)</div>
            <p>Only problem statements in the bottom 25% of submitted counts qualify. Fewer ideas = higher base score.</p>
          </div>
          <div className="bg-white p-3 border border-[#1E1E1E]/20 rounded space-y-1">
            <div className="font-bold text-[#1E1E1E]">2. Slots Buffer (25%)</div>
            <p>Compares remaining slots against the cap. High capacity remaining provides a safety barrier against saturation.</p>
          </div>
          <div className="bg-white p-3 border border-[#1E1E1E]/20 rounded space-y-1">
            <div className="font-bold text-[#1E1E1E]">3. Age Without Traction (20%)</div>
            <p>Rewards PS that have been live for multiple days while remaining completely untouched by other teams.</p>
          </div>
          <div className="bg-white p-3 border border-[#1E1E1E]/20 rounded space-y-1">
            <div className="font-bold text-[#1E1E1E]">4. Surge Trap Detection</div>
            <p>Aggressively flags any PS where last 12h gains exceed 20% of its total count, or 24h delta hits double digits.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
