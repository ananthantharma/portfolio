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
  FolderArrowDownIcon,
  PencilIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {INotePage} from '@/models/NotePage';
import {INoteSection} from '@/models/NoteSection';

import {useBadgeSettings} from './BadgeSettingsContext';
import {ColorPicker} from './ColorPicker';
import {ICON_options, IconPicker} from './IconPicker';
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
  onSetParentPage: (pageId: string, parentPageId: string | null) => Promise<void>;
  loadingPages: boolean;
  pageBadgeCounts?: Record<string, BadgeStat>;

  // Panel
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// ─── Badge pill ───────────────────────────────────────────────────────────────

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

// ─── Page row ─────────────────────────────────────────────────────────────────

interface PageRowProps {
  page: INotePage;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (page: INotePage) => void;
  onDelete: (id: string) => void;
  onMove: (page: INotePage) => void;
  onToggleInactive: (id: string, isInactive: boolean) => void;
  onShowParentPicker: (id: string) => void;
  badgeStat?: BadgeStat;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  isChild?: boolean;
  sortable?: boolean;
}

const PageRow = React.memo<PageRowProps>(
  ({
    page,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onMove,
    onToggleInactive,
    onShowParentPicker,
    badgeStat,
    hasChildren,
    isExpanded,
    onToggleExpand,
    isChild,
    sortable = true,
  }) => {
    const PageIcon = ICON_options[page.icon as keyof typeof ICON_options] || ICON_options.FileText;
    const isInactive = !!page.isInactive;
    const iconStyle = useMemo(
      () => ({color: page.color && page.color !== '#000000' ? page.color : undefined}),
      [page.color],
    );

    const inner = (
      <div
        className={`group relative flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-[12px] transition-all duration-150 ${
          isInactive
            ? isSelected
              ? 'bg-slate-200/50 text-slate-400 font-medium'
              : 'text-slate-300 hover:bg-black/[0.02]'
            : isSelected
            ? 'bg-violet-500/[0.10] text-slate-800 font-semibold'
            : 'text-slate-600 hover:bg-black/[0.04] hover:text-slate-900'
        }`}
        onClick={() => onSelect(page._id as string)}>
        {/* Chevron / spacer */}
        {hasChildren ? (
          <button
            className="flex-shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 transition-colors"
            onClick={e => {
              e.stopPropagation();
              onToggleExpand?.(page._id as string);
            }}>
            {isExpanded ? <ChevronDownIcon className="h-2.5 w-2.5" /> : <ChevronRightIcon className="h-2.5 w-2.5" />}
          </button>
        ) : !isChild ? (
          <span className="flex-shrink-0 w-3.5" />
        ) : null}

        {/* Icon */}
        {page.image ? (
          <img
            alt={page.title}
            className="h-3.5 w-3.5 object-contain flex-shrink-0"
            onError={e => {
              e.currentTarget.style.display = 'none';
              (e.currentTarget.nextSibling as HTMLElement)?.classList.remove('hidden');
            }}
            src={`https://logo.clearbit.com/${page.image}`}
          />
        ) : null}
        <PageIcon
          className={`h-3.5 w-3.5 flex-shrink-0 ${page.image ? 'hidden' : ''} ${
            isInactive ? 'text-slate-300' : isSelected ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-400'
          }`}
          style={isInactive ? undefined : iconStyle}
        />

        {/* Title */}
        <span className={`truncate flex-1 ${isInactive ? 'line-through decoration-slate-300' : ''}`}>
          {page.title || 'Untitled'}
        </span>

        {/* Badge */}
        {badgeStat && <BadgePill stat={badgeStat} />}

        {/* Actions (hover) */}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 flex-shrink-0">
          <button
            className={`rounded p-0.5 transition-colors ${
              isInactive
                ? 'text-slate-400 hover:bg-slate-200 hover:text-green-600'
                : 'text-slate-400 hover:bg-slate-200 hover:text-amber-600'
            }`}
            onClick={e => {
              e.stopPropagation();
              onToggleInactive(page._id as string, !isInactive);
            }}
            title={isInactive ? 'Mark active' : 'Mark inactive'}>
            {isInactive ? <EyeIcon className="h-3 w-3" /> : <EyeSlashIcon className="h-3 w-3" />}
          </button>
          <button
            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
            onClick={e => {
              e.stopPropagation();
              onShowParentPicker(page._id as string);
            }}
            title="Group under parent">
            <Squares2X2Icon className="h-3 w-3" />
          </button>
          <button
            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
            onClick={e => {
              e.stopPropagation();
              onEdit(page);
            }}
            title="Rename">
            <PencilIcon className="h-3 w-3" />
          </button>
          <button
            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
            onClick={e => {
              e.stopPropagation();
              onMove(page);
            }}
            title="Move page">
            <FolderArrowDownIcon className="h-3 w-3" />
          </button>
          <button
            className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={e => {
              e.stopPropagation();
              if (confirm('Delete this page?')) onDelete(page._id as string);
            }}
            title="Delete">
            <TrashIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    );

    if (!sortable) return inner;
    return <SortableItem id={page._id as string}>{inner}</SortableItem>;
  },
);

