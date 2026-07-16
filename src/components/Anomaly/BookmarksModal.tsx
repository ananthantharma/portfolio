/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  Bookmark as BookmarkIconLucide,
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

import {Bookmark, BookmarkDraft,bookmarksApi} from './bookmarksApi';
import {colorForId} from './icons';

const PINS_KEY = 'bookmark-pins'; // shared with the legacy /notes bookmark modal on purpose

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
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// ── Inline tag editor ─────────────────────────────────────────────────────────
function TagEditor({tags, onChange}: {tags: string[]; onChange: (tags: string[]) => void}) {
  const [val, setVal] = useState('');
  const add = (raw: string) => {
    const t = raw.trim().replace(/,+$/, '');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal('');
  };
  return (
    <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5">
      {tags.map(tag => (
        <span
          className="flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-200"
          key={tag}>
          {tag}
          <button className="text-violet-300/60 hover:text-violet-100" onClick={() => onChange(tags.filter(t => t !== tag))} type="button">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        className="min-w-[100px] flex-1 bg-transparent text-[12px] text-white/80 outline-none placeholder:text-white/25"
        onBlur={() => val.trim() && add(val)}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(val);
          } else if (e.key === 'Backspace' && !val && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        placeholder={tags.length ? '' : 'Add tags — Enter or comma'}
        value={val}
      />
    </div>
  );
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
  const [tag, setTag] = useState<string | null>(null);
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
  const tagsForCategory = useMemo(() => {
    if (category === 'All') return [];
    const t = new Set<string>();
    bookmarks.filter(b => b.category === category).forEach(b => (b.tags || []).forEach(x => t.add(x)));
    return [...t].sort();
  }, [bookmarks, category]);

  useEffect(() => setTag(null), [category]);

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
    setEditForm({title: b.title, url: b.url, category: b.category, description: b.description, tags: b.tags || []});
    setMenuId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await bookmarksApi.update(editingId, editForm);
      setBookmarks(prev => prev.map(b => (b._id === editingId ? {...b, ...editForm} as Bookmark : b)));
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
      const matchTag = !tag || (b.tags || []).includes(tag);
      const matchQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.tags || []).some(t => t.toLowerCase().includes(q));
      return matchCat && matchTag && matchQuery;
    });
    result = [...result].sort((a, b) =>
      sortBy === 'alpha' ? a.title.localeCompare(b.title) : Number(b.added_timestamp || 0) - Number(a.added_timestamp || 0),
    );
    return result;
  }, [bookmarks, category, tag, query, sortBy]);

  const pinnedList = filtered.filter(b => pinned.has(b._id));
  const restList = filtered.filter(b => !pinned.has(b._id));

  const renderCard = (b: Bookmark) => {
    if (editingId === b._id) {
      return (
        <div className="space-y-2 rounded-xl border-2 border-violet-400/40 bg-[#171a26] p-4" key={b._id}>
          <input
            autoFocus
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] font-semibold text-white outline-none focus:border-violet-400/50"
            onChange={e => setEditForm(f => ({...f, title: e.target.value}))}
            placeholder="Title"
            value={editForm.title || ''}
          />
          <input
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-cyan-300 outline-none focus:border-violet-400/50"
            onChange={e => setEditForm(f => ({...f, url: e.target.value}))}
            placeholder="https://…"
            value={editForm.url || ''}
          />
          <div className="flex gap-2">
            <select
              className="w-full rounded-lg border border-white/[0.08] bg-[#171a26] px-3 py-2 text-[13px] text-white/80 outline-none focus:border-violet-400/50"
              onChange={e => setEditForm(f => ({...f, category: e.target.value === '__new__' ? '' : e.target.value}))}
              value={categories.includes(editForm.category || '') ? editForm.category : '__new__'}>
              {categories.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__new__">+ New category…</option>
            </select>
          </div>
          {!categories.includes(editForm.category || '') && (
            <input
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-white/80 outline-none focus:border-violet-400/50"
              onChange={e => setEditForm(f => ({...f, category: e.target.value}))}
              placeholder="New category name"
              value={editForm.category || ''}
            />
          )}
          <textarea
            className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12.5px] text-white/70 outline-none focus:border-violet-400/50"
            onChange={e => setEditForm(f => ({...f, description: e.target.value}))}
            placeholder="Description (optional)"
            rows={2}
            value={editForm.description || ''}
          />
          <TagEditor onChange={tags => setEditForm(f => ({...f, tags}))} tags={editForm.tags || []} />
          <div className="flex gap-2 pt-1">
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-violet-400"
              onClick={saveEdit}>
              <Check className="h-3.5 w-3.5" /> Save
            </button>
            <button
              className="rounded-lg border border-white/[0.08] px-3 py-2 text-[12.5px] text-white/50 transition-colors hover:bg-white/[0.05]"
              onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      );
    }

    const domain = cleanDomain(b.url);
    const rel = relativeTime(b.added_timestamp);
    const dotColor = colorForId(b.category);
    const isPinned = pinned.has(b._id);
    const isCopied = copiedId === b._id;
    const menuOpen = menuId === b._id;

    const menu = (
      <div className="relative shrink-0" ref={menuOpen ? menuRef : undefined}>
        <button
          className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          onClick={() => setMenuId(menuOpen ? null : b._id)}>
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-white/[0.1] bg-[#171a26] shadow-float">
            <button
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] text-white/70 transition-colors hover:bg-white/[0.05]"
              onClick={() => {
                togglePin(b._id);
                setMenuId(null);
              }}>
              <Star className="h-3.5 w-3.5 text-amber-400" /> {isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] text-white/70 transition-colors hover:bg-white/[0.05]"
              onClick={() => {
                copyLink(b._id, b.url);
                setMenuId(null);
              }}>
              <Copy className="h-3.5 w-3.5 text-white/30" /> Copy link
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] text-white/70 transition-colors hover:bg-white/[0.05]"
              onClick={() => startEdit(b)}>
              <Pencil className="h-3.5 w-3.5 text-white/30" /> Edit
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] text-rose-400 transition-colors hover:bg-rose-500/10"
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
        style={{backgroundColor: `${dotColor}20`, color: dotColor}}>
        <BookmarkIconLucide className="h-4 w-4" />
      </div>
    );

    if (viewMode === 'list') {
      return (
        <div
          className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
            isPinned ? 'border-l-2 border-l-cyan-400/60 border-white/[0.06] bg-white/[0.03]' : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]'
          }`}
          key={b._id}>
          {tile}
          <div className="min-w-0 flex-1">
            <button className="truncate text-left text-[13px] font-semibold text-white/85 hover:text-violet-300" onClick={openInApp}>
              {b.title || 'Untitled'}
            </button>
            {b.tags && b.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {b.tags.map(t => (
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/40" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="hidden shrink-0 text-[11px] text-white/25 sm:block">{domain}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{backgroundColor: dotColor}} />
            <span className="hidden text-[11px] text-white/35 sm:block">{b.category}</span>
          </span>
          {rel && <span className="hidden shrink-0 text-[11px] text-white/25 md:block">{rel}</span>}
          <a
            className="shrink-0 rounded-md p-1.5 text-white/30 opacity-0 transition-all hover:bg-white/[0.08] hover:text-white/70 group-hover:opacity-100"
            href={b.url.startsWith('http') ? b.url : `https://${b.url}`}
            onClick={e => e.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
            title="Open in a new browser tab">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            className="shrink-0 rounded-md p-1.5 text-white/30 opacity-0 transition-all hover:bg-white/[0.08] hover:text-white/70 group-hover:opacity-100"
            onClick={() => copyLink(b._id, b.url)}
            title="Copy link">
            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {menu}
        </div>
      );
    }

    return (
      <div
        className={`group flex flex-col rounded-xl border p-4 transition-colors ${
          isPinned ? 'border-l-2 border-l-cyan-400/60 border-white/[0.06] bg-white/[0.03]' : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]'
        }`}
        key={b._id}>
        <div className="mb-3 flex items-start justify-between">
          {tile}
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <a
              className="rounded-md p-1.5 text-white/30 hover:bg-white/[0.08] hover:text-white/70"
              href={b.url.startsWith('http') ? b.url : `https://${b.url}`}
              onClick={e => e.stopPropagation()}
              rel="noopener noreferrer"
              target="_blank"
              title="Open in a new browser tab">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button className="rounded-md p-1.5 text-white/30 hover:bg-white/[0.08] hover:text-white/70" onClick={() => copyLink(b._id, b.url)} title="Copy link">
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {menu}
          </div>
        </div>
        <button className="mb-1 line-clamp-2 text-left text-[13px] font-semibold text-white/85 hover:text-violet-300" onClick={openInApp}>
          {b.title || 'Untitled'}
        </button>
        {b.description && b.description.trim().toLowerCase() !== (b.title || '').trim().toLowerCase() && (
          <p className="mb-1 line-clamp-2 text-[11.5px] text-white/35">{b.description}</p>
        )}
        <p className="mb-auto truncate text-[11px] text-white/25">{domain}</p>
        {b.tags && b.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {b.tags.map(t => (
              <button
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  tag === t ? 'border-violet-400/50 bg-violet-500/20 text-violet-200' : 'border-white/[0.08] bg-white/[0.04] text-white/40 hover:text-white/70'
                }`}
                key={t}
                onClick={() => setTag(prev => (prev === t ? null : t))}>
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{backgroundColor: dotColor}} />
            <span className="text-[11px] font-medium text-white/40">{b.category}</span>
          </span>
          {rel && <span className="text-[10.5px] text-white/25">{rel}</span>}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && !editingId && onClose()}>
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141d] shadow-float">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
              <BookmarkIconLucide className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-white">Bookmarks</h2>
              <p className="text-[11px] text-white/35">
                {filtered.length} link{filtered.length === 1 ? '' : 's'}
                {tag && <span className="ml-1 text-violet-300">· tagged "{tag}"</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.05] p-1">
              <button
                className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-white/[0.1] text-white' : 'text-white/35 hover:text-white/70'}`}
                onClick={() => setViewMode('grid')}
                title="Grid view">
                <Grid2x2 className="h-3.5 w-3.5" />
              </button>
              <button
                className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-white/[0.1] text-white' : 'text-white/35 hover:text-white/70'}`}
                onClick={() => setViewMode('list')}
                title="List view">
                <ListIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <select
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/70 outline-none"
              onChange={e => setSortBy(e.target.value as 'alpha' | 'recent')}
              value={sortBy}>
              <option value="alpha">A – Z</option>
              <option value="recent">Recently added</option>
            </select>
            <button
              className="flex items-center gap-1.5 rounded-lg bg-violet-500/90 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-violet-400"
              onClick={createBookmark}>
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
            <button className="rounded-lg p-2 text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category chips + search */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-white/[0.07] bg-white/[0.015] px-5 py-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <button
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                category === 'All' ? 'border-violet-400/40 bg-violet-500/20 text-violet-200' : 'border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/80'
              }`}
              onClick={() => setCategory('All')}>
              All <span className="opacity-60">{bookmarks.length}</span>
            </button>
            {categories.map(c => (
              <button
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                  category === c ? 'border-violet-400/40 bg-violet-500/20 text-violet-200' : 'border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/80'
                }`}
                key={c}
                onClick={() => setCategory(c)}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{backgroundColor: colorForId(c)}} />
                {c} <span className="opacity-60">{categoryCounts[c] || 0}</span>
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 sm:w-56">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/25" />
            <input
              className="w-full bg-transparent text-[12px] text-white/80 outline-none placeholder:text-white/25"
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              value={query}
            />
          </div>
        </div>

        {category !== 'All' && tagsForCategory.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-white/[0.06] bg-violet-500/[0.04] px-5 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">Tags</span>
            {tagsForCategory.map(t => (
              <button
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  tag === t ? 'border-violet-400/50 bg-violet-500/25 text-violet-100' : 'border-white/[0.08] text-white/45 hover:text-white/75'
                }`}
                key={t}
                onClick={() => setTag(prev => (prev === t ? null : t))}>
                {t}
              </button>
            ))}
            {tag && (
              <button className="ml-1 text-[11px] text-white/30 underline hover:text-white/60" onClick={() => setTag(null)}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-violet-400/60" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BookmarkIconLucide className="h-10 w-10 text-white/10" />
              <p className="text-[13px] text-white/35">No bookmarks found.</p>
              <button
                className="rounded-lg border border-violet-400/30 px-3 py-1.5 text-[12px] font-medium text-violet-300 hover:bg-violet-500/10"
                onClick={createBookmark}>
                Add a bookmark
              </button>
            </div>
          ) : (
            <>
              {pinnedList.length > 0 && (
                <section className="mb-6">
                  <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
                    <Pin className="h-3 w-3 rotate-45 text-cyan-300" /> Pinned
                  </h3>
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2'}>
                    {pinnedList.map(renderCard)}
                  </div>
                </section>
              )}
              {restList.length > 0 && (
                <section>
                  {pinnedList.length > 0 && (
                    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">All bookmarks</h3>
                  )}
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2'}>
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
