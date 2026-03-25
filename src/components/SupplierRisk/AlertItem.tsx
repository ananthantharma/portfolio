import React from 'react';

import {AlertCategory, AlertSeverity} from '@/models/RiskAlert';

const SEVERITY_CONFIG: Record<AlertSeverity, {border: string; icon: string; label: string; badge: string}> = {
  Critical: {border: 'border-red-400', icon: '🔴', label: 'Critical', badge: 'bg-red-100 text-red-800'},
  High: {border: 'border-orange-400', icon: '🟠', label: 'High', badge: 'bg-orange-100 text-orange-800'},
  Warning: {border: 'border-yellow-400', icon: '🟡', label: 'Warning', badge: 'bg-yellow-100 text-yellow-800'},
  Info: {border: 'border-blue-400', icon: '🔵', label: 'Info', badge: 'bg-blue-100 text-blue-800'},
};

const CATEGORY_ICONS: Record<AlertCategory, string> = {
  Financial: '💰',
  Operational: '⚙️',
  Compliance: '⚖️',
  ESG: '🌱',
  News: '📰',
  System: '🖥️',
};

interface AlertDoc {
  _id: string;
  supplierId: string;
  supplierName: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  source?: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
}

interface Props {
  alert: AlertDoc;
  onResolve?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  compact?: boolean;
}

export const AlertItem: React.FC<Props> = ({alert, onResolve, onMarkRead, compact}) => {
  const cfg = SEVERITY_CONFIG[alert.severity];
  const ago = timeAgo(new Date(alert.createdAt));

  return (
    <div
      className={`relative border-l-4 ${cfg.border} rounded-r-lg bg-white p-4 shadow-sm transition-opacity ${alert.isResolved ? 'opacity-50' : ''} ${!alert.isRead ? 'ring-1 ring-inset ring-gray-200' : ''}`}>
      {!alert.isRead && (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-blue-500" />
      )}
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none">{cfg.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>{cfg.label}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {CATEGORY_ICONS[alert.category]} {alert.category}
            </span>
            <span className="text-xs text-gray-400">{ago}</span>
          </div>
          <p className="mt-1 font-semibold text-gray-800">{alert.title}</p>
          {!compact && <p className="mt-0.5 text-sm text-gray-600">{alert.description}</p>}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
            <span>
              Supplier: <span className="font-medium text-gray-700">{alert.supplierName}</span>
            </span>
            {alert.source && <span>Source: {alert.source}</span>}
          </div>
          {!compact && !alert.isResolved && (
            <div className="mt-2 flex gap-2">
              {!alert.isRead && onMarkRead && (
                <button
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                  onClick={() => onMarkRead(alert._id)}>
                  Mark Read
                </button>
              )}
              {onResolve && (
                <button
                  className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-200"
                  onClick={() => onResolve(alert._id)}>
                  Resolve
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
