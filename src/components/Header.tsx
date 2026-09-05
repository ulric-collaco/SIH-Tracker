import React from 'react';
import { NavLink } from 'react-router-dom';
import { useWatchlist } from '../context/WatchlistContext';
import { DoodleUnderline, DoodleTape } from '../utils/doodleIcons';
import { Flame, Star, LayoutGrid, Clock, PenLine, Gem } from 'lucide-react';

interface HeaderProps {
  lastScrapedAt?: string;
}

export const Header: React.FC<HeaderProps> = ({ lastScrapedAt }) => {
  const { watchlistCount } = useWatchlist();

  const formattedTime = React.useMemo(() => {
    if (!lastScrapedAt) return 'Just now';
    try {
      const d = new Date(lastScrapedAt);
      return (
        d.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) + ' IST'
      );
    } catch {
      return lastScrapedAt;
    }
  }, [lastScrapedAt]);

  return (
    <header className="relative bg-[#FFFDF9] border-b-3 border-[#1E1E1E] pt-6 pb-5 px-4 sm:px-8 shadow-[0_4px_0px_#1E1E1E]">
      {/* Decorative Washi Tape on top corner */}
      <DoodleTape
        className="absolute -top-3 left-12 w-28 h-6 hidden sm:block"
        color="#FEF08A"
        rotation="rotate-[-2deg]"
      />
      <DoodleTape
        className="absolute -top-3 right-16 w-24 h-6 hidden sm:block"
        color="#FECDD3"
        rotation="rotate-[3deg]"
      />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Brand & Title */}
        <div>
          <NavLink to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 bg-[#FEF08A] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm flex items-center justify-center group-hover:rotate-6 transition-transform">
              <PenLine size={22} className="text-[#1E1E1E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-[#1E1E1E]">
                  SIH 2026
                </span>
                <span className="font-doodle text-xl font-bold bg-[#BAE6FD] px-2 py-0.5 border border-[#1E1E1E] rounded-full shadow-[1px_1px_0px_#1E1E1E]">
                  Tracker
                </span>
                <span className="text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#BBF7D0] border border-[#1E1E1E] rounded">
                  Live
                </span>
              </div>
              <div className="relative inline-block mt-0.5">
                <span className="font-hand text-base text-[#4A4A4A] tracking-wide block">
                  Find genuine low-competition problem statements with zero hype spike
                </span>
                <DoodleUnderline color="#FEF08A" className="w-full h-2.5 -mt-1" />
              </div>
            </div>
          </NavLink>
        </div>

        {/* Navigation & Status */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <nav className="flex items-center gap-2 bg-[#FAF8F5] p-1.5 border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md font-bold text-sm flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#1E1E1E] text-white shadow-[2px_2px_0px_#FEF08A]'
                    : 'text-[#1E1E1E] hover:bg-[#EFE7DA]'
                }`
              }
            >
              <LayoutGrid size={16} />
              <span>Leaderboard</span>
            </NavLink>

            <NavLink
              to="/trending"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md font-bold text-sm flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#1E1E1E] text-white shadow-[2px_2px_0px_#FECDD3]'
                    : 'text-[#1E1E1E] hover:bg-[#EFE7DA]'
                }`
              }
            >
              <Flame size={16} className="text-[#F43F5E]" />
              <span>Top Movers</span>
            </NavLink>

            <NavLink
              to="/gems"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md font-bold text-sm flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#1E1E1E] text-white shadow-[2px_2px_0px_#BBF7D0]'
                    : 'text-[#1E1E1E] hover:bg-[#EFE7DA]'
                }`
              }
            >
              <Gem size={16} className="text-[#16A34A]" />
              <span>Prime Picks</span>
            </NavLink>

            <NavLink
              to="/watchlist"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md font-bold text-sm flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#1E1E1E] text-white shadow-[2px_2px_0px_#FACC15]'
                    : 'text-[#1E1E1E] hover:bg-[#EFE7DA]'
                }`
              }
            >
              <Star size={16} className="text-[#EAB308] fill-[#FACC15]" />
              <span>Watchlist</span>
              {watchlistCount > 0 && (
                <span className="bg-[#FEF08A] text-[#1E1E1E] text-xs font-black px-1.5 py-0.2 rounded-full border border-[#1E1E1E]">
                  {watchlistCount}
                </span>
              )}
            </NavLink>
          </nav>

          {/* Scrape Time badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-[#FAF8F5] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm text-[#4A4A4A]">
            <Clock size={14} className="text-[#1E1E1E]" />
            <span>Updated:</span>
            <span className="font-bold text-[#1E1E1E]">{formattedTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
