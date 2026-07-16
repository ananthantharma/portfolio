/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {Archive, RotateCcw, Trash2, X} from 'lucide-react';
import React from 'react';

import {Task} from './types';

interface ArchiveViewProps {
  tasks: Task[]; // archived tasks
  onClose: () => void;
  onRestore: (task: Task) => void;
  onPurge: (task: Task) => void;
}

export default function ArchiveView({tasks, onClose, onRestore, onPurge}: ArchiveViewProps) {
  return (
    <div
      className="fixed inset-0 z-[225] flex items-start justify-center bg-slate-900/40 px-4 pt-[10vh] backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg animate-scale-in overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5 dark:border-slate-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15">
            <Archive className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">Archive</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-400 dark:bg-slate-700">
            {tasks.length}
          </span>
          <button
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3 [scrollbar-width:thin]">
          {tasks.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-slate-400">Nothing archived.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                  key={t._id}>
                  <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-600 dark:text-slate-300">
                    {t.title}
                  </p>
                  <button
                    className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-700 dark:text-slate-300"
                    onClick={() => onRestore(t)}>
                    <span className="flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" /> Restore
                    </span>
                  </button>
                  <button
                    className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                    onClick={() => onPurge(t)}
                    title="Delete permanently">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
