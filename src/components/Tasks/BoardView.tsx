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
import {Loader2, Plus} from 'lucide-react';
import React, {useRef, useState} from 'react';

import TaskCard from './TaskCard';
import {Status, STATUSES, statusOf, Task} from './types';

interface BoardViewProps {
  tasks: Task[]; // filtered (all statuses)
  selectedId: string | null;
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onSetStatus: (task: Task, status: Status) => void;
  onQuickCreate: (title: string, status: Status) => Promise<void>;
  onAddTask: (status: Status) => void; // opens the full New Task modal
  onContextMenu: (task: Task, e: React.MouseEvent) => void;
}

const COLUMN_TONES: Record<Status, {header: string; ring: string; bar: string; count: string}> = {
  'todo': {header: 'text-slate-600', ring: 'ring-slate-300', bar: 'bg-slate-400', count: 'text-slate-500'},
  'in-progress': {header: 'text-orange-600', ring: 'ring-orange-300', bar: 'bg-gradient-to-r from-orange-400 to-rose-400', count: 'text-orange-600'},
  'done': {header: 'text-emerald-600', ring: 'ring-emerald-300', bar: 'bg-emerald-400', count: 'text-emerald-600'},
};

function DraggableCard({
  task,
  selected,
  onOpen,
  onToggleComplete,
  onContextMenu,
}: {
  task: Task;
  selected: boolean;
  onOpen: (t: Task) => void;
  onToggleComplete: (t: Task) => void;
  onContextMenu: (task: Task, e: React.MouseEvent) => void;
}) {
  const {attributes, listeners, setNodeRef, isDragging} = useDraggable({id: task._id});
  return (
    <div className={isDragging ? 'opacity-30' : ''} ref={setNodeRef} {...listeners} {...attributes}>
      <TaskCard compact onContextMenu={onContextMenu} onOpen={onOpen} onToggleComplete={onToggleComplete} selected={selected} task={task} />
    </div>
  );
}

/** Inline "+ Add task" composer at the bottom of each column. */
function ColumnComposer({status, onQuickCreate}: {status: Status; onQuickCreate: (title: string, status: Status) => Promise<void>}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const title = value.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await onQuickCreate(title, status);
      setValue('');
      inputRef.current?.focus();
    } catch (err) {
      alert(`Could not create task: ${err instanceof Error ? err.message : err}`);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-[11.5px] font-semibold text-slate-400 transition-colors hover:border-orange-300 hover:bg-white/60 hover:text-orange-600"
        onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-orange-300 bg-white px-3 py-2 shadow-sm">
      <input
        autoFocus
        className="flex-1 bg-transparent text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300"
        onBlur={() => {
          if (!value.trim()) setOpen(false);
        }}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') {
            setValue('');
            setOpen(false);
          }
        }}
        placeholder="Task title, Enter to add…"
        ref={inputRef}
        value={value}
      />
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />}
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
  onQuickCreate,
  onAddTask,
  onContextMenu,
}: {
  status: Status;
  label: string;
  tasks: Task[];
  selectedId: string | null;
  onOpen: (t: Task) => void;
  onToggleComplete: (t: Task) => void;
  onQuickCreate: (title: string, status: Status) => Promise<void>;
  onAddTask: (status: Status) => void;
  onContextMenu: (task: Task, e: React.MouseEvent) => void;
}) {
  const {setNodeRef, isOver} = useDroppable({id: status});
  const tone = COLUMN_TONES[status];
  return (
    <div
      className={`flex h-full min-h-0 w-[330px] shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-100/70 backdrop-blur-sm transition-all dark:border-slate-700 dark:bg-slate-800/60 ${
        isOver ? `ring-2 ${tone.ring} scale-[1.01]` : ''
      }`}
      ref={setNodeRef}>
      {/* Accent bar */}
      <div className={`h-1 w-full ${tone.bar}`} />
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <h3 className={`text-[12px] font-bold uppercase tracking-wider ${tone.header}`}>{label}</h3>
        <span className={`rounded-full bg-white px-2 py-0.5 text-[10px] font-bold shadow-sm ${tone.count} dark:bg-slate-700`}>
          {tasks.length}
        </span>
        <button
          className="ml-auto rounded-lg p-1 text-slate-300 transition-colors hover:bg-white hover:text-orange-500 dark:hover:bg-slate-700"
          onClick={() => onAddTask(status)}
          title={`New task in ${label} (full form)`}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]">
        {tasks.map(task => (
          <DraggableCard
            key={task._id}
            onContextMenu={onContextMenu}
            onOpen={onOpen}
            onToggleComplete={onToggleComplete}
            selected={task._id === selectedId}
            task={task}
          />
        ))}
        {tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-[11px] text-slate-400 dark:border-slate-600">
            Drop tasks here
          </div>
        )}
      </div>
      <div className="px-3 pb-3">
        <ColumnComposer onQuickCreate={onQuickCreate} status={status} />
      </div>
    </div>
  );
}

export default function BoardView({
  tasks,
  selectedId,
  onOpen,
  onToggleComplete,
  onSetStatus,
  onQuickCreate,
  onAddTask,
  onContextMenu,
}: BoardViewProps) {
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
      <div className="flex h-full justify-center gap-4 overflow-x-auto px-6 pb-6 pt-4 [scrollbar-width:thin]">
        {STATUSES.map(col => (
          <Column
            key={col.key}
            label={col.label}
            onAddTask={onAddTask}
            onContextMenu={onContextMenu}
            onOpen={onOpen}
            onQuickCreate={onQuickCreate}
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
