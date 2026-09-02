import React from 'react';
import { DoodleTape } from '../utils/doodleIcons';
import { ExternalLink, ShieldCheck, GitBranch, Target } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative mt-16 bg-[#FFFDF9] border-t-3 border-[#1E1E1E] py-10 px-4 sm:px-8 shadow-[0_-4px_0px_#1E1E1E]">
      <DoodleTape
        className="absolute -top-3 right-24 w-28 h-6"
        color="#BAE6FD"
        rotation="rotate-[-1deg]"
      />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[#4A4A4A]">
        <div className="space-y-2 text-center md:text-left max-w-xl">
          <div className="flex items-center justify-center md:justify-start gap-2 font-bold text-[#1E1E1E]">
            <ShieldCheck size={18} className="text-[#10B981]" />
            <span>Unofficial & Independent Project</span>
          </div>
          <p className="text-xs leading-relaxed text-[#555555]">
            Problem statement data sourced directly from Smart India Hackathon (<a
              href="https://sih.gov.in/sih2026PS"
              target="_blank"
              rel="noreferrer"
              className="underline font-medium hover:text-[#1E1E1E] inline-flex items-center gap-0.5"
            >
              sih.gov.in/sih2026PS <ExternalLink size={12} />
            </a>). This tool is not affiliated with or endorsed by SIH, AICTE, or the Government of India. Data used under CC BY 4.0 guidelines.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm font-mono">
            <GitBranch size={14} className="text-[#2563EB]" />
            <span>Git-Scraped every 6h via GitHub Actions</span>
          </div>

          <span className="font-hand text-base text-[#1E1E1E] font-bold flex items-center gap-1.5">
            Built for smart hackathon strategists <Target size={16} className="text-[#EF4444]" />
          </span>
        </div>
      </div>
    </footer>
  );
};
