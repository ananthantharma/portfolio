import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
  FolderArrowDownIcon,
} from '@heroicons/react/24/outline';

import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {INotePage} from '@/models/NotePage';

import {useBadgeSettings} from './BadgeSettingsContext';
import {ColorPicker} from './ColorPicker';
import {ICON_options, IconPicker} from './IconPicker';
import {SortableItem} from './SortableItem';

interface PageListProps {
  pages: INotePage[];
  selectedPageId: string | null;
  onSelectPage: (id: string, tabId?: string) => void;
  onAddPage: (title: string, color?: string, icon?: string, image?: string | null) => Promise<void>;
  onRenamePage: (id: string, title: string, color?: string, icon?: string, image?: string | null) => Promise<void>;
  onDeletePage: (id: string) => Promise<void>;
  onMovePage: (page: INotePage) => void;
  onReorderPages: (newOrder: INotePage[]) => void;
  onToggleInactive: (id: string, isInactive: boolean) => Promise<void>;
  onSetParentPage: (pageId: string, parentPageId: string | null) => Promise<void>;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  badgeCounts?: Record<string, {todo: {count: number; minDays: number | null}; important: number; flagged: number}>;
}

// ── PageItem ────────────────────────────────────────────────────────────────

interface PageItemProps {
  page: INotePage & {type?: string};
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (page: INotePage) => void;
  onDelete: (id: string) => void;
  onMove: (page: INotePage) => void;
  onToggleInactive: (id: string, isInactive: boolean) => void;
  onShowParentPicker: (id: string) => void;
  isCollapsed: boolean;
  badgeStats?: {todo: {count: number; minDays: number | null}; important: number; flagged: number};
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  isChild?: boolean;
  /** wrap in SortableItem (false for child pages) */
  sortable?: boolean;
}

