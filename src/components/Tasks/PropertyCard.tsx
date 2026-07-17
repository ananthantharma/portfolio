/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import React from 'react';

interface PropertyCardProps {
  icon: React.ReactNode;
  label: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Shared "grouped field" card used to give the drawer/window properties a modern, scannable layout. */
export default function PropertyCard({icon, label, action, className, children}: PropertyCardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-700/60 dark:bg-slate-700/25 ${className || ''}`}>
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </div>
  );
}