PageRow.displayName = 'PageRow';

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
    pages,
    selectedPageId,
    onSelectPage,
    onAddPage,
    onRenamePage,
    onDeletePage,
    onMovePage,
    onReorderPages,
    onToggleInactive,
    onSetParentPage,
    loadingPages,
    pageBadgeCounts,
    isCollapsed,
    onToggleCollapse,
  }) => {
    // ── Section edit state ────────────────────────────────────────────────────
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSecName, setNewSecName] = useState('');
    const [newSecColor, setNewSecColor] = useState('#000000');
    const [newSecIcon, setNewSecIcon] = useState('Folder');
    const [newSecImage, setNewSecImage] = useState<string | null>(null);

    const [editingSecId, setEditingSecId] = useState<string | null>(null);
    const [editSecName, setEditSecName] = useState('');
    const [editSecColor, setEditSecColor] = useState('#000000');
    const [editSecIcon, setEditSecIcon] = useState('Folder');
    const [editSecImage, setEditSecImage] = useState<string | null>(null);

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

    const availableParents = useMemo(() => {
      if (!parentPickerFor) return [];
      const ownChildIds = new Set((childrenMap[parentPickerFor] || []).map(c => c._id as string));
      return rootPages.filter(p => {
        const pid = p._id as string;
        return pid !== parentPickerFor && !ownChildIds.has(pid);
      });
    }, [parentPickerFor, rootPages, childrenMap]);

    // ── DnD ──────────────────────────────────────────────────────────────────
    const sensors = useSensors(
      useSensor(PointerSensor, {activationConstraint: {distance: 8}}),
      useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
    );

    const handleSectionDragEnd = useCallback(
      (event: DragEndEvent) => {
        const {active, over} = event;
        if (over && active.id !== over.id) {
          const oldIdx = sections.findIndex(s => s._id === active.id);
          const newIdx = sections.findIndex(s => s._id === over.id);
          if (oldIdx !== -1 && newIdx !== -1) {
            onReorderSections(arrayMove(sections, oldIdx, newIdx));
          }
        }
      },
      [sections, onReorderSections],
    );

    const handlePageDragEnd = useCallback(
      (event: DragEndEvent) => {
        const {active, over} = event;
        if (over && active.id !== over.id) {
          const oldIdx = rootPages.findIndex(p => p._id === active.id);
          const newIdx = rootPages.findIndex(p => p._id === over.id);
          if (oldIdx !== -1 && newIdx !== -1) {
            const reorderedRoots = arrayMove(rootPages, oldIdx, newIdx);
            onReorderPages([...reorderedRoots, ...pages.filter(p => !!p.parentPageId)]);
          }
        }
      },
      [rootPages, pages, onReorderPages],
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

    const handleAddToday = useCallback(() => {
      const today = new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
      onAddPage(today, '#000000', 'Calendar', null);
    }, [onAddPage]);

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
          {sections.map(sec => {
            const SectionIcon = ICON_options[sec.icon as keyof typeof ICON_options] || ICON_options.Folder;
            const isSelected = selectedSectionId === sec._id;
            return (
              <button
                key={sec._id as string}
                className={`relative p-2 rounded-lg transition-all ${isSelected ? 'bg-violet-500/[0.10]' : 'hover:bg-black/[0.04]'}`}
                onClick={() => onSelectSection(sec._id as string)}
                title={sec.name}>
                {sec.image ? (
                  <img alt={sec.name} className="h-5 w-5 object-contain" src={`https://logo.clearbit.com/${sec.image}`} />
                ) : (
                  <SectionIcon
                    className={`h-5 w-5 ${isSelected ? 'text-violet-600' : 'text-slate-600'}`}
                    style={{color: !isSelected && sec.color ? sec.color : undefined}}
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

    // ── Expanded ──────────────────────────────────────────────────────────────
    return (
      <div className="flex h-full flex-col relative">
        {/* Panel header */}
        <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-slate-400/80">Sections</h2>
          <div className="flex items-center gap-0.5">
            <button
              className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all"
              onClick={onToggleCollapse}
              title="Collapse">
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
            <button
              className="rounded-md p-1 text-slate-400 hover:bg-black/[0.04] hover:text-slate-600 transition-all"
              onClick={() => setIsAddingSection(true)}
              title="Add Section">
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
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
                    className="w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] text-slate-700 hover:bg-violet-50 hover:text-violet-700"
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

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {/* Add-section inline form */}
          {isAddingSection && (
            <div className="mb-2 rounded-xl border border-black/[0.06] bg-white p-3 shadow-lg z-20 relative">
              <input
                autoFocus
                className="w-full border-b border-black/[0.06] px-1 py-1 text-[13px] font-medium outline-none focus:border-indigo-500 placeholder-gray-400 text-gray-900 mb-3"
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
                <button className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100" onClick={() => setIsAddingSection(false)}>
                  Cancel
                </button>
                <button className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 shadow-sm" onClick={handleAddSection}>
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Sections DnD list */}
          {loadingSections ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-7 rounded-lg bg-slate-200/60 animate-pulse" style={{animationDelay: `${i * 100}ms`}} />
              ))}
            </div>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd} sensors={sensors}>
              <SortableContext items={sections.map(s => s._id as string)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-0.5">
                  {sections.map(section => {
                    const sid = section._id as string;
                    const isSelectedSec = selectedSectionId === sid;
                    const SectionIcon = ICON_options[section.icon as keyof typeof ICON_options] || ICON_options.Folder;
                    const secIconStyle = {
                      color: section.color && section.color !== '#000000' ? section.color : undefined,
                    };

                    // ── Section edit form ──────────────────────────────────────
                    if (editingSecId === sid) {
                      return (
                        <li key={sid}>
                          <div className="rounded-xl border border-indigo-100 bg-white p-3 shadow-md ring-1 ring-indigo-50 z-20 relative">
                            <input
                              autoFocus
                              className="w-full border-b border-black/[0.06] px-1 py-1 text-[13px] font-medium outline-none focus:border-indigo-500 text-gray-900 mb-3"
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
                              <button className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100" onClick={() => setEditingSecId(null)}>
                                Cancel
                              </button>
                              <button className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700" onClick={handleRenameSection}>
                                Save
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li key={sid}>
                        <SortableItem id={sid}>
                          {/* ── Section row ───────────────────────────────── */}
                          <div
                            className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150 ${
                              isSelectedSec
                                ? 'bg-violet-500/[0.10] text-slate-800 font-semibold'
                                : 'text-slate-600 hover:bg-black/[0.04] hover:text-slate-900'
                            }`}
                            onClick={() => onSelectSection(sid)}>
                            <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                              {/* Expand chevron */}
                              <span className={`flex-shrink-0 transition-transform duration-150 ${isSelectedSec ? 'text-violet-400' : 'text-slate-300'}`}>
                                {isSelectedSec
                                  ? <ChevronDownIcon className="h-3 w-3" />
                                  : <ChevronRightIcon className="h-3 w-3" />}
                              </span>
                              {section.image ? (
                                <img alt={section.name} className="h-4 w-4 object-contain flex-shrink-0" src={`https://logo.clearbit.com/${section.image}`} />
                              ) : (
                                <SectionIcon
                                  className={`h-4 w-4 flex-shrink-0 ${isSelectedSec ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-400'}`}
                                  style={isSelectedSec ? undefined : secIconStyle}
                                />
                              )}
                              <span className="truncate">{section.name}</span>
                            </div>

                            {/* Badge */}
                            {sectionBadgeCounts?.[sid] && (
                              <BadgePill stat={sectionBadgeCounts[sid]} />
                            )}

                            {/* Section actions */}
                            <div className="hidden group-hover:flex items-center gap-0.5 ml-1 flex-shrink-0">
                              <button
                                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
                                onClick={e => {
                                  e.stopPropagation();
                                  startEditingSection(section);
                                }}
                                title="Rename section">
                                <PencilIcon className="h-3 w-3" />
                              </button>
                              <button
                                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                onClick={e => {
                                  e.stopPropagation();
                                  if (confirm('Delete this section and all its pages?')) onDeleteSection(sid);
                                }}
                                title="Delete section">
                                <TrashIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </SortableItem>

                        {/* ── Pages sub-list (only under selected section) ── */}
                        {isSelectedSec && (
                          <div className="ml-4 mt-0.5 mb-1 border-l border-slate-200/80 pl-1">
                            {/* Pages sub-header */}
                            <div className="flex items-center justify-between px-1.5 py-1 mb-0.5">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400/70">Pages</span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                                  onClick={handleAddToday}
                                  title="Add today's page">
                                  <CalendarIcon className="h-3 w-3" />
                                </button>
                                <button
                                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                                  onClick={() => setIsAddingPage(true)}
                                  title="Add page">
                                  <PlusIcon className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {/* Add-page inline form */}
                            {isAddingPage && (
                              <div className="mb-1.5 rounded-xl border border-black/[0.06] bg-white p-2.5 shadow-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <IconPicker onSelectIcon={handlePageIconSelect} selectedIcon={newPageIcon} selectedImage={newPageImage} />
                                  <ColorPicker onSelectColor={setNewPageColor} selectedColor={newPageColor} />
                                </div>
                                <input
                                  autoFocus
                                  className="w-full rounded-lg border border-black/[0.06] bg-white px-2 py-1 text-[12px] focus:border-indigo-500 focus:outline-none text-gray-900 mb-2"
                                  onChange={e => setNewPageTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddPage();
                                    if (e.key === 'Escape') setIsAddingPage(false);
                                  }}
                                  placeholder="Page title"
                                  value={newPageTitle}
                                />
                                <div className="flex justify-end gap-1">
                                  <button className="text-gray-500 hover:text-red-600" onClick={() => setIsAddingPage(false)}>
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                  <button className="text-indigo-500 hover:text-green-600" onClick={handleAddPage}>
                                    <CheckIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Pages loading */}
                            {loadingPages ? (
                              <div className="flex flex-col gap-1.5 py-1">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className="h-6 rounded bg-slate-200/60 animate-pulse" style={{animationDelay: `${i * 80}ms`}} />
                                ))}
                              </div>
                            ) : rootPages.length === 0 && !isAddingPage ? (
                              <button
                                className="w-full text-left px-2 py-1.5 text-[11px] text-slate-400 hover:text-violet-500 transition-colors"
                                onClick={() => setIsAddingPage(true)}>
                                + New page
                              </button>
                            ) : (
                              <DndContext collisionDetection={closestCenter} onDragEnd={handlePageDragEnd} sensors={sensors}>
                                <SortableContext items={rootPages.map(p => p._id as string)} strategy={verticalListSortingStrategy}>
                                  <ul className="space-y-0.5">
                                    {rootPages.map(page => {
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
                                                className="w-full rounded border border-black/[0.06] bg-white px-2 py-1 text-[12px] focus:border-indigo-500 focus:outline-none text-gray-900"
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
                                                <button className="text-indigo-500 hover:text-green-600" onClick={handleRenamePage}>
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
                                              sortable
                                            />
                                          </li>
                                          {isExpanded && children.length > 0 && (
                                            <li>
                                              <ul className="ml-3 space-y-0.5 border-l border-slate-100 pl-1">
                                                {children.map(child => {
                                                  const cid = child._id as string;
                                                  if (editingPageId === cid) {
                                                    return (
                                                      <li key={cid} className="p-1">
                                                        <div className="flex flex-col gap-1.5 rounded-xl border border-black/[0.06] bg-white p-2 shadow-lg">
                                                          <input
                                                            autoFocus
                                                            className="w-full rounded border border-black/[0.06] bg-white px-2 py-1 text-[12px] focus:border-indigo-500 focus:outline-none text-gray-900"
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
                                                            <button className="text-indigo-500 hover:text-green-600" onClick={handleRenamePage}>
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
                                    })}
                                  </ul>
                                </SortableContext>
                              </DndContext>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    );
  },
);

SectionPageList.displayName = 'SectionPageList';

export default SectionPageList;
