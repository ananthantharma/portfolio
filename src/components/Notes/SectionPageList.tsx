'use client';
/**
 * SectionPageList — unified sections + pages sidebar.
 *
 * Sections are listed top-level; the selected section expands inline to
 * show its pages as an indented sub-list. This replaces the two separate
 * SectionList + PageList panels.
 */
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {
  ArrowsUpDownIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentPlusIcon,
  EyeIcon,
  EyeSlashIcon,
  FolderArrowDownIcon,
  InboxIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {INotePage} from '@/models/NotePage';
import {INoteSection} from '@/models/NoteSection';

import {useBadgeSettings} from './BadgeSettingsContext';
import {ColorPicker} from './ColorPicker';
import {getNoteIcon, IconPicker} from './IconPicker';
import {SortableItem} from './SortableItem';

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeStat = {todo: {count: number; minDays: number | null}; important: number; flagged: number};

export interface SectionPageListProps {
  // Sections
  sections: INoteSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onAddSection: (name: string, color?: string, icon?: string, image?: string | null) => Promise<void>;
  onRenameSection: (id: string, name: string, color?: string, icon?: string, image?: string | null) => Promise<void>;
  onDeleteSection: (id: string) => Promise<void>;
  onReorderSections: (newOrder: INoteSection[]) => void;
  loadingSections: boolean;
  sectionBadgeCounts?: Record<string, BadgeStat>;
  // Open tasks linked to each section (vendor / project sections)
  sectionTaskCounts?: Record<string, number>;
  // What a section is in this notebook ("vendor", "person"…) and its plural
  sectionNoun?: {one: string; many: string};

  // Pages (always for selectedSectionId)
  pages: INotePage[];
  selectedPageId: string | null;
  onSelectPage: (id: string, tabId?: string) => void;
  onAddPage: (title: string, color?: string, icon?: string, image?: string | null) => Promise<void>;
  onRenamePage: (id: string, title: string, color?: string, icon?: string, image?: string | null) => Promise<void>;
  onDeletePage: (id: string) => Promise<void>;
  onMovePage: (page: INotePage) => void;
  onReorderPages: (newOrder: INotePage[]) => void;
  onToggleInactive: (id: string, isInactive: boolean) => Promise<void>;
  /** Pin a page to the top of its section */
  onTogglePin?: (id: string, isPinned: boolean) => void;
  onSetParentPage: (pageId: string, parentPageId: string | null) => Promise<void>;
  loadingPages: boolean;
  pageBadgeCounts?: Record<string, BadgeStat>;

  // Panel
  isCollapsed: boolean;
  onToggleCollapse: () => void;

  // Context
  categoryName?: string;
  categoryRecentPages?: Array<{id: string; title: string; sectionId: string; sectionName: string; timestamp: number}>;
  onJumpToRecentPage?: (sectionId: string, pageId: string) => void;

  // Category-level pages (live directly under the notebook, no section)
  categoryPages: INotePage[];
  loadingCategoryPages: boolean;
  onAddCategoryPage: (title: string, color?: string, icon?: string, image?: string | null) => Promise<void>;
  onReorderCategoryPages: (newOrder: INotePage[]) => void;
  onMovePageTo: (pageId: string, dest: {sectionId: string | null; categoryId: string}) => void;
  selectedCategoryId: string | null;
  /** Select a notebook-root page (also clears any section selection) */
  onSelectCategoryPage: (id: string) => void;
}

// ─── Badge pill (section-level — shows count) ─────────────────────────────────

function BadgePill({stat, collapsed}: {stat: BadgeStat; collapsed?: boolean}) {
  const {getBadgeStyle} = useBadgeSettings();
  if (!stat?.todo || stat.todo.count === 0) return null;
  const {className, style} = getBadgeStyle(stat.todo.minDays);
  return (
    <span
      className={`flex h-3 min-w-[12px] items-center justify-center rounded-full px-1 text-[8px] font-bold text-white shadow-sm ring-1 ring-white flex-shrink-0 ${className} ${
        collapsed ? 'absolute -top-1 -right-2' : ''
      }`}
      style={style}>
      {stat.todo.count}
    </span>
  );
}

function formatTimeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 5) return `${wks}w ago`;
  return new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

// ─── Count pill (tree rows) ──────────────────────────────────────────────────

/** A small rounded count on the right of a row; to-do counts carry their age colour as a dot. */
function CountPill({n, stat, title}: {n?: number; stat?: BadgeStat; title?: string}) {
  const {getBadgeStyle} = useBadgeSettings();
  const todo = stat?.todo?.count ?? 0;
  const value = n ?? todo;
  if (!value) return null;
  const dot = !n && todo ? getBadgeStyle(stat!.todo.minDays) : null;
  return (
    <span
      className="flex h-5 min-w-[22px] flex-shrink-0 items-center justify-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 text-[10.5px] font-semibold tabular-nums text-zinc-600 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      title={title ?? (dot ? `${todo} to-do${todo === 1 ? '' : 's'}` : undefined)}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot.className}`} style={dot.style} />}
      {value}
    </span>
  );
}

const rowAction = 'flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-700';

// ─── Page row ─────────────────────────────────────────────────────────────────

interface PageRowProps {
  page: INotePage;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (page: INotePage) => void;
  onDelete: (id: string) => void;
  onMove: (page: INotePage) => void;
  onToggleInactive: (id: string, isInactive: boolean) => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  onShowParentPicker: (id: string) => void;
  badgeStat?: BadgeStat;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  isChild?: boolean;
  sortable?: boolean;
  /** dnd-kit id (prefixed) — defaults to the raw page id */
  dndId?: string;
  /** Hide the "group under parent" action (not applicable to notebook-root pages) */
  hideGroupAction?: boolean;
}

