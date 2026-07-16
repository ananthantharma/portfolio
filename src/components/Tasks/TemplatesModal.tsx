/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {ListChecks, Plus, Sparkles, Tag, Trash2, X} from 'lucide-react';
import React from 'react';

import {PRIORITY_META, Task} from './types';

interface TemplatesModalProps {
  templates: Task[];
  onClose: () => void;
  onUseTemplate: (template: Task) => void;
  onDeleteTemplate: (template: Task) => void;
}

export default function TemplatesModal({templates, onClose, onUseTemplate, onDeleteTemplate}: TemplatesModalProps) {
  return (
    <div
      className="fixed inset-0 z-[230] flex items-start justify-center bg-slate-900/40 px-4 pt-[10vh] backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md animate-scale-in overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5 dark:border-slate-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">Task templates</h2>
          <button
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3 [scrollbar-width:thin]">
          {templates.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">No templates yet.</p>
              <p className="mt-1 text-[11.5px] text-slate-400 dark:text-slate-500">
                Open any task and choose "Save as template" to reuse it later.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div
                  className="group flex items-start gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                  key={t._id}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-white">{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-400">
                      {t.priority !== 'None' && (
                        <span className={`rounded px-1.5 py-0.5 ring-1 ring-inset ${PRIORITY_META[t.priority].chip}`}>
                          {t.priority}
                        </span>
                      )}
                      {t.category && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                          {t.category}
                        </span>
                      )}
                      {(t.subtasks?.length || 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <ListChecks className="h-3 w-3" /> {t.subtasks!.length}
                        </span>
                      )}
                      {(t.tags || []).slice(0, 3).map(tag => (
                        <span className="flex items-center gap-0.5" key={tag}>
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300"
                    onClick={() => onUseTemplate(t)}>
                    <span className="flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Use
                    </span>
                  </button>
                  <button
                    className="hidden shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 group-hover:block"
                    onClick={() => onDeleteTemplate(t)}
                    title="Delete template">
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
