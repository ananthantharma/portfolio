/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {BookmarkPlus, X} from 'lucide-react';
import React, {useState} from 'react';

import {SavedView} from './types';

interface SavedViewsBarProps {
  views: SavedView[];
  activeId: string | null;
  canSave: boolean;
  onApply: (view: SavedView) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
}

export default function SavedViewsBar({views, activeId, canSave, onApply, onSave, onDelete}: SavedViewsBarProps) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const commit = () => {
    const n = name.trim();
    if (n) onSave(n);
    setName('');
    setNaming(false);
  };

  if (views.length === 0 && !canSave) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {views.map(v => (
        <span
          className={`group flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            activeId === v.id
              ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
          }`}
          key={v.id}>
          <button onClick={() => onApply(v)}>{v.name}</button>
          <button className="hidden text-slate-400 hover:text-rose-500 group-hover:inline" onClick={() => onDelete(v.id)}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {canSave &&
        (naming ? (
          <div className="flex items-center gap-1 rounded-full border border-dashed border-violet-300 px-2 py-0.5">
            <input
              autoFocus
              className="w-24 bg-transparent text-[11px] outline-none"
              onBlur={commit}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setNaming(false);
              }}
              placeholder="View name…"
              value={name}
            />
          </div>
        ) : (
          <button
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => setNaming(true)}
            title="Save current filters as a smart view">
            <BookmarkPlus className="h-3 w-3" /> Save view
          </button>
        ))}
    </div>
  );
}
