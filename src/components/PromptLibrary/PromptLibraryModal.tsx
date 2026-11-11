/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  Copy,
  CopyPlus,
  Folder,
  FolderPlus,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {promptLibraryApi, PromptLibraryItem} from './api';

// ── Helpers ──────────────────────────────────────────────────────────────────
const DOTS = ['#e24b4a', '#d85a30', '#ef9f27', '#639922', '#1d9e75', '#378add', '#7f77dd', '#d4537e', '#0ea5a4', '#b45ad6'];
/** A steady colour for each category name. */
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return DOTS[h % DOTS.length];
}

/** {{placeholders}} in a prompt, in the order they first appear. */
const VAR_RE = /\{\{\s*([^{}]{1,40}?)\s*\}\}/g;
function variablesOf(text: string) {
  const out: string[] = [];
  for (const m of text.matchAll(VAR_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}
const fill = (text: string, values: Record<string, string>) => text.replace(VAR_RE, (whole, name: string) => (values[name]?.trim() ? values[name] : whole));

function ago(iso?: string | null) {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

type View = {kind: 'all' | 'pinned' | 'favorites' | 'recent'} | {kind: 'category'; name: string};
type Sort = 'smart' | 'used' | 'alpha' | 'newest';
type Draft = {id: string | null; title: string; description: string; content: string; category: string};

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));
};
const VIEW_KEY = 'PROMPTS_VIEW';
const readView = (): View => {
  try {
    const v = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null');
    return v && typeof v.kind === 'string' ? v : {kind: 'all'};
  } catch {
    return {kind: 'all'};
  }
};

interface PromptLibraryModalProps {
  onClose: () => void;
}

/**
 * The prompt library: categories on the left, a searchable list in the middle and the chosen prompt on the right.
 * Pin prompts to keep them at the top, star favourites, fill in {{placeholders}} and copy with Enter.
 */
