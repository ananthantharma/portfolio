/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import React from 'react';

export type PropertyTint = 'rose' | 'amber' | 'sky' | 'violet' | 'orange' | 'emerald' | 'cyan' | 'slate';

interface PropertyCardProps {
  icon: React.ReactNode;
  label: string;
  action?: React.ReactNode;
  className?: string;
  tint?: PropertyTint;
  children: React.ReactNode;
}

const TINTS: Record<PropertyTint, string> = {
  rose: 'bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-300',
  amber: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-300',
  sky: 'bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-300',
  violet: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-300',
  orange: 'bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300',
  emerald: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300',
  cyan: 'bg-cyan-50 text-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-300',
  slate: 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400',
};

/** Shared "grouped field" card used to give the drawer/window properties a modern, scannable layout. */
export default function PropertyCard({icon, label, action, className, tint = 'slate', children}: PropertyCardProps) {
  return (
    <div
      className={`group rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm shadow-slate-200/60 transition-shadow duration-200 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/50 dark:shadow-none ${
        className || ''
      }`}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${TINTS[tint]}`}>{icon}</span>
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
        </span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </div>
  );
}
