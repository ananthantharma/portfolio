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
import {Status, STATUSES, statusOf, Task} from './types';

interface BoardViewProps {
  tasks: Task[]; // filtered (all statuses)
  selectedId: string | null;
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onSetStatus: (task: Task, status: Status) => void;
}

const COLUMN_TONES: Record<Status, {header: string; ring: string}> = {
  'todo': {header: 'text-slate-600', ring: 'ring-slate-300'},
  'in-progress': {header: 'text-orange-600', ring: 'ring-orange-300'},
  'done': {header: 'text-emerald-600', ring: 'ring-emerald-300'},
};

function DraggableCard({
  task,
  selected,
  onOpen,
  onToggleComplete,
}: {
  task: Task;
  selected: boolean;
  onOpen: (t: Task) => void;
  onToggleComplete: (t: Task) => void;
}) {
  const {attributes, listeners, setNodeRef, isDragging} = useDraggable({id: task._id});
  return (
    <div className={isDragging ? 'opacity-30' : ''} ref={setNodeRef} {...listeners} {...attributes}>
      <TaskCard compact onOpen={onOpen} onToggleComplete={onToggleComplete} selected={selected} task={task} />
    </div>
  );
}

function Column({
  status,
  label,
  tasks,
  selectedId,
  onOpen,
  onToggleComplete,
}: {
  status: Status;
  label: string;
  tasks: Task[];
  selectedId: string | null;
  onOpen: (t: Task) => void;
  onToggleComplete: (t: Task) => void;
}) {
  const {setNodeRef, isOver} = useDroppable({id: status});
  const tone = COLUMN_TONES[status];
  return (
    <div
      className={`flex h-full min-h-0 w-[320px] shrink-0 flex-col rounded-3xl border border-slate-200/70 bg-slate-100/60 transition-shadow ${
        isOver ? `ring-2 ${tone.ring}` : ''
      }`}
      ref={setNodeRef}>
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        <h3 className={`text-[12px] font-bold uppercase tracking-wider ${tone.header}`}>{label}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
        {tasks.map(task => (
          <DraggableCard
            key={task._id}
            onOpen={onOpen}
            onToggleComplete={onToggleComplete}
            selected={task._id === selectedId}
            task={task}
          />
        ))}
        {tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-[11px] text-slate-400">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

export default function BoardView({tasks, selectedId, onOpen, onToggleComplete, onSetStatus}: BoardViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // distance: 6 lets plain clicks pass through to onOpen instead of starting a drag
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 6}}));

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask(tasks.find(t => t._id === e.active.id) || null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const target = e.over?.id as Status | undefined;
    const task = tasks.find(t => t._id === e.active.id);
    if (!task || !target) return;
    if (statusOf(task) !== target) onSetStatus(task, target);
  };

  return (
    <DndContext onDragEnd={onDragEnd} onDragStart={onDragStart} sensors={sensors}>
      <div className="flex h-full gap-4 overflow-x-auto px-6 pb-6 pt-4 [scrollbar-width:thin]">
        {STATUSES.map(col => (
          <Column
            key={col.key}
            label={col.label}
            onOpen={onOpen}
            onToggleComplete={onToggleComplete}
            selectedId={selectedId}
            status={col.key}
            tasks={tasks.filter(t => statusOf(t) === col.key)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 opacity-90">
            <TaskCard compact onOpen={() => undefined} onToggleComplete={() => undefined} selected task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