const PageItem = React.memo<PageItemProps>(
  ({
    page,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onMove,
    onToggleInactive,
    onShowParentPicker,
    isCollapsed,
    badgeStats,
    hasChildren,
    isExpanded,
    onToggleExpand,
    isChild,
    sortable = true,
  }) => {
    const PageIcon = ICON_options[page.icon as keyof typeof ICON_options] || ICON_options.FileText;
    const {getBadgeStyle} = useBadgeSettings();
    const isInactive = !!page.isInactive;

    const iconStyle = useMemo(
      () => ({color: page.color && page.color !== '#000000' ? page.color : undefined}),
      [page.color],
    );

    const collapsedStyle = useMemo(
      () => ({color: isSelected ? undefined : page.color}),
      [isSelected, page.color],
    );

    const renderBadges = () => {
      if (!badgeStats) return null;
      const {todo} = badgeStats;
      if (!todo || todo.count === 0) return null;
      const {className, style} = getBadgeStyle(todo.minDays);
      return (
        <div className={`flex items-center gap-1 ${isCollapsed ? 'absolute -top-1 -right-2' : 'flex-shrink-0'}`}>
          <span
            className={`flex h-3 min-w-[12px] items-center justify-center rounded-full px-1 text-[8px] font-bold text-white shadow-sm ring-1 ring-white ${className}`}
            style={style}>
            {todo.count}
          </span>
        </div>
      );
    };

    if (isCollapsed) {
      return (
        <button
          className={`relative p-2 rounded-lg transition-all ${
            isInactive ? 'opacity-40' : ''
          } ${isSelected ? 'bg-violet-600/10 ring-1 ring-violet-500/30 shadow-sm' : 'hover:bg-slate-100'}`}
          onClick={() => onSelect(page._id as string)}
          title={page.title || 'Untitled'}>
          {page.image ? (
            <img
              alt={page.title}
              className="h-5 w-5 object-contain"
              onError={e => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
              src={`/api/notes/brandfetch?domain=${page.image}`}
            />
          ) : null}
          <PageIcon
            className={`h-5 w-5 ${page.image ? 'hidden' : ''} ${isSelected ? 'text-violet-600' : 'text-slate-600'}`}
            style={collapsedStyle}
          />
          {renderBadges()}
        </button>
      );
    }

    const inner = (
      <div
        className={`group relative flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-[13px] transition-all duration-200 ${
          isInactive
            ? isSelected
              ? 'bg-slate-100 text-slate-400 ring-1 ring-slate-200 font-semibold'
              : 'text-slate-300 hover:bg-slate-50/60 hover:text-slate-400'
            : isSelected
            ? 'bg-violet-600/10 text-slate-800 ring-1 ring-violet-500/20 font-semibold'
            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
        } ${isChild ? 'border-l-2 border-slate-200/80' : ''}`}
        onClick={() => onSelect(page._id as string)}>
        {/* Accent Bar */}
        {isSelected && !isInactive && (
          <div className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-violet-500" />
        )}

        <div className="flex items-center gap-1.5 overflow-hidden w-full">
          {/* Chevron area — fixed w-4 so all root pages align regardless of children */}
          {hasChildren ? (
            <button
              className="flex-shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              onClick={e => {
                e.stopPropagation();
                onToggleExpand?.(page._id as string);
              }}
              title={isExpanded ? 'Collapse' : 'Expand'}>
              {isExpanded ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
            </button>
          ) : !isChild ? (
            /* invisible spacer — same width as chevron button so icon/text lines up with parent pages */
            <span className="flex-shrink-0 w-4" />
          ) : null}

          <div className="flex-shrink-0">
            {page.image ? (
              <img
                alt={page.title}
                className="h-4 w-4 object-contain"
                onError={e => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
                src={`/api/notes/brandfetch?domain=${page.image}`}
              />
            ) : null}
            <PageIcon
              className={`h-4 w-4 transition-colors ${page.image ? 'hidden' : ''} ${
                isInactive
                  ? 'text-slate-300'
                  : isSelected
                  ? 'text-violet-400'
                  : 'text-slate-600 group-hover:text-slate-400'
              }`}
              style={isInactive ? undefined : iconStyle}
            />
          </div>

          <span className={`truncate flex-1 ${isInactive ? 'line-through decoration-slate-300' : ''}`}>
            {page.title || 'Untitled'}
          </span>

          {renderBadges()}

          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 flex-shrink-0">
            {/* Inactive toggle */}
            <button
              className={`rounded p-1 transition-colors ${
                isInactive
                  ? 'text-slate-400 hover:bg-slate-200 hover:text-green-600'
                  : 'text-slate-400 hover:bg-slate-200 hover:text-amber-600'
              }`}
              onClick={e => {
                e.stopPropagation();
                onToggleInactive(page._id as string, !isInactive);
              }}
              title={isInactive ? 'Mark active' : 'Mark inactive'}>
              {isInactive ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeSlashIcon className="h-3.5 w-3.5" />}
            </button>

            {/* Set parent / group */}
            <button
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
              onClick={e => {
                e.stopPropagation();
                onShowParentPicker(page._id as string);
              }}
              title="Group under a parent page">
              <Squares2X2Icon className="h-3.5 w-3.5" />
            </button>

            {/* Edit */}
            <button
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
              onClick={e => {
                e.stopPropagation();
                onEdit(page);
              }}>
              <PencilIcon className="h-3.5 w-3.5" />
            </button>

            {/* Move to section */}
            <button
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
              onClick={e => {
                e.stopPropagation();
                onMove(page);
              }}
              title="Move Page">
              <FolderArrowDownIcon className="h-3.5 w-3.5" />
            </button>

            {/* Delete */}
            <button
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              onClick={e => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this page?')) {
                  onDelete(page._id as string);
                }
              }}>
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );

    if (!sortable) return inner;
    return <SortableItem id={page._id as string}>{inner}</SortableItem>;
  },
);

PageItem.displayName = 'PageItem';

// ── PageList ─────────────────────────────────────────────────────────────────

