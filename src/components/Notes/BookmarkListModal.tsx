/* eslint-disable react/jsx-sort-props, react-memo/require-memo, react-memo/require-usememo */
'use client';

// Bookmarks & documents: links and files you keep coming back to.
// Favourites sit in a quick-access strip; any entry can carry files kept in Google Drive.
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  FolderInput,
  Globe,
  Hash,
  Library,
  Link2,
  List as ListIcon,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Rows3,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {downloadFromDrive, uploadToDrive} from '@/lib/driveTransfer';

// ── Types ──────────────────────────────────────────────────────────────────
interface Attachment {
  id: string; // Google Drive file id
  name: string;
  mimeType?: string;
  size?: number;
  webViewLink?: string;
  addedAt?: number;
}
interface Bm {
  _id: string;
  url: string;
  title: string;
  description: string;
  notes?: string;
  category: string;
  tags?: string[];
  added_timestamp?: string;
  icon?: string;
  favorite?: boolean;
  attachments?: Attachment[];
  openCount?: number;
  lastOpenedAt?: number;
  /** Older entries: the whole bookmark is one Drive document */
  kind?: 'file';
  driveFileId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}
type Draft = {title: string; url: string; category: string; description: string; notes: string; tags: string[]; favorite: boolean; attachments: Attachment[]};
type View = 'all' | 'favorites' | 'recent' | 'files' | `cat:${string}` | `tag:${string}`;
type Sort = 'smart' | 'alpha' | 'newest' | 'used';

interface BookmarkListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DRIVE_FOLDER = 'Portfolio Bookmarks';
const GREEN = '#405b43';

// ── Server ─────────────────────────────────────────────────────────────────
async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {...init, headers: init?.body ? {'Content-Type': 'application/json'} : undefined});
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}
const api = {
  list: () => call<{bookmarks: Bm[]}>('/api/bookmarks').then(r => r.bookmarks || []),
  create: (d: Partial<Draft>) => call<{id: string; icon?: string}>('/api/bookmarks', {method: 'POST', body: JSON.stringify(d)}),
  update: (id: string, patch: Partial<Draft> & {opened?: boolean}) => call<{icon?: string}>(`/api/bookmarks/${id}`, {method: 'PUT', body: JSON.stringify(patch)}),
  remove: (id: string) => call(`/api/bookmarks/${id}`, {method: 'DELETE'}),
  renameCategory: (from: string, to: string) => call('/api/bookmarks', {method: 'PATCH', body: JSON.stringify({action: 'renameCategory', from, to})}),
};

// ── Helpers ────────────────────────────────────────────────────────────────
const DOTS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16'];
const dotOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return DOTS[Math.abs(h) % DOTS.length];
};
const hasLink = (b: Pick<Bm, 'url' | 'kind'>) => b.kind !== 'file' && !!b.url && !/^https?:\/\/?$/i.test(b.url.trim());
const hrefOf = (url: string) => (/^[a-z]+:/i.test(url) ? url : `https://${url}`);
const domainOf = (url: string) => {
  try {
    return new URL(hrefOf(url)).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
/** Two links count as the same bookmark when site and path match. */
const linkKey = (url: string) => {
  try {
    const u = new URL(hrefOf(url.trim()));
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
};
const iconOf = (b: Bm) => b.icon || (hasLink(b) ? `https://www.google.com/s2/favicons?domain=${domainOf(b.url)}&sz=64` : '');
/** Every file on an entry, including the single file of older document bookmarks. */
const filesOf = (b: Bm): Attachment[] => {
  const list = b.attachments || [];
  if (b.kind === 'file' && b.driveFileId && !list.some(a => a.id === b.driveFileId)) return [{id: b.driveFileId, name: b.fileName || b.title, mimeType: b.mimeType, size: b.size}, ...list];
  return list;
};
const addedAt = (b: Bm) => {
  if (b.added_timestamp && /^\d+$/.test(b.added_timestamp)) return Number(b.added_timestamp) * 1000;
  return /^[0-9a-f]{24}$/i.test(b._id) ? parseInt(b._id.slice(0, 8), 16) * 1000 : 0;
};
const ago = (ms?: number) => {
  if (!ms) return '';
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`;
};
const sizeOf = (bytes?: number) => (!bytes ? '' : bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`);
function fileTone(f: Pick<Attachment, 'name' | 'mimeType'>): {label: string; bg: string; fg: string} {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const mime = f.mimeType || '';
  if (ext === 'pdf' || mime.includes('pdf')) return {label: 'PDF', bg: '#fee2e2', fg: '#b91c1c'};
  if (['doc', 'docx', 'rtf', 'odt'].includes(ext) || mime.includes('word') || mime.includes('google-apps.document')) return {label: 'DOC', bg: '#dbeafe', fg: '#1d4ed8'};
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mime.includes('sheet') || mime.includes('excel')) return {label: 'XLS', bg: '#dcfce7', fg: '#15803d'};
  if (['ppt', 'pptx', 'odp'].includes(ext) || mime.includes('presentation')) return {label: 'PPT', bg: '#ffedd5', fg: '#c2410c'};
  if (mime.startsWith('image/')) return {label: 'IMG', bg: '#f3e8ff', fg: '#7e22ce'};
  if (['zip', 'rar', '7z'].includes(ext) || mime.includes('zip')) return {label: 'ZIP', bg: '#f1f5f9', fg: '#475569'};
  if (['msg', 'eml'].includes(ext)) return {label: 'MAIL', bg: '#fce7f3', fg: '#be185d'};
  return {label: (ext || 'FILE').slice(0, 4).toUpperCase(), bg: '#f1f5f9', fg: '#475569'};
}
/** A readable title from a link ("https://acme.com/pricing-2027" → "Acme · Pricing 2027"). */
function titleFromUrl(url: string) {
  try {
    const u = new URL(hrefOf(url));
    const site = u.hostname.replace(/^www\./, '').split('.')[0];
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return last && last.length < 60 && !/^\d+$/.test(last) ? `${cap(site)} · ${cap(last)}` : cap(site);
  } catch {
    return url;
  }
}
const looksLikeUrl = (s: string) => /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(s.trim()) && !/\s/.test(s.trim());
const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));
};
const read = <T,>(k: string, f: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? f : (JSON.parse(v) as T);
  } catch {
    return f;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // storage unavailable
  }
};
const emptyDraft = (category = 'Other'): Draft => ({title: '', url: '', category, description: '', notes: '', tags: [], favorite: false, attachments: []});

// ── Small pieces ───────────────────────────────────────────────────────────
function SiteIcon({b, size = 40}: {b: Bm; size?: number}) {
  const [broken, setBroken] = useState(false);
  const files = filesOf(b);
  const box = {width: size, height: size};
  if (!hasLink(b) && files.length) {
    const t = fileTone(files[0]);
    return (
      <span className="flex flex-shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold tracking-wide" style={{...box, background: t.bg, color: t.fg}}>
        {t.label}
      </span>
    );
  }
  const src = iconOf(b);
  return (
    <span className="flex flex-shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={box}>
      {src && !broken ? <img alt="" className="object-contain" onError={() => setBroken(true)} src={src} style={{width: size * 0.5, height: size * 0.5}} /> : <Globe className="text-zinc-300" style={{width: size * 0.45, height: size * 0.45}} />}
    </span>
  );
}

