import React from 'react';
import { DoodlePin } from '../utils/doodleIcons';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  bg?: string;
  pinColor?: string;
  badge?: string;
  icon?: React.ReactNode;
  rotation?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  bg = 'bg-[#FFFDF9]',
  pinColor = '#EF4444',
  badge,
  icon,
  rotation = 'rotate-0'
}) => {
  return (
    <div
      className={`relative p-5 border-3 border-[#1E1E1E] rounded-sketch shadow-sketch ${bg} ${rotation} transition-transform hover:-translate-y-1`}
    >
      {/* Thumbtack pin */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <DoodlePin color={pinColor} className="w-6 h-6 drop-shadow-sm" />
      </div>

      <div className="flex items-start justify-between gap-2 mt-1">
        <span className="font-hand text-lg text-[#333333] font-bold tracking-wide">
          {title}
        </span>
        {icon && <div className="text-[#1E1E1E]">{icon}</div>}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-black text-3xl sm:text-4xl text-[#1E1E1E] tracking-tight">
          {value}
        </span>
        {badge && (
          <span className="text-xs font-bold font-mono px-2 py-0.5 bg-white border border-[#1E1E1E] rounded-full shadow-[1px_1px_0px_#1E1E1E]">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-[#555555] font-medium leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
};
