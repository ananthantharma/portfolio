/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  Bookmark as BookmarkIcon,
  Check,
  Copy,
  ExternalLink,
  Grid2x2,
  List as ListIcon,
  Loader2,
  MoreVertical,
  Pencil,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import type {Bookmark, BookmarkDraft} from '@/components/Anomaly/bookmarksApi';
import {bookmarksApi} from '@/components/Anomaly/bookmarksApi';

const PINS_KEY = 'bookmark-pins'; // shared with the Anomaly notes bookmark modal on purpose

function loadPinnedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function savePinnedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

const CATEGORY_COLORS = ['#f97316', '#f43f5e', '#6366f1', '#0ea5e9', '#10b981', '#eab308', '#ec4899', '#14b8a6'];

function colorForCategory(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

function cleanDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function relativeTime(ts?: string): string | null {
  if (!ts) return null;
  const seconds = Number(ts);
  const then = Number.isFinite(seconds) ? seconds * 1000 : new Date(ts).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(then).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

interface BookmarksModalProps {
  onClose: () => void;
  onOpenUrl: (url: string, title: string) => void;
}

export default function BookmarksModal({onClose, onOpenUrl}: BookmarksModalProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'alpha' | 'recent'>('alpha');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pinned, setPinned] = useState<Set<string>>(loadPinnedIds);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BookmarkDraft>>({});
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    bookmarksApi
      .list()
      .then(data => !cancelled && setBookmarks(data))
      .catch(err => console.error('Failed to load bookmarks', err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !editingId && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editingId]);

  useEffect(() => {
    if (!menuId) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuId]);

  const togglePin = (id: string) => {
    setPinned(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      savePinnedIds(next);
      return next;
    });
  };

  const copyLink = (id: string, url: string) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    navigator.clipboard
      .writeText(href)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 1500);
      })
      .catch(() => undefined);
  };

  const categories = useMemo(() => [...new Set(bookmarks.map(b => b.category).filter(Boolean))].sort(), [bookmarks]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookmarks.forEach(b => (counts[b.category] = (counts[b.category] || 0) + 1));
    return counts;
  }, [bookmarks]);

  const createBookmark = async () => {
    const draft: BookmarkDraft = {
      title: 'New bookmark',
      url: 'https://',
      category: category === 'All' ? 'Other' : category,
      description: '',
      tags: [],
    };
    try {
      const id = await bookmarksApi.create(draft);
      const created: Bookmark = {...draft, _id: id};
      setBookmarks(prev => [created, ...prev]);
      setEditingId(id);
      setNewlyCreatedId(id);
      setEditForm(created);
    } catch (err) {
      alert(`Could not create bookmark: ${err instanceof Error ? err.message : err}`);
    }
  };

  const startEdit = (b: Bookmark) => {
    setEditingId(b._id);
    setEditForm({title: b.title, url: b.url, category: b.category, description: b.description});
    setMenuId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await bookmarksApi.update(editingId, editForm);
      setBookmarks(prev => prev.map(b => (b._id === editingId ? ({...b, ...editForm} as Bookmark) : b)));
      setEditingId(null);
      setNewlyCreatedId(null);
      setEditForm({});
    } catch (err) {
      alert(`Could not save bookmark: ${err instanceof Error ? err.message : err}`);
    }
  };

  const cancelEdit = () => {
    if (newlyCreatedId && newlyCreatedId === editingId) {
      bookmarksApi.remove(editingId).catch(() => undefined);
      setBookmarks(prev => prev.filter(b => b._id !== editingId));
      setNewlyCreatedId(null);
    }
    setEditingId(null);
    setEditForm({});
  };

  const deleteBookmark = async (id: string) => {
    if (!window.confirm('Delete this bookmark?')) return;
    try {
      await bookmarksApi.remove(id);
      setBookmarks(prev => prev.filter(b => b._id !== id));
      setPinned(prev => {
        const next = new Set(prev);
        next.delete(id);
        savePinnedIds(next);
        return next;
      });
    } catch (err) {
      alert(`Could not delete bookmark: ${err instanceof Error ? err.message : err}`);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = bookmarks.filter(b => {
      const matchCat = category === 'All' || b.category === category;
      const matchQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.tags || []).some(t => t.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
    result = [...result].sort((a, b) =>
      sortBy === 'alpha'
        ? a.title.localeCompare(b.title)
        : Number(b.added_timestamp || 0) - Number(a.added_timestamp || 0),
    );
    return result;
  }, [bookmarks, category, query, sortBy]);

  const pinnedList = filtered.filter(b => pinned.has(b._id));
  const restList = filtered.filter(b => !pinned.has(b._id));

  const renderCard = (b: Bookmark) => {
    if (editingId === b._id) {
      return (
        <div
          className="space-y-2 rounded-2xl border-2 border-indigo-300 bg-white p-4 dark:border-indigo-500/50 dark:bg-slate-800"
          key={b._id}>
          <input
            autoFocus
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            onChange={e => setEditForm(f => ({...f, title: e.target.value}))}
            placeholder="Title"
            value={editForm.title || ''}
          />
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-indigo-600 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-indigo-300"
            onChange={e => setEditForm(f => ({...f, url: e.target.value}))}
            placeholder="https://…"
            value={editForm.url || ''}
          />
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            onChange={e => setEditForm(f => ({...f, category: e.target.value}))}
            placeholder="Category"
            value={editForm.category || ''}
          />
          <div className="flex gap-2 pt-1">
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-indigo-400"
              onClick={saveEdit}>
              <Check className="h-3.5 w-3.5" /> Save
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      );
    }

    const domain = cleanDomain(b.url);
    const rel = relativeTime(b.added_timestamp);
    const dotColor = colorForCategory(b.category);
    const isPinned = pinned.has(b._id);
    const isCopied = copiedId === b._id;
    const menuOpen = menuId === b._id;

    const menu = (
      <div className="relative shrink-0" ref={menuOpen ? menuRef : undefined}>
        <button
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
          onClick={() => setMenuId(menuOpen ? null : b._id)}>
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
            <button
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={() => {
                togglePin(b._id);
                setMenuId(null);
              }}>
              <Star className="h-3.5 w-3.5 text-amber-400" /> {isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={() => {
                copyLink(b._id, b.url);
                setMenuId(null);
              }}>
              <Copy className="h-3.5 w-3.5 text-slate-400" /> Copy link
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={() => startEdit(b)}>
              <Pencil className="h-3.5 w-3.5 text-slate-400" /> Edit
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
              onClick={() => {
                deleteBookmark(b._id);
                setMenuId(null);
              }}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    );

    const openInApp = () => onOpenUrl(b.url, b.title || domain);
    const tile = b.icon ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" src={b.icon} />
    ) : (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{backgroundColor: `${dotColor}1a`, color: dotColor}}>
        <BookmarkIcon className="h-4 w-4" />
      </div>
    );

    if (viewMode === 'list') {
      return (
        <div
          className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
            isPinned
              ? 'border-l-2 border-l-orange-400 border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800'
              : 'border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60'
          }`}
          key={b._id}>
          {tile}
          <div className="min-w-0 flex-1">
            <button
              className="truncate text-left text-[13px] font-semibold text-slate-800 hover:text-indigo-600 dark:text-white"
              onClick={openInApp}>
              {b.title || 'Untitled'}
            </button>
          </div>
          <span className="hidden shrink-0 text-[11px] text-slate-400 sm:block">{domain}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{backgroundColor: dotColor}} />
            <span className="hidden text-[11px] text-slate-400 sm:block">{b.category}</span>
          </span>
          {rel && <span className="hidden shrink-0 text-[11px] text-slate-300 md:block">{rel}</span>}
          <a
            className="shrink-0 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-700"
            href={b.url.startsWith('http') ? b.url : `https://${b.url}`}
            onClick={e => e.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
            title="Open in a new browser tab">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            className="shrink-0 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-700"
            onClick={() => copyLink(b._id, b.url)}
            title="Copy link">
            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {menu}
        </div>
      );
    }

    return (
      <div
        className={`group flex flex-col rounded-2xl border p-4 transition-colors ${
          isPinned
            ? 'border-l-2 border-l-orange-400 border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800'
            : 'border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60'
        }`}
        key={b._id}>
        <div className="mb-3 flex items-start justify-between">
          {tile}
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <a
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
              href={b.url.startsWith('http') ? b.url : `https://${b.url}`}
              onClick={e => e.stopPropagation()}
              rel="noopener noreferrer"
              target="_blank"
              title="Open in a new browser tab">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
              onClick={() => copyLink(b._id, b.url)}
              title="Copy link">
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {menu}
          </div>
        </div>
        <button
          className="mb-1 line-clamp-2 text-left text-[13px] font-semibold text-slate-800 hover:text-indigo-600 dark:text-white"
          onClick={openInApp}>
          {b.title || 'Untitled'}
        </button>
        {b.description && b.description.trim().toLowerCase() !== (b.title || '').trim().toLowerCase() && (
          <p className="mb-1 line-clamp-2 text-[11.5px] text-slate-400">{b.description}</p>
        )}
        <p className="mb-auto truncate text-[11px] text-slate-300">{domain}</p>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{backgroundColor: dotColor}} />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{b.category}</span>
          </span>
          {rel && <span className="text-[10.5px] text-slate-300">{rel}</span>}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && !editingId && onClose()}>
      <div className="flex h-[85vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-orange-50 to-rose-50 px-6 py-4 dark:border-slate-700 dark:from-orange-500/10 dark:to-rose-500/10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-sm">
              <BookmarkIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">Bookmarks</h2>
              <p className="text-[11px] text-slate-400">
                {filtered.length} link{filtered.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg bg-white/70 p-1 dark:bg-slate-700/60">
              <button
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-700 shadow-sm dark:bg-slate-600 dark:text-white'
                    : 'text-slate-400'
                }`}
                onClick={() => setViewMode('grid')}
                title="Grid view">
                <Grid2x2 className="h-3.5 w-3.5" />
              </button>
              <button
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-700 shadow-sm dark:bg-slate-600 dark:text-white'
                    : 'text-slate-400'
                }`}
                onClick={() => setViewMode('list')}
                title="List view">
                <ListIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              onChange={e => setSortBy(e.target.value as 'alpha' | 'recent')}
              value={sortBy}>
              <option value="alpha">A – Z</option>
              <option value="recent">Recently added</option>
            </select>
            <button
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition-all hover:shadow-md"
              onClick={createBookmark}>
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
            <button
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700 dark:hover:bg-slate-700"
              onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category chips + search */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-6 py-3 dark:border-slate-700 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <button
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                category === 'All'
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400'
              }`}
              onClick={() => setCategory('All')}>
              All <span className="opacity-60">{bookmarks.length}</span>
            </button>
            {categories.map(c => (
              <button
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                  category === c
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400'
                }`}
                key={c}
                onClick={() => setCategory(c)}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{backgroundColor: colorForCategory(c)}} />
                {c} <span className="opacity-60">{categoryCounts[c] || 0}</span>
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-600 dark:bg-slate-700 sm:w-56">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <input
              className="w-full bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-300 dark:text-white"
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              value={query}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-5 [scrollbar-width:thin] dark:bg-slate-900/20">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BookmarkIcon className="h-10 w-10 text-slate-200" />
              <p className="text-[13px] text-slate-400">No bookmarks found.</p>
              <button
                className="rounded-lg border border-indigo-300 px-3 py-1.5 text-[12px] font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300"
                onClick={createBookmark}>
                Add a bookmark
              </button>
            </div>
          ) : (
            <>
              {pinnedList.length > 0 && (
                <section className="mb-6">
                  <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Pin className="h-3 w-3 rotate-45 text-orange-400" /> Pinned
                  </h3>
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'
                        : 'flex flex-col gap-2'
                    }>
                    {pinnedList.map(renderCard)}
                  </div>
                </section>
              )}
              {restList.length > 0 && (
                <section>
                  {pinnedList.length > 0 && (
                    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      All bookmarks
                    </h3>
                  )}
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'
                        : 'flex flex-col gap-2'
                    }>
                    {restList.map(renderCard)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