export default function PromptLibraryModal({onClose}: PromptLibraryModalProps) {
  const [prompts, setPrompts] = useState<PromptLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setViewState] = useState<View>({kind: 'all'});
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('smart');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [phonePane, setPhonePane] = useState<'list' | 'detail'>('list');
  const [renaming, setRenaming] = useState<{from: string; to: string} | null>(null);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  // Categories you've just created that have no prompts yet
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const [menu, setMenu] = useState<{id: string; x: number; y: number} | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(v));
    } catch {
      // storage unavailable
    }
  };

  useEffect(() => {
    setViewState(readView());
    let alive = true;
    promptLibraryApi
      .list()
      .then(data => alive && setPrompts(data))
      .catch(err => alive && setLoadError(err instanceof Error ? err.message : 'Could not load your prompts'))
      .finally(() => alive && setLoading(false));
    setTimeout(() => searchRef.current?.focus(), 60);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const patchLocal = (id: string, patch: Partial<PromptLibraryItem>) => setPrompts(prev => prev.map(p => (p._id === id ? {...p, ...patch} : p)));

  // ── Derived lists ─────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    prompts.forEach(p => counts.set(p.category || 'General', (counts.get(p.category || 'General') || 0) + 1));
    extraCategories.forEach(c => !counts.has(c) && counts.set(c, 0));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({name, count}));
  }, [prompts, extraCategories]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    let list = prompts.filter(p => {
      if (view.kind === 'pinned' && !p.pinned) return false;
      if (view.kind === 'favorites' && !p.favorite) return false;
      if (view.kind === 'recent' && !p.lastUsedAt) return false;
      if (view.kind === 'category' && (p.category || 'General') !== view.name) return false;
      if (!words.length) return true;
      const hay = `${p.title} ${p.description} ${p.category} ${p.content}`.toLowerCase();
      return words.every(w => hay.includes(w));
    });
    const titleHit = (p: PromptLibraryItem) => (q && p.title.toLowerCase().includes(q) ? 1 : 0);
    const byRecent = (a: PromptLibraryItem, b: PromptLibraryItem) => new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime();
    list = [...list].sort((a, b) => {
      if (view.kind === 'recent') return byRecent(a, b);
      // Pinned first, then favourites (unless a different order was chosen)
      if (sort === 'smart') {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        if (titleHit(a) !== titleHit(b)) return titleHit(b) - titleHit(a);
        if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
        return (b.useCount || 0) - (a.useCount || 0) || byRecent(a, b) || a.title.localeCompare(b.title);
      }
      if (sort === 'used') return (b.useCount || 0) - (a.useCount || 0) || a.title.localeCompare(b.title);
      if (sort === 'alpha') return a.title.localeCompare(b.title);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    return list;
  }, [prompts, view, query, sort]);

  // Keep a prompt selected (the first one in the list) so the right pane is never empty
  const selected = prompts.find(p => p._id === selectedId) || null;
  useEffect(() => {
    if (draft) return;
    if (!visible.length) return setSelectedId(null);
    if (!selectedId || !visible.some(p => p._id === selectedId)) setSelectedId(visible[0]._id);
  }, [visible, selectedId, draft]);

  const counts = {
    all: prompts.length,
    pinned: prompts.filter(p => p.pinned).length,
    favorites: prompts.filter(p => p.favorite).length,
    recent: prompts.filter(p => p.lastUsedAt).length,
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const copy = useCallback(
    async (p: PromptLibraryItem, close = false) => {
      const text = fill(p.content, values[p._id] || {});
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        setToast('Could not reach the clipboard. Select the text and copy it instead.');
        return;
      }
      const now = new Date().toISOString();
      patchLocal(p._id, {useCount: (p.useCount || 0) + 1, lastUsedAt: now});
      void promptLibraryApi.update(p._id, {used: true}).catch(() => undefined);
      const left = variablesOf(text).length;
      setToast(left ? `Copied (${left} placeholder${left === 1 ? '' : 's'} still unfilled)` : `Copied “${p.title}”`);
      if (close) setTimeout(onClose, 250);
    },
    [values, onClose],
  );

  const toggle = (p: PromptLibraryItem, key: 'pinned' | 'favorite') => {
    const next = !p[key];
    patchLocal(p._id, {[key]: next});
    promptLibraryApi.update(p._id, {[key]: next}).catch(() => {
      patchLocal(p._id, {[key]: !next});
      setToast('Not saved. Try again.');
    });
  };

  const startNew = () => {
    setFormError(null);
    setDraft({id: null, title: '', description: '', content: '', category: view.kind === 'category' ? view.name : 'General'});
    setPhonePane('detail');
  };
  const startEdit = (p: PromptLibraryItem) => {
    setFormError(null);
    setDraft({id: p._id, title: p.title, description: p.description || '', content: p.content, category: p.category || 'General'});
    setPhonePane('detail');
  };
  const saveDraft = async () => {
    if (!draft || saving) return;
    if (!draft.title.trim()) return setFormError('Give the prompt a name.');
    if (!draft.content.trim()) return setFormError('Write the prompt itself.');
    setSaving(true);
    setFormError(null);
    const payload = {title: draft.title.trim(), description: draft.description.trim(), content: draft.content, category: draft.category.trim() || 'General'};
    try {
      if (draft.id) {
        const saved = await promptLibraryApi.update(draft.id, payload);
        patchLocal(draft.id, saved);
        setSelectedId(draft.id);
      } else {
        const created = await promptLibraryApi.create(payload);
        setPrompts(prev => [created, ...prev]);
        setSelectedId(created._id);
      }
      setExtraCategories(prev => prev.filter(c => c !== payload.category));
      setDraft(null);
      setToast('Saved');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };
  const duplicate = async (p: PromptLibraryItem) => {
    try {
      const created = await promptLibraryApi.create({title: `${p.title} (copy)`, description: p.description, content: p.content, category: p.category});
      setPrompts(prev => [created, ...prev]);
      setSelectedId(created._id);
      setToast('Duplicated');
    } catch {
      setToast('Could not duplicate. Try again.');
    }
  };
  const remove = async (p: PromptLibraryItem) => {
    if (!window.confirm(`Delete “${p.title}”? This can't be undone.`)) return;
    try {
      await promptLibraryApi.remove(p._id);
      setPrompts(prev => prev.filter(x => x._id !== p._id));
      setToast('Deleted');
    } catch {
      setToast('Could not delete. Try again.');
    }
  };
  const moveTo = (p: PromptLibraryItem, category: string) => {
    if ((p.category || 'General') === category) return;
    const before = p.category;
    patchLocal(p._id, {category});
    promptLibraryApi.update(p._id, {category}).then(
      () => setToast(`Moved to ${category}`),
      () => {
        patchLocal(p._id, {category: before});
        setToast('Could not move it. Try again.');
      },
    );
  };
  const renameCategory = async () => {
    if (!renaming) return;
    const to = renaming.to.trim();
    const from = renaming.from;
    setRenaming(null);
    if (!to || to === from) return;
    if (!prompts.some(p => (p.category || 'General') === from)) {
      setExtraCategories(prev => prev.map(c => (c === from ? to : c)));
    } else {
      try {
        await promptLibraryApi.renameCategory(from, to);
        setPrompts(prev => prev.map(p => ((p.category || 'General') === from ? {...p, category: to} : p)));
      } catch {
        return setToast('Could not rename. Try again.');
      }
    }
    if (view.kind === 'category' && view.name === from) setView({kind: 'category', name: to});
  };
  const deleteCategory = async (name: string) => {
    const inIt = prompts.filter(p => (p.category || 'General') === name).length;
    if (inIt && !window.confirm(`Remove the “${name}” category? Its ${inIt} prompt${inIt === 1 ? '' : 's'} move to General.`)) return;
    setExtraCategories(prev => prev.filter(c => c !== name));
    if (inIt) {
      try {
        await promptLibraryApi.renameCategory(name, 'General');
        setPrompts(prev => prev.map(p => ((p.category || 'General') === name ? {...p, category: 'General'} : p)));
      } catch {
        return setToast('Could not remove it. Try again.');
      }
    }
    if (view.kind === 'category' && view.name === name) setView({kind: 'all'});
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isTyping(e.target);
      if (e.key === 'Escape') {
        e.preventDefault();
        if (menu) return setMenu(null);
        if (renaming) return setRenaming(null);
        if (draft) return setDraft(null);
        if (query && e.target === searchRef.current) return setQuery('');
        return onClose();
      }
      if (draft) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          void saveDraft();
        }
        return;
      }
      const inSearch = e.target === searchRef.current;
      if (typing && !inSearch) return;
      const i = visible.findIndex(p => p._id === selectedId);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = visible[Math.max(0, Math.min(visible.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (next) {
          setSelectedId(next._id);
          listRef.current?.querySelector(`[data-id="${next._id}"]`)?.scrollIntoView({block: 'nearest'});
        }
        return;
      }
      if (e.key === 'Enter' && selected) {
        e.preventDefault();
        // A prompt with blanks to fill goes to its first empty blank instead of copying half-done text
        const blank = variablesOf(selected.content).find(v => !values[selected._id]?.[v]?.trim());
        if (blank) {
          setPhonePane('detail');
          setTimeout(() => (document.querySelector(`[data-var="${CSS.escape(blank)}"]`) as HTMLTextAreaElement | null)?.focus(), 30);
          setToast('Fill in the blanks, then Ctrl+Enter to copy');
          return;
        }
        void copy(selected, e.shiftKey);
        return;
      }
      if (inSearch || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        return searchRef.current?.focus();
      }
      if (e.key === 'n') return e.preventDefault(), startNew();
      if (!selected) return;
      if (e.key === 'e') return e.preventDefault(), startEdit(selected);
      if (e.key === 'p') return e.preventDefault(), toggle(selected, 'pinned');
      if (e.key === 'f') return e.preventDefault(), toggle(selected, 'favorite');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => !(e.target as HTMLElement).closest?.('[data-prompt-menu]') && setMenu(null);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menu]);

  // ── Pieces ────────────────────────────────────────────────────────────────
  const viewTitle = view.kind === 'category' ? view.name : {all: 'All prompts', pinned: 'Pinned', favorites: 'Favourites', recent: 'Recently used'}[view.kind];
  const sameView = (v: View) => v.kind === view.kind && (v.kind !== 'category' || (view.kind === 'category' && v.name === view.name));

  const railItem = (v: View, label: string, icon: React.ReactNode, count: number) => (
    <button
      className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition ${sameView(v) ? 'bg-[#e3eadb] font-semibold text-[#2f4a32]' : 'text-slate-600 hover:bg-black/[0.04] hover:text-slate-900'}`}
      key={label}
      onClick={() => {
        setView(v);
        setPhonePane('list');
      }}
      type="button">
      <span className="flex w-4 justify-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 && <span className="text-[11.5px] tabular-nums text-slate-400">{count}</span>}
    </button>
  );

  const highlighted = (text: string) =>
    text.split(/(\{\{\s*[^{}]{1,40}?\s*\}\})/g).map((part, i) =>
      /^\{\{/.test(part) ? (
        <mark className="rounded bg-[#efe6ff] px-0.5 text-[#5a3fb4]" key={i}>
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );

  const row = (p: PromptLibraryItem) => {
    const on = p._id === selectedId && !draft;
    return (
      <div
        className={`group relative flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition ${on ? 'border-[#b9cdb0] bg-white shadow-[0_1px_2px_rgba(30,40,30,0.06),0_6px_18px_-10px_rgba(30,40,30,0.25)]' : 'border-transparent hover:bg-white/70'}`}
        data-id={p._id}
        draggable
        key={p._id}
        onClick={() => {
          setDraft(null);
          setSelectedId(p._id);
          setPhonePane('detail');
        }}
        onContextMenu={e => {
          e.preventDefault();
          setSelectedId(p._id);
          setMenu({id: p._id, x: e.clientX, y: e.clientY});
        }}
        onDoubleClick={() => void copy(p)}
        onDragStart={e => {
          e.dataTransfer.setData('text/prompt-id', p._id);
          e.dataTransfer.effectAllowed = 'move';
        }}>
        <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{background: colorFor(p.category || 'General')}} title={p.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-semibold text-slate-800">{p.title || 'Untitled'}</span>
            {p.pinned && <Pin className="h-3 w-3 shrink-0 fill-[#46674d] text-[#46674d]" />}
            {p.favorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">{p.description || p.content.replace(/\s+/g, ' ').slice(0, 120) || 'Empty prompt'}</p>
        </div>
        <button
          aria-label={`Copy ${p.title}`}
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-[#e3eadb] hover:text-[#2f4a32] ${on ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={e => {
            e.stopPropagation();
            void copy(p);
          }}
          title="Copy (Enter)"
          type="button">
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  const pinnedInView = sort === 'smart' && view.kind !== 'pinned' && view.kind !== 'recent' ? visible.filter(p => p.pinned) : [];
  const restInView = pinnedInView.length ? visible.filter(p => !p.pinned) : visible;
  const vars = selected ? variablesOf(selected.content) : [];
  const filled = selected ? fill(selected.content, values[selected._id] || {}) : '';
  const menuPrompt = menu ? prompts.find(p => p._id === menu.id) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-0 backdrop-blur-[3px] sm:p-4"
      onMouseDown={e => e.target === e.currentTarget && !draft && onClose()}>
      <div
        aria-label="Prompt library"
        aria-modal
        className="relative flex h-[100dvh] w-full max-w-[1280px] overflow-hidden bg-[#fbfaf7] font-sans text-slate-800 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] sm:h-[88vh] sm:rounded-2xl sm:border sm:border-black/10"
        role="dialog">
        {/* ── Categories ── */}
        <aside className="hidden w-[228px] shrink-0 flex-col border-r border-black/[0.07] bg-[#f3f2ec] md:flex">
          <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#405b43] text-white">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold leading-tight text-slate-900">Prompts</h2>
              <p className="text-[11.5px] text-slate-500">Alt+P opens this anywhere</p>
            </div>
          </div>
          <nav className="space-y-0.5 px-2">
            {railItem({kind: 'all'}, 'All prompts', <Layers className="h-4 w-4" />, counts.all)}
            {railItem({kind: 'pinned'}, 'Pinned', <Pin className="h-4 w-4" />, counts.pinned)}
            {railItem({kind: 'favorites'}, 'Favourites', <Star className="h-4 w-4" />, counts.favorites)}
            {railItem({kind: 'recent'}, 'Recently used', <Clock className="h-4 w-4" />, counts.recent)}
          </nav>
          <div className="mt-4 flex items-center justify-between px-4 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Categories</span>
            <button aria-label="New category" className="rounded-md p-1 text-slate-400 hover:bg-black/5 hover:text-slate-700" onClick={() => setNewCategory('')} title="New category" type="button">
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            {newCategory !== null && (
              <input
                autoFocus
                className="mb-1 w-full rounded-lg border border-[#b9cdb0] bg-white px-2.5 py-1.5 text-[13px] outline-none"
                onBlur={() => setNewCategory(null)}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newCategory.trim()) {
                    const name = newCategory.trim().slice(0, 60);
                    setExtraCategories(prev => (prev.includes(name) ? prev : [...prev, name]));
                    setView({kind: 'category', name});
                    setNewCategory(null);
                  }
                }}
                placeholder="Category name, then Enter"
                value={newCategory}
              />
            )}
            {categories.map(c =>
              renaming?.from === c.name ? (
                <input
                  autoFocus
                  className="w-full rounded-lg border border-[#b9cdb0] bg-white px-2.5 py-1.5 text-[13px] outline-none"
                  key={c.name}
                  onBlur={() => void renameCategory()}
                  onChange={e => setRenaming({from: c.name, to: e.target.value})}
                  onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                  value={renaming.to}
                />
              ) : (
                <div
                  className={`group relative rounded-lg transition ${dropOn === c.name ? 'bg-[#dfe9d6] ring-2 ring-[#9fbf8c]' : ''}`}
                  key={c.name}
                  onDragLeave={() => setDropOn(null)}
                  onDragOver={e => {
                    if (!e.dataTransfer.types.includes('text/prompt-id')) return;
                    e.preventDefault();
                    setDropOn(c.name);
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    setDropOn(null);
                    const p = prompts.find(x => x._id === e.dataTransfer.getData('text/prompt-id'));
                    if (p) moveTo(p, c.name);
                  }}>
                  {railItem({kind: 'category', name: c.name}, c.name, <span className="h-2 w-2 rounded-full" style={{background: colorFor(c.name)}} />, c.count)}
                  <span className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md bg-[#f3f2ec] group-hover:flex">
                    <button aria-label={`Rename ${c.name}`} className="rounded p-1 text-slate-400 hover:bg-black/5 hover:text-slate-700" onClick={() => setRenaming({from: c.name, to: c.name})} title="Rename" type="button">
                      <Pencil className="h-3 w-3" />
                    </button>
                    {c.name !== 'General' && (
                      <button aria-label={`Remove ${c.name}`} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => void deleteCategory(c.name)} title="Remove (prompts move to General)" type="button">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                </div>
              ),
            )}
            {!loading && categories.length > 0 && <p className="px-2.5 pt-2 text-[11px] leading-snug text-slate-400">Drag a prompt onto a category to move it.</p>}
          </div>
        </aside>

        {/* ── List ── */}
        <section className={`min-w-0 flex-col border-r border-black/[0.07] md:flex md:w-[360px] md:shrink-0 ${phonePane === 'list' ? 'flex flex-1 md:flex-none' : 'hidden'}`}>
          <div className="space-y-2.5 px-3 pb-2 pt-3.5">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold text-slate-900">{viewTitle}</h3>
                <p className="text-[11.5px] text-slate-500">
                  {visible.length} prompt{visible.length === 1 ? '' : 's'}
                </p>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg bg-[#405b43] px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-[#2e4731]" onClick={startNew} title="New prompt (N)" type="button">
                <Plus className="h-3.5 w-3.5" /> New
              </button>
              <button aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-black/5 hover:text-slate-700 md:hidden" onClick={onClose} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 py-2 transition focus-within:border-[#9fbf8c] focus-within:ring-2 focus-within:ring-[#dfe9d6]">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                aria-label="Search prompts"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] outline-none placeholder:text-slate-400 focus:ring-0"
                onChange={e => setQuery(e.target.value)}
                placeholder="Search, then Enter to copy"
                ref={searchRef}
                value={query}
              />
              {query ? (
                <button aria-label="Clear search" className="text-slate-400 hover:text-slate-600" onClick={() => setQuery('')} type="button">
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="rounded border border-black/10 bg-slate-50 px-1.5 text-[11px] text-slate-400">/</kbd>
              )}
            </div>
            {/* Phones: views and categories as chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 md:hidden">
              {([{kind: 'all'}, {kind: 'pinned'}, {kind: 'favorites'}, {kind: 'recent'}] as View[])
                .concat(categories.map(c => ({kind: 'category', name: c.name}) as View))
                .map(v => (
                  <button
                    className={`shrink-0 rounded-full px-3 py-1 text-[12.5px] font-semibold ${sameView(v) ? 'bg-[#405b43] text-white' : 'bg-black/[0.05] text-slate-600'}`}
                    key={v.kind === 'category' ? `c-${v.name}` : v.kind}
                    onClick={() => setView(v)}
                    type="button">
                    {v.kind === 'category' ? v.name : {all: 'All', pinned: 'Pinned', favorites: 'Favourites', recent: 'Recent'}[v.kind]}
                  </button>
                ))}
            </div>
            {view.kind !== 'recent' && (
              <div className="flex items-center gap-1 text-[12px]">
                <span className="mr-1 text-slate-400">Sort</span>
                {(
                  [
                    ['smart', 'Best'],
                    ['used', 'Most used'],
                    ['alpha', 'A–Z'],
                    ['newest', 'Newest'],
                  ] as [Sort, string][]
                ).map(([k, l]) => (
                  <button className={`rounded-md px-2 py-0.5 font-semibold ${sort === k ? 'bg-black/[0.06] text-slate-800' : 'text-slate-500 hover:text-slate-800'}`} key={k} onClick={() => setSort(k)} type="button">
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3" ref={listRef}>
            {loading ? (
              Array.from({length: 7}).map((_, i) => <div className="mx-1 h-[54px] animate-pulse rounded-xl bg-black/[0.04]" key={i} />)
            ) : loadError ? (
              <p className="px-3 py-8 text-center text-[13px] text-rose-600">{loadError}</p>
            ) : !visible.length ? (
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e3eadb] text-[#405b43]">
                  {query ? <Search className="h-5 w-5" /> : view.kind === 'pinned' ? <Pin className="h-5 w-5" /> : view.kind === 'favorites' ? <Star className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                </span>
                <p className="text-[13.5px] font-semibold text-slate-700">
                  {query ? 'No prompts match' : view.kind === 'pinned' ? 'Pin the prompts you reach for most' : view.kind === 'favorites' ? 'Star a prompt to keep it here' : view.kind === 'recent' ? 'Prompts you copy show up here' : 'Start your library'}
                </p>
                <p className="text-[12.5px] text-slate-500">
                  {query ? 'Try fewer words, or search everything.' : view.kind === 'pinned' || view.kind === 'favorites' ? 'Pinned prompts also sit at the top of every list.' : 'Save a prompt once, copy it with one key.'}
                </p>
                {query && view.kind !== 'all' ? (
                  <button className="mt-1 text-[12.5px] font-semibold text-[#405b43] hover:underline" onClick={() => setView({kind: 'all'})} type="button">
                    Search all prompts
                  </button>
                ) : (
                  !query && (
                    <button className="mt-1 rounded-lg border border-[#cfdacb] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#405b43] hover:bg-[#f1f6ec]" onClick={startNew} type="button">
                      New prompt
                    </button>
                  )
                )}
              </div>
            ) : (
              <>
                {pinnedInView.length > 0 && (
                  <>
                    <p className="flex items-center gap-1.5 px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      <Pin className="h-3 w-3" /> Pinned
                    </p>
                    {pinnedInView.map(row)}
                    {restInView.length > 0 && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Everything else</p>}
                  </>
                )}
                {restInView.map(row)}
              </>
            )}
          </div>
          <p className="hidden border-t border-black/[0.06] px-4 py-2 text-[11px] text-slate-400 md:block">↑↓ move · Enter copy · E edit · P pin · F star · N new</p>
        </section>

        {/* ── Selected prompt / editor ── */}
        <section className={`min-w-0 flex-1 flex-col bg-white md:flex ${phonePane === 'detail' ? 'flex' : 'hidden'}`}>
          <div className="flex items-center gap-1 border-b border-black/[0.06] px-3 py-2 md:justify-end">
            <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-black/5 md:hidden" onClick={() => (setDraft(null), setPhonePane('list'))} type="button">
              <ArrowLeft className="h-4 w-4" /> Prompts
            </button>
            <span className="flex-1 md:hidden" />
            <button aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-black/5 hover:text-slate-700" onClick={onClose} title="Close (Esc)" type="button">
              <X className="h-4 w-4" />
            </button>
          </div>

          {draft ? (
            <form
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 sm:px-8"
              onSubmit={e => {
                e.preventDefault();
                void saveDraft();
              }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{draft.id ? 'Edit prompt' : 'New prompt'}</p>
              <input
                aria-label="Prompt name"
                autoFocus
                className="w-full border-0 bg-transparent p-0 text-[22px] font-semibold tracking-tight text-slate-900 outline-none placeholder:text-slate-300 focus:ring-0"
                onChange={e => setDraft({...draft, title: e.target.value})}
                placeholder="Name it, e.g. Summarise an email thread"
                value={draft.title}
              />
              <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
                <label className="text-[12px] font-semibold text-slate-500">
                  Category
                  <input
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13.5px] font-normal text-slate-800 outline-none focus:border-[#9fbf8c] focus:ring-2 focus:ring-[#dfe9d6]"
                    list="prompt-categories"
                    onChange={e => setDraft({...draft, category: e.target.value})}
                    placeholder="General"
                    value={draft.category}
                  />
                  <datalist id="prompt-categories">
                    {categories.map(c => (
                      <option key={c.name} value={c.name} />
                    ))}
                  </datalist>
                </label>
                <label className="text-[12px] font-semibold text-slate-500">
                  Short description
                  <input
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13.5px] font-normal text-slate-800 outline-none focus:border-[#9fbf8c] focus:ring-2 focus:ring-[#dfe9d6]"
                    onChange={e => setDraft({...draft, description: e.target.value})}
                    placeholder="When you use it (optional)"
                    value={draft.description}
                  />
                </label>
              </div>
              <label className="flex min-h-[260px] flex-1 flex-col text-[12px] font-semibold text-slate-500">
                <span className="flex items-center justify-between">
                  Prompt
                  <span className="font-normal text-slate-400">
                    Use {'{{name}}'} for parts you fill in each time · {draft.content.length.toLocaleString()} characters
                  </span>
                </span>
                <textarea
                  className="mt-1 min-h-[220px] w-full flex-1 resize-none rounded-xl border border-black/10 bg-[#fcfcfa] px-4 py-3 font-mono text-[13px] font-normal leading-relaxed text-slate-800 outline-none focus:border-[#9fbf8c] focus:ring-2 focus:ring-[#dfe9d6]"
                  onChange={e => setDraft({...draft, content: e.target.value})}
                  placeholder={'Rewrite this email so it is shorter and friendlier:\n\n{{email}}'}
                  value={draft.content}
                />
              </label>
              {variablesOf(draft.content).length > 0 && (
                <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
                  Placeholders:
                  {variablesOf(draft.content).map(v => (
                    <span className="rounded-md bg-[#efe6ff] px-1.5 py-0.5 font-mono text-[11.5px] text-[#5a3fb4]" key={v}>
                      {v}
                    </span>
                  ))}
                </p>
              )}
              {formError && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700" role="alert">
                  {formError}
                </p>
              )}
              <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-2 border-t border-black/[0.06] bg-white px-5 py-3 sm:-mx-8 sm:px-8">
                <span className="mr-auto text-[11.5px] text-slate-400">Ctrl+Enter saves · Esc cancels</span>
                <button className="rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-500 hover:bg-black/5" onClick={() => setDraft(null)} type="button">
                  Cancel
                </button>
                <button className="flex items-center gap-1.5 rounded-lg bg-[#405b43] px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-[#2e4731]" disabled={saving} type="submit">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {draft.id ? 'Save' : 'Create prompt'}
                </button>
              </div>
            </form>
          ) : selected ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="px-5 pb-3 pt-4 sm:px-8">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <button
                      className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[12px] font-semibold text-slate-600 hover:bg-black/[0.07]"
                      onClick={() => setView({kind: 'category', name: selected.category || 'General'})}
                      title="Show this category"
                      type="button">
                      <span className="h-2 w-2 rounded-full" style={{background: colorFor(selected.category || 'General')}} />
                      {selected.category || 'General'}
                    </button>
                    <h3 className="text-[22px] font-semibold leading-tight tracking-tight text-slate-900">{selected.title}</h3>
                    {selected.description && <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{selected.description}</p>}
                    <p className="mt-2 text-[12px] text-slate-400">
                      {selected.useCount ? `Copied ${selected.useCount} time${selected.useCount === 1 ? '' : 's'} · last ${ago(selected.lastUsedAt)}` : 'Not copied yet'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      aria-label={selected.pinned ? 'Unpin' : 'Pin'}
                      aria-pressed={!!selected.pinned}
                      className={`rounded-lg p-2 transition ${selected.pinned ? 'bg-[#e3eadb] text-[#2f4a32]' : 'text-slate-400 hover:bg-black/5 hover:text-slate-700'}`}
                      onClick={() => toggle(selected, 'pinned')}
                      title={selected.pinned ? 'Unpin (P)' : 'Pin to the top (P)'}
                      type="button">
                      {selected.pinned ? <Pin className="h-4 w-4 fill-current" /> : <Pin className="h-4 w-4" />}
                    </button>
                    <button
                      aria-label={selected.favorite ? 'Remove from favourites' : 'Add to favourites'}
                      aria-pressed={!!selected.favorite}
                      className={`rounded-lg p-2 transition ${selected.favorite ? 'text-amber-500' : 'text-slate-400 hover:bg-black/5 hover:text-slate-700'}`}
                      onClick={() => toggle(selected, 'favorite')}
                      title={selected.favorite ? 'Remove from favourites (F)' : 'Favourite (F)'}
                      type="button">
                      <Star className="h-4 w-4" fill={selected.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button aria-label="Edit" className="rounded-lg p-2 text-slate-400 hover:bg-black/5 hover:text-slate-700" onClick={() => startEdit(selected)} title="Edit (E)" type="button">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="More"
                      className="rounded-lg p-2 text-slate-400 hover:bg-black/5 hover:text-slate-700"
                      onClick={e => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setMenu({id: selected._id, x: r.right - 200, y: r.bottom + 4});
                      }}
                      title="More"
                      type="button">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {vars.length > 0 && (
                <div className="mx-5 mb-3 rounded-xl border border-[#e5dcfb] bg-[#faf7ff] p-3 sm:mx-8">
                  <p className="mb-2 text-[12px] font-semibold text-[#5a3fb4]">Fill in before copying</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {vars.map(v => (
                      <label className="text-[12px] font-semibold text-slate-600" key={v}>
                        {v}
                        <textarea
                          className="mt-1 w-full resize-y rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[13px] font-normal text-slate-800 outline-none focus:border-[#b9a7f0] focus:ring-2 focus:ring-[#ece5ff]"
                          onChange={e => setValues(prev => ({...prev, [selected._id]: {...prev[selected._id], [v]: e.target.value}}))}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              void copy(selected);
                            }
                          }}
                          data-var={v}
                          placeholder="Ctrl+Enter copies"
                          rows={1}
                          value={values[selected._id]?.[v] || ''}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative mx-5 mb-4 flex-1 sm:mx-8">
                <pre className="min-h-[180px] whitespace-pre-wrap break-words rounded-xl border border-black/[0.07] bg-[#fbfbf8] p-4 font-mono text-[13px] leading-relaxed text-slate-800">
                  {selected.content ? highlighted(filled) : <span className="text-slate-400">This prompt is empty. Edit it to add the text.</span>}
                </pre>
              </div>

              <div className="sticky bottom-0 mt-auto flex flex-wrap items-center gap-2 border-t border-black/[0.06] bg-white px-5 py-3 sm:px-8">
                <span className="mr-auto hidden text-[11.5px] text-slate-400 sm:inline">{selected.content.length.toLocaleString()} characters</span>
                <span className="flex-1 sm:hidden" />
                <button className="rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-black/5" onClick={() => void copy(selected, true)} title="Shift+Enter" type="button">
                  Copy and close
                </button>
                <button className="flex items-center gap-1.5 rounded-lg bg-[#405b43] px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-[#2e4731]" onClick={() => void copy(selected)} title="Enter" type="button">
                  <Copy className="h-3.5 w-3.5" /> Copy prompt
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
              <Folder className="h-9 w-9 text-slate-300" />
              <p className="text-[13.5px] text-slate-500">{loading ? 'Opening your prompts…' : 'Choose a prompt to see it here.'}</p>
            </div>
          )}
        </section>

        {/* Right-click / More menu */}
        {menu && menuPrompt && (
          <div
            className="fixed z-[10001] w-[200px] rounded-xl border border-black/10 bg-white p-1 text-[13px] shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)]"
            data-prompt-menu
            role="menu"
            style={{left: Math.max(8, Math.min(menu.x, window.innerWidth - 208)), top: Math.max(8, Math.min(menu.y, window.innerHeight - 330))}}>
            {(
              [
                [<Copy className="h-3.5 w-3.5" key="c" />, 'Copy', () => void copy(menuPrompt)],
                [menuPrompt.pinned ? <PinOff className="h-3.5 w-3.5" key="p" /> : <Pin className="h-3.5 w-3.5" key="p" />, menuPrompt.pinned ? 'Unpin' : 'Pin to top', () => toggle(menuPrompt, 'pinned')],
                [<Star className="h-3.5 w-3.5" key="f" />, menuPrompt.favorite ? 'Remove favourite' : 'Favourite', () => toggle(menuPrompt, 'favorite')],
                [<Pencil className="h-3.5 w-3.5" key="e" />, 'Edit', () => startEdit(menuPrompt)],
                [<CopyPlus className="h-3.5 w-3.5" key="d" />, 'Duplicate', () => void duplicate(menuPrompt)],
              ] as [React.ReactNode, string, () => void][]
            ).map(([icon, label, act]) => (
              <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-black/[0.04]" key={label} onClick={() => (act(), setMenu(null))} role="menuitem" type="button">
                <span className="text-slate-400">{icon}</span>
                {label}
              </button>
            ))}
            {categories.length > 1 && (
              <>
                <p className="px-2.5 pb-0.5 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Move to</p>
                <div className="max-h-32 overflow-y-auto">
                  {categories
                    .filter(c => c.name !== (menuPrompt.category || 'General'))
                    .map(c => (
                      <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-black/[0.04]" key={c.name} onClick={() => (moveTo(menuPrompt, c.name), setMenu(null))} role="menuitem" type="button">
                        <span className="h-2 w-2 rounded-full" style={{background: colorFor(c.name)}} />
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                </div>
              </>
            )}
            <div className="my-1 h-px bg-black/[0.06]" />
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-rose-600 hover:bg-rose-50" onClick={() => (setMenu(null), void remove(menuPrompt))} role="menuitem" type="button">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}

        {toast && (
          <div className="pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-4 py-2 text-[12.5px] font-medium text-white shadow-lg" role="status">
            {toast}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
