'use client';

import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  FolderIcon,
  FolderOpenIcon,
  MapPinIcon,
  PlusCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import {StarIcon as StarSolid} from '@heroicons/react/24/solid';
import React, {useCallback, useMemo, useRef, useState} from 'react';

import {INoteCategory} from '@/models/NoteCategory';
import {INotePage} from '@/models/NotePage';
import {INoteSection} from '@/models/NoteSection';

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeStat = {todo: {count: number; minDays: number | null}; important: number; flagged: number};

export interface SectionDashboardProps {
  pages: INotePage[];
  loadingPages: boolean;
  currentSection: INoteSection | undefined;
  currentCategory: INoteCategory | undefined;
  badgeCounts: Record<string, BadgeStat>;
  onOpenPage: (id: string, tabId?: string) => void;
  onAddPage: (title: string) => void;
  onUpdatePage: (id: string, updates: Partial<INotePage>) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
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

// ─── PageCard ─────────────────────────────────────────────────────────────────

interface PageCardProps {
  page: INotePage;
  isExpanded: boolean;
  isEditing: boolean;
  descDraft: string;
  descRef: React.RefObject<HTMLTextAreaElement>;
  badge: BadgeStat | undefined;
  onToggleExpand: (id: string) => void;
  onOpenPage: (id: string, tabId?: string) => void;
  onToggleStar: (page: INotePage) => void;
  onTogglePin: (page: INotePage) => void;
  onStartEditing: (page: INotePage) => void;
  onDescChange: (text: string) => void;
  onSaveDesc: (pageId: string) => void;
  onCancelEditing: () => void;
}

const PageCard = React.memo<PageCardProps>(
  ({
    page,
    isExpanded,
    isEditing,
    descDraft,
    descRef,
    badge,
    onToggleExpand,
    onOpenPage,
    onToggleStar,
    onTogglePin,
    onStartEditing,
    onDescChange,
    onSaveDesc,
    onCancelEditing,
  }) => {
    const pid = page._id as string;
    const tabs = useMemo(() => [...(page.tabs || [])].sort((a, b) => a.order - b.order), [page.tabs]);
    const taskCount = badge?.todo?.count || 0;
    const description = page.description || '';
    const isStarred = !!page.isStarred;
    const isPinned = !!page.isPinned;
    const pageColor = page.color && page.color !== '#000000' ? page.color : undefined;

    return (
      <div
        className={`group flex flex-col rounded-xl border transition-all duration-200 overflow-hidden ${
          isPinned
            ? 'border-amber-200/70 bg-gradient-to-r from-amber-50/40 to-white/60 hover:shadow-lg hover:shadow-amber-500/[0.06]'
            : 'border-slate-100 bg-white/60 hover:bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/60'
        }`}>
        {/* ── Main row ── */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          {/* Expand toggle + folder icon */}
          <div className="flex items-center gap-1 flex-shrink-0 mt-[3px]">
            <button
              onClick={() => tabs.length > 0 && onToggleExpand(pid)}
              className={`p-0.5 rounded transition-colors ${
                tabs.length > 0 ? 'text-slate-400 hover:text-slate-700' : 'text-slate-200 cursor-default'
              }`}>
              {isExpanded ? (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={() => (tabs.length > 0 ? onToggleExpand(pid) : onOpenPage(pid))}
              className="flex-shrink-0 p-0.5 rounded-lg hover:bg-slate-100 transition-colors"
              title={tabs.length > 0 ? 'Expand tabs' : 'Open page'}>
              {isExpanded ? (
                <FolderOpenIcon className="h-5 w-5" style={pageColor ? {color: pageColor} : undefined} />
              ) : (
                <FolderIcon className="h-5 w-5" style={pageColor ? {color: pageColor} : undefined} />
              )}
            </button>
          </div>

          {/* Title + description + meta */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-slate-800 leading-snug">
                {page.title || 'Untitled'}
              </span>
              {isPinned && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <MapPinIcon className="h-2.5 w-2.5" /> Pinned
                </span>
              )}
              {isStarred && <StarSolid className="h-3 w-3 text-amber-400 flex-shrink-0" />}
            </div>

            {/* Description — inline editable */}
            <div className="mt-1.5">
              {isEditing ? (
                <textarea
                  ref={descRef}
                  value={descDraft}
                  onChange={e => onDescChange(e.target.value)}
                  onBlur={() => onSaveDesc(pid)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      onCancelEditing();
                    }
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      onSaveDesc(pid);
                    }
                    e.stopPropagation();
                  }}
                  placeholder="Add a description..."
                  rows={2}
                  className="w-full text-[12px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:border-violet-400 min-h-[52px] leading-relaxed"
                />
              ) : (
                <p
                  onClick={() => onStartEditing(page)}
                  className={`text-[12px] leading-relaxed cursor-text transition-colors ${
                    description ? 'text-slate-500 hover:text-slate-700' : 'text-slate-300 italic hover:text-slate-400'
                  }`}>
                  {description || 'Add a description...'}
                </p>
              )}
            </div>

            {/* Meta: tabs count + dates */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {tabs.length > 0 && (
                <button
                  onClick={() => onToggleExpand(pid)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                  <DocumentDuplicateIcon className="h-3 w-3" />
                  {tabs.length} tab{tabs.length !== 1 ? 's' : ''}
                </button>
              )}
              {tabs.length > 0 && page.createdAt && (
                <span className="text-slate-200 text-[11px]">·</span>
              )}
              {page.createdAt && (
                <span className="text-[11px] text-slate-300">Created {formatDate(page.createdAt)}</span>
              )}
              {page.updatedAt && (
                <>
                  <span className="text-slate-200 text-[11px]">·</span>
                  <span className="text-[11px] text-slate-300">Modified {formatTimeAgo(page.updatedAt)}</span>
                </>
              )}
            </div>
          </div>

          {/* Right side: badge + star + pin + open */}
          <div className="flex items-center gap-1 flex-shrink-0 mt-[3px]">
            {taskCount > 0 && (
              <span className="text-[10px] font-semibold bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.5 rounded-full mr-1">
                {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
              </span>
            )}
            <button
              onClick={() => onToggleStar(page)}
              title={isStarred ? 'Unstar' : 'Star'}
              className={`p-1.5 rounded-lg transition-colors ${
                isStarred
                  ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50'
                  : 'text-slate-200 hover:text-amber-400 hover:bg-amber-50'
              }`}>
              {isStarred ? <StarSolid className="h-3.5 w-3.5" /> : <StarIcon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => onTogglePin(page)}
              title={isPinned ? 'Unpin' : 'Pin to top'}
              className={`p-1.5 rounded-lg transition-colors ${
                isPinned
                  ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                  : 'text-slate-200 hover:text-violet-500 hover:bg-violet-50'
              }`}>
              <MapPinIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onOpenPage(pid)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-slate-800 text-white text-[11px] font-semibold transition-all ml-1 shadow-sm">
              Open <ArrowRightIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* ── Tab list (expanded) ── */}
        {isExpanded && tabs.length > 0 && (
          <div className="border-t border-slate-100/80 px-4 pb-3 pt-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-300 px-2 py-1.5">
              Tabs · {tabs.length}
            </p>
            <div className="flex flex-col gap-0.5">
              {tabs.map((tab, idx) => (
                <button
                  key={tab._id || idx}
                  onClick={() => onOpenPage(pid, tab._id)}
                  className="group/tab flex items-center gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-slate-50 hover:shadow-sm transition-all">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${
                      tab.isImportant ? 'bg-amber-100' : 'bg-slate-100'
                    }`}>
                    <DocumentTextIcon
                      className={`h-3 w-3 ${tab.isImportant ? 'text-amber-500' : 'text-slate-400'}`}
                    />
                  </div>
                  <span className="text-[12px] text-slate-600 group-hover/tab:text-slate-900 transition-colors flex-1 min-w-0 truncate font-medium">
                    {tab.title || 'Untitled Tab'}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover/tab:opacity-100 transition-opacity">
                    {tab.isFlagged && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                    )}
                    {tab.isImportant && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    )}
                    <span className="text-[11px] text-slate-400 group-hover/tab:text-violet-500 transition-colors flex-shrink-0 font-medium">
                      Open →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
);

PageCard.displayName = 'PageCard';

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="h-20 rounded-xl border border-slate-100 bg-white/60 animate-pulse"
          style={{animationDelay: `${i * 80}ms`}}
        />
      ))}
    </div>
  );
}

// ─── Section Dashboard ────────────────────────────────────────────────────────

const SectionDashboard = React.memo<SectionDashboardProps>(
  ({pages, loadingPages, currentSection, currentCategory, badgeCounts, onOpenPage, onAddPage, onUpdatePage}) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [editingDescId, setEditingDescId] = useState<string | null>(null);
    const [descDraft, setDescDraft] = useState('');
    const descRef = useRef<HTMLTextAreaElement>(null);

    const pinnedPages = useMemo(() => pages.filter(p => !!p.isPinned), [pages]);
    const starredUnpinnedPages = useMemo(
      () => pages.filter(p => !!p.isStarred && !p.isPinned),
      [pages],
    );
    const regularPages = useMemo(
      () => pages.filter(p => !p.isPinned && !p.isStarred),
      [pages],
    );

    const totalTasks = useMemo(
      () => pages.reduce((sum, p) => sum + (badgeCounts[p._id as string]?.todo?.count || 0), 0),
      [pages, badgeCounts],
    );

    const toggleExpand = useCallback((id: string) => {
      setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    const handleToggleStar = useCallback(
      async (page: INotePage) => {
        await onUpdatePage(page._id as string, {isStarred: !page.isStarred});
      },
      [onUpdatePage],
    );

    const handleTogglePin = useCallback(
      async (page: INotePage) => {
        await onUpdatePage(page._id as string, {isPinned: !page.isPinned});
      },
      [onUpdatePage],
    );

    const startEditing = useCallback((page: INotePage) => {
      setEditingDescId(page._id as string);
      setDescDraft(page.description || '');
      setTimeout(() => descRef.current?.focus(), 30);
    }, []);

    const saveDesc = useCallback(
      async (pageId: string) => {
        setEditingDescId(null);
        await onUpdatePage(pageId, {description: descDraft} as Partial<INotePage>);
      },
      [descDraft, onUpdatePage],
    );

    const cancelEditing = useCallback(() => {
      setEditingDescId(null);
      setDescDraft('');
    }, []);

    const hasPinnedOrStarred = pinnedPages.length > 0 || starredUnpinnedPages.length > 0;

    const renderCard = (page: INotePage) => {
      const pid = page._id as string;
      return (
        <PageCard
          key={pid}
          page={page}
          isExpanded={expandedIds.has(pid)}
          isEditing={editingDescId === pid}
          descDraft={descDraft}
          descRef={descRef}
          badge={badgeCounts[pid]}
          onToggleExpand={toggleExpand}
          onOpenPage={onOpenPage}
          onToggleStar={handleToggleStar}
          onTogglePin={handleTogglePin}
          onStartEditing={startEditing}
          onDescChange={setDescDraft}
          onSaveDesc={saveDesc}
          onCancelEditing={cancelEditing}
        />
      );
    };

    return (
      <div className="h-full overflow-y-auto custom-scrollbar px-6 py-8">
        {/* ── Header ── */}
        <div className="mb-8">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
            {currentCategory?.name?.toUpperCase()} · SECTION
          </p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold text-slate-900 leading-tight">{currentSection?.name}</h1>
              <p className="text-[12px] text-slate-400 mt-1">
                {pages.length} page{pages.length !== 1 ? 's' : ''}
                {totalTasks > 0 && (
                  <> · {totalTasks} open task{totalTasks !== 1 ? 's' : ''}</>
                )}
                {pinnedPages.length > 0 && <> · {pinnedPages.length} pinned</>}
              </p>
            </div>
            <button
              onClick={() => onAddPage('New Page')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A1A1A] hover:bg-slate-800 text-white text-[12px] font-semibold transition-all shadow-lg flex-shrink-0">
              <DocumentPlusIcon className="h-3.5 w-3.5" /> New page
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        {loadingPages ? (
          <DashboardSkeleton />
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-3xl bg-slate-50/50 border border-dashed border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <FolderIcon className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-[13px] text-slate-400 font-medium">No pages yet. Create your first one.</p>
            <button
              onClick={() => onAddPage('New Page')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A1A1A] hover:bg-slate-800 text-white text-[12px] font-semibold transition-all shadow-lg">
              <DocumentPlusIcon className="h-3.5 w-3.5" /> Create page
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Pinned */}
            {pinnedPages.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <MapPinIcon className="h-3 w-3 text-amber-500" />
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-500">Pinned</p>
                </div>
                {pinnedPages.map(renderCard)}
              </div>
            )}

            {/* Starred (not pinned) */}
            {starredUnpinnedPages.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <StarSolid className="h-3 w-3 text-amber-400" />
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-400">Starred</p>
                </div>
                {starredUnpinnedPages.map(renderCard)}
              </div>
            )}

            {/* Divider */}
            {hasPinnedOrStarred && regularPages.length > 0 && (
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-slate-100" />
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-300">All Pages</p>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
            )}

            {/* Regular */}
            {regularPages.map(renderCard)}

            {/* Add page */}
            <button
              onClick={() => onAddPage('New Page')}
              className="group flex items-center justify-center gap-2 px-4 py-4 rounded-xl border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/40 transition-all mt-1">
              <PlusCircleIcon className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
              <span className="text-[12px] text-slate-400 group-hover:text-slate-500 transition-colors font-medium">
                New page
              </span>
            </button>
          </div>
        )}
      </div>
    );
  },
);

SectionDashboard.displayName = 'SectionDashboard';

export default SectionDashboard;
