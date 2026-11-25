import React from 'react';

interface CircularGaugeProps {
  label: string;
  value: number;
  subLabel: string;
  color: string;
  size?: number;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  label,
  value,
  subLabel,
  color,
  size = 128,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#111827] p-5">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 transform" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono-tabular text-2xl font-bold text-white">{clamped}</span>
          <span className="text-[11px] font-medium text-slate-400">/ 100</span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <p className="text-sm font-semibold text-slate-100">{label}</p>
        <p className="mt-0.5 font-mono-tabular text-xs font-medium" style={{ color }}>
          {subLabel}
        </p>
      </div>
    </div>
  );
};