/** One page in the tree: a small icon, the title, and a count; actions appear on hover. */
const PageRow = React.memo<PageRowProps>(
  ({
    page,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onMove,
    onToggleInactive,
    onTogglePin,
    onShowParentPicker,
    badgeStat,
    hasChildren,
    isExpanded,
    onToggleExpand,
    isChild,
    sortable = true,
    dndId,
    hideGroupAction = false,
  }) => {
    const PageIcon = getNoteIcon(page.icon, 'FileText');
    const isInactive = !!page.isInactive;
    const tint = page.color && page.color !== '#000000' ? page.color : undefined;
    const stop = (fn: () => void) => (e: React.MouseEvent) => {
      e.stopPropagation();
      fn();
    };

    const inner = (
      <div
        className={`group relative flex h-8 cursor-pointer items-center gap-2 rounded-lg pl-2 pr-1 text-[13px] transition-colors duration-150 ${
          isSelected
            ? 'bg-zinc-100 font-semibold text-zinc-900'
            : isInactive
            ? 'text-zinc-400 hover:bg-zinc-50'
            : 'font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
        }`}
        data-page-id={page._id as string}
        onClick={() => onSelect(page._id as string)}
        title={page.updatedAt ? `${page.title || 'Untitled'} · edited ${formatTimeAgo(page.updatedAt)}` : page.title}>
        {isSelected && <span className="absolute -left-[9px] top-1.5 bottom-1.5 w-[2px] rounded-full bg-[#405b43]" />}
        {page.image ? (
          <img alt="" className="h-4 w-4 flex-shrink-0 rounded object-contain" src={`https://logo.clearbit.com/${page.image}`} />
        ) : (
          <PageIcon
            className={`h-4 w-4 flex-shrink-0 ${isInactive ? 'text-zinc-300' : tint ? '' : isSelected ? 'text-zinc-700' : 'text-zinc-400'}`}
            style={tint && !isInactive ? {color: tint} : undefined}
          />
        )}

        <span className={`min-w-0 flex-1 truncate ${isInactive ? 'line-through decoration-zinc-300' : ''}`}>{page.title || 'Untitled'}</span>

        {/* Count and pin (hidden while the actions show) */}
        <span className="flex flex-shrink-0 items-center gap-1 group-hover:hidden">
          {page.isPinned && !isChild && (
            <span title="Pinned">
              <MapPinIcon className="h-3.5 w-3.5 text-amber-500" />
            </span>
          )}
          {badgeStat && <CountPill stat={badgeStat} />}
        </span>

        {/* Actions (hover) */}
        <span className="hidden flex-shrink-0 items-center group-hover:flex">
          {onTogglePin && !isChild && (
            <button className={`${rowAction} ${page.isPinned ? 'text-amber-500' : ''}`} onClick={stop(() => onTogglePin(page._id as string, !page.isPinned))} title={page.isPinned ? 'Unpin' : 'Pin to the top'}>
              <MapPinIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button className={rowAction} onClick={stop(() => onEdit(page))} title="Rename">
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          {!hideGroupAction && (
            <button className={rowAction} onClick={stop(() => onShowParentPicker(page._id as string))} title="Group under another page">
              <Squares2X2Icon className="h-3.5 w-3.5" />
            </button>
          )}
          <button className={rowAction} onClick={stop(() => onMove(page))} title="Move page">
            <FolderArrowDownIcon className="h-3.5 w-3.5" />
          </button>
          <button className={rowAction} onClick={stop(() => onToggleInactive(page._id as string, !isInactive))} title={isInactive ? 'Mark active' : 'Mark inactive'}>
            {isInactive ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeSlashIcon className="h-3.5 w-3.5" />}
          </button>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
            onClick={stop(() => confirm('Delete this page?') && onDelete(page._id as string))}
            title="Delete">
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </span>

        {/* Grouped pages */}
        {hasChildren && (
          <button
            aria-label={isExpanded ? 'Hide grouped pages' : 'Show grouped pages'}
            className={rowAction}
            onClick={stop(() => onToggleExpand?.(page._id as string))}
            title={isExpanded ? 'Hide grouped pages' : 'Show grouped pages'}>
            <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
    );

    if (!sortable) return inner;
    return <SortableItem id={dndId ?? (page._id as string)}>{inner}</SortableItem>;
  },
);

PageRow.displayName = 'PageRow';

// ─── Notebook-root drop zone (pages without a section live here) ──────────────

function CategoryRootDrop({children}: {children: (isOver: boolean) => React.ReactNode}) {
  const {setNodeRef, isOver} = useDroppable({id: 'catroot'});
  return <div ref={setNodeRef}>{children(isOver)}</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SectionPageList: React.FC<SectionPageListProps> = React.memo(
  ({
    sections,
    selectedSectionId,
    onSelectSection,
    onAddSection,
    onRenameSection,
    onDeleteSection,
    onReorderSections,
    loadingSections,
    sectionBadgeCounts,
    sectionTaskCounts,
    sectionNoun = {one: 'section', many: 'sections'},
    pages,
    selectedPageId,
    onSelectPage,
    onAddPage,
    onRenamePage,
    onDeletePage,
    onMovePage,
    onReorderPages,
    onToggleInactive,
    onTogglePin,
    onSetParentPage,
    loadingPages,
    pageBadgeCounts,
    isCollapsed,
    onToggleCollapse,
    categoryName,
    categoryPages,
    loadingCategoryPages,
    onAddCategoryPage,
    onReorderCategoryPages,
    onMovePageTo,
    selectedCategoryId,
    onSelectCategoryPage,
  }) => {
    // ── Section search ────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');

    // ── Section edit state ────────────────────────────────────────────────────
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSecName, setNewSecName] = useState('');
    const [newSecColor, setNewSecColor] = useState('#000000');
    const [newSecIcon, setNewSecIcon] = useState('Folder');
    const [newSecImage, setNewSecImage] = useState<string | null>(null);

    const [editingSecId, setEditingSecId] = useState<string | null>(null);
    // The selected section's card can be folded (its X) without changing the selection
    const [foldedSecId, setFoldedSecId] = useState<string | null>(null);
    const [editSecName, setEditSecName] = useState('');
    const [editSecColor, setEditSecColor] = useState('#000000');
    const [editSecIcon, setEditSecIcon] = useState('Folder');
    const [editSecImage, setEditSecImage] = useState<string | null>(null);

    // ── Category-root page state ──────────────────────────────────────────────
    const [isAddingCatPage, setIsAddingCatPage] = useState(false);
    const [newCatPageTitle, setNewCatPageTitle] = useState('');

    // ── Page edit state ───────────────────────────────────────────────────────
    const [isAddingPage, setIsAddingPage] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageColor, setNewPageColor] = useState('#000000');
    const [newPageIcon, setNewPageIcon] = useState('FileText');
    const [newPageImage, setNewPageImage] = useState<string | null>(null);

    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const [editPageTitle, setEditPageTitle] = useState('');
    const [editPageColor, setEditPageColor] = useState('#000000');
    const [editPageIcon, setEditPageIcon] = useState('FileText');
    const [editPageImage, setEditPageImage] = useState<string | null>(null);

    // Notebook-level pages fold like a section (remembered in this browser)
    const [rootOpen, setRootOpen] = useState(true);
    useEffect(() => {
      try {
        setRootOpen(localStorage.getItem('NOTES_ROOT_PAGES_OPEN') !== 'false');
      } catch {
        // storage unavailable
      }
    }, []);
    const toggleRootOpen = useCallback(() => {
      setRootOpen(prev => {
        try {
          localStorage.setItem('NOTES_ROOT_PAGES_OPEN', String(!prev));
        } catch {
          // storage unavailable
        }
        return !prev;
      });
    }, []);

    // ── Parent picker ─────────────────────────────────────────────────────────
    const [parentPickerFor, setParentPickerFor] = useState<string | null>(null);

    // ── Page tree ─────────────────────────────────────────────────────────────
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

    const rootPages = useMemo(() => pages.filter(p => !p.parentPageId), [pages]);
    const pinnedRoots = useMemo(() => rootPages.filter(p => p.isPinned), [rootPages]);
    const otherRoots = useMemo(() => rootPages.filter(p => !p.isPinned), [rootPages]);
    const childrenMap = useMemo(() => {
      const map: Record<string, INotePage[]> = {};
      pages.forEach(p => {
        if (p.parentPageId) {
          const pid = p.parentPageId.toString();
          map[pid] = map[pid] || [];
          map[pid].push(p);
        }
      });
      return map;
    }, [pages]);

    // A–Z sort is a display preference remembered in this browser; your own order is kept underneath
    const [sortSectionsAlpha, setSortSectionsAlpha] = useState(false);
    useEffect(() => {
      try {
        setSortSectionsAlpha(localStorage.getItem('NOTES_SECTIONS_SORT_ALPHA') === 'true');
      } catch {
        // storage unavailable
      }
    }, []);
    const toggleSectionSort = useCallback(() => {
      setSortSectionsAlpha(prev => {
        try {
          localStorage.setItem('NOTES_SECTIONS_SORT_ALPHA', String(!prev));
        } catch {
          // storage unavailable
        }
        return !prev;
      });
    }, []);
    const orderedSections = useMemo(
      () =>
        sortSectionsAlpha
          ? [...sections].sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}))
          : sections,
      [sections, sortSectionsAlpha],
    );

    const filteredSections = useMemo(
      () =>
        searchQuery.trim()
          ? orderedSections.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
          : orderedSections,
      [orderedSections, searchQuery],
    );

    const availableParents = useMemo(() => {
      if (!parentPickerFor) return [];
      const ownChildIds = new Set((childrenMap[parentPickerFor] || []).map(c => c._id as string));
      return rootPages.filter(p => {
        const pid = p._id as string;
        return pid !== parentPickerFor && !ownChildIds.has(pid);
      });
    }, [parentPickerFor, rootPages, childrenMap]);

    // ── DnD (single context: section reorder, page reorder, cross-container moves) ──
    const sensors = useSensors(
      useSensor(PointerSensor, {activationConstraint: {distance: 8}}),
      useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
    );

    // dnd ids are prefixed to tell items apart: "sec:<id>", "page:<id>", "cpage:<id>", "catroot"
    const parseDndId = useCallback((raw: string): {type: 'sec' | 'page' | 'cpage' | 'catroot'; id: string} => {
      if (raw === 'catroot') return {type: 'catroot', id: ''};
      const i = raw.indexOf(':');
      return {type: raw.slice(0, i) as 'sec' | 'page' | 'cpage', id: raw.slice(i + 1)};
    }, []);

    // Highlight target while dragging a page over a section row
    const [dropTargetSec, setDropTargetSec] = useState<string | null>(null);

    const handleDragOver = useCallback(
      (event: DragOverEvent) => {
        const a = parseDndId(String(event.active.id));
        const o = event.over ? parseDndId(String(event.over.id)) : null;
        if ((a.type === 'page' || a.type === 'cpage') && o?.type === 'sec') {
          setDropTargetSec(o.id);
        } else {
          setDropTargetSec(null);
        }
      },
      [parseDndId],
    );

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        setDropTargetSec(null);
        const {active, over} = event;
        if (!over || active.id === over.id) return;

        const a = parseDndId(String(active.id));
        const o = parseDndId(String(over.id));

        // 1. Section reorder (not while sorted A–Z: the list shows a computed order)
        if (a.type === 'sec' && o.type === 'sec') {
          if (sortSectionsAlpha) return;
          const oldIdx = sections.findIndex(s => s._id === a.id);
          const newIdx = sections.findIndex(s => s._id === o.id);
          if (oldIdx !== -1 && newIdx !== -1) onReorderSections(arrayMove(sections, oldIdx, newIdx));
          return;
        }

        // 2. Section-page interactions
        if (a.type === 'page') {
          if (o.type === 'page') {
            // Reorder within the selected section
            const oldIdx = rootPages.findIndex(p => p._id === a.id);
            const newIdx = rootPages.findIndex(p => p._id === o.id);
            if (oldIdx !== -1 && newIdx !== -1) {
              const reorderedRoots = arrayMove(rootPages, oldIdx, newIdx);
              onReorderPages([...reorderedRoots, ...pages.filter(p => !!p.parentPageId)]);
            }
          } else if (o.type === 'sec' && o.id !== selectedSectionId && selectedCategoryId) {
            // Drop onto another section → move it there
            onMovePageTo(a.id, {sectionId: o.id, categoryId: selectedCategoryId});
          } else if ((o.type === 'catroot' || o.type === 'cpage') && selectedCategoryId) {
            // Drop onto the notebook root → page now lives directly under the category
            onMovePageTo(a.id, {sectionId: null, categoryId: selectedCategoryId});
          }
          return;
        }

        // 3. Category-root page interactions
        if (a.type === 'cpage') {
          if (o.type === 'cpage') {
            const oldIdx = categoryPages.findIndex(p => p._id === a.id);
            const newIdx = categoryPages.findIndex(p => p._id === o.id);
            if (oldIdx !== -1 && newIdx !== -1) onReorderCategoryPages(arrayMove(categoryPages, oldIdx, newIdx));
          } else if (o.type === 'sec' && selectedCategoryId) {
            // Drop onto a section → move it inside
            onMovePageTo(a.id, {sectionId: o.id, categoryId: selectedCategoryId});
          } else if (o.type === 'page' && selectedSectionId && selectedCategoryId) {
            // Dropped among the open section's pages → move into that section
            onMovePageTo(a.id, {sectionId: selectedSectionId, categoryId: selectedCategoryId});
          }
          return;
        }
      },
      [
        parseDndId,
        sections,
        rootPages,
        pages,
        categoryPages,
        selectedSectionId,
        selectedCategoryId,
        onReorderSections,
        onReorderPages,
        onReorderCategoryPages,
        onMovePageTo,
        sortSectionsAlpha,
      ],
    );

    // ── Section callbacks ─────────────────────────────────────────────────────
    const handleAddSection = useCallback(() => {
      if (newSecName.trim()) {
        onAddSection(newSecName, newSecColor, newSecIcon, newSecImage);
        setNewSecName('');
        setNewSecColor('#000000');
        setNewSecIcon('Folder');
        setNewSecImage(null);
        setIsAddingSection(false);
      }
    }, [newSecName, newSecColor, newSecIcon, newSecImage, onAddSection]);

    const startEditingSection = useCallback((sec: INoteSection) => {
      setEditingSecId(sec._id as string);
      setEditSecName(sec.name);
      setEditSecColor(sec.color || '#000000');
      setEditSecIcon(sec.icon || 'Folder');
      setEditSecImage(sec.image || null);
    }, []);

    const handleRenameSection = useCallback(() => {
      if (editingSecId && editSecName.trim()) {
        onRenameSection(editingSecId, editSecName, editSecColor, editSecIcon, editSecImage);
        setEditingSecId(null);
      }
    }, [editingSecId, editSecName, editSecColor, editSecIcon, editSecImage, onRenameSection]);

    const handleSecIconSelect = useCallback(
      (icon: string, image?: string | null) => {
        if (editingSecId) {
          setEditSecIcon(icon);
          setEditSecImage(image || null);
        } else {
          setNewSecIcon(icon);
          setNewSecImage(image || null);
        }
      },
      [editingSecId],
    );

    // ── Page callbacks ────────────────────────────────────────────────────────
    const handleAddPage = useCallback(() => {
      if (newPageTitle.trim()) {
        onAddPage(newPageTitle, newPageColor, newPageIcon, newPageImage);
        setNewPageTitle('');
        setNewPageColor('#000000');
        setNewPageIcon('FileText');
        setNewPageImage(null);
        setIsAddingPage(false);
      }
    }, [newPageTitle, newPageColor, newPageIcon, newPageImage, onAddPage]);


    const startEditingPage = useCallback((page: INotePage) => {
      setEditingPageId(page._id as string);
      setEditPageTitle(page.title);
      setEditPageColor(page.color || '#000000');
      setEditPageIcon(page.icon || 'FileText');
      setEditPageImage(page.image || null);
    }, []);

    const handleRenamePage = useCallback(() => {
      if (editingPageId && editPageTitle.trim()) {
        onRenamePage(editingPageId, editPageTitle, editPageColor, editPageIcon, editPageImage);
        setEditingPageId(null);
      }
    }, [editingPageId, editPageTitle, editPageColor, editPageIcon, editPageImage, onRenamePage]);

    const handlePageIconSelect = useCallback(
      (icon: string, image?: string | null) => {
        if (editingPageId) {
          setEditPageIcon(icon);
          setEditPageImage(image || null);
        } else {
          setNewPageIcon(icon);
          setNewPageImage(image || null);
        }
      },
      [editingPageId],
    );

    const handleAddCatPage = useCallback(() => {
      if (newCatPageTitle.trim()) {
        onAddCategoryPage(newCatPageTitle);
        setNewCatPageTitle('');
        setIsAddingCatPage(false);
      }
    }, [newCatPageTitle, onAddCategoryPage]);

    const handleSetParent = useCallback(
      async (pageId: string, parentPageId: string | null) => {
        await onSetParentPage(pageId, parentPageId);
        if (parentPageId) setExpandedParents(prev => new Set([...prev, parentPageId]));
        setParentPickerFor(null);
      },
      [onSetParentPage],
    );

    const toggleParentExpanded = useCallback((id: string) => {
      setExpandedParents(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    // ── Collapsed (icon-only) ─────────────────────────────────────────────────
    if (isCollapsed) {
      return (
        <div className="flex h-full flex-col items-center py-2.5 gap-1.5">
          <button
            className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all"
            onClick={onToggleCollapse}
            title="Expand">
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all"
            onClick={() => {
              onToggleCollapse();
              setIsAddingSection(true);
            }}
            title="Add Section">
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
          <div className="w-5 h-px bg-slate-200/70 my-0.5" />
          {orderedSections.map(sec => {
            const SectionIcon = getNoteIcon(sec.icon, 'Folder');
            const isSelected = selectedSectionId === sec._id;
            return (
              <button
                key={sec._id as string}
                className={`relative p-2 rounded-lg transition-all ${isSelected ? 'bg-slate-100' : 'hover:bg-black/[0.04]'}`}
                onClick={() => onSelectSection(sec._id as string)}
                title={sec.name}>
                {sec.image ? (
                  <img alt={sec.name} className="h-5 w-5 object-contain" src={`https://logo.clearbit.com/${sec.image}`} />
                ) : (
                  <SectionIcon
                    className={`h-5 w-5 ${isSelected ? 'text-slate-700' : 'text-slate-400'}`}
                  />
                )}
                {sectionBadgeCounts?.[sec._id as string] && (
                  <BadgePill stat={sectionBadgeCounts[sec._id as string]} collapsed />
                )}
              </button>
            );
          })}
        </div>
      );
    }

    // One top-level page (with its grouped pages); pinned ones aren't draggable
    const renderRootPage = (page: INotePage, sortable: boolean) => {
      const pid = page._id as string;
      const children = childrenMap[pid] || [];
      const isExpanded = expandedParents.has(pid);

      if (editingPageId === pid) {
        return (
          <li key={pid} className="p-1">
            <div className="flex flex-col gap-1.5 rounded-xl border border-black/[0.06] bg-white p-2 shadow-lg">
              <div className="flex items-center gap-2">
                <IconPicker onSelectIcon={handlePageIconSelect} selectedIcon={editPageIcon} selectedImage={editPageImage} />
                <ColorPicker onSelectColor={setEditPageColor} selectedColor={editPageColor} />
              </div>
              <input
                autoFocus
                className="w-full rounded border border-black/[0.06] bg-white px-2 py-1 text-[12px] focus:border-[#7d9b70] focus:outline-none text-gray-900"
                onChange={e => setEditPageTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenamePage();
                  if (e.key === 'Escape') setEditingPageId(null);
                  e.stopPropagation();
                }}
                onPointerDown={e => e.stopPropagation()}
                value={editPageTitle}
              />
              <div className="flex justify-end gap-1">
                <button className="text-gray-500 hover:text-red-600" onClick={() => setEditingPageId(null)}>
                  <XMarkIcon className="h-4 w-4" />
                </button>
                <button className="text-[#55734c] hover:text-green-600" onClick={handleRenamePage}>
                  <CheckIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        );
      }

      return (
        <React.Fragment key={pid}>
          <li>
            <PageRow
              page={page}
              isSelected={selectedPageId === pid}
              onSelect={onSelectPage}
              onEdit={startEditingPage}
              onDelete={onDeletePage}
              onMove={onMovePage}
              onToggleInactive={onToggleInactive}
              onShowParentPicker={setParentPickerFor}
              badgeStat={pageBadgeCounts?.[pid]}
              hasChildren={children.length > 0}
              isExpanded={isExpanded}
              onToggleExpand={toggleParentExpanded}
              onTogglePin={onTogglePin}
              sortable={sortable}
              dndId={`page:${pid}`}
            />
          </li>
          {isExpanded && children.length > 0 && (
            <li>
              <ul className="ml-[15px] space-y-px border-l border-zinc-200 py-0.5 pl-2">
                {children.map(child => {
                  const cid = child._id as string;
                  if (editingPageId === cid) {
                    return (
                      <li key={cid} className="p-1">
                        <div className="flex flex-col gap-1.5 rounded-xl border border-black/[0.06] bg-white p-2 shadow-lg">
                          <input
                            autoFocus
                            className="w-full rounded border border-black/[0.06] bg-white px-2 py-1 text-[12px] focus:border-[#7d9b70] focus:outline-none text-gray-900"
                            onChange={e => setEditPageTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenamePage();
                              if (e.key === 'Escape') setEditingPageId(null);
                              e.stopPropagation();
                            }}
                            onPointerDown={e => e.stopPropagation()}
                            value={editPageTitle}
                          />
                          <div className="flex justify-end gap-1">
                            <button className="text-gray-500 hover:text-red-600" onClick={() => setEditingPageId(null)}>
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                            <button className="text-[#55734c] hover:text-green-600" onClick={handleRenamePage}>
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={cid}>
                      <PageRow
                        page={child}
                        isSelected={selectedPageId === cid}
                        onSelect={onSelectPage}
                        onEdit={startEditingPage}
                        onDelete={onDeletePage}
                        onMove={onMovePage}
                        onToggleInactive={onToggleInactive}
                        onShowParentPicker={setParentPickerFor}
                        badgeStat={pageBadgeCounts?.[cid]}
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
    };

    // ── Expanded ──────────────────────────────────────────────────────────────
    return (
      <div className="flex h-full flex-col relative">
        {/* Panel header */}
        <div className="flex-shrink-0 border-b border-black/[0.06]">
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <div className="min-w-0 overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400/80 truncate">
                {categoryName ?? 'Sections'}
              </p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                className="rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-all"
                onClick={onToggleCollapse}
                title="Collapse">
                <ChevronLeftIcon className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded-md p-1 text-[#55734c] hover:bg-[#eef3e8] hover:text-[#365238] transition-all"
                onClick={() => setIsAddingSection(true)}
                title="New Section">
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {/* Search input */}
          <div className="px-2 pb-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white px-2.5 py-1.5 transition-colors focus-within:border-[#7d9b70] focus-within:ring-2 focus-within:ring-[#e0e7d9]">
              <MagnifyingGlassIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <input
                aria-label={`Search ${sectionNoun.many}`}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-slate-700 placeholder-slate-400 outline-none focus:ring-0"
                placeholder={`Search ${sectionNoun.many}…`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-300 hover:text-slate-500 flex-shrink-0 transition-colors">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Parent picker overlay */}
        {parentPickerFor && (
          <div className="absolute inset-x-2 top-11 z-50 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-500">Group under a parent page</p>
              <button onClick={() => setParentPickerFor(null)} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              <li>
                <button
                  className="w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] text-slate-500 hover:bg-slate-100 italic"
                  onClick={() => handleSetParent(parentPickerFor, null)}>
                  — No parent (root page)
                </button>
              </li>
              {availableParents.map(p => (
                <li key={p._id as string}>
                  <button
                    className="w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] text-slate-700 hover:bg-[#eef3e8] hover:text-[#365238]"
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


        {/* Scrollable list — single DndContext powers section reorder, page reorder,
            and dragging pages onto sections / the notebook root */}
        <DndContext
          collisionDetection={closestCenter}
          onDragCancel={() => setDropTargetSec(null)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          sensors={sensors}>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
          {/* ── Notebook-root pages (no section needed) ── */}
          <CategoryRootDrop>
            {isOver => (
              <div className={`rounded-lg transition-colors duration-150 ${isOver ? 'bg-[#eef3e8] ring-2 ring-inset ring-[#b9c9ad]' : ''}`}>
                <div className="group flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-zinc-700 transition-colors hover:bg-zinc-50" onClick={toggleRootOpen}>
                  <InboxIcon className="h-[18px] w-[18px] flex-shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">Pages</span>
                  <button
                    className={`${rowAction} hidden group-hover:flex`}
                    onClick={e => {
                      e.stopPropagation();
                      if (!rootOpen) toggleRootOpen();
                      setIsAddingCatPage(true);
                    }}
                    title="New page (no section)">
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                  <span className="group-hover:hidden">
                    <CountPill n={categoryPages.length} title={`${categoryPages.length} page${categoryPages.length === 1 ? '' : 's'}`} />
                  </span>
                  <ChevronDownIcon className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform duration-200 ${rootOpen ? 'rotate-180' : ''}`} />
                </div>

                {rootOpen && (
                  <div className="ml-[17px] border-l border-zinc-200 py-0.5 pl-2">
                    {isAddingCatPage && (
                      <div className="mb-1.5 rounded-lg border border-[#dfe5d7] bg-white p-2 shadow-sm">
                        <input
                          autoFocus
                          className="mb-1.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[12px] text-slate-800 outline-none transition-all placeholder-slate-300 focus:border-[#7d9b70] focus:ring-2 focus:ring-[#e0e7d9]"
                          onChange={e => setNewCatPageTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddCatPage();
                            if (e.key === 'Escape') setIsAddingCatPage(false);
                            e.stopPropagation();
                          }}
                          placeholder="Page title"
                          value={newCatPageTitle}
                        />
                        <div className="flex justify-end gap-1.5">
                          <button className="rounded-md px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" onClick={() => setIsAddingCatPage(false)}>
                            Cancel
                          </button>
                          <button className="rounded-md bg-[#405b43] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-[#2e4731]" onClick={handleAddCatPage}>
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    {loadingCategoryPages ? (
                      <div className="flex flex-col gap-1 py-1">
                        {[1, 2].map(i => (
                          <div className="h-6 animate-pulse rounded bg-slate-100/80" key={i} />
                        ))}
                      </div>
                    ) : categoryPages.length > 0 ? (
                      <SortableContext items={categoryPages.map(p => `cpage:${p._id as string}`)} strategy={verticalListSortingStrategy}>
                        <ul className="space-y-px">
                          {categoryPages.map(page => {
                            const pid = page._id as string;
                            if (editingPageId === pid) {
                              return (
                                <li className="p-1" key={pid}>
                                  <div className="flex flex-col gap-1.5 rounded-xl border border-black/[0.06] bg-white p-2 shadow-lg">
                                    <div className="flex items-center gap-2">
                                      <IconPicker onSelectIcon={handlePageIconSelect} selectedIcon={editPageIcon} selectedImage={editPageImage} />
                                      <ColorPicker onSelectColor={setEditPageColor} selectedColor={editPageColor} />
                                    </div>
                                    <input
                                      autoFocus
                                      className="w-full rounded border border-black/[0.06] bg-white px-2 py-1 text-[12px] text-gray-900 focus:border-[#7d9b70] focus:outline-none"
                                      onChange={e => setEditPageTitle(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleRenamePage();
                                        if (e.key === 'Escape') setEditingPageId(null);
                                        e.stopPropagation();
                                      }}
                                      onPointerDown={e => e.stopPropagation()}
                                      value={editPageTitle}
                                    />
                                    <div className="flex justify-end gap-1">
                                      <button className="text-gray-500 hover:text-red-600" onClick={() => setEditingPageId(null)}>
                                        <XMarkIcon className="h-4 w-4" />
                                      </button>
                                      <button className="text-[#55734c] hover:text-green-600" onClick={handleRenamePage}>
                                        <CheckIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              );
                            }
                            return (
                              <li key={pid}>
                                <PageRow
                                  badgeStat={pageBadgeCounts?.[pid]}
                                  dndId={`cpage:${pid}`}
                                  hideGroupAction
                                  isSelected={selectedPageId === pid}
                                  onDelete={onDeletePage}
                                  onEdit={startEditingPage}
                                  onMove={onMovePage}
                                  onSelect={onSelectCategoryPage}
                                  onShowParentPicker={() => {}}
                                  onToggleInactive={onToggleInactive}
                                  page={page}
                                  sortable
                                />
                              </li>
                            );
                          })}
                        </ul>
                      </SortableContext>
                    ) : (
                      !isAddingCatPage && (
                        <p className="px-2 py-1.5 text-[11px] leading-snug text-zinc-400">{isOver ? 'Drop to move here' : 'Pages without a section. Click + or drop a page here.'}</p>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </CategoryRootDrop>

          <div className="my-2.5 h-px bg-zinc-200/80" />

          {/* Sections label */}
          <div className="mb-1 flex items-center justify-between pl-2 pr-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-zinc-400">{sectionNoun.many}</p>
            <button
              aria-pressed={sortSectionsAlpha}
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                sortSectionsAlpha ? 'bg-[#eef3e8] text-[#365238]' : 'text-zinc-400 hover:bg-black/[0.04] hover:text-zinc-600'
              }`}
              onClick={toggleSectionSort}
              title={sortSectionsAlpha ? 'Sorted A–Z. Click to use your own order.' : 'Sort sections A–Z'}>
              <ArrowsUpDownIcon className="h-3 w-3" />
              A–Z
            </button>
          </div>

          {/* Add-section inline form */}
          {isAddingSection && (
            <div className="mb-2 rounded-xl border border-[#dfe5d7] bg-white p-3 shadow-xl shadow-black/5 ring-1 ring-[#dfe5d7]/50 z-20 relative">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#55734c] mb-2">New Section</p>
              <input
                autoFocus
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-[#7d9b70] focus:ring-2 focus:ring-[#e0e7d9] placeholder-slate-300 text-slate-800 mb-3 transition-all"
                onChange={e => setNewSecName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSection();
                  if (e.key === 'Escape') setIsAddingSection(false);
                  e.stopPropagation();
                }}
                placeholder="Section name"
                value={newSecName}
              />
              <div className="flex items-center gap-2 mb-3">
                <IconPicker onSelectIcon={handleSecIconSelect} selectedIcon={newSecIcon} selectedImage={newSecImage} />
              </div>
              <ColorPicker onSelectColor={setNewSecColor} selectedColor={newSecColor} />
              <div className="flex justify-end gap-2 mt-3">
                <button className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 transition-colors" onClick={() => setIsAddingSection(false)}>
                  Cancel
                </button>
                <button className="rounded-lg bg-[#405b43] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2e4731] shadow-sm transition-colors" onClick={handleAddSection}>
                  Add Section
                </button>
              </div>
            </div>
          )}

          {/* Sections tree */}
          {loadingSections ? (
            <div className="flex flex-col gap-1.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 rounded-lg bg-slate-200/60 animate-pulse" style={{animationDelay: `${i * 100}ms`}} />
              ))}
            </div>
          ) : (
            <SortableContext items={filteredSections.map(s => `sec:${s._id as string}`)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-px">
                {filteredSections.map(section => {
                  const sid = section._id as string;
                  const isSelectedSec = selectedSectionId === sid;
                  const SectionIcon = getNoteIcon(section.icon, 'Folder');
                  if (editingSecId === sid) {
                    return (
                      <li key={sid}>
                        <div className="rounded-xl border border-[#dfe5d7] bg-white p-3 shadow-xl shadow-black/5 ring-1 ring-[#e0e7d9] z-20 relative">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#55734c] mb-2">Rename Section</p>
                          <input
                            autoFocus
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-[#7d9b70] focus:ring-2 focus:ring-[#e0e7d9] text-slate-800 mb-3 transition-all"
                            onChange={e => setEditSecName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameSection();
                              if (e.key === 'Escape') setEditingSecId(null);
                              e.stopPropagation();
                            }}
                            onPointerDown={e => e.stopPropagation()}
                            value={editSecName}
                          />
                          <div className="flex items-center gap-2 mb-3">
                            <IconPicker onSelectIcon={handleSecIconSelect} selectedIcon={editSecIcon} selectedImage={editSecImage} />
                          </div>
                          <ColorPicker onSelectColor={setEditSecColor} selectedColor={editSecColor} />
                          <div className="flex justify-end gap-2 mt-3">
                            <button className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 transition-colors" onClick={() => setEditingSecId(null)}>
                              Cancel
                            </button>
                            <button className="rounded-lg bg-[#405b43] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2e4731] shadow-sm transition-colors" onClick={handleRenameSection}>
                              Save
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  }

                  const isDropTarget = dropTargetSec === sid;
                  const isOpen = isSelectedSec && foldedSecId !== sid;
                  const openTasks = sectionTaskCounts?.[sid] ?? 0;
                  const tint = section.color && section.color !== '#000000' ? section.color : undefined;
                  return (
                    <li key={sid}>
                      <SortableItem id={`sec:${sid}`}>
                        {/* ── Section row ── */}
                        <div
                          className={`group flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 transition-colors duration-150 ${
                            isDropTarget
                              ? 'bg-[#eef3e8] ring-2 ring-inset ring-[#b9c9ad]'
                              : isSelectedSec
                              ? 'bg-zinc-100/80 text-zinc-900'
                              : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                          }`}
                          onClick={() => {
                            if (isOpen) return setFoldedSecId(sid);
                            setFoldedSecId(null);
                            onSelectSection(sid);
                          }}>
                          {section.image ? (
                            <img alt="" className="h-[18px] w-[18px] flex-shrink-0 rounded object-contain" src={`https://logo.clearbit.com/${section.image}`} />
                          ) : (
                            <SectionIcon className={`h-[18px] w-[18px] flex-shrink-0 ${tint ? '' : isSelectedSec ? 'text-[#405b43]' : 'text-zinc-500'}`} style={tint ? {color: tint} : undefined} />
                          )}
                          <span className={`min-w-0 flex-1 truncate text-[13.5px] ${isSelectedSec ? 'font-semibold' : 'font-medium'}`}>{section.name}</span>

                          {/* Counts (hidden while the actions show) */}
                          <span className="flex flex-shrink-0 items-center gap-1 group-hover:hidden">
                            {openTasks > 0 && (
                              <span
                                className="inline-flex h-5 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
                                title={`${openTasks} open task${openTasks === 1 ? '' : 's'} linked`}>
                                <ClipboardDocumentListIcon className="h-3 w-3" />
                                {openTasks}
                              </span>
                            )}
                            {isSelectedSec ? (
                              <CountPill n={pages.length} title={`${pages.length} page${pages.length === 1 ? '' : 's'}`} />
                            ) : (
                              sectionBadgeCounts?.[sid] && <CountPill stat={sectionBadgeCounts[sid]} />
                            )}
                          </span>

                          {/* Section actions */}
                          <span className="hidden flex-shrink-0 items-center group-hover:flex">
                            <button
                              className={rowAction}
                              onClick={e => {
                                e.stopPropagation();
                                setFoldedSecId(null);
                                onSelectSection(sid);
                                setIsAddingPage(true);
                              }}
                              title="New page in this section">
                              <DocumentPlusIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className={rowAction}
                              onClick={e => {
                                e.stopPropagation();
                                startEditingSection(section);
                              }}
                              title="Rename section">
                              <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              onClick={e => {
                                e.stopPropagation();
                                if (confirm('Delete this section and all its pages?')) onDeleteSection(sid);
                              }}
                              title="Delete section">
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </span>
                          <ChevronDownIcon className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </SortableItem>

                      {/* ── Pages (only the selected section loads them) ── */}
                      <div
                        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0.9,0.25,1)]"
                        style={{gridTemplateRows: isOpen ? '1fr' : '0fr'}}>
                        <div className={`min-h-0 overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                          {isSelectedSec && (
                            <div className="mb-1.5 ml-[17px] mt-0.5 border-l border-zinc-200 pl-2">
                              {isAddingPage && (
                                <div className="mb-1.5 rounded-xl border border-[#dfe5d7] bg-white p-2.5 shadow-lg shadow-black/5 ring-1 ring-[#e0e7d9]">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#55734c] mb-2">New Page</p>
                                  <div className="flex items-center gap-2 mb-2">
                                    <IconPicker onSelectIcon={handlePageIconSelect} selectedIcon={newPageIcon} selectedImage={newPageImage} />
                                    <ColorPicker onSelectColor={setNewPageColor} selectedColor={newPageColor} />
                                  </div>
                                  <input
                                    autoFocus
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] focus:border-[#7d9b70] focus:ring-2 focus:ring-[#e0e7d9] focus:outline-none text-slate-800 mb-2 transition-all"
                                    onChange={e => setNewPageTitle(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleAddPage();
                                      if (e.key === 'Escape') setIsAddingPage(false);
                                    }}
                                    placeholder="Page title"
                                    value={newPageTitle}
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button className="rounded-lg px-2 py-1 text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => setIsAddingPage(false)}>
                                      Cancel
                                    </button>
                                    <button className="rounded-lg px-2.5 py-1 text-[10px] font-semibold bg-[#405b43] text-white hover:bg-[#2e4731] transition-colors shadow-sm" onClick={handleAddPage}>
                                      Add Page
                                    </button>
                                  </div>
                                </div>
                              )}

                              {loadingPages ? (
                                <div className="flex flex-col gap-1.5 py-1">
                                  {[1, 2, 3].map(i => (
                                    <div key={i} className="h-6 rounded bg-slate-100/80 animate-pulse" style={{animationDelay: `${i * 80}ms`}} />
                                  ))}
                                </div>
                              ) : (
                                <>
                                  {pinnedRoots.length > 0 && <ul className="space-y-px">{pinnedRoots.map(page => renderRootPage(page, false))}</ul>}
                                  {otherRoots.length > 0 && (
                                    <SortableContext items={otherRoots.map(p => `page:${p._id as string}`)} strategy={verticalListSortingStrategy}>
                                      <ul className="space-y-px">{otherRoots.map(page => renderRootPage(page, true))}</ul>
                                    </SortableContext>
                                  )}
                                  {!isAddingPage && (
                                    <button
                                      className="flex h-8 w-full items-center gap-2 rounded-lg pl-2 text-[12.5px] font-medium text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-[#405b43]"
                                      onClick={() => setIsAddingPage(true)}>
                                      <PlusIcon className="h-4 w-4" />
                                      New page
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SortableContext>
          )}
        </div>
        </DndContext>
      </div>
    );
  },
);

SectionPageList.displayName = 'SectionPageList';

export default SectionPageList;
