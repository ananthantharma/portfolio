/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {DndContext, DragEndEvent, PointerSensor, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Flag,
  FolderPlus,
  GripVertical,
  Home,
  LogOut,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import {signOut, useSession} from 'next-auth/react';
import React, {useEffect, useRef, useState} from 'react';

import {accentOf, Notebook, Section, View} from './types';

// ── Inline name editor used for create + rename flows ────────────────────────
function InlineInput({
  initial,
  placeholder,
  onCommit,
  onCancel,
  indent,
}: {
  initial?: string;
  placeholder: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  indent?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <div className={`px-2 py-1 ${indent ? 'pl-9' : ''}`}>
      <input
        className="w-full rounded-lg border border-violet-400/40 bg-white/[0.06] px-2.5 py-1.5 text-[13px] text-white placeholder-white/30 outline-none focus:border-violet-400/70"
        defaultValue={initial || ''}
        onBlur={e => {
          const v = e.target.value.trim();
          if (v && v !== (initial || '')) onCommit(v);
          else onCancel();
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const v = (e.target as HTMLInputElement).value.trim();
            if (v) onCommit(v);
            else onCancel();
          }
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        ref={ref}
      />
    </div>
  );
}

function CountBadge({count, tone}: {count?: number; tone: 'todo' | 'flag'}) {
  if (!count) return null;
  return (
    <span
      className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
        tone === 'todo' ? 'bg-cyan-400/15 text-cyan-300' : 'bg-rose-400/15 text-rose-300'
      }`}>
      {count}
    </span>
  );
}

// ── Section row (draggable within its notebook) ──────────────────────────────
interface SectionRowProps {
  section: Section;
  notebookId: string;
  active: boolean;
  renaming: boolean;
  draggable: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
}

function SectionRow({
  section,
  active,
  renaming,
  draggable,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete,
}: SectionRowProps) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: section._id,
    disabled: !draggable,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  if (renaming) {
    return <InlineInput initial={section.name} onCancel={onCancelRename} onCommit={onCommitRename} placeholder="Section name…" />;
  }

  return (
    <div
      className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
        active ? 'bg-violet-500/15 ring-1 ring-inset ring-violet-400/20' : 'hover:bg-white/[0.04]'
      }`}
      ref={setNodeRef}
      style={style}>
      {draggable && (
        <button
          className="shrink-0 cursor-grab touch-none text-white/0 transition-colors group-hover:text-white/25 hover:!text-white/60 active:cursor-grabbing"
          title="Drag to reorder"
          {...attributes}
          {...listeners}>
          <GripVertical className="h-3 w-3" />
        </button>
      )}
      <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onSelect} title={section.name}>
        <BookOpen className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-violet-300' : 'text-white/25'}`} />
        <span
          className={`truncate text-[12.5px] ${
            active ? 'font-medium text-violet-100' : 'text-white/55 group-hover:text-white/85'
          }`}>
          {section.name}
        </span>
      </button>
      <CountBadge count={section.todoCount} tone="todo" />
      <CountBadge count={section.flaggedCount} tone="flag" />
      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <button
          className="rounded p-1 text-white/30 hover:bg-white/[0.08] hover:text-white/80"
          onClick={onStartRename}
          title="Rename">
          <Pencil className="h-3 w-3" />
        </button>
        <button className="rounded p-1 text-white/30 hover:bg-white/[0.08] hover:text-rose-400" onClick={onDelete} title="Delete section">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

interface SidebarProps {
  notebooks: Notebook[];
  sectionsByNotebook: Record<string, Section[]>;
  expanded: Set<string>;
  view: View;
  onToggleExpand: (notebookId: string) => void;
  onSelectView: (view: View) => void;
  onCreateNotebook: (name: string) => void;
  onRenameNotebook: (id: string, name: string) => void;
  onDeleteNotebook: (id: string) => void;
  onCreateSection: (notebookId: string, name: string) => void;
  onRenameSection: (id: string, name: string) => void;
  onDeleteSection: (notebookId: string, id: string) => void;
  onReorderNotebooks: (newOrder: Notebook[]) => void;
  onReorderSections: (notebookId: string, newOrder: Section[]) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onOpenBookmarks: () => void;
  onOpenPalette: () => void;
  onCollapse: () => void;
}

export default function Sidebar(props: SidebarProps) {
  const {
    notebooks,
    sectionsByNotebook,
    expanded,
    view,
    onToggleExpand,
    onSelectView,
    onCreateNotebook,
    onRenameNotebook,
    onDeleteNotebook,
    onCreateSection,
    onRenameSection,
    onDeleteSection,
    onReorderNotebooks,
    onReorderSections,
    onExpandAll,
    onCollapseAll,
    onOpenBookmarks,
    onOpenPalette,
    onCollapse,
  } = props;

  const {data: session} = useSession();
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [creatingSectionFor, setCreatingSectionFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{type: 'notebook' | 'section'; id: string} | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 4}}));

  const totalImportant = notebooks.reduce((n, c) => n + (c.importantCount || 0), 0);
  const totalFlagged = notebooks.reduce((n, c) => n + (c.flaggedCount || 0), 0);

  const quickViews: {key: View['kind']; label: string; icon: React.ReactNode; badge?: number}[] = [
    {key: 'home', label: 'Home', icon: <Home className="h-4 w-4" />},
    {key: 'important', label: 'Important', icon: <Star className="h-4 w-4" />, badge: totalImportant},
    {key: 'flagged', label: 'Flagged', icon: <Flag className="h-4 w-4" />, badge: totalFlagged},
  ];

  const handleNotebookDragEnd = (e: DragEndEvent) => {
    const {active, over} = e;
    if (!over || active.id === over.id) return;
    const oldIndex = notebooks.findIndex(n => n._id === active.id);
    const newIndex = notebooks.findIndex(n => n._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderNotebooks(arrayMove(notebooks, oldIndex, newIndex));
  };

  const handleSectionDragEnd = (notebookId: string, sections: Section[]) => (e: DragEndEvent) => {
    const {active, over} = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex(s => s._id === active.id);
    const newIndex = sections.findIndex(s => s._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderSections(notebookId, arrayMove(sections, oldIndex, newIndex));
  };

  return (
    <aside className="flex h-full w-[268px] shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.02]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-glow-violet">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight tracking-tight text-white">Anomaly</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/30">notes, reinvented</p>
        </div>
        <button
          className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/70"
          onClick={onCollapse}
          title="Collapse sidebar">
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Search trigger */}
      <div className="px-3 pb-3">
        <button
          className="flex w-full items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-[13px] text-white/40 transition-colors hover:border-white/[0.14] hover:text-white/70"
          onClick={onOpenPalette}>
          <Search className="h-3.5 w-3.5" />
          <span>Search everything…</span>
          <kbd className="ml-auto rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-white/40">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Quick views */}
      <nav className="space-y-0.5 px-3">
        {quickViews.map(q => {
          const active = view.kind === q.key;
          return (
            <button
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-400/25'
                  : 'text-white/60 hover:bg-white/[0.05] hover:text-white/90'
              }`}
              key={q.key}
              onClick={() => onSelectView({kind: q.key} as View)}>
              <span className={active ? 'text-violet-300' : 'text-white/35'}>{q.icon}</span>
              {q.label}
              {q.badge ? (
                <span className="ml-auto rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-semibold text-white/50">
                  {q.badge}
                </span>
              ) : null}
            </button>
          );
        })}
        <button
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white/90"
          onClick={onOpenBookmarks}>
          <Bookmark className="h-4 w-4 text-white/35" />
          Bookmarks
        </button>
      </nav>

      {/* Notebooks */}
      <div className="mt-4 flex items-center justify-between px-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">Notebooks</p>
        <div className="flex items-center gap-0.5">
          <button
            className="rounded-md p-1 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-violet-300"
            onClick={onExpandAll}
            title="Expand all notebooks">
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-md p-1 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-violet-300"
            onClick={onCollapseAll}
            title="Collapse all notebooks">
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-md p-1 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-violet-300"
            onClick={() => setCreatingNotebook(true)}
            title="New notebook">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-1 flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
        {creatingNotebook && (
          <InlineInput
            onCancel={() => setCreatingNotebook(false)}
            onCommit={name => {
              onCreateNotebook(name);
              setCreatingNotebook(false);
            }}
            placeholder="Notebook name…"
          />
        )}

        {notebooks.length === 0 && !creatingNotebook && (
          <button
            className="mx-2 mt-2 flex w-[calc(100%-16px)] items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-3 text-[12px] text-white/35 transition-colors hover:border-violet-400/30 hover:text-violet-300"
            onClick={() => setCreatingNotebook(true)}>
            <Plus className="h-3.5 w-3.5" /> Create your first notebook
          </button>
        )}

        <DndContext onDragEnd={handleNotebookDragEnd} sensors={sensors}>
          <SortableContext items={notebooks.map(n => n._id)} strategy={verticalListSortingStrategy}>
            {notebooks.map(nb => {
              const isExpanded = expanded.has(nb._id);
              const isActive = view.kind === 'notebook' && view.notebookId === nb._id;
              const sections = sectionsByNotebook[nb._id] || [];
              const isRenaming = renaming?.type === 'notebook' && renaming.id === nb._id;

              return (
                <NotebookRow
                  isActive={isActive}
                  isExpanded={isExpanded}
                  isRenaming={isRenaming}
                  key={nb._id}
                  notebook={nb}
                  onCancelRename={() => setRenaming(null)}
                  onCommitRename={name => {
                    onRenameNotebook(nb._id, name);
                    setRenaming(null);
                  }}
                  onDelete={() => onDeleteNotebook(nb._id)}
                  onSelect={() => onSelectView({kind: 'notebook', notebookId: nb._id})}
                  onStartCreateSection={() => {
                    setCreatingSectionFor(nb._id);
                    if (!isExpanded) onToggleExpand(nb._id);
                  }}
                  onStartRename={() => setRenaming({type: 'notebook', id: nb._id})}
                  onToggleExpand={() => onToggleExpand(nb._id)}>
                  {isExpanded && (
                    <div className="ml-4 border-l border-white/[0.06] pl-1.5">
                      {creatingSectionFor === nb._id && (
                        <InlineInput
                          onCancel={() => setCreatingSectionFor(null)}
                          onCommit={name => {
                            onCreateSection(nb._id, name);
                            setCreatingSectionFor(null);
                          }}
                          placeholder="Section name…"
                        />
                      )}
                      <DndContext onDragEnd={handleSectionDragEnd(nb._id, sections)} sensors={sensors}>
                        <SortableContext items={sections.map(s => s._id)} strategy={verticalListSortingStrategy}>
                          {sections.map(sec => (
                            <SectionRow
                              active={view.kind === 'section' && view.sectionId === sec._id}
                              draggable={sections.length > 1}
                              key={sec._id}
                              notebookId={nb._id}
                              onCancelRename={() => setRenaming(null)}
                              onCommitRename={name => {
                                onRenameSection(sec._id, name);
                                setRenaming(null);
                              }}
                              onDelete={() => onDeleteSection(nb._id, sec._id)}
                              onSelect={() => onSelectView({kind: 'section', notebookId: nb._id, sectionId: sec._id})}
                              onStartRename={() => setRenaming({type: 'section', id: sec._id})}
                              renaming={renaming?.type === 'section' && renaming.id === sec._id}
                              section={sec}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                      {sections.length === 0 && creatingSectionFor !== nb._id && (
                        <p className="px-2 py-1.5 text-[11px] italic text-white/20">No sections yet</p>
                      )}
                    </div>
                  )}
                </NotebookRow>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* Footer: user + escape hatches */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-2">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-8 w-8 rounded-full ring-1 ring-white/10" src={session.user.image} />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/25 text-[12px] font-bold text-violet-200">
              {(session?.user?.name || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-white/85">{session?.user?.name || 'Admin'}</p>
            <p className="truncate text-[10px] text-white/35">{session?.user?.email}</p>
          </div>
          <button
            className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.07] hover:text-rose-400"
            onClick={() => signOut({callbackUrl: '/'})}
            title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between px-1 text-[10.5px] text-white/25">
          <Link className="transition-colors hover:text-white/60" href="/">
            ← Portfolio
          </Link>
          <Link className="transition-colors hover:text-white/60" href="/notes">
            Classic notes ↗
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ── Notebook row (draggable at the top level) ────────────────────────────────
interface NotebookRowProps {
  notebook: Notebook;
  isActive: boolean;
  isExpanded: boolean;
  isRenaming: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onStartCreateSection: () => void;
  onStartRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}

function NotebookRow({
  notebook,
  isActive,
  isExpanded,
  isRenaming,
  onToggleExpand,
  onSelect,
  onStartCreateSection,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete,
  children,
}: NotebookRowProps) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: notebook._id});
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div className="mb-0.5" ref={setNodeRef} style={style}>
      {isRenaming ? (
        <InlineInput initial={notebook.name} onCancel={onCancelRename} onCommit={onCommitRename} placeholder="Notebook name…" />
      ) : (
        <div
          className={`group flex items-center gap-1 rounded-lg px-1.5 py-1.5 transition-colors ${
            isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
          }`}>
          <button
            className="shrink-0 cursor-grab touch-none rounded p-0.5 text-white/0 transition-colors group-hover:text-white/25 hover:!text-white/60 active:cursor-grabbing"
            title="Drag to reorder"
            {...attributes}
            {...listeners}>
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-0.5 text-white/30 hover:bg-white/[0.08] hover:text-white/70"
            onClick={onToggleExpand}
            title={isExpanded ? 'Collapse' : 'Expand sections'}>
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onSelect} title={notebook.name}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor: accentOf(notebook.color)}} />
            <span
              className={`truncate text-[13px] font-medium ${
                isActive ? 'text-white' : 'text-white/70 group-hover:text-white/90'
              }`}>
              {notebook.name}
            </span>
          </button>
          <CountBadge count={notebook.todoCount} tone="todo" />
          <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
            <button
              className="rounded p-1 text-white/30 hover:bg-white/[0.08] hover:text-cyan-300"
              onClick={onStartCreateSection}
              title="New section">
              <FolderPlus className="h-3 w-3" />
            </button>
            <button className="rounded p-1 text-white/30 hover:bg-white/[0.08] hover:text-white/80" onClick={onStartRename} title="Rename">
              <Pencil className="h-3 w-3" />
            </button>
            <button className="rounded p-1 text-white/30 hover:bg-white/[0.08] hover:text-rose-400" onClick={onDelete} title="Delete notebook">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
