/* eslint-disable react/jsx-sort-props, react-memo/require-memo, react-memo/require-usememo */
import {Dialog, Transition} from '@headlessui/react';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowUpTrayIcon,
  BookmarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  DocumentIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {StarIcon} from '@heroicons/react/24/solid';
import axios from 'axios';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {downloadFromDrive, uploadToDrive} from '@/lib/driveTransfer';

interface IBookmark {
  _id: string;
  url: string;
  title: string;
  description: string;
  notes?: string;
  category: string;
  tags?: string[];
  added_timestamp?: string;
  icon?: string;
  /** 'file' = a document kept in Google Drive */
  kind?: 'file';
  driveFileId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}

interface BookmarkListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DRIVE_FOLDER = 'Portfolio Bookmarks';
const DOCS = '__documents__';

// ── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_PILL: Record<string, string> = {
  'Power BI': 'bg-amber-50 text-amber-700 border-amber-100',
  Work: 'bg-blue-50 text-blue-700 border-blue-100',
  SharePoint: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  Procedures: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  ServiceNow: 'bg-rose-50 text-rose-700 border-rose-100',
  Finance: 'bg-teal-50 text-teal-700 border-teal-100',
  Personal: 'bg-violet-50 text-violet-700 border-violet-100',
  Coding: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  Email: 'bg-pink-50 text-pink-700 border-pink-100',
  Documents: 'bg-orange-50 text-orange-700 border-orange-100',
};
const PILL_FALLBACKS = [
  'bg-sky-50 text-sky-700 border-sky-100',
  'bg-lime-50 text-lime-700 border-lime-100',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
  'bg-yellow-50 text-yellow-700 border-yellow-100',
  'bg-stone-100 text-stone-600 border-stone-200',
];

function categoryPill(cat: string): string {
  if (CATEGORY_PILL[cat]) return CATEGORY_PILL[cat];
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return PILL_FALLBACKS[Math.abs(hash) % PILL_FALLBACKS.length];
}

function getSourceBadge(url: string): {label: string; bg: string; fg: string} | null {
  const u = (url ?? '').toLowerCase();
  if (u.includes('powerbi.com')) return {label: 'PB', bg: '#F2C94C', fg: '#78350f'};
  if (u.includes('sharepoint.com') || u.includes('.sharepoint.')) return {label: 'SP', bg: '#2563EB', fg: '#fff'};
  if (u.includes('servicenow.com')) return {label: 'SN', bg: '#DC2626', fg: '#fff'};
  if (u.includes('outlook.') || u.includes('office365') || u.includes('/mail.')) return {label: 'OL', bg: '#1D6F42', fg: '#fff'};
  if (u.includes('docs.google.com') || u.includes('drive.google.com')) return {label: 'GD', bg: '#16A34A', fg: '#fff'};
  return null;
}

function fileBadge(b: Pick<IBookmark, 'fileName' | 'mimeType'>): {label: string; bg: string; fg: string} {
  const ext = (b.fileName?.split('.').pop() || '').toLowerCase();
  const mime = b.mimeType || '';
  if (ext === 'pdf' || mime.includes('pdf')) return {label: 'PDF', bg: '#FEE2E2', fg: '#B91C1C'};
  if (['doc', 'docx', 'rtf', 'odt'].includes(ext) || mime.includes('word')) return {label: 'DOC', bg: '#DBEAFE', fg: '#1D4ED8'};
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mime.includes('sheet') || mime.includes('excel')) return {label: 'XLS', bg: '#DCFCE7', fg: '#15803D'};
  if (['ppt', 'pptx', 'odp'].includes(ext) || mime.includes('presentation')) return {label: 'PPT', bg: '#FFEDD5', fg: '#C2410C'};
  if (mime.startsWith('image/')) return {label: 'IMG', bg: '#F3E8FF', fg: '#7E22CE'};
  if (['zip', 'rar', '7z'].includes(ext) || mime.includes('zip')) return {label: 'ZIP', bg: '#F1F5F9', fg: '#475569'};
  if (['txt', 'md'].includes(ext) || mime.startsWith('text/')) return {label: 'TXT', bg: '#F1F5F9', fg: '#475569'};
  return {label: (ext || 'FILE').slice(0, 4).toUpperCase(), bg: '#F1F5F9', fg: '#475569'};
}

function getCleanDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** When it was added: stored as unix seconds; older entries fall back to the id's creation time. */
function addedAt(b: IBookmark): number {
  if (b.added_timestamp && /^\d+$/.test(b.added_timestamp)) return Number(b.added_timestamp) * 1000;
  if (b.added_timestamp) {
    const t = new Date(b.added_timestamp).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return /^[0-9a-f]{24}$/i.test(b._id) ? parseInt(b._id.slice(0, 8), 16) * 1000 : 0;
}

function relativeTime(ms: number): string | null {
  if (!ms) return null;
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  return mo < 12 ? `${mo}mo ago` : `${Math.floor(d / 365)}y ago`;
}

function loadPinnedIds(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('bookmark-pins');
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function savePinnedIds(ids: Set<string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('bookmark-pins', JSON.stringify([...ids]));
  } catch {
    // storage unavailable
  }
}

// ── TagInput ───────────────────────────────────────────────────────────────

function TagInput({tags, onChange}: {tags: string[]; onChange: (tags: string[]) => void}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState('');

  const addTag = (raw: string) => {
    const trimmed = raw.trim().replace(/,+$/, '');
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setInputVal('');
  };
  const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));

  return (
    <div
      className="flex min-h-[38px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-gray-900"
      onClick={() => inputRef.current?.focus()}>
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
          {tag}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="text-gray-400 hover:text-gray-700">
            <XMarkIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputVal);
          } else if (e.key === 'Backspace' && !inputVal && tags.length) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        onBlur={() => inputVal.trim() && addTag(inputVal)}
        placeholder={tags.length ? '' : 'Add tags (press Enter or comma)'}
        className="min-w-[120px] flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────────────────

interface RowProps {
  bookmark: IBookmark;
  isPinned: boolean;
  isEditing: boolean;
  editForm: Partial<IBookmark>;
  setEditForm: (f: Partial<IBookmark>) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  onPin: (id: string) => void;
  onEdit: (b: IBookmark) => void;
  onDelete: (b: IBookmark) => void;
  onCopyLink: (id: string, url: string) => void;
  onDownload: (b: IBookmark) => void;
  downloading: boolean;
  copiedId: string | null;
  allCategories: string[];
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
}

