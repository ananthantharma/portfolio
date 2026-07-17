/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import React, {useState} from 'react';

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
}

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
  {key: 'do', title: 'Do first', hint: 'urgent + important', tone: 'border-rose-200 bg-rose-50/60 text-rose-700', ring: 'ring-rose-300'},
  {
    key: 'schedule',
    title: 'Schedule',
    hint: 'important, not urgent',
    tone: 'border-orange-200 bg-orange-50/60 text-orange-700',
    ring: 'ring-orange-300',
  },
  {
    key: 'delegate',
    title: 'Delegate',
    hint: 'urgent, not important',
    tone: 'border-sky-200 bg-sky-50/60 text-sky-700',
    ring: 'ring-sky-300',
  },
  {key: 'someday', title: 'Someday', hint: 'neither', tone: 'border-slate-200 bg-slate-50/80 text-slate-500', ring: 'ring-slate-300'},
];

function DraggableCard({
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
  const {attributes, listeners, setNodeRef, isDragging} = useDraggable({id: task._id});
  return (
    <div className={isDragging ? 'opacity-30' : ''} ref={setNodeRef} {...listeners} {...attributes}>
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
      ref={setNodeRef}>
      <div className="flex items-baseline gap-2 px-4 pb-1 pt-3.5">
        <h3 className="text-[13px] font-bold uppercase tracking-wider">{q.title}</h3>
        <span className="text-[10.5px] font-medium opacity-60">{q.hint}</span>
        <span className="ml-auto rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold shadow-sm">{items.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]">
        {items.map(task => (
          <DraggableCard
            key={task._id}
            onContextMenu={onContextMenu}
            onOpen={onOpen}
            onSnooze={onSnooze}
            onToggleComplete={onToggleComplete}
            selected={task._id === selectedId}
            task={task}
          />
        ))}
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
}: MatrixViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 6}}));

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask(tasks.find(t => t._id === e.active.id) || null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const target = e.over?.id as Quadrant | undefined;
    const task = tasks.find(t => t._id === e.active.id);
    if (!task || !target) return;
    if (quadrantOf(task) !== target) onMoveToQuadrant(task, target);
  };

  return (
    <DndContext onDragEnd={onDragEnd} onDragStart={onDragStart} sensors={sensors}>
      <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto px-6 pb-6 pt-4 md:grid-cols-2 md:grid-rows-2 md:overflow-hidden">
        {QUADRANTS.map(q => (
          <QuadrantBox
            items={tasks.filter(t => quadrantOf(t) === q.key)}
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