function FileChip({f, busy, onDownload, onRemove, compact}: {f: Attachment; busy?: boolean; onDownload: () => void; onRemove?: () => void; compact?: boolean}) {
  const t = fileTone(f);
  return (
    <div className="group/file flex min-w-0 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 py-1 pl-1 pr-1 transition-colors hover:border-zinc-300 hover:bg-white">
      <span className="flex h-6 w-7 flex-shrink-0 items-center justify-center rounded-md text-[8.5px] font-extrabold" style={{background: t.bg, color: t.fg}}>
        {t.label}
      </span>
      <button className="min-w-0 flex-1 truncate text-left text-[12px] font-medium text-zinc-700 hover:text-zinc-900" onClick={onDownload} title={`Download ${f.name}`} type="button">
        {f.name}
      </button>
      {!compact && f.size ? <span className="flex-shrink-0 text-[10.5px] tabular-nums text-zinc-400">{sizeOf(f.size)}</span> : null}
      <button className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900" disabled={busy} onClick={onDownload} title="Download" type="button">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
      </button>
      <a
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900"
        href={f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`}
        onClick={e => e.stopPropagation()}
        rel="noopener noreferrer"
        target="_blank"
        title="Open in Google Drive">
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      {onRemove && (
        <button className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600" onClick={onRemove} title="Remove from this bookmark" type="button">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function TagEditor({tags, onChange, suggestions}: {tags: string[]; onChange: (t: string[]) => void; suggestions: string[]}) {
  const [val, setVal] = useState('');
  const add = (raw: string) => {
    const t = raw.trim().replace(/^#/, '').replace(/,+$/, '');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal('');
  };
  const hints = suggestions.filter(s => !tags.includes(s) && (!val || s.toLowerCase().includes(val.toLowerCase()))).slice(0, 6);
  return (
    <div>
      <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 focus-within:border-[#7d9b70] focus-within:ring-2 focus-within:ring-[#e0e7d9]">
        {tags.map(t => (
          <span className="flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[12px] font-medium text-zinc-700" key={t}>
            #{t}
            <button className="text-zinc-400 hover:text-zinc-700" onClick={() => onChange(tags.filter(x => x !== t))} type="button">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          className="min-w-[90px] flex-1 border-0 bg-transparent p-0 text-[13px] outline-none focus:ring-0"
          onBlur={() => val.trim() && add(val)}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(val);
            } else if (e.key === 'Backspace' && !val && tags.length) onChange(tags.slice(0, -1));
          }}
          placeholder={tags.length ? '' : 'Add tags'}
          value={val}
        />
      </div>
      {hints.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {hints.map(h => (
            <button className="rounded-md px-1.5 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" key={h} onClick={() => add(h)} type="button">
              + #{h}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Window ─────────────────────────────────────────────────────────────────
export default function BookmarkListModal({isOpen, onClose}: BookmarkListModalProps) {
  const [items, setItems] = useState<Bm[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setViewState] = useState<View>('all');
  const [query, setQuery] = useState('');
  const [sort, setSortState] = useState<Sort>('smart');
  const [layout, setLayoutState] = useState<'grid' | 'list'>('grid');
  const downOnBackdrop = useRef(false);
  const [drawer, setDrawer] = useState<{id: string | null; draft: Draft; files: File[]} | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState<Record<string, {name: string; progress: number}>>({});
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [toast, setToast] = useState<{text: string; error?: boolean} | null>(null);
  const [menu, setMenu] = useState<{id: string; x: number; y: number} | null>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileTarget = useRef<string | 'new-entries' | 'draft'>('new-entries');

  useEffect(() => {
    setViewState(read<View>('BOOKMARKS_VIEW', 'all'));
    setSortState(read<Sort>('BOOKMARKS_SORT', 'smart'));
    setLayoutState(read<'grid' | 'list'>('BOOKMARKS_LAYOUT', 'grid'));
  }, []);
  const setView = (v: View) => (setViewState(v), write('BOOKMARKS_VIEW', v));
  const setSort = (s: Sort) => (setSortState(s), write('BOOKMARKS_SORT', s));
  const setLayout = (l: 'grid' | 'list') => (setLayoutState(l), write('BOOKMARKS_LAYOUT', l));

  const flash = useCallback((text: string, error = false) => {
    setToast({text, error});
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), error ? 6000 : 2600);
  }, []);

  // ── Loading (and moving old browser-only pins to real favourites) ─────────
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let list = await api.list();
      if (!read('bookmark-pins-moved', false)) {
        const pins = new Set(read<string[]>('bookmark-pins', []));
        const toStar = list.filter(b => pins.has(b._id) && !b.favorite);
        await Promise.all(toStar.map(b => api.update(b._id, {favorite: true}).catch(() => undefined)));
        if (toStar.length) list = list.map(b => (pins.has(b._id) ? {...b, favorite: true} : b));
        write('bookmark-pins-moved', true);
      }
      setItems(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load your bookmarks');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    void load();
    const t = setTimeout(() => searchRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [isOpen, load]);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach(b => m.set(b.category || 'Other', (m.get(b.category || 'Other') || 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach(b => (b.tags || []).forEach(t => m.set(t, (m.get(t) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);
  const favorites = useMemo(() => items.filter(b => b.favorite).sort((a, b) => (b.openCount || 0) - (a.openCount || 0) || a.title.localeCompare(b.title)), [items]);
  const counts = useMemo(() => ({all: items.length, favorites: favorites.length, recent: items.filter(b => b.lastOpenedAt).length, files: items.filter(b => filesOf(b).length).length}), [items, favorites]);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    let list = items.filter(b => {
      if (view === 'favorites' && !b.favorite) return false;
      if (view === 'recent' && !b.lastOpenedAt) return false;
      if (view === 'files' && !filesOf(b).length) return false;
      if (view.startsWith('cat:') && (b.category || 'Other') !== view.slice(4)) return false;
      if (view.startsWith('tag:') && !(b.tags || []).includes(view.slice(4))) return false;
      if (!words.length) return true;
      const hay = [b.title, b.url, b.description, b.notes, b.category, ...(b.tags || []).map(t => `#${t}`), ...filesOf(b).map(f => f.name)].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    });
    const by: Record<Sort, (a: Bm, b: Bm) => number> = {
      smart: (a, b) => Number(!!b.favorite) - Number(!!a.favorite) || (b.lastOpenedAt || addedAt(b)) - (a.lastOpenedAt || addedAt(a)),
      alpha: (a, b) => a.title.localeCompare(b.title),
      newest: (a, b) => addedAt(b) - addedAt(a),
      used: (a, b) => (b.openCount || 0) - (a.openCount || 0) || a.title.localeCompare(b.title),
    };
    list = [...list].sort(view === 'recent' ? (a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0) : by[sort]);
    return list;
  }, [items, view, query, sort]);

  const viewTitle = view === 'all' ? 'All bookmarks' : view === 'favorites' ? 'Favourites' : view === 'recent' ? 'Recently opened' : view === 'files' ? 'With files' : view.startsWith('cat:') ? view.slice(4) : `#${view.slice(4)}`;
  const currentCategory = view.startsWith('cat:') ? view.slice(4) : null;
  const typedUrl = looksLikeUrl(query) ? query.trim() : null;
  const already = typedUrl ? items.find(b => hasLink(b) && linkKey(b.url) === linkKey(typedUrl)) : undefined;

  // ── Actions ───────────────────────────────────────────────────────────────
  const patchLocal = (id: string, p: Partial<Bm>) => setItems(prev => prev.map(b => (b._id === id ? {...b, ...p} : b)));
  const save = async (id: string, p: Partial<Draft>, undo?: Partial<Bm>) => {
    patchLocal(id, p);
    try {
      const r = await api.update(id, p);
      if (r?.icon) patchLocal(id, {icon: r.icon});
    } catch (e) {
      if (undo) patchLocal(id, undo);
      flash(e instanceof Error ? e.message : 'Not saved', true);
    }
  };
  const open = (b: Bm) => {
    if (!hasLink(b)) {
      const f = filesOf(b)[0];
      if (f) void download(b, f);
      return;
    }
    window.open(hrefOf(b.url), '_blank', 'noopener,noreferrer');
    patchLocal(b._id, {openCount: (b.openCount || 0) + 1, lastOpenedAt: Date.now()});
    void api.update(b._id, {opened: true}).catch(() => undefined);
  };
  const download = async (b: Bm, f: Attachment) => {
    if (busyFile) return;
    setBusyFile(f.id);
    try {
      await downloadFromDrive({id: f.id, name: f.name, mimeType: f.mimeType});
      patchLocal(b._id, {lastOpenedAt: Date.now(), openCount: (b.openCount || 0) + 1});
      void api.update(b._id, {opened: true}).catch(() => undefined);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not download the file', true);
    } finally {
      setBusyFile(null);
    }
  };
  const toggleFav = (b: Bm) => void save(b._id, {favorite: !b.favorite}, {favorite: b.favorite});
  const copy = (b: Bm, markdown = false) => {
    const text = markdown ? `[${b.title}](${hrefOf(b.url)})` : hrefOf(b.url);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(b._id);
        setTimeout(() => setCopied(c => (c === b._id ? null : c)), 1500);
        flash(markdown ? 'Copied as a Markdown link' : 'Link copied');
      })
      .catch(() => flash('Could not copy', true));
  };
  const remove = async (b: Bm) => {
    const files = filesOf(b).length;
    if (!confirm(`Delete “${b.title}”?${files ? `\n\nIts ${files === 1 ? 'file stays' : `${files} files stay`} in your Google Drive (folder “${DRIVE_FOLDER}”).` : ''}`)) return;
    setItems(prev => prev.filter(x => x._id !== b._id));
    if (drawer?.id === b._id) setDrawer(null);
    try {
      await api.remove(b._id);
    } catch (e) {
      setItems(prev => [b, ...prev]);
      flash(e instanceof Error ? e.message : 'Could not delete', true);
    }
  };
  const duplicate = async (b: Bm) => {
    const d = {title: `${b.title} (copy)`, url: b.url, category: b.category, description: b.description, notes: b.notes || '', tags: b.tags || [], attachments: b.attachments || []};
    try {
      const r = await api.create(d);
      setItems(prev => [{...d, _id: r.id, icon: r.icon, added_timestamp: String(Math.floor(Date.now() / 1000))}, ...prev]);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not duplicate', true);
    }
  };
  const moveTo = (b: Bm, category: string) => {
    if (b.category === category) return;
    void save(b._id, {category}, {category: b.category});
    flash(`Moved to ${category}`);
  };

  /** Uploads files to Google Drive; returns what was stored. */
  const uploadFiles = async (key: string, files: File[]): Promise<Attachment[]> => {
    const done: Attachment[] = [];
    for (const file of files) {
      setUploads(u => ({...u, [key]: {name: file.name, progress: 0}}));
      try {
        const meta = await uploadToDrive(file, DRIVE_FOLDER, progress => setUploads(u => ({...u, [key]: {name: file.name, progress}})));
        done.push({id: meta.id, name: meta.name || file.name, mimeType: meta.mimeType || file.type, size: file.size, webViewLink: meta.webViewLink, addedAt: Date.now()});
      } catch (e) {
        flash(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`, true);
      }
    }
    setUploads(u => {
      const next = {...u};
      delete next[key];
      return next;
    });
    return done;
  };
  /** Files added to an existing bookmark are saved to Drive straight away. */
  const attachTo = async (b: Bm, files: File[]) => {
    if (!files.length) return;
    const got = await uploadFiles(b._id, files);
    if (!got.length) return;
    const fresh = items.find(x => x._id === b._id) || b;
    const next = [...(fresh.attachments || []), ...got];
    await save(b._id, {attachments: next});
    setDrawer(d => (d && d.id === b._id ? {...d, draft: {...d.draft, attachments: next}} : d));
    flash(got.length === 1 ? `“${got[0].name}” attached` : `${got.length} files attached`);
  };
  /** Files dropped on the window (not on a card): each becomes its own document entry. */
  const filesAsEntries = async (files: File[]) => {
    for (const file of files) {
      const [att] = await uploadFiles('new-entries', [file]);
      if (!att) continue;
      const d = {title: file.name.replace(/\.[^.]+$/, '') || file.name, url: '', category: currentCategory || 'Documents', description: '', notes: '', tags: [], attachments: [att]};
      try {
        const r = await api.create(d);
        setItems(prev => [{...d, _id: r.id, added_timestamp: String(Math.floor(Date.now() / 1000))}, ...prev]);
      } catch (e) {
        flash(e instanceof Error ? e.message : 'The file uploaded but the entry was not saved', true);
      }
    }
    flash(files.length === 1 ? `“${files[0].name}” saved to Google Drive` : `${files.length} files saved to Google Drive`);
  };
  const pickFiles = (target: string | 'new-entries' | 'draft') => {
    fileTarget.current = target;
    fileInput.current?.click();
  };
  const detach = (b: Bm, f: Attachment) => {
    if (!confirm(`Remove “${f.name}” from this bookmark?\n\nThe file stays in your Google Drive.`)) return;
    if (b.kind === 'file' && b.driveFileId === f.id) return flash('This entry is the document itself. Delete the entry instead.', true);
    const next = (b.attachments || []).filter(a => a.id !== f.id);
    void save(b._id, {attachments: next}, {attachments: b.attachments});
    setDrawer(d => (d && d.id === b._id ? {...d, draft: {...d.draft, attachments: next}} : d));
  };

  // ── Drawer (new and edit) ─────────────────────────────────────────────────
  const startNew = (prefill: Partial<Draft> = {}) => setDrawer({id: null, draft: {...emptyDraft(currentCategory || (view === 'files' ? 'Documents' : 'Other')), favorite: view === 'favorites', ...prefill}, files: []});
  const startEdit = (b: Bm) =>
    setDrawer({id: b._id, draft: {title: b.title, url: hasLink(b) ? b.url : '', category: b.category, description: b.description || '', notes: b.notes || '', tags: b.tags || [], favorite: !!b.favorite, attachments: b.attachments || []}, files: []});
  const setDraft = (p: Partial<Draft>) => setDrawer(d => (d ? {...d, draft: {...d.draft, ...p}} : d));
  const submit = async () => {
    if (!drawer || saving) return;
    const d = drawer.draft;
    const url = d.url.trim() ? (looksLikeUrl(d.url) && !/^[a-z]+:/i.test(d.url.trim()) ? `https://${d.url.trim()}` : d.url.trim()) : '';
    const title = d.title.trim() || (url ? titleFromUrl(url) : drawer.files[0]?.name.replace(/\.[^.]+$/, '') || '');
    if (!title) return flash('Give it a name or a link', true);
    if (!url && !d.attachments.length && !drawer.files.length) return flash('Add a link or attach a file', true);
    setSaving(true);
    try {
      if (drawer.id) {
        const b = items.find(x => x._id === drawer.id);
        await save(drawer.id, {title, url: b && b.kind === 'file' && !url ? b.url : url, category: d.category.trim() || 'Other', description: d.description, notes: d.notes, tags: d.tags, favorite: d.favorite, attachments: d.attachments});
      } else {
        const extra = drawer.files.length ? await uploadFiles('draft', drawer.files) : [];
        const body = {...d, title, url, category: d.category.trim() || 'Other', attachments: [...d.attachments, ...extra]};
        const r = await api.create(body);
        setItems(prev => [{...body, _id: r.id, icon: r.icon, added_timestamp: String(Math.floor(Date.now() / 1000))}, ...prev]);
        if (looksLikeUrl(query) && linkKey(query) === linkKey(url)) setQuery('');
        flash('Saved');
      }
      setDrawer(null);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Not saved', true);
    } finally {
      setSaving(false);
    }
  };

  const renameCategory = async (from: string, to: string) => {
    setRenaming(null);
    const name = to.trim();
    if (!name || name === from) return;
    setItems(prev => prev.map(b => (b.category === from ? {...b, category: name} : b)));
    if (view === `cat:${from}`) setView(`cat:${name}`);
    try {
      await api.renameCategory(from, name);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Not renamed', true);
      void load();
    }
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (menu) return setMenu(null);
        if (renaming) return setRenaming(null);
        if (drawer) return setDrawer(null);
        if (query) return setQuery('');
        return onClose();
      }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'n') {
        e.preventDefault();
        startNew();
      } else if (/^[1-9]$/.test(e.key) && favorites[Number(e.key) - 1]) {
        e.preventDefault();
        open(favorites[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  if (!isOpen || !mounted) return null;
  const menuItem = menu ? items.find(b => b._id === menu.id) : undefined;
  const draftItem = drawer?.id ? items.find(b => b._id === drawer.id) : undefined;
  const newUpload = uploads['new-entries'];

  // ── Pieces that use the window's state ────────────────────────────────────
  const railBtn = (v: View, label: string, icon: React.ReactNode, count?: number) => (
    <button
      className={`flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors ${view === v ? 'bg-white font-semibold text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-zinc-200' : 'font-medium text-zinc-600 hover:bg-white/70 hover:text-zinc-900'}`}
      key={v}
      onClick={() => setView(v)}
      type="button">
      {icon}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {count !== undefined && count > 0 && <span className="text-[11px] tabular-nums text-zinc-400">{count}</span>}
    </button>
  );

  const cardActions = (b: Bm) => (
    <>
      {hasLink(b) && (
        <button className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800" onClick={() => copy(b)} title="Copy link" type="button">
          {copied === b._id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      <button className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800" onClick={() => pickFiles(b._id)} title="Attach files (or drop them on the card)" type="button">
        <Paperclip className="h-3.5 w-3.5" />
      </button>
      <button className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800" onClick={() => startEdit(b)} title="Edit" type="button">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
        onClick={e => {
          e.stopPropagation();
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setMenu({id: b._id, x: r.right - 220, y: r.bottom + 4});
        }}
        onPointerDown={e => e.stopPropagation()}
        title="More"
        type="button">
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </>
  );

  const dropProps = (b: Bm) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      e.stopPropagation();
      setDropOn(b._id);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropOn(d => (d === b._id ? null : d));
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.files?.length) return;
      e.preventDefault();
      e.stopPropagation();
      setDropOn(null);
      void attachTo(b, [...e.dataTransfer.files]);
    },
    onContextMenu: (e: React.MouseEvent) => {
      if (isTyping(e.target)) return;
      e.preventDefault();
      setMenu({id: b._id, x: Math.min(e.clientX, window.innerWidth - 230), y: Math.min(e.clientY, window.innerHeight - 380)});
    },
    draggable: true,
    onDragStart: (e: React.DragEvent) => e.dataTransfer.setData('text/bookmark-id', b._id),
  });

  const Card = (b: Bm) => {
    const files = filesOf(b);
    const up = uploads[b._id];
    const detail = b.description?.trim() && b.description.trim().toLowerCase() !== b.title.trim().toLowerCase() ? b.description.trim() : '';
    return (
      <article
        className={`group relative flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-all duration-200 sm:flex-row sm:items-center sm:gap-4 ${
          dropOn === b._id ? 'border-[#7d9b70] ring-4 ring-[#e0e7d9]' : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-[0_10px_30px_-20px_rgba(0,0,0,0.35)]'
        }`}
        key={b._id}
        onDoubleClick={e => !isTyping(e.target) && !(e.target as HTMLElement).closest('a,button') && startEdit(b)}
        {...dropProps(b)}>
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <SiteIcon b={b} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1">
              <button className="min-w-0 truncate text-left text-[15px] font-semibold text-zinc-900 hover:text-[#405b43]" onClick={() => open(b)} title={hasLink(b) ? `Open ${hrefOf(b.url)}` : 'Download'} type="button">
                {b.title}
              </button>
              <button
                aria-label={b.favorite ? 'Remove from favourites' : 'Add to favourites'}
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${b.favorite ? 'text-amber-400 hover:bg-amber-50' : 'text-zinc-300 opacity-0 hover:bg-zinc-100 hover:text-zinc-500 group-hover:opacity-100'}`}
                onClick={() => toggleFav(b)}
                title={b.favorite ? 'Favourite' : 'Add to favourites'}
                type="button">
                <Star className="h-4 w-4" fill={b.favorite ? 'currentColor' : 'none'} />
              </button>
            </div>
            <p className="flex min-w-0 items-center gap-1 text-[12px] text-zinc-400">
              {hasLink(b) ? (
                <>
                  <Link2 className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{domainOf(b.url)}</span>
                </>
              ) : (
                <>
                  <FileText className="h-3 w-3 flex-shrink-0" />
                  Document
                </>
              )}
              {b.lastOpenedAt ? <span className="flex-shrink-0">· opened {ago(b.lastOpenedAt)}</span> : null}
            </p>
            {detail && <p className="mt-1.5 line-clamp-2 select-text text-[13px] leading-relaxed text-zinc-500">{detail}</p>}
            {(!!b.tags?.length || files.length > 0 || up) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {(b.tags || []).slice(0, 6).map(t => (
                  <button className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800" key={t} onClick={() => setView(`tag:${t}`)} type="button">
                    #{t}
                  </button>
                ))}
                {files.slice(0, 4).map(f => (
                  <div className="w-full sm:w-auto sm:max-w-[320px]" key={f.id}>
                    <FileChip busy={busyFile === f.id} f={f} onDownload={() => void download(b, f)} />
                  </div>
                ))}
                {files.length > 4 && (
                  <button className="text-[11.5px] font-medium text-zinc-500 hover:text-zinc-800" onClick={() => startEdit(b)} type="button">
                    +{files.length - 4} more
                  </button>
                )}
                {up && (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-2 py-1 text-[11.5px] text-zinc-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="max-w-[200px] truncate">{up.name}</span>
                    <span className="tabular-nums">{Math.round(up.progress * 100)}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1 pl-[58px] sm:pl-0">
          <button className="mr-1 flex min-w-0 max-w-[160px] items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-zinc-500 hover:bg-zinc-100" onClick={() => setView(`cat:${b.category || 'Other'}`)} title={b.category || 'Other'} type="button">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{background: dotOf(b.category || 'Other')}} />
            <span className="truncate">{b.category || 'Other'}</span>
          </button>
          <span className="flex-1 sm:hidden" />
          <span className="flex items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">{cardActions(b)}</span>
          <button
            className="ml-1 flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#405b43]"
            onClick={() => open(b)}
            type="button">
            {hasLink(b) ? (
              <>
                Open <ArrowUpRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                {busyFile === files[0]?.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />} Download
              </>
            )}
          </button>
        </div>
      </article>
    );
  };

  const Row = (b: Bm) => {
    const files = filesOf(b);
    const up = uploads[b._id];
    return (
      <li
        className={`group flex items-center gap-3 border-b border-zinc-100 px-3 py-2.5 last:border-b-0 ${dropOn === b._id ? 'bg-[#eef3e8]' : 'hover:bg-zinc-50/80'}`}
        key={b._id}
        onDoubleClick={e => !(e.target as HTMLElement).closest('a,button') && startEdit(b)}
        {...dropProps(b)}>
        <button className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${b.favorite ? 'text-amber-400' : 'text-zinc-300 hover:text-zinc-500'}`} onClick={() => toggleFav(b)} title="Favourite" type="button">
          <Star className="h-4 w-4" fill={b.favorite ? 'currentColor' : 'none'} />
        </button>
        <SiteIcon b={b} size={30} />
        <div className="min-w-0 flex-1">
          <button className="block max-w-full truncate text-left text-[13.5px] font-semibold text-zinc-900 hover:text-[#405b43]" onClick={() => open(b)} type="button">
            {b.title}
          </button>
          <p className="truncate text-[11.5px] text-zinc-400">{hasLink(b) ? domainOf(b.url) : 'Document'}{b.description ? ` · ${b.description}` : ''}</p>
        </div>
        {up && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
        {files.length > 0 && (
          <button
            className="hidden flex-shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600 hover:border-zinc-300 hover:bg-white sm:flex"
            onClick={() => (files.length === 1 ? void download(b, files[0]) : startEdit(b))}
            title={files.length === 1 ? `Download ${files[0].name}` : `${files.length} files`}
            type="button">
            {busyFile === files[0].id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
            {files.length}
          </button>
        )}
        <span className="hidden w-32 flex-shrink-0 items-center gap-1.5 truncate text-[12px] text-zinc-500 md:flex">
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{background: dotOf(b.category || 'Other')}} />
          <span className="truncate">{b.category}</span>
        </span>
        <span className="hidden w-20 flex-shrink-0 text-right text-[11px] text-zinc-400 lg:inline">{b.lastOpenedAt ? ago(b.lastOpenedAt) : ago(addedAt(b))}</span>
        <span className="hidden flex-shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:flex">{cardActions(b)}</span>
        <button className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-white" onClick={() => open(b)} title={hasLink(b) ? 'Open' : 'Download'} type="button">
          {hasLink(b) ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
        </button>
      </li>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Bookmarks and documents">
      <div
        className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px]"
        onClick={e => {
          if (downOnBackdrop.current && e.target === e.currentTarget) onClose();
          downOnBackdrop.current = false;
        }}
        onMouseDown={e => (downOnBackdrop.current = e.target === e.currentTarget)}
      />
      <div
        className="relative flex h-[100dvh] w-full overflow-hidden bg-[#fafaf9] text-zinc-900 shadow-2xl ring-1 ring-black/5 sm:h-[88vh] sm:max-w-[1360px] sm:rounded-2xl"
        onDragOver={e => {
          if (e.dataTransfer.types.includes('Files')) e.preventDefault();
        }}
        onDrop={e => {
          if (!e.dataTransfer.files?.length) return;
          e.preventDefault();
          void filesAsEntries([...e.dataTransfer.files]);
        }}>
        <input
          className="hidden"
          multiple
          onChange={e => {
            const files = [...(e.target.files || [])];
            e.target.value = '';
            if (!files.length) return;
            const t = fileTarget.current;
            if (t === 'draft') setDrawer(d => (d ? {...d, files: [...d.files, ...files]} : d));
            else if (t === 'new-entries') void filesAsEntries(files);
            else {
              const b = items.find(x => x._id === t);
              if (b) void attachTo(b, files);
            }
          }}
          ref={fileInput}
          type="file"
        />

        {/* ── Left rail ── */}
        <aside className="hidden w-[232px] flex-shrink-0 flex-col border-r border-zinc-200/80 bg-[#f4f4f2] md:flex">
          <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{background: GREEN}}>
              <Library className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold leading-tight">Bookmarks</p>
              <p className="text-[11px] text-zinc-500">& documents</p>
            </div>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3">
            {railBtn('all', 'All bookmarks', <Library className="h-4 w-4 text-zinc-500" />, counts.all)}
            {railBtn('favorites', 'Favourites', <Star className="h-4 w-4 text-amber-500" />, counts.favorites)}
            {railBtn('recent', 'Recently opened', <Clock className="h-4 w-4 text-zinc-500" />, counts.recent)}
            {railBtn('files', 'With files', <Paperclip className="h-4 w-4 text-zinc-500" />, counts.files)}

            <p className="px-2.5 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-zinc-400">Categories</p>
            {categories.map(([c, n]) =>
              renaming === c ? (
                <input
                  autoFocus
                  className="h-8 w-full rounded-lg border border-[#7d9b70] bg-white px-2.5 text-[13px] outline-none ring-2 ring-[#e0e7d9]"
                  defaultValue={c}
                  key={c}
                  onBlur={e => void renameCategory(c, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setRenaming(null);
                    }
                  }}
                />
              ) : (
                <div
                  className={`group/cat flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors ${
                    view === `cat:${c}` ? 'bg-white font-semibold text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-zinc-200' : 'font-medium text-zinc-600 hover:bg-white/70'
                  }`}
                  key={c}
                  onDragOver={e => {
                    if (e.dataTransfer.types.includes('text/bookmark-id')) {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).style.background = '#e7efe1';
                    }
                  }}
                  onDragLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
                  onDrop={e => {
                    (e.currentTarget as HTMLElement).style.background = '';
                    const id = e.dataTransfer.getData('text/bookmark-id');
                    const b = items.find(x => x._id === id);
                    if (b) {
                      e.preventDefault();
                      e.stopPropagation();
                      moveTo(b, c);
                    }
                  }}>
                  <button className="flex min-w-0 flex-1 items-center gap-2.5" onClick={() => setView(`cat:${c}`)} type="button">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{background: dotOf(c)}} />
                    <span className="truncate text-left">{c}</span>
                  </button>
                  <button className="hidden text-zinc-400 hover:text-zinc-700 group-hover/cat:block" onClick={() => setRenaming(c)} title="Rename category" type="button">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <span className="text-[11px] tabular-nums text-zinc-400 group-hover/cat:hidden">{n}</span>
                </div>
              ),
            )}

            {tagCounts.length > 0 && (
              <>
                <p className="px-2.5 pb-1.5 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-zinc-400">Tags</p>
                <div className="flex flex-wrap gap-1 px-1.5">
                  {(showAllTags ? tagCounts : tagCounts.slice(0, 12)).map(([t, n]) => (
                    <button
                      className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-medium transition-colors ${view === `tag:${t}` ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-300'}`}
                      key={t}
                      onClick={() => setView(view === `tag:${t}` ? 'all' : `tag:${t}`)}
                      title={`${n} bookmark${n === 1 ? '' : 's'}`}
                      type="button">
                      #{t}
                    </button>
                  ))}
                  {tagCounts.length > 12 && (
                    <button className="px-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-800" onClick={() => setShowAllTags(v => !v)} type="button">
                      {showAllTags ? 'Fewer' : `+${tagCounts.length - 12}`}
                    </button>
                  )}
                </div>
              </>
            )}
          </nav>
          <div className="border-t border-zinc-200/80 px-4 py-3 text-[11px] leading-snug text-zinc-500">
            Files are kept in your Google Drive, in <b className="font-semibold text-zinc-700">{DRIVE_FOLDER}</b>.
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-shrink-0 flex-col gap-3 border-b border-zinc-200/80 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[19px] font-bold tracking-tight">{viewTitle}</h2>
                <p className="text-[12px] text-zinc-500">
                  {shown.length} of {items.length}
                  {query && ` matching “${query}”`}
                </p>
              </div>
              <div className="hidden items-center rounded-lg bg-zinc-100 p-0.5 sm:flex">
                {(['grid', 'list'] as const).map(l => (
                  <button
                    aria-label={l === 'grid' ? 'Cards' : 'List'}
                    className={`flex h-7 w-8 items-center justify-center rounded-md ${layout === l ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
                    key={l}
                    onClick={() => setLayout(l)}
                    title={l === 'grid' ? 'Cards' : 'List'}
                    type="button">
                    {l === 'grid' ? <Rows3 className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
                  </button>
                ))}
              </div>
              <button className="hidden h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-semibold text-zinc-700 hover:border-zinc-300 sm:flex" onClick={() => pickFiles('new-entries')} type="button">
                <Upload className="h-4 w-4" /> Upload
              </button>
              <button className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-white shadow-sm" onClick={() => startNew()} style={{background: GREEN}} title="New bookmark (N)" type="button">
                <Plus className="h-4 w-4" /> New
              </button>
              <button aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" onClick={onClose} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 focus-within:border-[#7d9b70] focus-within:ring-2 focus-within:ring-[#e0e7d9]">
                <Search className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] outline-none placeholder:text-zinc-400 focus:ring-0"
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (typedUrl && !already) startNew({url: typedUrl, title: titleFromUrl(typedUrl)});
                      else if (shown[0]) open(shown[0]);
                    }
                  }}
                  placeholder="Search, or paste a link to save it"
                  ref={searchRef}
                  value={query}
                />
                {query ? (
                  <button className="text-zinc-400 hover:text-zinc-700" onClick={() => setQuery('')} type="button">
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <kbd className="hidden rounded border border-zinc-200 px-1.5 text-[10px] font-semibold text-zinc-400 sm:block">/</kbd>
                )}
              </label>
              <div className="relative">
                <select
                  aria-label="Sort"
                  className="h-9 appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-8 text-[13px] font-medium text-zinc-700 focus:border-[#7d9b70] focus:outline-none focus:ring-2 focus:ring-[#e0e7d9]"
                  onChange={e => setSort(e.target.value as Sort)}
                  value={sort}>
                  <option value="smart">Favourites first</option>
                  <option value="used">Most opened</option>
                  <option value="newest">Newest</option>
                  <option value="alpha">A–Z</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
            {/* Phone: views and categories as chips */}
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 md:hidden">
              {(['all', 'favorites', 'recent', 'files'] as const).map(v => (
                <button className={`flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${view === v ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`} key={v} onClick={() => setView(v)} type="button">
                  {{all: 'All', favorites: '★ Favourites', recent: 'Recent', files: 'Files'}[v]}
                </button>
              ))}
              {categories.map(([c]) => (
                <button className={`flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${view === `cat:${c}` ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`} key={c} onClick={() => setView(`cat:${c}`)} type="button">
                  {c}
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6">
            {/* Paste a link → save it */}
            {typedUrl && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#cfdcc5] bg-[#f3f7ef] px-4 py-3">
                <Link2 className="h-4 w-4 flex-shrink-0" style={{color: GREEN}} />
                {already ? (
                  <p className="min-w-0 flex-1 truncate text-[13px] text-zinc-700">
                    Already saved as <b>{already.title}</b>
                  </p>
                ) : (
                  <p className="min-w-0 flex-1 truncate text-[13px] text-zinc-700">
                    Save <b>{domainOf(typedUrl)}</b> as a bookmark
                  </p>
                )}
                {already ? (
                  <button className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:ring-zinc-300" onClick={() => startEdit(already)} type="button">
                    Edit it
                  </button>
                ) : (
                  <button className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white" onClick={() => startNew({url: typedUrl, title: titleFromUrl(typedUrl)})} style={{background: GREEN}} type="button">
                    Save · Enter
                  </button>
                )}
              </div>
            )}

            {/* Quick access: favourites */}
            {favorites.length > 0 && !query && view !== 'favorites' && view !== 'recent' && (
              <section className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                    <Star className="h-3 w-3 text-amber-400" fill="currentColor" /> Quick access
                  </h3>
                  <span className="hidden text-[11px] text-zinc-400 sm:block">Press 1–9 to open</span>
                </div>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {favorites.slice(0, 16).map((b, i) => (
                    <button
                      className="group/fav flex max-w-[220px] flex-shrink-0 items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-white py-2 pl-2 pr-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
                      key={b._id}
                      onClick={() => open(b)}
                      onContextMenu={e => {
                        e.preventDefault();
                        setMenu({id: b._id, x: Math.min(e.clientX, window.innerWidth - 230), y: Math.min(e.clientY, window.innerHeight - 380)});
                      }}
                      title={hasLink(b) ? hrefOf(b.url) : 'Download'}
                      type="button">
                      <SiteIcon b={b} size={28} />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-zinc-800">{b.title}</span>
                        <span className="block truncate text-[10.5px] text-zinc-400">{hasLink(b) ? domainOf(b.url) : `${filesOf(b).length} file${filesOf(b).length === 1 ? '' : 's'}`}</span>
                      </span>
                      {i < 9 && <kbd className="ml-1 hidden flex-shrink-0 rounded border border-zinc-200 px-1 text-[10px] font-semibold text-zinc-400 sm:block">{i + 1}</kbd>}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {newUpload && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">Uploading {newUpload.name} to Google Drive…</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full transition-[width] duration-300" style={{width: `${Math.round(newUpload.progress * 100)}%`, background: GREEN}} />
                  </div>
                </div>
                <span className="text-[12px] tabular-nums text-zinc-500">{Math.round(newUpload.progress * 100)}%</span>
              </div>
            )}

            {loading && !items.length ? (
              <div className="flex flex-col gap-2.5">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div className="h-[84px] animate-pulse rounded-2xl bg-zinc-200/50" key={i} style={{animationDelay: `${i * 70}ms`}} />
                ))}
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <p className="text-[14px] font-semibold text-zinc-800">{loadError}</p>
                <button className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white" onClick={() => void load()} type="button">
                  Try again
                </button>
              </div>
            ) : shown.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-400 ring-1 ring-zinc-200">
                  {view === 'favorites' ? <Star className="h-5 w-5" /> : <Library className="h-5 w-5" />}
                </span>
                <p className="text-[14px] font-semibold text-zinc-800">{query ? 'Nothing matches that' : view === 'favorites' ? 'No favourites yet' : view === 'recent' ? 'Nothing opened yet' : 'Nothing here yet'}</p>
                <p className="max-w-sm text-[12.5px] text-zinc-500">
                  {view === 'favorites' ? 'Star a bookmark to keep it one click (or one key) away.' : 'Paste a link in the search box, press N for a new bookmark, or drop files anywhere in this window.'}
                </p>
              </div>
            ) : layout === 'grid' ? (
              <div className="flex flex-col gap-2.5">{shown.map(Card)}</div>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">{shown.map(Row)}</ul>
            )}
          </div>
          <footer className="hidden flex-shrink-0 items-center gap-4 border-t border-zinc-200/80 bg-white/70 px-6 py-2 text-[11px] text-zinc-400 lg:flex">
            <span>
              <kbd className="font-semibold text-zinc-500">/</kbd> search
            </span>
            <span>
              <kbd className="font-semibold text-zinc-500">N</kbd> new
            </span>
            <span>
              <kbd className="font-semibold text-zinc-500">1–9</kbd> open a favourite
            </span>
            <span>Drop files on a card to attach them, or on the window to save them</span>
            <span className="flex-1" />
            <span>Double-click a card to edit · right-click for more</span>
          </footer>
        </main>

        {/* ── Drawer: new / edit ── */}
        {drawer && (
          <div className="absolute inset-0 z-20 flex justify-end bg-zinc-950/10">
            <section
              className="flex h-full w-full flex-col bg-white shadow-[-20px_0_60px_-30px_rgba(0,0,0,0.45)] sm:w-[440px]"
              onClick={e => e.stopPropagation()}
              onDragOver={e => {
                if (e.dataTransfer.types.includes('Files')) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onDrop={e => {
                if (!e.dataTransfer.files?.length) return;
                e.preventDefault();
                e.stopPropagation();
                const files = [...e.dataTransfer.files];
                if (draftItem) void attachTo(draftItem, files);
                else setDrawer(d => (d ? {...d, files: [...d.files, ...files]} : d));
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}>
              <header className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3.5">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 sm:hidden" onClick={() => setDrawer(null)} type="button">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h3 className="flex-1 text-[15px] font-bold">{drawer.id ? 'Edit bookmark' : 'New bookmark'}</h3>
                <button
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold ${drawer.draft.favorite ? 'bg-amber-50 text-amber-600' : 'text-zinc-500 hover:bg-zinc-100'}`}
                  onClick={() => setDraft({favorite: !drawer.draft.favorite})}
                  type="button">
                  <Star className="h-4 w-4" fill={drawer.draft.favorite ? 'currentColor' : 'none'} /> {drawer.draft.favorite ? 'Favourite' : 'Favourite?'}
                </button>
                <button className="hidden h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 sm:flex" onClick={() => setDrawer(null)} type="button">
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-zinc-600">Link</span>
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-2.5 focus-within:border-[#7d9b70] focus-within:ring-2 focus-within:ring-[#e0e7d9]">
                    <Link2 className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                    <input
                      autoFocus={!drawer.id}
                      className="h-9 min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-blue-700 outline-none focus:ring-0"
                      onBlur={() => !drawer.draft.title.trim() && drawer.draft.url.trim() && setDraft({title: titleFromUrl(drawer.draft.url)})}
                      onChange={e => setDraft({url: e.target.value})}
                      placeholder="https://… (leave empty for a file-only entry)"
                      value={drawer.draft.url}
                    />
                    {drawer.draft.url.trim() && (
                      <a className="text-zinc-400 hover:text-zinc-700" href={hrefOf(drawer.draft.url.trim())} rel="noopener noreferrer" target="_blank" title="Open">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-zinc-600">Name</span>
                  <input
                    autoFocus={!!drawer.id}
                    className="h-9 w-full rounded-lg border border-zinc-200 px-2.5 text-[14px] font-semibold outline-none focus:border-[#7d9b70] focus:ring-2 focus:ring-[#e0e7d9]"
                    onChange={e => setDraft({title: e.target.value})}
                    placeholder="What is it?"
                    value={drawer.draft.title}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-zinc-600">Category</span>
                  <input
                    className="h-9 w-full rounded-lg border border-zinc-200 px-2.5 text-[13px] outline-none focus:border-[#7d9b70] focus:ring-2 focus:ring-[#e0e7d9]"
                    list="bm-categories"
                    onChange={e => setDraft({category: e.target.value})}
                    placeholder="Other"
                    value={drawer.draft.category}
                  />
                  <datalist id="bm-categories">
                    {categories.map(([c]) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {categories.slice(0, 8).map(([c]) => (
                      <button
                        className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${drawer.draft.category === c ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
                        key={c}
                        onClick={() => setDraft({category: c})}
                        type="button">
                        <span className="h-1.5 w-1.5 rounded-full" style={{background: dotOf(c)}} />
                        {c}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-zinc-600">Description</span>
                  <textarea
                    className="w-full resize-none rounded-lg border border-zinc-200 px-2.5 py-2 text-[13px] outline-none focus:border-[#7d9b70] focus:ring-2 focus:ring-[#e0e7d9]"
                    onChange={e => setDraft({description: e.target.value})}
                    placeholder="One line about it (shown on the card)"
                    rows={2}
                    value={drawer.draft.description}
                  />
                </label>
                <div>
                  <span className="mb-1 block text-[11.5px] font-semibold text-zinc-600">Tags</span>
                  <TagEditor onChange={tags => setDraft({tags})} suggestions={tagCounts.map(([t]) => t)} tags={drawer.draft.tags} />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold text-zinc-600">Files</span>
                    <span className="text-[10.5px] text-zinc-400">Saved to Google Drive</span>
                  </div>
                  <div className="space-y-1.5">
                    {(draftItem ? filesOf({...draftItem, attachments: drawer.draft.attachments}) : drawer.draft.attachments).map(f => (
                      <FileChip busy={busyFile === f.id} f={f} key={f.id} onDownload={() => draftItem && void download(draftItem, f)} onRemove={draftItem ? () => detach({...draftItem, attachments: drawer.draft.attachments}, f) : undefined} />
                    ))}
                    {drawer.files.map((f, i) => (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-2 py-1.5 text-[12px]" key={`${f.name}-${i}`}>
                        <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        <span className="text-[10.5px] text-zinc-400">{sizeOf(f.size)} · uploads on save</span>
                        <button className="text-zinc-400 hover:text-red-600" onClick={() => setDrawer(d => (d ? {...d, files: d.files.filter((_, j) => j !== i)} : d))} type="button">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {(uploads[drawer.id || 'draft'] || (drawer.id && uploads[drawer.id])) && (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-2 py-1.5 text-[12px] text-zinc-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="min-w-0 flex-1 truncate">{uploads[drawer.id || 'draft']?.name}</span>
                        <span className="tabular-nums">{Math.round((uploads[drawer.id || 'draft']?.progress || 0) * 100)}%</span>
                      </div>
                    )}
                    <button
                      className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-zinc-200 px-3 py-4 text-[12px] text-zinc-500 transition-colors hover:border-[#9fb592] hover:bg-[#f3f7ef] hover:text-zinc-800"
                      onClick={() => pickFiles(drawer.id || 'draft')}
                      type="button">
                      <Upload className="h-4 w-4" />
                      <span>
                        <b className="font-semibold">Choose files</b> or drop them here
                      </span>
                    </button>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-zinc-600">Notes</span>
                  <textarea
                    className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-[13px] leading-relaxed outline-none focus:border-[#7d9b70] focus:ring-2 focus:ring-[#e0e7d9]"
                    onChange={e => setDraft({notes: e.target.value})}
                    placeholder="Logins to use, who owns it, how to find things… (searchable)"
                    rows={4}
                    value={drawer.draft.notes}
                  />
                </label>
                {draftItem && (
                  <p className="text-[11px] text-zinc-400">
                    Added {ago(addedAt(draftItem))}
                    {draftItem.openCount ? ` · opened ${draftItem.openCount} time${draftItem.openCount === 1 ? '' : 's'}` : ''}
                    {draftItem.lastOpenedAt ? `, last ${ago(draftItem.lastOpenedAt)}` : ''}
                  </p>
                )}
              </div>
              <footer className="flex items-center gap-2 border-t border-zinc-100 px-5 py-3">
                {draftItem && (
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600" onClick={() => void remove(draftItem)} title="Delete" type="button">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <span className="flex-1 text-[11px] text-zinc-400">Ctrl+Enter to save</span>
                <button className="h-9 rounded-lg px-3 text-[13px] font-medium text-zinc-500 hover:bg-zinc-100" onClick={() => setDrawer(null)} type="button">
                  Cancel
                </button>
                <button className="flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void submit()} style={{background: GREEN}} type="button">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {drawer.id ? 'Save' : 'Add bookmark'}
                </button>
              </footer>
            </section>
          </div>
        )}

        {/* ── Right-click / ⋯ menu ── */}
        {menu && menuItem && (
          <div
            className="fixed z-[120] w-[220px] rounded-xl border border-zinc-200 bg-white p-1 text-[13px] shadow-xl"
            onPointerDown={e => e.stopPropagation()}
            style={{left: Math.max(8, menu.x), top: menu.y}}>
            {[
              {icon: hasLink(menuItem) ? <ArrowUpRight /> : <ArrowDownToLine />, label: hasLink(menuItem) ? 'Open' : 'Download', run: () => open(menuItem)},
              ...(hasLink(menuItem)
                ? [
                    {icon: <Copy />, label: 'Copy link', run: () => copy(menuItem)},
                    {icon: <Hash />, label: 'Copy as Markdown link', run: () => copy(menuItem, true)},
                  ]
                : []),
              {icon: <Star />, label: menuItem.favorite ? 'Remove from favourites' : 'Add to favourites', run: () => toggleFav(menuItem)},
              {icon: <Paperclip />, label: 'Attach files…', run: () => pickFiles(menuItem._id)},
              {icon: <Pencil />, label: 'Edit', run: () => startEdit(menuItem)},
              {icon: <Copy />, label: 'Duplicate', run: () => void duplicate(menuItem)},
            ].map(x => (
              <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-zinc-700 hover:bg-zinc-100 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-zinc-400" key={x.label} onClick={() => (setMenu(null), x.run())} type="button">
                {x.icon}
                {x.label}
              </button>
            ))}
            {categories.length > 1 && (
              <>
                <p className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  <FolderInput className="h-3 w-3" /> Move to
                </p>
                <div className="max-h-40 overflow-y-auto">
                  {categories
                    .filter(([c]) => c !== menuItem.category)
                    .map(([c]) => (
                      <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-zinc-700 hover:bg-zinc-100" key={c} onClick={() => (setMenu(null), moveTo(menuItem, c))} type="button">
                        <span className="h-2 w-2 rounded-full" style={{background: dotOf(c)}} />
                        {c}
                      </button>
                    ))}
                </div>
              </>
            )}
            <div className="my-1 h-px bg-zinc-100" />
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-red-600 hover:bg-red-50" onClick={() => (setMenu(null), void remove(menuItem))} type="button">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        )}

        {toast && (
          <div
            className={`pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-[12.5px] font-semibold shadow-lg ${toast.error ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white'}`}
            role="status">
            {toast.text}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
