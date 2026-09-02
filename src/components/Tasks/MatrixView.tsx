/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDroppable, useSensor, useSensors} from '@dnd-kit/core';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import React, {useState} from 'react';

import TaskCard from './TaskCard';
import {daysUntil, Task} from './types';

export type Quadrant = 'do' | 'schedule' | 'delegate' | 'someday';

interface MatrixViewProps {
  tasks: Task[]; // filtered, active only
  selectedId: string | null;
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onExpand: (task: Task) => void;
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

const QUADRANTS: {key: Quadrant; title: string; hint: string; dot: string; accent: string; ring: string}[] = [
  {
    key: 'do',
    title: 'Do First',
    hint: 'urgent + important',
    dot: 'bg-rose-500',
    accent: 'text-rose-600 dark:text-rose-300',
    ring: 'ring-rose-300',
  },
  {
    key: 'schedule',
    title: 'Second Priority',
    hint: 'important, not urgent',
    dot: 'bg-amber-500',
    accent: 'text-amber-600 dark:text-amber-300',
    ring: 'ring-amber-300',
  },
  {
    key: 'delegate',
    title: 'With Someone',
    hint: 'urgent, not important',
    dot: 'bg-sky-500',
    accent: 'text-sky-600 dark:text-sky-300',
    ring: 'ring-sky-300',
  },
  {
    key: 'someday',
    title: 'Someday',
    hint: 'neither',
    dot: 'bg-slate-400',
    accent: 'text-slate-500 dark:text-slate-400',
    ring: 'ring-slate-300',
  },
];

function SortableCard({
  task,
  selected,
  onOpen,
  onToggleComplete,
  onExpand,
  onContextMenu,
}: {
  task: Task;
  selected: boolean;
  onOpen: (t: Task) => void;
  onToggleComplete: (t: Task) => void;
  onExpand: (t: Task) => void;
  onContextMenu: (task: Task, e: React.MouseEvent) => void;
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: task._id});
  const style = {transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1};
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard
        compact
        onContextMenu={onContextMenu}
        onExpand={onExpand}
        onOpen={onOpen}
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
  onExpand,
  onContextMenu,
}: {
  q: (typeof QUADRANTS)[number];
  items: Task[];
  selectedId: string | null;
  onOpen: (t: Task) => void;
  onToggleComplete: (t: Task) => void;
  onExpand: (t: Task) => void;
  onContextMenu: (task: Task, e: React.MouseEvent) => void;
}) {
  const {setNodeRef, isOver} = useDroppable({id: q.key});
  return (
    <div
      className={`flex min-h-[220px] flex-col rounded-2xl border border-slate-200/70 bg-white/70 transition-all dark:border-slate-800 dark:bg-slate-900/40 ${
        isOver ? `ring-2 ${q.ring}` : ''
      }`}
      ref={setNodeRef}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className={`h-2 w-2 shrink-0 rounded-full ${q.dot}`} />
        <h3 className={`text-[12px] font-bold uppercase tracking-wider ${q.accent}`}>{q.title}</h3>
        <span className="hidden text-[10px] font-medium text-slate-400 sm:inline">{q.hint}</span>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {items.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]">
        <SortableContext items={items.map(t => t._id)} strategy={verticalListSortingStrategy}>
          {items.map(task => (
            <SortableCard
              key={task._id}
              onContextMenu={onContextMenu}
              onExpand={onExpand}
              onOpen={onOpen}
              onToggleComplete={onToggleComplete}
              selected={task._id === selectedId}
              task={task}
            />
          ))}
        </SortableContext>
        {items.length === 0 && <p className="pt-6 text-center text-[11px] italic text-slate-300 dark:text-slate-600">Drop tasks here</p>}
      </div>
    </div>
  );
}

export default function MatrixView({
  tasks,
  selectedId,
  onOpen,
  onToggleComplete,
  onExpand,
  onContextMenu,
  onMoveToQuadrant,
  onReorderQuadrant,
}: MatrixViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 6}}));
  const isQuadrantKey = (id: string): id is Quadrant => QUADRANTS.some(q => q.key === id);

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
      <div className="flex h-full flex-col">
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-4 overflow-y-auto px-4 pb-6 pt-4 sm:px-6 md:grid-cols-2 md:overflow-hidden">
          {QUADRANTS.map(q => (
            <QuadrantBox
              items={tasks.filter(t => quadrantOf(t) === q.key).sort(byOrder)}
              key={q.key}
              onContextMenu={onContextMenu}
              onExpand={onExpand}
              onOpen={onOpen}
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
            <TaskCard
              compact
              onContextMenu={() => undefined}
              onExpand={() => undefined}
              onOpen={() => undefined}
              onToggleComplete={() => undefined}
              selected
              task={activeTask}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
