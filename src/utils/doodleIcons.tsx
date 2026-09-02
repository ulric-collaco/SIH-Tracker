import React from 'react';

// Hand-drawn doodle star (for watchlist & favoriting)
export const DoodleStar: React.FC<{ filled?: boolean; className?: string; size?: number }> = ({
  filled = false,
  className = 'w-5 h-5',
  size = 22
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#FACC15' : 'none'}
      stroke="#1E1E1E"
      strokeWidth={filled ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform active:scale-125 ${className}`}
    >
      <path d="M12 2.5 L14.8 8.6 L21.5 9.3 L16.4 14 L17.9 20.6 L12 17.2 L6.1 20.6 L7.6 14 L2.5 9.3 L9.2 8.6 Z" />
    </svg>
  );
};

// Hand-drawn scribble underline
export const DoodleUnderline: React.FC<{ color?: string; className?: string }> = ({
  color = '#FEF08A',
  className = 'w-full h-3'
}) => {
  return (
    <svg
      viewBox="0 0 200 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d="M3 11.5C38 3.5 125 1.5 197 12.5C140 7 60 7.5 15 14"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Hand-drawn wobbly circle / highlight
export const DoodleCircle: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-8 h-8',
  color = '#BAE6FD'
}) => {
  return (
    <svg viewBox="0 0 50 50" fill="none" className={className}>
      <path
        d="M25 4C38 3 47 14 46 26C45 38 35 46 23 45C11 44 4 33 4 23C4 12 13 4 27 5C35 5.5 44 11 44 20"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Hand-drawn washi tape strip
export const DoodleTape: React.FC<{ className?: string; color?: string; rotation?: string }> = ({
  className = 'w-24 h-6',
  color = '#FEF08A',
  rotation = 'rotate-[-3deg]'
}) => {
  return (
    <div
      className={`opacity-85 shadow-[1px_1px_2px_rgba(0,0,0,0.15)] border-t border-b border-[#1E1E1E]/20 ${rotation} ${className}`}
      style={{
        backgroundColor: color,
        clipPath: 'polygon(0% 15%, 4% 0%, 96% 0%, 100% 15%, 98% 85%, 94% 100%, 6% 100%, 0% 85%)'
      }}
    />
  );
};

// Hand-drawn thumbtack / pin
export const DoodlePin: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-6 h-6',
  color = '#EF4444'
}) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="7" r="5" fill={color} stroke="#1E1E1E" strokeWidth="2" />
      <path d="M12 12 L12 21" stroke="#1E1E1E" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="10" cy="5" r="1.5" fill="#FFFFFF" />
    </svg>
  );
};

// Hand-drawn fire / spike doodle
export const DoodleSpike: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#FECDD3"
      stroke="#1E1E1E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2C10 7 6 10 6 15C6 18.5 8.5 21 12 21C15.5 21 18 18.5 18 15C18 11 15 8 15 4C14 7 13 8 12 2Z" />
      <path d="M12 11C11 13 10 14 10 16C10 17 11 18 12 18C13 18 14 17 14 16C14 14.5 13 13.5 12 11Z" fill="#F43F5E" />
    </svg>
  );
};

// Hand-drawn arrow
export const DoodleArrow: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-8 h-8',
  color = '#1E1E1E'
}) => {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <path
        d="M6 22 C14 21, 24 19, 32 17 M25 9 C28 12, 32 16, 34 18 C30 21, 26 26, 23 29"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
