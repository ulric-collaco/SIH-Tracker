import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWatchlist } from '../context/WatchlistContext';
import { DoodleUnderline, DoodleTape } from '../utils/doodleIcons';
import { Flame, Star, LayoutGrid, Clock, PenLine, Gem, ChevronRight } from 'lucide-react';

interface HeaderProps {
  lastScrapedAt?: string;
}

export const Header: React.FC<HeaderProps> = ({ lastScrapedAt }) => {
  const { watchlistCount } = useWatchlist();

  const location = useLocation();
  const navRef = React.useRef<HTMLElement>(null);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollWidth - scrollLeft - clientWidth > 8);
    }
  }, []);

  React.useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 150);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  // If user navigated to Watchlist, scroll it into view automatically
  React.useEffect(() => {
    if (location.pathname === '/watchlist' && navRef.current) {
      navRef.current.scrollTo({ left: navRef.current.scrollWidth, behavior: 'smooth' });
    }
    checkScroll();
  }, [location.pathname, checkScroll]);

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
    <header className="relative bg-[#FFFDF9] border-b-3 border-[#1E1E1E] py-4 sm:py-6 px-3 sm:px-8 shadow-[0_4px_0px_#1E1E1E] w-full max-w-full">
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

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-5 w-full">
        {/* Brand & Title */}
        <div>
          <NavLink to="/" className="inline-flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#FEF08A] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm flex items-center justify-center group-hover:rotate-6 transition-transform shrink-0">
              <PenLine size={20} className="text-[#1E1E1E] sm:w-[22px] sm:h-[22px]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#1E1E1E]">
                  SIH 2026
                </span>
                <span className="font-doodle text-lg sm:text-xl font-bold bg-[#BAE6FD] px-2 py-0.2 border border-[#1E1E1E] rounded-full shadow-[1px_1px_0px_#1E1E1E]">
                  Tracker
                </span>
                <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#BBF7D0] border border-[#1E1E1E] rounded">
                  Live
                </span>
              </div>
              <div className="relative inline-block mt-0.5 max-w-full">
                <span className="font-hand text-xs sm:text-base text-[#4A4A4A] tracking-wide block leading-snug">
                  Find genuine low-competition problem statements with zero hype spike
                </span>
                <DoodleUnderline color="#FEF08A" className="w-full h-2 sm:h-2.5 -mt-0.5" />
              </div>
            </div>
          </NavLink>
        </div>

        {/* Navigation & Status */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
          <div className="relative w-full md:w-auto">
            {/* Left fade if scrolled */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute left-0.5 top-0.5 bottom-0.5 w-6 bg-gradient-to-r from-[#FAF8F5] to-transparent rounded-l-sketch-sm z-10 md:hidden" />
            )}

            <nav
              ref={navRef}
              onScroll={checkScroll}
              className="w-full md:w-auto flex items-center justify-start gap-1 sm:gap-2 bg-[#FAF8F5] p-1 sm:p-1.5 pr-8 sm:pr-1.5 border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm overflow-x-auto no-scrollbar scrollbar-none"
            >
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-2.5 sm:px-3 py-1.5 rounded-md font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#1E1E1E] text-white shadow-[2px_2px_0px_#FEF08A]'
                      : 'text-[#1E1E1E] hover:bg-[#EFE7DA]'
                  }`
                }
              >
                <LayoutGrid size={15} />
                <span>Leaderboard</span>
              </NavLink>

              <NavLink
                to="/trending"
                className={({ isActive }) =>
                  `px-2.5 sm:px-3 py-1.5 rounded-md font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#1E1E1E] text-white shadow-[2px_2px_0px_#FECDD3]'
                      : 'text-[#1E1E1E] hover:bg-[#EFE7DA]'
                  }`
                }
              >
                <Flame size={15} className="text-[#F43F5E]" />
                <span>Top Movers</span>
              </NavLink>

              <NavLink
                to="/gems"
                className={({ isActive }) =>
                  `px-2.5 sm:px-3 py-1.5 rounded-md font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#1E1E1E] text-white shadow-[2px_2px_0px_#BBF7D0]'
                      : 'text-[#1E1E1E] hover:bg-[#EFE7DA]'
                  }`
                }
              >
                <Gem size={15} className="text-[#16A34A]" />
                <span>Prime Picks</span>
              </NavLink>

              <NavLink
                to="/watchlist"
                className={({ isActive }) =>
                  `px-2.5 sm:px-3 py-1.5 rounded-md font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#1E1E1E] text-white shadow-[2px_2px_0px_#FACC15]'
                      : 'text-[#1E1E1E] hover:bg-[#EFE7DA]'
                  }`
                }
              >
                <Star size={15} className="text-[#EAB308] fill-[#FACC15]" />
                <span>Watchlist</span>
                {watchlistCount > 0 && (
                  <span className="bg-[#FEF08A] text-[#1E1E1E] text-[10px] sm:text-xs font-black px-1.5 py-0.2 rounded-full border border-[#1E1E1E]">
                    {watchlistCount}
                  </span>
                )}
              </NavLink>
            </nav>

            {/* Right fade overlay indicating more content */}
            {canScrollRight && (
              <div className="pointer-events-none absolute right-0.5 top-0.5 bottom-0.5 w-16 bg-gradient-to-l from-[#FAF8F5] via-[#FAF8F5]/85 to-transparent rounded-r-sketch-sm z-10 md:hidden" />
            )}

            {/* Visual swipe / scroll prompt button */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => {
                  navRef.current?.scrollBy({ left: 140, behavior: 'smooth' });
                }}
                className="md:hidden absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5 px-2 py-0.5 bg-[#FEF08A] hover:bg-[#FDE047] text-[#1E1E1E] border border-[#1E1E1E] rounded-full text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#1E1E1E] active:scale-95 transition-transform cursor-pointer"
                title="Scroll to reveal Watchlist"
                aria-label="Scroll navigation right"
              >
                <span>Swipe</span>
                <ChevronRight size={12} className="stroke-[3]" />
              </button>
            )}
          </div>

          {/* Scrape Time badge */}
          <div className="flex md:hidden lg:flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-[#FAF8F5] border border-[#1E1E1E] rounded-sketch-sm shadow-[1px_1px_0px_#1E1E1E] text-[#4A4A4A] w-fit self-end sm:self-auto">
            <Clock size={13} className="text-[#1E1E1E]" />
            <span>Updated:</span>
            <span className="font-bold text-[#1E1E1E]">{formattedTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
