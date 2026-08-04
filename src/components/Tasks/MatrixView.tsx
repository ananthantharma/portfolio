/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDroppable, useSensor, useSensors} from '@dnd-kit/core';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {LayoutGrid, PanelLeft, PanelRight, PanelTop, Rows3} from 'lucide-react';
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

// ── Layout presets ──────────────────────────────────────────────────────────
// Each preset places the four quadrants (by key) into a CSS grid via named
// areas, so switching layouts never touches which tasks live where.
type LayoutKey = 'grid' | 'doLeft' | 'doRight' | 'doTop' | 'column';

interface LayoutPreset {
  key: LayoutKey;
  label: string;
  icon: React.ReactNode;
  areas: string; // grid-template-areas value (quoted rows)
  cols: string;
  rows: string;
}

const LAYOUTS: LayoutPreset[] = [
  {
    key: 'grid',
    label: '2×2 grid',
    icon: <LayoutGrid className="h-3.5 w-3.5" />,
    areas: `"do schedule" "delegate someday"`,
    cols: 'repeat(2, minmax(0, 1fr))',
    rows: 'repeat(2, minmax(0, 1fr))',
  },
  {
    key: 'doLeft',
    label: 'Do First · left column',
    icon: <PanelLeft className="h-3.5 w-3.5" />,
    areas: `"do schedule" "do delegate" "do someday"`,
    cols: 'minmax(0, 1fr) minmax(0, 1fr)',
    rows: 'repeat(3, minmax(0, 1fr))',
  },
  {
    key: 'doRight',
    label: 'Do First · right column',
    icon: <PanelRight className="h-3.5 w-3.5" />,
    areas: `"schedule do" "delegate do" "someday do"`,
    cols: 'minmax(0, 1fr) minmax(0, 1fr)',
    rows: 'repeat(3, minmax(0, 1fr))',
  },
  {
    key: 'doTop',
    label: 'Do First · top row',
    icon: <PanelTop className="h-3.5 w-3.5" />,
    areas: `"do do do" "schedule delegate someday"`,
    cols: 'repeat(3, minmax(0, 1fr))',
    rows: 'minmax(0, 1fr) minmax(0, 1fr)',
  },
  {
    key: 'column',
    label: 'Single column',
    icon: <Rows3 className="h-3.5 w-3.5" />,
    areas: `"do" "schedule" "delegate" "someday"`,
    cols: 'minmax(0, 1fr)',
    rows: 'repeat(4, minmax(0, 1fr))',
  },
];

const LAYOUT_STORAGE_KEY = 'TASKS_MATRIX_LAYOUT';

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
  const [layoutKey, setLayoutKey] = useState<LayoutKey>('grid');
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 6}}));
  const isQuadrantKey = (id: string): id is Quadrant => QUADRANTS.some(q => q.key === id);

  useEffect(() => {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY) as LayoutKey | null;
    if (saved && LAYOUTS.some(l => l.key === saved)) setLayoutKey(saved);
  }, []);

  const changeLayout = (key: LayoutKey) => {
    setLayoutKey(key);
    localStorage.setItem(LAYOUT_STORAGE_KEY, key);
  };

  const layout = LAYOUTS.find(l => l.key === layoutKey) || LAYOUTS[0];

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
            grid-template-areas: ${layout.areas};
            grid-template-columns: ${layout.cols};
            grid-template-rows: ${layout.rows};
          }
        }
      `}</style>

      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-end gap-1.5 px-6 pt-3">
          <span className="mr-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Layout</span>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
            {LAYOUTS.map(l => (
              <button
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all ${
                  layoutKey === l.key ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
                key={l.key}
                onClick={() => changeLayout(l.key)}
                title={l.label}>
                {l.icon}
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
