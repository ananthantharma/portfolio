/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {BookOpen, Check, Copy, Loader2, Minus, Pencil, Plus, Search, Star, Trash2, X} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import {promptLibraryApi,PromptLibraryItem, PromptLibraryItemDraft} from './api';

const CATEGORY_COLORS = [
  '#8b5cf6', // violet
  '#22d3ee', // cyan
  '#f472b6', // pink
  '#fb923c', // orange
  '#34d399', // emerald
  '#facc15', // amber
  '#60a5fa', // blue
  '#f87171', // red
  '#a3e635', // lime
  '#c084fc', // purple
];

function colorForCategory(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

interface PromptLibraryModalProps {
  onClose: () => void;
}

export default function PromptLibraryModal({onClose}: PromptLibraryModalProps) {
  const [prompts, setPrompts] = useState<PromptLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'alpha' | 'recent'>('recent');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PromptLibraryItemDraft>>({});
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // The one prompt opened in the list (accordion)
  const [openId, setOpenId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    promptLibraryApi
      .list()
      .then(data => !cancelled && setPrompts(data))
      .catch(err => console.error('Failed to load prompt library', err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || editingId) return;
      if (openId) setOpenId(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editingId, openId]);

  const copyContent = (id: string, content: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 1500);
      })
      .catch(() => undefined);
  };

  const toggleFavorite = (p: PromptLibraryItem) => {
    const next = !p.favorite;
    setPrompts(prev => prev.map(x => (x._id === p._id ? {...x, favorite: next} : x)));
    promptLibraryApi.update(p._id, {favorite: next}).catch(err => {
      console.error('Failed to toggle favorite', err);
      setPrompts(prev => prev.map(x => (x._id === p._id ? {...x, favorite: !next} : x)));
    });
  };

  const categories = useMemo(() => [...new Set(prompts.map(p => p.category).filter(Boolean))].sort(), [prompts]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    prompts.forEach(p => (counts[p.category] = (counts[p.category] || 0) + 1));
    return counts;
  }, [prompts]);
  const favoriteCount = useMemo(() => prompts.filter(p => p.favorite).length, [prompts]);

  const createPrompt = async () => {
    const draft: PromptLibraryItemDraft = {
      title: 'New prompt',
      description: '',
      content: '',
      category: category === 'All' ? 'General' : category,
    };
    try {
      const created = await promptLibraryApi.create(draft);
      setPrompts(prev => [created, ...prev]);
      setEditingId(created._id);
      setNewlyCreatedId(created._id);
      setEditForm(created);
    } catch (err) {
      alert(`Could not create prompt: ${err instanceof Error ? err.message : err}`);
    }
  };

  const startEdit = (p: PromptLibraryItem) => {
    setOpenId(p._id);
    setEditingId(p._id);
    setEditForm({title: p.title, description: p.description, content: p.content, category: p.category});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editForm.title?.trim() || !editForm.content?.trim()) {
      alert('A title and prompt content are required.');
      return;
    }
    try {
      await promptLibraryApi.update(editingId, editForm);
      setPrompts(prev => prev.map(p => (p._id === editingId ? ({...p, ...editForm} as PromptLibraryItem) : p)));
      setEditingId(null);
      setNewlyCreatedId(null);
      setEditForm({});
    } catch (err) {
      alert(`Could not save prompt: ${err instanceof Error ? err.message : err}`);
    }
  };

  const cancelEdit = () => {
    if (newlyCreatedId && newlyCreatedId === editingId) {
      promptLibraryApi.remove(editingId).catch(() => undefined);
      setPrompts(prev => prev.filter(p => p._id !== editingId));
      setNewlyCreatedId(null);
    }
    setEditingId(null);
    setEditForm({});
  };

  const deletePrompt = async (id: string) => {
    if (!window.confirm('Delete this prompt?')) return;
    try {
      await promptLibraryApi.remove(id);
      setPrompts(prev => prev.filter(p => p._id !== id));
      setOpenId(prev => (prev === id ? null : prev));
    } catch (err) {
      alert(`Could not delete prompt: ${err instanceof Error ? err.message : err}`);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = prompts.filter(p => {
      const matchCat = category === 'All' || p.category === category;
      const matchFav = !favoritesOnly || p.favorite;
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q);
      return matchCat && matchFav && matchQuery;
    });
    result = [...result].sort((a, b) => {
      if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
      return sortBy === 'alpha'
        ? a.title.localeCompare(b.title)
        : new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    return result;
  }, [prompts, category, favoritesOnly, query, sortBy]);

  const renderItem = (p: PromptLibraryItem, index: number) => {
    if (editingId === p._id) {
      return (
        <div className="space-y-2 border-2 border-violet-400/40 bg-[#171a26] p-4" key={p._id}>
          <input
            autoFocus
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] font-semibold text-white outline-none focus:border-violet-400/50"
            onChange={e => setEditForm(f => ({...f, title: e.target.value}))}
            placeholder="Title"
            ref={inputRef}
            value={editForm.title || ''}
          />
          <input
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12.5px] text-white/70 outline-none focus:border-violet-400/50"
            onChange={e => setEditForm(f => ({...f, description: e.target.value}))}
            placeholder="Short description (optional)"
            value={editForm.description || ''}
          />
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
          {!categories.includes(editForm.category || '') && (
            <input
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-white/80 outline-none focus:border-violet-400/50"
              onChange={e => setEditForm(f => ({...f, category: e.target.value}))}
              placeholder="New category name"
              value={editForm.category || ''}
            />
          )}
          <textarea
            className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-[12px] leading-relaxed text-white/80 outline-none focus:border-violet-400/50"
            onChange={e => setEditForm(f => ({...f, content: e.target.value}))}
            placeholder="Full prompt text…"
            rows={8}
            value={editForm.content || ''}
          />
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

    const catColor = colorForCategory(p.category);
    const isCopied = copiedId === p._id;
    const open = openId === p._id;
    const num = String(index + 1).padStart(2, '0');
    const toggle = () => setOpenId(open ? null : p._id);

    return (
      <div
        className={`group overflow-hidden border transition-all duration-300 ${
          open
            ? 'border-violet-300/30 bg-gradient-to-r from-violet-500/70 to-violet-500/50 shadow-lg shadow-violet-950/40'
            : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.045]'
        }`}
        data-state={open ? 'open' : 'closed'}
        key={p._id}>
        <div
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 sm:px-7 sm:py-3.5"
          onClick={toggle}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle();
            }
          }}
          role="button"
          tabIndex={0}>
          <span
            className={`w-8 shrink-0 text-center text-xs font-semibold tabular-nums tracking-widest transition-colors duration-200 ${
              open ? 'text-white/75' : 'text-white/25 group-hover:text-white/55'
            }`}>
            {num}
          </span>
          <span
            className={`flex-1 truncate text-left text-sm font-medium leading-snug transition-colors duration-200 sm:text-[15px] ${
              open ? 'text-white' : 'text-white/60 group-hover:text-white'
            }`}>
            {p.title || 'Untitled'}
          </span>
          <button
            aria-label={`Copy ${p.title || 'prompt'}`}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
              isCopied ? 'text-emerald-300' : open ? 'text-white/80 hover:bg-white/15 hover:text-white' : 'text-white/30 hover:bg-white/[0.08] hover:text-white'
            }`}
            onClick={e => {
              e.stopPropagation();
              copyContent(p._id, p.content);
            }}
            title={isCopied ? 'Copied' : 'Copy prompt'}>
            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center transition-colors duration-300 ${open ? 'text-white' : 'text-white/40 group-hover:text-white'}`}>
            {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </span>
        </div>

        {/* Expanding answer: description, the full prompt and actions */}
        <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{gridTemplateRows: open ? '1fr' : '0fr'}}>
          <div className="min-h-0 overflow-hidden">
            {open && (
              <div className="px-5 pb-5 sm:pl-[4.25rem] sm:pr-7 sm:pb-6">
                {p.description && <p className="mb-3 text-sm leading-relaxed text-white/85">{p.description}</p>}
                <pre className="max-h-[45vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-white/15 bg-black/25 p-4 font-mono text-[12.5px] leading-relaxed text-white/90 [scrollbar-width:thin]">
                  {p.content || '(empty)'}
                </pre>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-0.5 text-[11px] font-medium text-white/85">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{backgroundColor: catColor}} />
                    {p.category}
                  </span>
                  <span className="flex-1" />
                  <button
                    className={`rounded-md p-1.5 transition-colors ${p.favorite ? 'text-amber-300' : 'text-white/60 hover:bg-white/15 hover:text-white'}`}
                    onClick={() => toggleFavorite(p)}
                    title={p.favorite ? 'Unfavorite' : 'Favorite'}>
                    <Star className="h-4 w-4" fill={p.favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/15 hover:text-white" onClick={() => startEdit(p)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-rose-500/25 hover:text-rose-100" onClick={() => deletePrompt(p._id)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      isCopied ? 'bg-emerald-500/25 text-emerald-100' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                    onClick={() => copyContent(p._id, p.content)}>
                    {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {isCopied ? 'Copied' : 'Copy prompt'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={e => e.target === e.currentTarget && !editingId && onClose()}>
      <div className="flex h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141d] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="whitespace-nowrap text-[15px] font-bold text-white">Prompt Library</h2>
              <p className="text-[11px] text-white/35">
                {filtered.length} prompt{filtered.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <select
              className="hidden rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/70 outline-none sm:block"
              onChange={e => setSortBy(e.target.value as 'alpha' | 'recent')}
              value={sortBy}>
              <option value="recent">Recently added</option>
              <option value="alpha">A – Z</option>
            </select>
            <button
              className="flex items-center gap-1.5 rounded-lg bg-violet-500/90 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-violet-400"
              onClick={createPrompt}>
              <Plus className="h-3.5 w-3.5" /> <span className="whitespace-nowrap">Add<span className="hidden sm:inline"> prompt</span></span>
            </button>
            <button className="rounded-lg p-2 text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category chips + search */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-white/[0.07] bg-white/[0.015] px-6 py-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <button
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                category === 'All'
                  ? 'border-violet-400/40 bg-violet-500/20 text-violet-200'
                  : 'border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/80'
              }`}
              onClick={() => setCategory('All')}>
              All <span className="opacity-60">{prompts.length}</span>
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                favoritesOnly
                  ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                  : 'border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/80'
              }`}
              onClick={() => setFavoritesOnly(v => !v)}>
              <Star className="h-3 w-3" fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites{' '}
              <span className="opacity-60">{favoriteCount}</span>
            </button>
            {categories.map(c => (
              <button
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                  category === c
                    ? 'border-violet-400/40 bg-violet-500/20 text-violet-200'
                    : 'border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/80'
                }`}
                key={c}
                onClick={() => setCategory(c)}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{backgroundColor: colorForCategory(c)}} />
                {c} <span className="opacity-60">{categoryCounts[c] || 0}</span>
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 sm:w-64">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/25" />
            <input
              className="w-full bg-transparent text-[12px] text-white/80 outline-none placeholder:text-white/25"
              onChange={e => setQuery(e.target.value)}
              placeholder="Search prompts…"
              value={query}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-violet-400/60" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BookOpen className="h-10 w-10 text-white/10" />
              <p className="text-[13px] text-white/35">No prompts found.</p>
              <button
                className="rounded-lg border border-violet-400/30 px-3 py-1.5 text-[12px] font-medium text-violet-300 hover:bg-violet-500/10"
                onClick={createPrompt}>
                Add a prompt
              </button>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col [&>*+*]:-mt-px [&>*:first-child]:rounded-t-xl [&>*:last-child]:rounded-b-xl">
              {filtered.map((p, i) => renderItem(p, i))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
