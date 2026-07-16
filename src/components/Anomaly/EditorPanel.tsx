/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {AlertCircle, Check, ChevronRight, Cloud, Flag, FolderInput, Loader2, Pin, Plus, Star, Trash2, X} from 'lucide-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import RichTextEditor from '@/components/Notes/RichTextEditor';

import {api} from './api';
import IconPicker from './IconPicker';
import {normalizeTabs, Page, Tab, timeAgo} from './types';

type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

interface EditorPanelProps {
  pageId: string;
  crumbs: string[]; // e.g. ["Work", "Meetings"]
  onMetaChange: (page: Page) => void;
  onDeleted: (pageId: string) => void;
  onRequestMove?: (page: Page) => void;
}

export default function EditorPanel({pageId, crumbs, onMetaChange, onDeleted, onRequestMove}: EditorPanelProps) {
  const [page, setPage] = useState<Page | null>(null);
  const [title, setTitle] = useState('');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renamingTab, setRenamingTab] = useState<number | null>(null);

  // Refs mirror the latest editable state so debounced/unmount saves never use stale closures
  const latest = useRef({title: '', tabs: [] as Tab[], dirty: false});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load page ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setPage(null);
    setLoadError(null);
    api.pages
      .get(pageId)
      .then(data => {
        if (cancelled) return;
        const normalized = normalizeTabs(data);
        setPage(data);
        setTitle(data.title || '');
        setTabs(normalized);
        setActiveTab(0);
        setStatus('saved');
        latest.current = {title: data.title || '', tabs: normalized, dirty: false};
      })
      .catch(err => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  // ── Saving ──────────────────────────────────────────────────────────────────
  const persist = useCallback(async () => {
    if (!latest.current.dirty) return;
    setStatus('saving');
    try {
      const updated = await api.pages.update(pageId, {
        title: latest.current.title || 'Untitled',
        tabs: latest.current.tabs,
      });
      latest.current.dirty = false;
      setStatus('saved');
      onMetaChange(updated);
    } catch {
      setStatus('error');
    }
  }, [pageId, onMetaChange]);

  const markDirty = useCallback(
    (nextTitle: string, nextTabs: Tab[]) => {
      latest.current = {title: nextTitle, tabs: nextTabs, dirty: true};
      setStatus('dirty');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(persist, 1200);
    },
    [persist],
  );

  // Flush unsaved work when switching pages / unmounting
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (latest.current.dirty) {
        // fire-and-forget; keepalive lets it survive navigation
        fetch(`/api/notes/pages/${pageId}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({title: latest.current.title || 'Untitled', tabs: latest.current.tabs}),
          keepalive: true,
        }).catch(() => undefined);
      }
    };
  }, [pageId]);

  // Ctrl+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (saveTimer.current) clearTimeout(saveTimer.current);
        persist();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [persist]);

  // ── Metadata toggles (immediate save) ──────────────────────────────────────
  const toggleMeta = async (field: 'isStarred' | 'isPinned' | 'isImportant' | 'isFlagged') => {
    if (!page) return;
    const next = !page[field];
    setPage({...page, [field]: next});
    try {
      const updated = await api.pages.update(pageId, {[field]: next});
      setPage(prev => (prev ? {...prev, [field]: updated[field]} : prev));
      onMetaChange(updated);
    } catch {
      setPage(prev => (prev ? {...prev, [field]: !next} : prev));
    }
  };

  const updateAppearance = async (patch: {icon?: string; color?: string}) => {
    if (!page) return;
    setPage({...page, ...patch});
    try {
      const updated = await api.pages.update(pageId, patch);
      setPage(prev => (prev ? {...prev, icon: updated.icon, color: updated.color} : prev));
      onMetaChange(updated);
    } catch (err) {
      console.error('Failed to update page appearance', err);
    }
  };

  const deletePage = async () => {
    if (!window.confirm(`Delete "${title || 'Untitled'}"? This cannot be undone.`)) return;
    try {
      await api.pages.remove(pageId);
      onDeleted(pageId);
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : err}`);
    }
  };

  // ── Tab operations ──────────────────────────────────────────────────────────
  const addTab = () => {
    const next = [...tabs, {title: `Tab ${tabs.length + 1}`, content: '', order: tabs.length}];
    setTabs(next);
    setActiveTab(next.length - 1);
    setRenamingTab(next.length - 1);
    markDirty(title, next);
  };

  const renameTab = (index: number, name: string) => {
    const next = tabs.map((t, i) => (i === index ? {...t, title: name || t.title} : t));
    setTabs(next);
    setRenamingTab(null);
    markDirty(title, next);
  };

  const removeTab = (index: number) => {
    if (tabs.length <= 1) return;
    if (!window.confirm(`Delete tab "${tabs[index].title}" and its content?`)) return;
    const next = tabs.filter((_, i) => i !== index).map((t, i) => ({...t, order: i}));
    setTabs(next);
    setActiveTab(prev => {
      if (index < prev) return prev - 1;
      return Math.min(prev, next.length - 1);
    });
    markDirty(title, next);
  };

  const onEditorChange = (html: string) => {
    const next = tabs.map((t, i) => (i === activeTab ? {...t, content: html} : t));
    setTabs(next);
    markDirty(title, next);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-white/40">
        <AlertCircle className="h-8 w-8 text-rose-400/70" />
        <p className="text-sm">Could not load this page: {loadError}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400/60" />
      </div>
    );
  }

  const statusChip = {
    saved: {icon: <Check className="h-3 w-3" />, label: 'Saved', cls: 'text-emerald-300/80 bg-emerald-400/10'},
    dirty: {icon: <Cloud className="h-3 w-3" />, label: 'Unsaved', cls: 'text-amber-300/80 bg-amber-400/10'},
    saving: {icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Saving…', cls: 'text-cyan-300/80 bg-cyan-400/10'},
    error: {icon: <AlertCircle className="h-3 w-3" />, label: 'Save failed — Ctrl+S to retry', cls: 'text-rose-300 bg-rose-400/10'},
  }[status];

  const metaButtons: {field: 'isStarred' | 'isPinned' | 'isImportant' | 'isFlagged'; icon: React.ReactNode; on: string; title: string}[] = [
    {field: 'isStarred', icon: <Star className="h-4 w-4" />, on: 'text-amber-300', title: 'Star'},
    {field: 'isPinned', icon: <Pin className="h-4 w-4" />, on: 'text-cyan-300', title: 'Pin to top'},
    {field: 'isImportant', icon: <Star className="h-4 w-4 fill-current" />, on: 'text-amber-400', title: 'Mark important'},
    {field: 'isFlagged', icon: <Flag className="h-4 w-4" />, on: 'text-rose-400', title: 'Flag'},
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* Header */}
      <header className="shrink-0 px-6 pb-0 pt-4">
        <div className="flex items-center gap-2 text-[11px] text-white/30">
          {crumbs.filter(Boolean).map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className="max-w-[160px] truncate">{c}</span>
            </React.Fragment>
          ))}
          <span className={`ml-auto flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${statusChip.cls}`}>
            {statusChip.icon} {statusChip.label}
          </span>
          <span className="text-white/20">edited {timeAgo(page.updatedAt)}</span>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <IconPicker color={page.color} icon={page.icon} onChange={updateAppearance} />
          <input
            className="min-w-0 flex-1 bg-transparent text-[26px] font-bold tracking-tight text-white placeholder-white/20 outline-none"
            onChange={e => {
              setTitle(e.target.value);
              markDirty(e.target.value, tabs);
            }}
            placeholder="Untitled"
            value={title}
          />
          <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
            {metaButtons.map(btn => (
              <button
                className={`rounded-lg p-1.5 transition-colors hover:bg-white/[0.08] ${
                  page[btn.field] ? btn.on : 'text-white/30 hover:text-white/70'
                }`}
                key={btn.title}
                onClick={() => toggleMeta(btn.field)}
                title={btn.title}>
                {btn.icon}
              </button>
            ))}
            {onRequestMove && (
              <>
                <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />
                <button
                  className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.08] hover:text-violet-300"
                  onClick={() => onRequestMove(page)}
                  title="Move to another notebook/section">
                  <FolderInput className="h-4 w-4" />
                </button>
              </>
            )}
            <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />
            <button
              className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.08] hover:text-rose-400"
              onClick={deletePage}
              title="Delete page">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-0 [scrollbar-width:none]">
          {tabs.map((tab, i) => {
            const active = i === activeTab;
            return renamingTab === i ? (
              <input
                autoFocus
                className="w-28 rounded-t-lg border border-b-0 border-violet-400/40 bg-white/[0.06] px-2.5 py-1.5 text-[12px] text-white outline-none"
                defaultValue={tab.title}
                key={i}
                onBlur={e => renameTab(i, e.target.value.trim())}
                onKeyDown={e => {
                  if (e.key === 'Enter') renameTab(i, (e.target as HTMLInputElement).value.trim());
                  if (e.key === 'Escape') setRenamingTab(null);
                }}
              />
            ) : (
              <button
                className={`group flex shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  active
                    ? 'border-white/[0.1] bg-white text-slate-800'
                    : 'border-transparent bg-white/[0.04] text-white/45 hover:bg-white/[0.07] hover:text-white/75'
                }`}
                key={i}
                onClick={() => setActiveTab(i)}
                onDoubleClick={() => setRenamingTab(i)}
                title="Double-click to rename">
                {tab.title}
                {tabs.length > 1 && (
                  <X
                    className={`h-3 w-3 rounded-sm opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-60 ${
                      active ? 'text-slate-500' : 'text-white/60'
                    }`}
                    onClick={e => {
                      e.stopPropagation();
                      removeTab(i);
                    }}
                  />
                )}
              </button>
            );
          })}
          <button
            className="ml-1 shrink-0 rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.07] hover:text-violet-300"
            onClick={addTab}
            title="Add tab">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Paper */}
      <div className="min-h-0 flex-1 px-6 pb-5">
        <div className="h-full overflow-hidden rounded-b-2xl rounded-tr-2xl bg-white shadow-float ring-1 ring-white/[0.1]">
          <RichTextEditor
            key={`${pageId}:${activeTab}`}
            onChange={html => onEditorChange(html)}
            placeholder="Start writing… (markdown shortcuts work)"
            value={tabs[activeTab]?.content || ''}
          />
        </div>
      </div>
    </div>
  );
}
