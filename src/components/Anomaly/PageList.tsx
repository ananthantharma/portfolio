/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {DndContext, DragEndEvent, PointerSensor, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {CheckCircle2, FileText, Filter, Flag, FolderInput, GripVertical, Pin, Plus, Star, Trash2} from 'lucide-react';
import React, {useMemo, useState} from 'react';

import {colorForId, iconFor} from './icons';
import {nameOf, Page, stripHtml, timeAgo} from './types';

interface PageListProps {
  title: string;
  subtitle?: string;
  pages: Page[];
  loading: boolean;
  selectedPageId: string | null;
  canCreate: boolean;
  showLocation?: boolean;
  onSelect: (page: Page) => void;
  onCreate: () => void;
  onTogglePin: (page: Page) => void;
  onDelete: (page: Page) => void;
  onRequestMove?: (page: Page) => void;
  onReorder?: (pages: Page[]) => void;
}

function snippetOf(page: Page): string {
  const source = page.tabs?.length ? page.tabs[0].content : page.content || '';
  return stripHtml(source).slice(0, 110);
}

function badgeColorOf(page: Page): string {
  const c = (page.color || '').toLowerCase();
  if (c && c !== '#000000' && c !== '#ffffff' && c !== 'transparent') return page.color as string;
  return colorForId(page._id);
}

interface PageCardProps {
  page: Page;
  active: boolean;
  showLocation: boolean;
  draggable: boolean;
  onSelect: (page: Page) => void;
  onTogglePin: (page: Page) => void;
  onDelete: (page: Page) => void;
  onRequestMove?: (page: Page) => void;
}

function PageCard({page, active, showLocation, draggable, onSelect, onTogglePin, onDelete, onRequestMove}: PageCardProps) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: page._id,
    disabled: !draggable,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const Icon = iconFor(page.icon);
  const badgeColor = badgeColorOf(page);
  const snippet = snippetOf(page);
  const location = nameOf(page.sectionId) || nameOf(page.categoryId) || '';

  return (
    <div
      className={`group relative cursor-pointer rounded-xl border p-3 transition-all ${
        active
          ? 'border-violet-400/30 bg-violet-500/[0.12] shadow-glow-violet'
          : 'border-transparent bg-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.05]'
      }`}
      onClick={() => onSelect(page)}
      ref={setNodeRef}
      style={style}>
      <div className="flex items-center gap-2">
        {draggable && (
          <button
            className="shrink-0 cursor-grab touch-none text-white/0 transition-colors group-hover:text-white/25 hover:!text-white/60 active:cursor-grabbing"
            onClick={e => e.stopPropagation()}
            title="Drag to reorder"
            {...attributes}
            {...listeners}>
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
          style={{backgroundColor: `${badgeColor}22`, color: badgeColor}}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {page.isPinned && <Pin className="h-3 w-3 shrink-0 rotate-45 text-cyan-300" />}
        <p
          className={`truncate text-[13px] font-semibold ${
            active ? 'text-white' : 'text-white/80 group-hover:text-white'
          }`}>
          {page.title || 'Untitled'}
        </p>
      </div>
      {snippet && <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-white/35">{snippet}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-white/30">
        {showLocation && location && (
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-medium text-white/45">{location}</span>
        )}
        <span>{timeAgo(page.updatedAt)}</span>
        {(page.todoCount || 0) > 0 && (
          <span className="flex items-center gap-0.5 text-cyan-300/80">
            <CheckCircle2 className="h-3 w-3" /> {page.todoCount}
          </span>
        )}
        {page.isImportant && <Star className="h-3 w-3 fill-amber-400/70 text-amber-400/70" />}
        {page.isFlagged && <Flag className="h-3 w-3 fill-rose-400/60 text-rose-400/60" />}
        {page.tabs?.length > 1 && (
          <span className="rounded bg-white/[0.06] px-1 py-px font-medium">{page.tabs.length} tabs</span>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute right-2 top-2 hidden items-center gap-0.5 rounded-lg border border-white/[0.08] bg-[#151823] p-0.5 shadow-float group-hover:flex">
        <button
          className={`rounded-md p-1 transition-colors hover:bg-white/[0.08] ${
            page.isPinned ? 'text-cyan-300' : 'text-white/40 hover:text-cyan-300'
          }`}
          onClick={e => {
            e.stopPropagation();
            onTogglePin(page);
          }}
          title={page.isPinned ? 'Unpin' : 'Pin to top'}>
          <Pin className="h-3 w-3" />
        </button>
        {onRequestMove && (
          <button
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-violet-300"
            onClick={e => {
              e.stopPropagation();
              onRequestMove(page);
            }}
            title="Move to another notebook/section">
            <FolderInput className="h-3 w-3" />
          </button>
        )}
        <button
          className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-rose-400"
          onClick={e => {
            e.stopPropagation();
            onDelete(page);
          }}
          title="Delete page">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function PageList({
  title,
  subtitle,
  pages,
  loading,
  selectedPageId,
  canCreate,
  showLocation,
  onSelect,
  onCreate,
  onTogglePin,
  onDelete,
  onRequestMove,
  onReorder,
}: PageListProps) {
  const [filter, setFilter] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 4}}));

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q ? pages.filter(p => p.title.toLowerCase().includes(q)) : pages;
    // Pinned first, keep server order within groups
    return [...filtered].sort((a, b) => Number(b.isPinned || false) - Number(a.isPinned || false));
  }, [pages, filter]);

  // Reordering only makes sense against a concrete, unfiltered notebook/section list —
  // Important/Flagged span notebooks and share a global `order` field with each page's
  // home section, so dragging there would silently scramble unrelated lists.
  const dragEnabled = canCreate && !filter && !!onReorder;

  const handleDragEnd = (e: DragEndEvent) => {
    const {active, over} = e;
    if (!onReorder || !over || active.id === over.id) return;
    const oldIndex = visible.findIndex(p => p._id === active.id);
    const newIndex = visible.findIndex(p => p._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(visible, oldIndex, newIndex));
  };

  return (
    <section className="flex h-full w-[312px] shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.015]">
      {/* Header */}
      <div className="px-4 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold tracking-tight text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-white/35">{subtitle}</p>}
          </div>
          {canCreate && (
            <button
              className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-500/90 px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-glow-violet transition-all hover:bg-violet-400"
              onClick={onCreate}
              title="New page">
              <Plus className="h-3.5 w-3.5" /> Page
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 focus-within:border-violet-400/40">
          <Filter className="h-3 w-3 text-white/25" />
          <input
            className="w-full bg-transparent text-[12px] text-white/80 placeholder-white/25 outline-none"
            onChange={e => setFilter(e.target.value)}
            placeholder={`Filter ${pages.length} page${pages.length === 1 ? '' : 's'} by title…`}
            value={filter}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
        {loading ? (
          <div className="space-y-2 pt-1">
            {[...Array(5)].map((_, i) => (
              <div className="h-[74px] animate-pulse-soft rounded-xl bg-white/[0.04]" key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
              <FileText className="h-5 w-5 text-white/20" />
            </div>
            <p className="text-[12px] text-white/30">
              {filter ? 'Nothing matches that filter.' : 'No pages here yet.'}
            </p>
            {canCreate && !filter && (
              <button
                className="rounded-lg border border-violet-400/30 px-3 py-1.5 text-[12px] font-medium text-violet-300 transition-colors hover:bg-violet-500/10"
                onClick={onCreate}>
                Create the first page
              </button>
            )}
          </div>
        ) : (
          <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext items={visible.map(p => p._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5 pt-1">
                {visible.map(page => (
                  <PageCard
                    active={page._id === selectedPageId}
                    draggable={dragEnabled}
                    key={page._id}
                    onDelete={onDelete}
                    onRequestMove={onRequestMove}
                    onSelect={onSelect}
                    onTogglePin={onTogglePin}
                    page={page}
                    showLocation={!!showLocation}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}