const PageList: React.FC<PageListProps> = React.memo(
  ({
    isCollapsed,
    loading,
    onAddPage,
    onDeletePage,
    onMovePage,
    onRenamePage,
    onReorderPages,
    onSelectPage,
    onToggleCollapse,
    onToggleInactive,
    onSetParentPage,
    pages,
    selectedPageId,
    badgeCounts,
  }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageColor, setNewPageColor] = useState('#000000');
    const [newPageIcon, setNewPageIcon] = useState('FileText');
    const [newPageImage, setNewPageImage] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editColor, setEditColor] = useState('#000000');
    const [editIcon, setEditIcon] = useState('FileText');
    const [editImage, setEditImage] = useState<string | null>(null);

    // Which parent pages are expanded (persisted to localStorage)
    const [expandedParents, setExpandedParents] = useState<Set<string>>(() => {
      if (typeof window === 'undefined') return new Set<string>();
      try {
        const saved = localStorage.getItem('NOTES_EXPANDED_PARENTS');
        return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
      } catch {
        return new Set<string>();
      }
    });

    useEffect(() => {
      localStorage.setItem('NOTES_EXPANDED_PARENTS', JSON.stringify([...expandedParents]));
    }, [expandedParents]);

    // Which page's parent-picker panel is open
    const [parentPickerFor, setParentPickerFor] = useState<string | null>(null);

    // ── Tree helpers ──────────────────────────────────────────────────────────
    const rootPages = useMemo(
      () => pages.filter(p => !p.parentPageId),
      [pages],
    );

    const childrenMap = useMemo(() => {
      const map: Record<string, INotePage[]> = {};
      pages.forEach(p => {
        if (p.parentPageId) {
          const pid = p.parentPageId.toString();
          if (!map[pid]) map[pid] = [];
          map[pid].push(p);
        }
      });
      return map;
    }, [pages]);

    // ── DnD ──────────────────────────────────────────────────────────────────
    const sensors = useSensors(
      useSensor(PointerSensor, {activationConstraint: {distance: 8}}),
      useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
    );

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const {active, over} = event;
        if (over && active.id !== over.id) {
          const oldIndex = rootPages.findIndex(p => p._id === active.id);
          const newIndex = rootPages.findIndex(p => p._id === over.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedRoots = arrayMove(rootPages, oldIndex, newIndex);
            const children = pages.filter(p => !!p.parentPageId);
            onReorderPages([...reorderedRoots, ...children]);
          }
        }
      },
      [rootPages, pages, onReorderPages],
    );

    // ── Callbacks ─────────────────────────────────────────────────────────────
    const toggleParentExpanded = useCallback((id: string) => {
      setExpandedParents(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    const handleAdd = useCallback(() => {
      if (newPageTitle.trim()) {
        onAddPage(newPageTitle, newPageColor, newPageIcon, newPageImage);
        setNewPageTitle('');
        setNewPageColor('#000000');
        setNewPageIcon('FileText');
        setNewPageImage(null);
        setIsAdding(false);
      }
    }, [newPageTitle, newPageColor, newPageIcon, newPageImage, onAddPage]);

    const handleAddToday = useCallback(() => {
      const today = new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
      onAddPage(today, '#000000', 'Calendar', null);
    }, [onAddPage]);

    const startEditing = useCallback((page: INotePage) => {
      setEditingId(page._id as string);
      setEditTitle(page.title);
      setEditColor(page.color || '#000000');
      setEditIcon(page.icon || 'FileText');
      setEditImage(page.image || null);
    }, []);

    const handleRename = useCallback(() => {
      if (editingId && editTitle.trim()) {
        onRenamePage(editingId, editTitle, editColor, editIcon, editImage);
        setEditingId(null);
        setEditTitle('');
        setEditColor('#000000');
        setEditIcon('FileText');
        setEditImage(null);
      }
    }, [editingId, editTitle, editColor, editIcon, editImage, onRenamePage]);

    const handleAddClick = useCallback(() => {
      if (isCollapsed) onToggleCollapse();
      setIsAdding(true);
    }, [isCollapsed, onToggleCollapse]);

    const handleIconSelect = useCallback(
      (icon: string, image?: string | null) => {
        if (editingId) {
          setEditIcon(icon);
          setEditImage(image || null);
        } else {
          setNewPageIcon(icon);
          setNewPageImage(image || null);
        }
      },
      [editingId],
    );

    const handleSetParent = useCallback(
      async (pageId: string, parentPageId: string | null) => {
        await onSetParentPage(pageId, parentPageId);
        // Auto-expand the parent so the child is immediately visible
        if (parentPageId) {
          setExpandedParents(prev => new Set([...prev, parentPageId]));
        }
        setParentPickerFor(null);
      },
      [onSetParentPage],
    );

    // Available parents for a given page (exclude self and its own children)
    const availableParents = useMemo(() => {
      if (!parentPickerFor) return [];
      const ownChildIds = new Set((childrenMap[parentPickerFor] || []).map(c => c._id as string));
      return rootPages.filter(p => {
        const pid = p._id as string;
        return pid !== parentPickerFor && !ownChildIds.has(pid);
      });
    }, [parentPickerFor, rootPages, childrenMap]);

    // ── Inline edit form ──────────────────────────────────────────────────────
    const renderEditForm = (key: string) => (
      <div className="p-2" key={key}>
        <div className="flex flex-col gap-2 rounded-xl border border-black/[0.06] bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <IconPicker onSelectIcon={handleIconSelect} selectedIcon={editIcon} selectedImage={editImage} />
            <ColorPicker onSelectColor={setEditColor} selectedColor={editColor} />
          </div>
          <input
            autoFocus
            className="w-full rounded-lg border border-black/[0.06] bg-white px-2.5 py-1.5 text-[13px] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setEditingId(null);
              e.stopPropagation();
            }}
            onPointerDown={e => e.stopPropagation()}
            type="text"
            value={editTitle}
          />
          <div className="flex justify-end gap-2">
            <button className="text-gray-500 hover:text-red-600" onClick={() => setEditingId(null)}>
              <XMarkIcon className="h-5 w-5" />
            </button>
            <button className="text-indigo-500 hover:text-green-600" onClick={handleRename}>
              <CheckIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (loading) {
      return (
        <div className="flex h-full flex-col gap-2 p-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 rounded-lg bg-slate-200/60 animate-pulse" style={{animationDelay: `${i * 100}ms`}} />
          ))}
        </div>
      );
    }

    // ── Collapsed (icon-only) view ────────────────────────────────────────────
    if (isCollapsed) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-0.5 mx-auto flex-col">
              <button
                className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all duration-150"
                onClick={onToggleCollapse}
                title="Expand Pages">
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all duration-150 mt-2"
                onClick={handleAddClick}
                title="Add Page">
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ul className="px-1 py-2 space-y-1">
              {pages.map(page => (
                <PageItem
                  key={page._id as string}
                  page={page}
                  isSelected={selectedPageId === page._id}
                  isCollapsed
                  onSelect={onSelectPage}
                  onEdit={startEditing}
                  onDelete={onDeletePage}
                  onMove={onMovePage}
                  onToggleInactive={onToggleInactive}
                  onShowParentPicker={setParentPickerFor}
                  badgeStats={badgeCounts?.[page._id as string]}
                  sortable={false}
                />
              ))}
            </ul>
          </div>
        </div>
      );
    }

    // ── Expanded view ─────────────────────────────────────────────────────────
    return (
      <div className="flex h-full flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pages</h2>
          <div className="flex items-center gap-0.5">
            <button
              className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all duration-150"
              onClick={onToggleCollapse}
              title="Collapse Pages">
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
            <button
              className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all duration-150"
              onClick={handleAddToday}
              title="Add Today">
              <CalendarIcon className="h-3.5 w-3.5" />
            </button>
            <button
              className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all duration-150"
              onClick={handleAddClick}
              title="Add Page">
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Parent-picker overlay */}
        {parentPickerFor && (
          <div className="absolute inset-x-2 top-11 z-50 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-500">Group under a parent page</p>
              <button onClick={() => setParentPickerFor(null)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-1 max-h-52 overflow-y-auto">
              {/* Remove parent option */}
              <li>
                <button
                  className="w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] text-slate-500 hover:bg-slate-100 transition-colors italic"
                  onClick={() => handleSetParent(parentPickerFor, null)}>
                  — No parent (root page)
                </button>
              </li>
              {availableParents.map(p => (
                <li key={p._id as string}>
                  <button
                    className="w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                    onClick={() => handleSetParent(parentPickerFor, p._id as string)}>
                    {p.title || 'Untitled'}
                  </button>
                </li>
              ))}
              {availableParents.length === 0 && (
                <li className="text-[11px] text-slate-400 px-2 py-1">No other pages available</li>
              )}
            </ul>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isAdding && (
            <div className="p-2">
              <div className="flex flex-col gap-2 rounded-xl border border-black/[0.06] bg-white p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <IconPicker onSelectIcon={handleIconSelect} selectedIcon={newPageIcon} selectedImage={newPageImage} />
                  <ColorPicker onSelectColor={setNewPageColor} selectedColor={newPageColor} />
                </div>
                <input
                  autoFocus
                  className="w-full rounded-lg border border-black/[0.06] bg-white px-2.5 py-1.5 text-[13px] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                  onChange={e => setNewPageTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setIsAdding(false);
                  }}
                  placeholder="New Page Title"
                  type="text"
                  value={newPageTitle}
                />
                <div className="flex justify-end gap-2">
                  <button className="text-gray-500 hover:text-red-600" onClick={() => setIsAdding(false)}>
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <button className="text-indigo-500 hover:text-green-600" onClick={handleAdd}>
                    <CheckIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext items={rootPages.map(p => p._id as string)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1 p-2">
                {rootPages.map(page => {
                  const pid = page._id as string;
                  const children = childrenMap[pid] || [];
                  const isExpanded = expandedParents.has(pid);

                  if (editingId === pid) {
                    return renderEditForm(pid);
                  }

                  return (
                    <React.Fragment key={pid}>
                      <li>
                        <PageItem
                          page={page}
                          isSelected={selectedPageId === pid}
                          isCollapsed={false}
                          onSelect={onSelectPage}
                          onEdit={startEditing}
                          onDelete={onDeletePage}
                          onMove={onMovePage}
                          onToggleInactive={onToggleInactive}
                          onShowParentPicker={setParentPickerFor}
                          badgeStats={badgeCounts?.[pid]}
                          hasChildren={children.length > 0}
                          isExpanded={isExpanded}
                          onToggleExpand={toggleParentExpanded}
                          sortable
                        />
                      </li>

                      {/* Child pages */}
                      {isExpanded && children.length > 0 && (
                        <li>
                          <ul className="ml-4 space-y-1 border-l-2 border-slate-100 pl-1">
                            {children.map(child => {
                              const cid = child._id as string;
                              if (editingId === cid) {
                                return renderEditForm(cid);
                              }
                              return (
                                <li key={cid}>
                                  <PageItem
                                    page={child}
                                    isSelected={selectedPageId === cid}
                                    isCollapsed={false}
                                    onSelect={onSelectPage}
                                    onEdit={startEditing}
                                    onDelete={onDeletePage}
                                    onMove={onMovePage}
                                    onToggleInactive={onToggleInactive}
                                    onShowParentPicker={setParentPickerFor}
                                    badgeStats={badgeCounts?.[cid]}
                                    isChild
                                    sortable={false}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      )}
                    </React.Fragment>
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    );
  },
);

PageList.displayName = 'PageList';

export default PageList;
