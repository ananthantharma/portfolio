/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {FileText, Loader2, Plus, Search, X} from 'lucide-react';
import React, {useEffect, useState} from 'react';

import {NotePage, notesApi} from './notesApi';

interface NoteLinkModalProps {
  taskTitle: string;
  initialMode?: 'search' | 'create';
  onClose: () => void;
  onLinked: (page: {_id: string; title: string}) => void;
}

export default function NoteLinkModal({taskTitle, initialMode = 'search', onClose, onLinked}: NoteLinkModalProps) {
  const [mode, setMode] = useState<'search' | 'create'>(initialMode);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NotePage[]>([]);
  const [searching, setSearching] = useState(false);
  const [newTitle, setNewTitle] = useState(taskTitle);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      notesApi
        .searchByTitle(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const createAndLink = async () => {
    const title = newTitle.trim() || 'Untitled';
    setCreating(true);
    setError(null);
    try {
      const page = await notesApi.createPage(title);
      onLinked({_id: page._id, title: page.title});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create note.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-sky-50 px-5 py-4 dark:border-slate-700 dark:from-indigo-500/10 dark:to-sky-500/10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-sm">
              <FileText className="h-4 w-4" />
            </span>
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">Link a note</h2>
          </div>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-600 dark:hover:bg-slate-700"
            onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex shrink-0 gap-1 border-b border-slate-100 px-5 pt-3 dark:border-slate-700">
          {(
            [
              {key: 'search', label: 'Link existing'},
              {key: 'create', label: 'Create new'},
            ] as const
          ).map(t => (
            <button
              className={`rounded-t-lg px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                mode === t.key
                  ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-300'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              key={t.key}
              onClick={() => setMode(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {mode === 'search' ? (
            <div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-indigo-400 dark:border-slate-600 dark:bg-slate-700/40">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                  autoFocus
                  className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-300 dark:text-white"
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search note titles…"
                  value={query}
                />
                {searching && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />}
              </div>

              <div className="mt-3 space-y-1">
                {query.trim().length < 2 && (
                  <p className="px-1 py-3 text-center text-[12px] text-slate-400">
                    Type at least 2 characters to search.
                  </p>
                )}
                {query.trim().length >= 2 && !searching && results.length === 0 && (
                  <p className="px-1 py-3 text-center text-[12px] text-slate-400">No notes match “{query.trim()}”.</p>
                )}
                {results.map(page => {
                  const section = page.sectionId && typeof page.sectionId === 'object' ? page.sectionId.name : null;
                  return (
                    <button
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                      key={page._id}
                      onClick={() => onLinked({_id: page._id, title: page.title})}>
                      <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700 dark:text-white">
                        {page.title}
                      </span>
                      {section && <span className="shrink-0 text-[11px] text-slate-400">{section}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Note title</label>
              <input
                autoFocus
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createAndLink()}
                placeholder="Note title"
                value={newTitle}
              />
              <p className="mt-2 text-[11.5px] text-slate-400">Filed into your “Tasks” notebook.</p>
              {error && <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>}
              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-40"
                disabled={creating}
                onClick={createAndLink}>
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create & link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
