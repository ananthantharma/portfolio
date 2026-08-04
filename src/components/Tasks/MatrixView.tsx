/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDroppable, useSensor, useSensors} from '@dnd-kit/core';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {Columns3, LayoutGrid, PanelBottom, PanelLeft, PanelRight, PanelTop, Rows3} from 'lucide-react';
import React, {useEffect, useState} from 'react';

import TaskCard from './TaskCard';
import {daysUntil, Task} from './types';

export type Quadrant = 'do' | 'schedule' | 'delegate' | 'someday';

interface MatrixViewProps {
  tasks: Task[]; // filtered, active only
  selectedId: string | null;
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onSnooze?: (task: Task) => void;
  onContextMenu: (task: Task, e: React.MouseEvent) => void;
  onMoveToQuadrant: (task: Task, quadrant: Quadrant) => void;
  /** Persists the drag-reordered rank of tasks within a quadrant (reuses the shared `order` field). */
  onReorderQuadrant: (updates: {id: string; order: number}[]) => void;
}

const byOrder = (a: Task, b: Task) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);

// Eisenhower classification: urgent = overdue or due within 2 days; important = High/Medium priority
export function quadrantOf(task: Task): Quadrant {
  const d = daysUntil(task.dueDate);
  const urgent = d !== null && d <= 2;
  const important = task.priority === 'High' || task.priority === 'Medium';
  if (urgent && important) return 'do';
  if (!urgent && important) return 'schedule';
  if (urgent && !important) return 'delegate';
  return 'someday';
}

const QUADRANTS: {key: Quadrant; title: string; hint: string; tone: string; ring: string}[] = [
  {key: 'do', title: 'Do First', hint: 'urgent + important', tone: 'border-rose-200 bg-rose-50/60 text-rose-700', ring: 'ring-rose-300'},
  {
    key: 'schedule',
    title: 'Second Priority',
    hint: 'important, not urgent',
    tone: 'border-orange-200 bg-orange-50/60 text-orange-700',
    ring: 'ring-orange-300',
  },
  {
    key: 'delegate',
    title: 'With Someone',
    hint: 'urgent, not important',
    tone: 'border-sky-200 bg-sky-50/60 text-sky-700',
    ring: 'ring-sky-300',
  },
  {key: 'someday', title: 'Someday', hint: 'neither', tone: 'border-slate-200 bg-slate-50/80 text-slate-500', ring: 'ring-slate-300'},
];

// ── Layout system ────────────────────────────────────────────────────────────
// A layout is computed (not hand-authored) so every quadrant can be the large
// "featured" one, from any side — 4 quadrants × 4 positions = 16 combinations,
// plus the plain grid / row / column modes. All resolve to CSS grid-template-
// areas, so switching layouts never touches which tasks live where.
type LayoutMode = 'grid' | 'featured' | 'row' | 'column';
type FeaturedPosition = 'left' | 'right' | 'top' | 'bottom';

interface LayoutSettings {
  mode: LayoutMode;
  featuredQuadrant: Quadrant;
  featuredPosition: FeaturedPosition;
}

const DEFAULT_LAYOUT: LayoutSettings = {mode: 'grid', featuredQuadrant: 'do', featuredPosition: 'left'};

const LAYOUT_MODES: {key: LayoutMode; label: string; icon: React.ReactNode}[] = [
  {key: 'grid', label: '2×2 grid', icon: <LayoutGrid className="h-3.5 w-3.5" />},
  {key: 'featured', label: 'Featured quadrant', icon: <PanelLeft className="h-3.5 w-3.5" />},
  {key: 'row', label: 'Single row', icon: <Columns3 className="h-3.5 w-3.5" />},
  {key: 'column', label: 'Single column', icon: <Rows3 className="h-3.5 w-3.5" />},
];

const POSITIONS: {key: FeaturedPosition; label: string; icon: React.ReactNode}[] = [
  {key: 'left', label: 'Left', icon: <PanelLeft className="h-3.5 w-3.5" />},
  {key: 'right', label: 'Right', icon: <PanelRight className="h-3.5 w-3.5" />},
  {key: 'top', label: 'Top', icon: <PanelTop className="h-3.5 w-3.5" />},
  {key: 'bottom', label: 'Bottom', icon: <PanelBottom className="h-3.5 w-3.5" />},
];