function BookmarkRow({
  bookmark,
  isPinned,
  isEditing,
  editForm,
  setEditForm,
  saveEdit,
  cancelEdit,
  onPin,
  onEdit,
  onDelete,
  onCopyLink,
  onDownload,
  downloading,
  copiedId,
  allCategories,
  selectedTag,
  onTagClick,
}: RowProps) {
  const isFile = bookmark.kind === 'file';
  const href = bookmark.url.startsWith('http') ? bookmark.url : `https://${bookmark.url}`;
  const tags = bookmark.tags ?? [];
  const when = relativeTime(addedAt(bookmark));
  const detail = bookmark.description?.trim() && bookmark.description.trim().toLowerCase() !== bookmark.title.trim().toLowerCase()
    ? bookmark.description.trim()
    : bookmark.notes?.trim() || (isFile ? bookmark.fileName || '' : getCleanDomain(bookmark.url));

  // ── Edit form ────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <li className="border-b border-gray-100 py-4 last:border-b-0">
        <div className="space-y-2 rounded-xl border-2 border-gray-900 bg-white p-4">
          <input
            autoFocus
            value={editForm.title ?? ''}
            onChange={e => setEditForm({...editForm, title: e.target.value})}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Title"
          />
          {isFile ? (
            <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              <DocumentIcon className="h-4 w-4" /> {bookmark.fileName} · {formatSize(bookmark.size)} · kept in Google Drive
            </p>
          ) : (
            <input
              value={editForm.url ?? ''}
              onChange={e => setEditForm({...editForm, url: e.target.value})}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-blue-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="https://..."
              type="url"
            />
          )}
          <select
            value={allCategories.includes(editForm.category ?? '') ? (editForm.category ?? '') : '__new__'}
            onChange={e => setEditForm({...editForm, category: e.target.value === '__new__' ? '' : e.target.value})}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
            {allCategories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__new__">+ New category…</option>
          </select>
          {!allCategories.includes(editForm.category ?? '') && (
            <input
              value={editForm.category ?? ''}
              onChange={e => setEditForm({...editForm, category: e.target.value})}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="New category name"
              type="text"
            />
          )}
          <textarea
            value={editForm.description ?? ''}
            onChange={e => setEditForm({...editForm, description: e.target.value})}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Description (optional)"
            rows={2}
          />
          <TagInput tags={editForm.tags ?? []} onChange={newTags => setEditForm({...editForm, tags: newTags})} />
          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700">
              <CheckIcon className="h-4 w-4" />
              Save
            </button>
            <button onClick={cancelEdit} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  const badge = isFile ? fileBadge(bookmark) : getSourceBadge(bookmark.url);
  const tile = badge ? (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-bold tracking-wide" style={{backgroundColor: badge.bg, color: badge.fg}}>
      {badge.label}
    </span>
  ) : bookmark.icon ? (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white">
      <img
        src={bookmark.icon}
        alt=""
        className="h-5 w-5 object-contain"
        onError={e => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </span>
  ) : (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
      <BookmarkIcon className="h-5 w-5 text-gray-300" />
    </span>
  );

  const toolClass = 'rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700';
  const open = () => (isFile ? onDownload(bookmark) : window.open(href, '_blank', 'noopener,noreferrer'));

  return (
    <li className="border-b border-gray-100 last:border-b-0">
      <div
        className="group relative flex cursor-pointer flex-col gap-3 py-4 transition-colors sm:flex-row sm:items-center sm:gap-5"
        onClick={e => {
          if ((e.target as HTMLElement).closest('button, a, input')) return;
          open();
        }}>
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          {tile}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {isFile ? (
                <h3 className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-gray-700 sm:text-[15px]">{bookmark.title}</h3>
              ) : (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-semibold text-gray-900 transition-colors hover:text-blue-600 sm:text-[15px]">
                  {bookmark.title}
                </a>
              )}
              {isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                  <StarIcon className="h-2.5 w-2.5" />
                  Pinned
                </span>
              )}
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={e => {
                    e.stopPropagation();
                    onTagClick(tag);
                  }}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    selectedTag === tag ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-800'
                  }`}>
                  #{tag}
                </button>
              ))}
            </div>
            {detail && <p className="line-clamp-1 text-xs text-gray-500 sm:text-[13px]">{detail}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-[54px] sm:flex-nowrap sm:shrink-0 sm:pl-0">
          {/* Hover tools */}
          <span className="flex items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button
              onClick={e => {
                e.stopPropagation();
                onPin(bookmark._id);
              }}
              className={toolClass}
              title={isPinned ? 'Unpin' : 'Pin to top'}>
              <StarIcon className={`h-4 w-4 ${isPinned ? 'text-amber-400' : ''}`} />
            </button>
            {!isFile && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onCopyLink(bookmark._id, bookmark.url);
                }}
                className={toolClass}
                title="Copy link">
                {copiedId === bookmark._id ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(bookmark);
              }}
              className={toolClass}
              title="Edit">
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(bookmark);
              }}
              className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete">
              <TrashIcon className="h-4 w-4" />
            </button>
          </span>

          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryPill(bookmark.category)}`}>{bookmark.category}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            {isFile ? (
              <>
                <DocumentIcon className="h-3 w-3" />
                {formatSize(bookmark.size) || 'Document'}
              </>
            ) : (
              <>
                <GlobeAltIcon className="h-3 w-3" />
                <span className="max-w-[140px] truncate">{getCleanDomain(bookmark.url)}</span>
              </>
            )}
          </span>
          {when && <span className="hidden text-xs text-gray-400 lg:inline">{when}</span>}

          {isFile ? (
            <button
              onClick={e => {
                e.stopPropagation();
                onDownload(bookmark);
              }}
              disabled={downloading}
              aria-label={`Download ${bookmark.fileName || bookmark.title}`}
              title="Download"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors duration-300 group-hover:bg-gray-900 group-hover:text-white disabled:opacity-60 sm:ml-2">
              {downloading ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownTrayIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />}
            </button>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${bookmark.title}`}
              title="Open"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors duration-300 group-hover:bg-gray-900 group-hover:text-white sm:ml-2">
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

// ── BookmarkListModal ──────────────────────────────────────────────────────

export default function BookmarkListModal({isOpen, onClose}: BookmarkListModalProps) {
  const [bookmarks, setBookmarks] = useState<IBookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'alpha' | 'recent'>('alpha');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(loadPinnedIds);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<IBookmark>>({});
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [upload, setUpload] = useState<{name: string; progress: number} | null>(null);
  const [notice, setNotice] = useState<{text: string; error?: boolean} | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const flash = useCallback((text: string, error = false) => {
    setNotice({text, error});
    setTimeout(() => setNotice(n => (n?.text === text ? null : n)), error ? 6000 : 3000);
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      savePinnedIds(next);
      return next;
    });
  }, []);

  const handleCopyLink = useCallback((id: string, url: string) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    navigator.clipboard
      .writeText(href)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => undefined);
  }, []);

  const allCategories = useMemo(() => [...new Set(bookmarks.map(b => b.category).filter(Boolean))].sort(), [bookmarks]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookmarks.forEach(b => {
      counts[b.category] = (counts[b.category] ?? 0) + 1;
    });
    return counts;
  }, [bookmarks]);
  const docCount = useMemo(() => bookmarks.filter(b => b.kind === 'file').length, [bookmarks]);

  const availableTagsForCategory = useMemo(() => {
    if (selectedCategory === 'All' || selectedCategory === DOCS) return [];
    const tags = new Set<string>();
    bookmarks.filter(b => b.category === selectedCategory).forEach(b => (b.tags ?? []).forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [bookmarks, selectedCategory]);

  useEffect(() => setSelectedTag(null), [selectedCategory]);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/bookmarks');
      setBookmarks(res.data?.bookmarks ?? []);
    } catch (e) {
      console.error('Error fetching bookmarks', e);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchBookmarks();
  }, [isOpen, fetchBookmarks]);

  const newCategory = selectedCategory === 'All' || selectedCategory === DOCS ? null : selectedCategory;

  const handleCreate = async () => {
    const draft: Omit<IBookmark, '_id'> = {title: 'New Bookmark', url: 'https://', description: '', category: newCategory || 'Other', tags: []};
    try {
      const res = await axios.post('/api/bookmarks', draft);
      if (res.data?.id) {
        const created = {...draft, _id: res.data.id, added_timestamp: String(Math.floor(Date.now() / 1000))} as IBookmark;
        setBookmarks(prev => [created, ...prev]);
        setEditingId(res.data.id);
        setNewlyCreatedId(res.data.id);
        setEditForm(created);
      } else {
        fetchBookmarks();
      }
    } catch (e) {
      console.error('Error creating bookmark:', e);
      flash('Could not create the bookmark.', true);
    }
  };

  // Documents go to a folder in your Google Drive; the bookmark remembers which file it is
  const handleUpload = async (file: File | undefined) => {
    if (!file || upload) return;
    setUpload({name: file.name, progress: 0});
    try {
      const meta = await uploadToDrive(file, DRIVE_FOLDER, progress => setUpload({name: file.name, progress}));
      const draft = {
        title: file.name.replace(/\.[^.]+$/, '') || file.name,
        url: meta.webViewLink || `https://drive.google.com/file/d/${meta.id}/view`,
        description: '',
        category: newCategory || 'Documents',
        tags: [] as string[],
        kind: 'file' as const,
        driveFileId: meta.id,
        fileName: meta.name || file.name,
        mimeType: meta.mimeType || file.type,
        size: file.size,
      };
      const res = await axios.post('/api/bookmarks', draft);
      if (!res.data?.id) throw new Error('The file uploaded but the bookmark was not saved');
      setBookmarks(prev => [{...draft, _id: res.data.id, added_timestamp: String(Math.floor(Date.now() / 1000))}, ...prev]);
      flash(`“${file.name}” saved to Google Drive`);
    } catch (e) {
      console.error('Upload failed:', e);
      flash(e instanceof Error ? e.message : 'Upload failed. Try again.', true);
    } finally {
      setUpload(null);
    }
  };

  const handleDownload = async (b: IBookmark) => {
    if (!b.driveFileId || downloadingId) return;
    setDownloadingId(b._id);
    try {
      await downloadFromDrive({id: b.driveFileId, name: b.fileName || b.title, mimeType: b.mimeType});
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not download the file.', true);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (b: IBookmark) => {
    const message =
      b.kind === 'file'
        ? `Remove “${b.title}” from your bookmarks?\n\nThe file itself stays in your Google Drive (folder “${DRIVE_FOLDER}”).`
        : 'Delete this bookmark?';
    if (!confirm(message)) return;
    try {
      await axios.delete(`/api/bookmarks/${b._id}`);
      setBookmarks(prev => prev.filter(x => x._id !== b._id));
      setPinnedIds(prev => {
        const next = new Set(prev);
        next.delete(b._id);
        savePinnedIds(next);
        return next;
      });
    } catch (e) {
      console.error('Error deleting bookmark:', e);
      flash('Could not delete the bookmark.', true);
    }
  };

  const startEdit = useCallback((bookmark: IBookmark) => {
    setEditingId(bookmark._id);
    setEditForm({...bookmark, tags: bookmark.tags ?? []});
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    try {
      await axios.put(`/api/bookmarks/${editingId}`, {
        title: editForm.title,
        url: editForm.url,
        description: editForm.description,
        category: editForm.category,
        tags: editForm.tags ?? [],
      });
      setBookmarks(prev => prev.map(b => (b._id === editingId ? ({...b, ...editForm} as IBookmark) : b)));
      setEditingId(null);
      setNewlyCreatedId(null);
      setEditForm({});
    } catch (e) {
      console.error('Error updating bookmark:', e);
      flash('Could not save the changes.', true);
    }
  }, [editingId, editForm, flash]);

  const cancelEdit = useCallback(() => {
    if (newlyCreatedId && newlyCreatedId === editingId) {
      axios.delete(`/api/bookmarks/${editingId}`).catch(() => undefined);
      setBookmarks(prev => prev.filter(b => b._id !== editingId));
      setNewlyCreatedId(null);
    }
    setEditingId(null);
    setEditForm({});
  }, [editingId, newlyCreatedId]);

  const visibleBookmarks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const result = bookmarks.filter(b => {
      const matchCat = selectedCategory === 'All' || (selectedCategory === DOCS ? b.kind === 'file' : b.category === selectedCategory);
      const matchTag = !selectedTag || (b.tags ?? []).includes(selectedTag);
      const matchSearch =
        !q ||
        (b.title ?? '').toLowerCase().includes(q) ||
        (b.url ?? '').toLowerCase().includes(q) ||
        (b.fileName ?? '').toLowerCase().includes(q) ||
        (b.description ?? '').toLowerCase().includes(q) ||
        (b.tags ?? []).some(t => t.toLowerCase().includes(q));
      return matchCat && matchTag && matchSearch;
    });
    const order = sortBy === 'alpha' ? (a: IBookmark, b: IBookmark) => a.title.localeCompare(b.title) : (a: IBookmark, b: IBookmark) => addedAt(b) - addedAt(a);
    // Pinned first, each part in the chosen order
    return [...result].sort((a, b) => Number(pinnedIds.has(b._id)) - Number(pinnedIds.has(a._id)) || order(a, b));
  }, [bookmarks, selectedCategory, selectedTag, searchQuery, sortBy, pinnedIds]);

  const tabs: {label: string; value: string; count: number}[] = [
    {label: 'All', value: 'All', count: bookmarks.length},
    ...allCategories.map(cat => ({label: cat, value: cat, count: categoryCounts[cat] ?? 0})),
    ...(docCount ? [{label: 'Files', value: DOCS, count: docCount}] : []),
  ];

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="relative z-[100]"
        onClose={() => {
          cancelEdit();
          onClose();
        }}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center sm:p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95">
              <Dialog.Panel
                className="relative flex h-[100dvh] w-full transform flex-col overflow-hidden bg-white text-left shadow-2xl ring-1 ring-black/5 transition-all sm:h-[80vh] sm:w-[80vw] sm:rounded-2xl"
                onDragLeave={e => {
                  if (e.currentTarget === e.target) setDragging(false);
                }}
                onDragOver={e => {
                  if (!e.dataTransfer.types.includes('Files')) return;
                  e.preventDefault();
                  setDragging(true);
                }}
                onDrop={e => {
                  if (!e.dataTransfer.files?.length) return;
                  e.preventDefault();
                  setDragging(false);
                  void handleUpload(e.dataTransfer.files[0]);
                }}>
                <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                  <XMarkIcon className="h-5 w-5" />
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  onChange={e => {
                    void handleUpload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />

                <div className="flex-1 overflow-y-auto">
                  <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
                    {/* ── Header ── */}
                    <div className="mb-8 space-y-4">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">
                        <SparklesIcon className="h-3 w-3 text-gray-900" />
                        Your library
                      </div>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-3">
                          <Dialog.Title as="h2" className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                            Bookmarks{' '}
                            <span className="relative inline-block">
                              <span className="relative z-10">&amp; documents</span>
                              <span aria-hidden className="absolute inset-x-0 bottom-1 h-[7px] rounded-full bg-amber-200/70" />
                            </span>
                          </Dialog.Title>
                          <p className="max-w-xl text-sm text-gray-500 sm:text-base">
                            Links you keep coming back to, and files kept safe in Google Drive. Documents download straight to your computer.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => fileInput.current?.click()}
                            disabled={!!upload}
                            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-400 disabled:opacity-60">
                            <ArrowUpTrayIcon className="h-4 w-4" />
                            Upload document
                          </button>
                          <button
                            onClick={() => void handleCreate()}
                            className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-700">
                            <PlusIcon className="h-4 w-4" />
                            Add link
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ── Filters ── */}
                    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center">
                      <div className="flex flex-1 flex-wrap gap-2">
                        {tabs.map(tab => {
                          const active = selectedCategory === tab.value;
                          return (
                            <button
                              key={tab.value}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setSelectedCategory(tab.value)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                                active ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200/70 hover:text-gray-900'
                              }`}>
                              {tab.value === DOCS && <DocumentIcon className="h-3.5 w-3.5" />}
                              {tab.label}
                              <span
                                className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums ${
                                  active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                {tab.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <div className="relative w-full md:w-56">
                          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full rounded-full border border-gray-200 bg-white py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                          />
                        </div>
                        <select
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value as 'alpha' | 'recent')}
                          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300">
                          <option value="alpha">A – Z</option>
                          <option value="recent">Newest</option>
                        </select>
                      </div>
                    </div>

                    {availableTagsForCategory.length > 0 && (
                      <div className="mb-3 flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Tags</span>
                        {availableTagsForCategory.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setSelectedTag(prev => (prev === tag ? null : tag))}
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                              selectedTag === tag ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                            }`}>
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}

                    {notice && (
                      <div
                        role="status"
                        className={`mb-3 rounded-xl border px-4 py-2.5 text-sm ${notice.error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                        {notice.text}
                      </div>
                    )}

                    {/* ── List ── */}
                    <div className={`rounded-xl border bg-white px-4 transition-colors sm:px-6 ${dragging ? 'border-dashed border-gray-900 bg-gray-50' : 'border-gray-200'}`}>
                      {upload && (
                        <div className="flex items-center gap-3.5 border-b border-gray-100 py-4">
                          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                            <ArrowPathIcon className="h-4 w-4 animate-spin text-gray-500" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">Uploading {upload.name}…</p>
                            <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-gray-900 transition-[width] duration-300" style={{width: `${Math.round(upload.progress * 100)}%`}} />
                            </div>
                          </div>
                          <span className="text-xs tabular-nums text-gray-400">{Math.round(upload.progress * 100)}%</span>
                        </div>
                      )}
                      {loading ? (
                        <div className="flex justify-center py-14">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-800 border-t-transparent" />
                        </div>
                      ) : visibleBookmarks.length > 0 ? (
                        <ul role="list">
                          {visibleBookmarks.map(b => (
                            <BookmarkRow
                              key={b._id}
                              bookmark={b}
                              isPinned={pinnedIds.has(b._id)}
                              isEditing={editingId === b._id}
                              editForm={editForm}
                              setEditForm={setEditForm}
                              saveEdit={saveEdit}
                              cancelEdit={cancelEdit}
                              onPin={togglePin}
                              onEdit={startEdit}
                              onDelete={handleDelete}
                              onCopyLink={handleCopyLink}
                              onDownload={handleDownload}
                              downloading={downloadingId === b._id}
                              copiedId={copiedId}
                              allCategories={allCategories}
                              selectedTag={selectedTag}
                              onTagClick={tag => setSelectedTag(prev => (prev === tag ? null : tag))}
                            />
                          ))}
                        </ul>
                      ) : (
                        !upload && (
                          <div className="flex flex-col items-center gap-3 py-14 text-center">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                              <BookmarkIcon className="h-4 w-4" />
                            </span>
                            <p className="text-sm font-medium text-gray-900">{searchQuery || selectedTag ? 'Nothing matches that' : 'Nothing here yet'}</p>
                            <p className="max-w-xs text-xs text-gray-500">Add a link, upload a document, or drop a file anywhere in this window.</p>
                          </div>
                        )
                      )}
                    </div>

                    {/* ── Upload banner ── */}
                    <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500">
                          <DocumentIcon className="h-3.5 w-3.5" />
                        </span>
                        <p className="text-sm text-gray-500">Have a file to keep with your links? Drop it here or upload it. It&apos;s stored in your Google Drive.</p>
                      </div>
                      <button
                        onClick={() => fileInput.current?.click()}
                        disabled={!!upload}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 underline-offset-4 transition-all hover:underline disabled:opacity-60">
                        Upload a document
                        <ArrowRightIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
