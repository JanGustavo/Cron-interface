import React from 'react';

export type StatCardColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'purple';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: StatCardColor;
  trend?: {
    value: string;
    type: 'up' | 'down' | 'neutral';
  };
  description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = 'indigo',
  trend,
  description,
}) => {
  const colorStyles = () => {
    switch (color) {
      case 'emerald':
        return {
          border: 'border-l-4 border-l-emerald-500',
          hover: 'hover:border-emerald-500/30 hover:shadow-[0_8px_32px_0_rgba(16,185,129,0.08)]',
          iconBg: 'bg-emerald-500/10 text-emerald-400',
          trendUp: 'text-emerald-400',
        };
      case 'rose':
        return {
          border: 'border-l-4 border-l-rose-500',
          hover: 'hover:border-rose-500/30 hover:shadow-[0_8px_32px_0_rgba(244,63,94,0.08)]',
          iconBg: 'bg-rose-500/10 text-rose-400',
          trendUp: 'text-emerald-400',
        };
      case 'amber':
        return {
          border: 'border-l-4 border-l-amber-500',
          hover: 'hover:border-amber-500/30 hover:shadow-[0_8px_32px_0_rgba(245,158,11,0.08)]',
          iconBg: 'bg-amber-500/10 text-amber-400',
          trendUp: 'text-emerald-400',
        };
      case 'purple':
        return {
          border: 'border-l-4 border-l-purple-500',
          hover: 'hover:border-purple-500/30 hover:shadow-[0_8px_32px_0_rgba(168,85,247,0.08)]',
          iconBg: 'bg-purple-500/10 text-purple-400',
          trendUp: 'text-emerald-400',
        };
      case 'indigo':
      default:
        return {
          border: 'border-l-4 border-l-indigo-500',
          hover: 'hover:border-indigo-500/30 hover:shadow-[0_8px_32px_0_rgba(99,102,241,0.08)]',
          iconBg: 'bg-indigo-500/10 text-indigo-400',
          trendUp: 'text-emerald-400',
        };
    }
  };

  const styles = colorStyles();

  return (
    <div
      className={`p-5 rounded-2xl glass-panel ${styles.border} ${styles.hover} transition-all duration-300 group select-none`}
    >
      <div className="flex items-center justify-between">
        {/* Title */}
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">
          {title}
        </span>
        
        {/* Icon container */}
        {icon && (
          <div className={`p-2 rounded-xl transition-all duration-300 ${styles.iconBg} group-hover:scale-110`}>
            {icon}
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="text-3xl font-black mt-2 text-slate-100 tracking-tight">
        {value}
      </div>

      {/* Trend & Description Bottom Bar */}
      {(trend || description) && (
        <div className="flex items-center gap-1.5 mt-2.5 text-xs">
          {trend && (
            <span
              className={`font-bold flex items-center gap-0.5 ${
                trend.type === 'up'
                  ? 'text-emerald-400'
                  : trend.type === 'down'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {trend.type === 'up' && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {trend.type === 'down' && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {trend.value}
            </span>
          )}
          {description && <span className="text-slate-500 truncate">{description}</span>}
        </div>
      )}
    </div>
  );
};