interface GridSpec {
  areas: string;
  cols: string;
  rows: string;
}

function computeGrid({mode, featuredQuadrant, featuredPosition}: LayoutSettings): GridSpec {
  if (mode === 'row') {
    return {
      areas: `"do schedule delegate someday"`,
      cols: 'repeat(4, minmax(0, 1fr))',
      rows: 'minmax(0, 1fr)',
    };
  }
  if (mode === 'column') {
    return {
      areas: `"do" "schedule" "delegate" "someday"`,
      cols: 'minmax(0, 1fr)',
      rows: 'repeat(4, minmax(0, 1fr))',
    };
  }
  if (mode === 'featured') {
    const others = QUADRANTS.map(q => q.key).filter(k => k !== featuredQuadrant);
    const f = featuredQuadrant;
    if (featuredPosition === 'left') {
      return {
        areas: `"${f} ${others[0]}" "${f} ${others[1]}" "${f} ${others[2]}"`,
        cols: 'minmax(0, 1fr) minmax(0, 1fr)',
        rows: 'repeat(3, minmax(0, 1fr))',
      };
    }
    if (featuredPosition === 'right') {
      return {
        areas: `"${others[0]} ${f}" "${others[1]} ${f}" "${others[2]} ${f}"`,
        cols: 'minmax(0, 1fr) minmax(0, 1fr)',
        rows: 'repeat(3, minmax(0, 1fr))',
      };
    }
    if (featuredPosition === 'top') {
      return {
        areas: `"${f} ${f} ${f}" "${others[0]} ${others[1]} ${others[2]}"`,
        cols: 'repeat(3, minmax(0, 1fr))',
        rows: 'minmax(0, 1fr) minmax(0, 1fr)',
      };
    }
    return {
      areas: `"${others[0]} ${others[1]} ${others[2]}" "${f} ${f} ${f}"`,
      cols: 'repeat(3, minmax(0, 1fr))',
      rows: 'minmax(0, 1fr) minmax(0, 1fr)',
    };
  }
  // grid (default)
  return {
    areas: `"do schedule" "delegate someday"`,
    cols: 'repeat(2, minmax(0, 1fr))',
    rows: 'repeat(2, minmax(0, 1fr))',
  };
}

const LAYOUT_STORAGE_KEY = 'TASKS_MATRIX_LAYOUT_V2';

function SortableCard({
  task,
  selected,
  onOpen,
  onToggleComplete,
  onSnooze,
  onContextMenu,
}: {
  task: Task;
  selected: boolean;
  onOpen: (t: Task) => void;
  onToggleComplete: (t: Task) => void;
  onSnooze?: (t: Task) => void;
  onContextMenu: (task: Task, e: React.MouseEvent) => void;
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: task._id});
  const style = {transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1};
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard
        compact
        onContextMenu={onContextMenu}
        onOpen={onOpen}
        onSnooze={onSnooze}
        onToggleComplete={onToggleComplete}
        selected={selected}
        task={task}
      />
    </div>
  );
}

function QuadrantBox({
  q,
  items,
  selectedId,
  onOpen,
  onToggleComplete,
  onSnooze,
  onContextMenu,
}: {
  q: (typeof QUADRANTS)[number];
  items: Task[];
  selectedId: string | null;
  onOpen: (t: Task) => void;
  onToggleComplete: (t: Task) => void;
  onSnooze?: (t: Task) => void;
  onContextMenu: (task: Task, e: React.MouseEvent) => void;
}) {
  const {setNodeRef, isOver} = useDroppable({id: q.key});
  return (
    <div
      className={`flex min-h-[220px] flex-col rounded-3xl border transition-all ${q.tone} ${
        isOver ? `ring-2 ${q.ring} scale-[1.005]` : ''
      }`}
      ref={setNodeRef}
      style={{gridArea: q.key}}>
      <div className="flex items-baseline gap-2 px-4 pb-1 pt-3.5">
        <h3 className="text-[13px] font-bold uppercase tracking-wider">{q.title}</h3>
        <span className="text-[10.5px] font-medium opacity-60">{q.hint}</span>
        <span className="ml-auto rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold shadow-sm">{items.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]">
        <SortableContext items={items.map(t => t._id)} strategy={verticalListSortingStrategy}>
          {items.map(task => (
            <SortableCard
              key={task._id}
              onContextMenu={onContextMenu}
              onOpen={onOpen}
              onSnooze={onSnooze}
              onToggleComplete={onToggleComplete}
              selected={task._id === selectedId}
              task={task}
            />
          ))}
        </SortableContext>
        {items.length === 0 && <p className="pt-6 text-center text-[11px] italic opacity-50">Drop tasks here</p>}
      </div>
    </div>
  );
}

