import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {Dialog, Transition} from '@headlessui/react';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  Bars3Icon,
  Squares2X2Icon,
  EllipsisVerticalIcon,
  PencilIcon,
  CheckIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import {StarIcon} from '@heroicons/react/24/solid';
import axios from 'axios';

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
}

interface BookmarkListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_DOT_COLORS: Record<string, string> = {
  'Power BI': 'bg-yellow-400',
  Work: 'bg-blue-500',
  SharePoint: 'bg-blue-600',
  Procedures: 'bg-green-500',
  ServiceNow: 'bg-red-500',
  Finance: 'bg-emerald-500',
  Personal: 'bg-purple-500',
  Coding: 'bg-cyan-500',
  Email: 'bg-pink-500',
  Other: 'bg-gray-400',
};

function getCategoryDotColor(cat: string): string {
  return CATEGORY_DOT_COLORS[cat] ?? 'bg-gray-400';
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

function getCleanDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getRelativeTime(ts?: string): string | null {
  if (!ts) return null;
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
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
  } catch {}
}

// ── TagPills ───────────────────────────────────────────────────────────────

function TagPills({
  tags,
  selectedTag,
  onTagClick,
  small = false,
}: {
  tags: string[];
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
  small?: boolean;
}) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <button
          key={tag}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            onTagClick(tag);
          }}
          className={`px-2 py-0.5 rounded-full border text-xs font-medium transition-colors ${
            small ? 'text-[10px] px-1.5' : ''
          } ${
            selectedTag === tag
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
          }`}>
          {tag}
        </button>
      ))}
    </div>
  );
}

// ── TagInput ───────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState('');

  const addTag = (raw: string) => {
    const trimmed = raw.trim().replace(/,+$/, '');
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputVal('');
  };

  const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));

  return (
    <div
      className="w-full min-h-[38px] flex flex-wrap gap-1.5 items-center border border-gray-200 rounded-lg px-3 py-2 cursor-text focus-within:ring-2 focus-within:ring-gray-900"
      onClick={() => inputRef.current?.focus()}>
      {tags.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
          {tag}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="text-indigo-400 hover:text-indigo-700">
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
        onBlur={() => {
          if (inputVal.trim()) addTag(inputVal);
        }}
        placeholder={tags.length ? '' : 'Add tags (press Enter or comma)'}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
      />
    </div>
  );
}

// ── BookmarkCard ───────────────────────────────────────────────────────────

interface CardProps {
  bookmark: IBookmark;
  isPinned: boolean;
  isEditing: boolean;
  editForm: Partial<IBookmark>;
  setEditForm: (f: Partial<IBookmark>) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onPin: (id: string) => void;
  onEdit: (b: IBookmark) => void;
  onDelete: (id: string) => void;
  onCopyLink: (id: string, url: string) => void;
  copiedId: string | null;
  viewMode: 'grid' | 'list';
  allCategories: string[];
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
}

