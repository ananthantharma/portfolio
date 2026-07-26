/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {Check, ExternalLink, FileText, Loader2, X} from 'lucide-react';
import React, {useEffect, useState} from 'react';

import RichTextEditor from '@/components/Notes/RichTextEditor';

import {NotePage, notesApi} from './notesApi';

interface NoteQuickEditModalProps {
  pageId: string;
  onClose: () => void;
}

export default function NoteQuickEditModal({pageId, onClose}: NoteQuickEditModalProps) {
  const [page, setPage] = useState<NotePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    notesApi
      .getPage(pageId)
      .then(data => {
        if (cancelled) return;
        setPage(data);
        setTitle(data.title || '');
        const tabs =
          data.tabs && data.tabs.length ? [...data.tabs].sort((a, b) => (a.order || 0) - (b.order || 0)) : null;
        setContent(tabs ? tabs[0].content || '' : data.content || '');
      })
      .catch(err => !cancelled && setLoadError(err instanceof Error ? err.message : 'Could not load note.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    if (!page) return;
    setSaving(true);
    setSaveError(null);
    try {
      const sortedTabs =
        page.tabs && page.tabs.length ? [...page.tabs].sort((a, b) => (a.order || 0) - (b.order || 0)) : null;
      const patch: Record<string, unknown> = {title};
      if (sortedTabs) {
        sortedTabs[0] = {...sortedTabs[0], content};
        patch.tabs = sortedTabs;
      } else {
        patch.tabs = [{title: title || 'Note', content, order: 0}];
      }
      const updated = await notesApi.updatePage(pageId, patch);
      setPage(updated);
      setDirty(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-sky-50 px-5 py-3.5 dark:border-slate-700 dark:from-indigo-500/10 dark:to-sky-500/10">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-sm">
            <FileText className="h-4 w-4" />
          </span>
          <input
            className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-slate-800 outline-none placeholder:text-slate-300 dark:text-white"
            onChange={e => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            placeholder="Note title"
            value={title}
          />
          <a
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold text-indigo-500 hover:bg-white/60 dark:hover:bg-slate-700"
            href={`/notes?pageId=${pageId}`}
            rel="noopener noreferrer"
            target="_blank">
            Open full page <ExternalLink className="h-3 w-3" />
          </a>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-600 dark:hover:bg-slate-700"
            onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {loadError && (
          <div className="mx-5 mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12px] font-medium text-rose-700">
            {loadError}
          </div>
        )}

        {/* Editor */}
        <div className="relative flex-1 overflow-hidden px-5 py-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            !loadError && (
              <RichTextEditor
                onChange={value => {
                  setContent(value);
                  setDirty(true);
                }}
                placeholder="Start typing your note here…"
                value={content}
              />
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-slate-700">
          {saveError && <p className="mr-auto text-[12px] font-medium text-rose-600">{saveError}</p>}
          <button
            className="rounded-xl px-4 py-2 text-[12.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={onClose}>
            Close
          </button>
          <button
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-2 text-[12.5px] font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-40"
            disabled={!dirty || saving || loading}
            onClick={save}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