export default function MatrixView({
  tasks,
  selectedId,
  onOpen,
  onToggleComplete,
  onSnooze,
  onContextMenu,
  onMoveToQuadrant,
  onReorderQuadrant,
}: MatrixViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [layout, setLayout] = useState<LayoutSettings>(DEFAULT_LAYOUT);
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 6}}));
  const isQuadrantKey = (id: string): id is Quadrant => QUADRANTS.some(q => q.key === id);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) setLayout({...DEFAULT_LAYOUT, ...JSON.parse(saved)});
    } catch {
      // ignore malformed/legacy stored value — fall back to the default layout
    }
  }, []);

  const changeLayout = (patch: Partial<LayoutSettings>) => {
    setLayout(prev => {
      const next = {...prev, ...patch};
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const grid = computeGrid(layout);

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask(tasks.find(t => t._id === e.active.id) || null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const {active, over} = e;
    if (!over || active.id === over.id) return;
    const task = tasks.find(t => t._id === active.id);
    if (!task) return;

    const overId = over.id as string;
    const overTask = isQuadrantKey(overId) ? null : tasks.find(t => t._id === overId) || null;
    const targetQuadrant: Quadrant = overTask ? quadrantOf(overTask) : (overId as Quadrant);
    const sourceQuadrant = quadrantOf(task);

    // Recompute the destination quadrant's order, with the dragged task inserted at the drop position.
    const destItems = tasks.filter(t => quadrantOf(t) === targetQuadrant && t._id !== task._id).sort(byOrder);
    const insertAt = overTask ? Math.max(0, destItems.findIndex(t => t._id === overTask._id)) : destItems.length;
    const reordered = [...destItems.slice(0, insertAt), task, ...destItems.slice(insertAt)];

    onReorderQuadrant(reordered.map((t, i) => ({id: t._id, order: i})));
    if (sourceQuadrant !== targetQuadrant) onMoveToQuadrant(task, targetQuadrant);
  };

  return (
    <DndContext onDragEnd={onDragEnd} onDragStart={onDragStart} sensors={sensors}>
      <style>{`
        @media (min-width: 768px) {
          #matrix-grid {
            grid-template-areas: ${grid.areas};
            grid-template-columns: ${grid.cols};
            grid-template-rows: ${grid.rows};
          }
        }
      `}</style>

      <div className="flex h-full flex-col">
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 px-6 pt-3">
          {layout.mode === 'featured' && (
            <>
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
                {QUADRANTS.map(q => (
                  <button
                    className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all ${
                      layout.featuredQuadrant === q.key
                        ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    key={q.key}
                    onClick={() => changeLayout({featuredQuadrant: q.key})}
                    title={`Feature "${q.title}"`}>
                    {q.title}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
                {POSITIONS.map(p => (
                  <button
                    className={`flex items-center rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all ${
                      layout.featuredPosition === p.key
                        ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    key={p.key}
                    onClick={() => changeLayout({featuredPosition: p.key})}
                    title={`Feature it on the ${p.label.toLowerCase()}`}>
                    {p.icon}
                  </button>
                ))}
              </div>
            </>
          )}
          <span className="mr-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Layout</span>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
            {LAYOUT_MODES.map(m => (
              <button
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all ${
                  layout.mode === m.key ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
                key={m.key}
                onClick={() => changeLayout({mode: m.key})}
                title={m.label}>
                {m.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 pb-6 pt-3 md:overflow-hidden" id="matrix-grid">
          {QUADRANTS.map(q => (
            <QuadrantBox
              items={tasks.filter(t => quadrantOf(t) === q.key).sort(byOrder)}
              key={q.key}
              onContextMenu={onContextMenu}
              onOpen={onOpen}
              onSnooze={onSnooze}
              onToggleComplete={onToggleComplete}
              q={q}
              selectedId={selectedId}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 opacity-90">
            <TaskCard compact onContextMenu={() => undefined} onOpen={() => undefined} onToggleComplete={() => undefined} selected task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