function BookmarkCard({
  bookmark,
  isPinned,
  isEditing,
  editForm,
  setEditForm,
  saveEdit,
  cancelEdit,
  openMenuId,
  setOpenMenuId,
  onPin,
  onEdit,
  onDelete,
  onCopyLink,
  copiedId,
  viewMode,
  allCategories,
  selectedTag,
  onTagClick,
}: CardProps) {
  const source = getSourceBadge(bookmark.url);
  const domain = getCleanDomain(bookmark.url);
  const relTime = getRelativeTime(bookmark.added_timestamp);
  const isMenuOpen = openMenuId === bookmark._id;
  const isCopied = copiedId === bookmark._id;

  const hasDescription =
    !!bookmark.description?.trim() &&
    bookmark.description.trim().toLowerCase() !== bookmark.title.trim().toLowerCase();

  const href = bookmark.url.startsWith('http') ? bookmark.url : `https://${bookmark.url}`;
  const tags = bookmark.tags ?? [];

  // ── Edit form ────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="bg-white border-2 border-gray-900 rounded-xl p-4 space-y-2" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          value={editForm.title ?? ''}
          onChange={e => setEditForm({...editForm, title: e.target.value})}
          className="w-full text-sm font-semibold text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Title"
        />
        <input
          value={editForm.url ?? ''}
          onChange={e => setEditForm({...editForm, url: e.target.value})}
          className="w-full text-sm text-blue-600 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="https://..."
          type="url"
        />
        <select
          value={allCategories.includes(editForm.category ?? '') ? (editForm.category ?? '') : '__new__'}
          onChange={e =>
            setEditForm({...editForm, category: e.target.value === '__new__' ? '' : e.target.value})
          }
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white text-gray-900">
          {allCategories.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="__new__">+ New category…</option>
        </select>
        {!allCategories.includes(editForm.category ?? '') && (
          <input
            autoFocus
            value={editForm.category ?? ''}
            onChange={e => setEditForm({...editForm, category: e.target.value})}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="New category name"
            type="text"
          />
        )}
        <textarea
          value={editForm.description ?? ''}
          onChange={e => setEditForm({...editForm, description: e.target.value})}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          placeholder="Description (optional)"
          rows={2}
        />
        <TagInput
          tags={editForm.tags ?? []}
          onChange={newTags => setEditForm({...editForm, tags: newTags})}
        />
        <div className="flex gap-2 pt-1">
          <button
            onClick={saveEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
            <CheckIcon className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={cancelEdit}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Source tile ──────────────────────────────────────────────────────────
  const sourceTile = source ? (
    <span
      className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
      style={{backgroundColor: source.bg, color: source.fg}}>
      {source.label}
    </span>
  ) : bookmark.icon ? (
    <img
      src={bookmark.icon}
      alt=""
      className="flex-shrink-0 w-9 h-9 rounded-lg object-contain"
      onError={e => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  ) : (
    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
      <BookmarkIcon className="h-5 w-5 text-gray-300" />
    </div>
  );

  // ── Copy button ──────────────────────────────────────────────────────────
  const copyButton = (
    <button
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        onCopyLink(bookmark._id, bookmark.url);
      }}
      title="Copy link"
      className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
      {isCopied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
    </button>
  );

  // ── Context menu ─────────────────────────────────────────────────────────
  const menu = (
    <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpenMenuId(isMenuOpen ? null : bookmark._id)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <EllipsisVerticalIcon className="h-4 w-4" />
      </button>
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <button
            onClick={() => {
              onPin(bookmark._id);
              setOpenMenuId(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <StarIcon className="h-4 w-4 text-amber-400" />
            {isPinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            onClick={() => {
              onCopyLink(bookmark._id, bookmark.url);
              setOpenMenuId(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
            Copy link
          </button>
          <button
            onClick={() => onEdit(bookmark)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <PencilIcon className="h-4 w-4 text-gray-400" />
            Edit
          </button>
          <button
            onClick={() => onDelete(bookmark._id)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50">
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );

  // ── List mode ────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        className={`group relative flex items-start gap-3 px-4 py-3 bg-white border rounded-xl hover:shadow-sm transition-all ${
          isPinned ? 'border-l-4 border-l-green-500 border-gray-200' : 'border-gray-200 hover:border-gray-300'
        }`}>
        <div className="flex-shrink-0 mt-0.5">{sourceTile}</div>
        <div className="flex-1 min-w-0">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-semibold text-gray-900 hover:text-blue-600 truncate transition-colors">
            {bookmark.title}
          </a>
          {bookmark.notes?.trim() && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{bookmark.notes}</p>
          )}
          {tags.length > 0 && (
            <div className="mt-1.5">
              <TagPills tags={tags} selectedTag={selectedTag} onTagClick={onTagClick} small />
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block self-center">{domain}</span>
        <span className="flex items-center gap-1 flex-shrink-0 self-center">
          <span className={`w-2 h-2 rounded-full ${getCategoryDotColor(bookmark.category)}`} />
          <span className="text-xs text-gray-500 hidden sm:block">{bookmark.category}</span>
        </span>
        {relTime && <span className="text-xs text-gray-400 flex-shrink-0 hidden md:block self-center">{relTime}</span>}
        <div className="self-center">{copyButton}</div>
        <div className="self-center">{menu}</div>
      </div>
    );
  }

  // ── Grid mode ────────────────────────────────────────────────────────────
  return (
    <div
      className={`group relative flex flex-col bg-white border rounded-xl p-4 hover:shadow-md transition-all ${
        isPinned ? 'border-l-4 border-l-green-500 border-gray-200' : 'border-gray-200 hover:border-gray-300'
      }`}>
      <div className="flex items-start justify-between mb-3">
        {sourceTile}
        <div className="flex items-center gap-0.5">
          {copyButton}
          {menu}
        </div>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-1">
        {bookmark.title}
      </a>

      {hasDescription && <p className="text-xs text-gray-500 line-clamp-2 mb-1">{bookmark.description}</p>}

      <p className="text-xs text-gray-400 truncate mb-auto">{domain}</p>

      {tags.length > 0 && (
        <div className="mt-2">
          <TagPills tags={tags} selectedTag={selectedTag} onTagClick={onTagClick} />
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getCategoryDotColor(bookmark.category)}`} />
          <span className="text-xs text-gray-500 font-medium">{bookmark.category}</span>
        </span>
        {relTime && <span className="text-xs text-gray-400">{relTime}</span>}
      </div>
    </div>
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(loadPinnedIds);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<IBookmark>>({});
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    navigator.clipboard.writeText(href).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  }, []);

  const allCategories = useMemo(
    () => [...new Set(bookmarks.map(b => b.category).filter(Boolean))].sort(),
    [bookmarks],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookmarks.forEach(b => {
      counts[b.category] = (counts[b.category] ?? 0) + 1;
    });
    return counts;
  }, [bookmarks]);

  // Tags available in the selected category (for the sub-filter row)
  const availableTagsForCategory = useMemo(() => {
    if (selectedCategory === 'All') return [];
    const tags = new Set<string>();
    bookmarks
      .filter(b => b.category === selectedCategory)
      .forEach(b => (b.tags ?? []).forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [bookmarks, selectedCategory]);

  // Reset tag filter when category changes
  useEffect(() => {
    setSelectedTag(null);
  }, [selectedCategory]);

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

  const handleCreate = async () => {
    const draft: Omit<IBookmark, '_id'> = {
      title: 'New Bookmark',
      url: 'https://',
      description: '',
      category: selectedCategory === 'All' ? 'Other' : selectedCategory,
      tags: [],
    };
    try {
      const res = await axios.post('/api/bookmarks', draft);
      if (res.data?.id) {
        const created = {...draft, _id: res.data.id} as IBookmark;
        setBookmarks(prev => [created, ...prev]);
        setEditingId(res.data.id);
        setNewlyCreatedId(res.data.id);
        setEditForm(created);
      } else {
        fetchBookmarks();
      }
    } catch (e) {
      console.error('Error creating bookmark:', e);
      alert('Failed to create bookmark');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bookmark?')) return;
    try {
      await axios.delete(`/api/bookmarks/${id}`);
      setBookmarks(prev => prev.filter(b => b._id !== id));
      setPinnedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        savePinnedIds(next);
        return next;
      });
    } catch (e) {
      console.error('Error deleting bookmark:', e);
    }
  };

  const startEdit = useCallback((bookmark: IBookmark) => {
    setEditingId(bookmark._id);
    setEditForm({...bookmark, tags: bookmark.tags ?? []});
    setOpenMenuId(null);
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
    }
  }, [editingId, editForm]);

  const cancelEdit = useCallback(() => {
    if (newlyCreatedId && newlyCreatedId === editingId) {
      axios.delete(`/api/bookmarks/${editingId}`).catch(() => {});
      setBookmarks(prev => prev.filter(b => b._id !== editingId));
      setNewlyCreatedId(null);
    }
    setEditingId(null);
    setEditForm({});
  }, [editingId, newlyCreatedId]);

  const filteredBookmarks = useMemo(() => {
    let result = bookmarks.filter(b => {
      const matchCat = selectedCategory === 'All' || b.category === selectedCategory;
      const matchTag = !selectedTag || (b.tags ?? []).includes(selectedTag);
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (b.title ?? '').toLowerCase().includes(q) ||
        (b.url ?? '').toLowerCase().includes(q) ||
        (b.description ?? '').toLowerCase().includes(q) ||
        (b.tags ?? []).some(t => t.toLowerCase().includes(q));
      return matchCat && matchTag && matchSearch;
    });

    if (sortBy === 'alpha') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else {
      result = [...result].sort((a, b) => {
        const ta = a.added_timestamp ? new Date(a.added_timestamp).getTime() : 0;
        const tb = b.added_timestamp ? new Date(b.added_timestamp).getTime() : 0;
        return tb - ta;
      });
    }

    return result;
  }, [bookmarks, selectedCategory, selectedTag, searchQuery, sortBy]);

  const pinnedBookmarks = filteredBookmarks.filter(b => pinnedIds.has(b._id));
  const unpinnedBookmarks = filteredBookmarks.filter(b => !pinnedIds.has(b._id));

  const gridClass = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3';
  const listClass = 'flex flex-col gap-2';

  const cardSharedProps = (b: IBookmark) => ({
    bookmark: b,
    isPinned: pinnedIds.has(b._id),
    isEditing: editingId === b._id,
    editForm,
    setEditForm,
    saveEdit,
    cancelEdit,
    openMenuId,
    setOpenMenuId,
    onPin: togglePin,
    onEdit: startEdit,
    onDelete: handleDelete,
    onCopyLink: handleCopyLink,
    copiedId,
    viewMode,
    allCategories,
    selectedTag,
    onTagClick: (tag: string) => setSelectedTag(prev => (prev === tag ? null : tag)),
  });

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
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95">
              <Dialog.Panel
                className="w-full max-w-[95vw] xl:max-w-6xl transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl ring-1 ring-black/5 transition-all flex flex-col h-[90vh]"
                onClick={() => setOpenMenuId(null)}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <BookmarkIcon className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 leading-tight">
                        Bookmarks
                      </Dialog.Title>
                      <p className="text-xs text-gray-500">
                        {filteredBookmarks.length} link{filteredBookmarks.length !== 1 ? 's' : ''}
                        {selectedTag && (
                          <span className="ml-1 text-indigo-600">· tagged "{selectedTag}"</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setViewMode('grid');
                        }}
                        title="Grid view"
                        className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                        <Squares2X2Icon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setViewMode('list');
                        }}
                        title="List view"
                        className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                        <Bars3Icon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Sort */}
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as 'alpha' | 'recent')}
                      onClick={e => e.stopPropagation()}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300">
                      <option value="alpha">A – Z</option>
                      <option value="recent">Recently added</option>
                    </select>

                    {/* Add */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleCreate();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#333] transition-colors flex-shrink-0">
                      <PlusIcon className="h-4 w-4" />
                      Add
                    </button>

                    {/* Close */}
                    <button
                      onClick={onClose}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* ── Category filter chips + search ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedCategory('All');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full border transition-all ${
                        selectedCategory === 'All'
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
                      }`}>
                      All
                      <span className="text-xs opacity-60">{bookmarks.length}</span>
                    </button>
                    {allCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedCategory(cat);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full border transition-all ${
                          selectedCategory === cat
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
                        }`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getCategoryDotColor(cat)}`} />
                        {cat}
                        <span className="text-xs opacity-60">{categoryCounts[cat] ?? 0}</span>
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-52 flex-shrink-0">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                </div>

                {/* ── Tag sub-filter row (shows when a category is selected and has tags) ── */}
                {selectedCategory !== 'All' && availableTagsForCategory.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap px-6 py-2 border-b border-gray-100 bg-indigo-50/40 flex-shrink-0">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Tags</span>
                    {availableTagsForCategory.map(tag => (
                      <button
                        key={tag}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTag(prev => (prev === tag ? null : tag));
                        }}
                        className={`px-2.5 py-0.5 text-xs font-medium rounded-full border transition-all ${
                          selectedTag === tag
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                        }`}>
                        {tag}
                      </button>
                    ))}
                    {selectedTag && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTag(null);
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">
                        Clear
                      </button>
                    )}
                  </div>
                )}

                {/* ── Content ── */}
                <div className="flex-1 overflow-auto p-6">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-800 border-t-transparent" />
                    </div>
                  ) : filteredBookmarks.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <BookmarkIcon className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                      <p className="text-sm font-medium">No bookmarks found.</p>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleCreate();
                        }}
                        className="mt-4 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333] transition-colors shadow-sm">
                        Add a bookmark
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Pinned */}
                      {pinnedBookmarks.length > 0 && (
                        <section className="mb-6">
                          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                            Pinned
                          </h3>
                          <div className={viewMode === 'grid' ? gridClass : listClass}>
                            {pinnedBookmarks.map(b => (
                              <BookmarkCard key={b._id} {...cardSharedProps(b)} />
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Unpinned */}
                      {unpinnedBookmarks.length > 0 && (
                        <section>
                          {pinnedBookmarks.length > 0 && (
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                              All Bookmarks
                            </h3>
                          )}
                          <div className={viewMode === 'grid' ? gridClass : listClass}>
                            {unpinnedBookmarks.map(b => (
                              <BookmarkCard key={b._id} {...cardSharedProps(b)} />
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
