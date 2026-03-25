import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'emerald' | 'yellow' | 'orange' | 'red' | 'purple';
  trend?: {value: number; label: string};
}

const COLOR_MAP = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
};

export const StatCard: React.FC<StatCardProps> = ({label, value, sub, icon, color = 'blue', trend}) => {
  const colorCls = COLOR_MAP[color];
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trend.value >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)} {trend.label}
            </p>
          )}
        </div>
        <div className={`rounded-lg border p-2.5 ${colorCls}`}>{icon}</div>
      </div>
    </div>
  );
};
