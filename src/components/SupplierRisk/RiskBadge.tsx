import React from 'react';

import {RiskLevel} from '@/models/Supplier';

const RISK_CONFIG: Record<RiskLevel, {bg: string; text: string; dot: string}> = {
  Low: {bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500'},
  Medium: {bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500'},
  High: {bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500'},
  Critical: {bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500'},
};

interface Props {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<Props> = ({level, score, size = 'md'}) => {
  const cfg = RISK_CONFIG[level];
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${px} ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {level}
      {score !== undefined && <span className="opacity-70">({score})</span>}
    </span>
  );
};

export const ScoreBar: React.FC<{score: number; label?: string}> = ({score, label}) => {
  const color =
    score <= 30 ? 'bg-emerald-500' : score <= 60 ? 'bg-yellow-500' : score <= 80 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>{label}</span>
          <span className="font-medium text-gray-700">{score}</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{width: `${score}%`}} />
      </div>
    </div>
  );
};
