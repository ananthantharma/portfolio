/* eslint-disable */
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { IOrgTask } from '@/models/OrgTask';
import OrgTaskFormModal from '../modals/OrgTaskFormModal';

type Status = 'backlog' | 'this-week' | 'in-progress' | 'review' | 'done';

const COLUMNS: { id: Status; label: string; color: string; textColor: string; dotColor: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'border-slate-600/30 bg-slate-800/20', textColor: 'text-slate-400', dotColor: 'bg-slate-500' },
  { id: 'this-week', label: 'This Week', color: 'border-blue-600/30 bg-blue-800/10', textColor: 'text-blue-400', dotColor: 'bg-blue-500' },
  { id: 'in-progress', label: 'In Progress', color: 'border-amber-600/30 bg-amber-800/10', textColor: 'text-amber-400', dotColor: 'bg-amber-500' },
  { id: 'review', label: 'Review', color: 'border-violet-600/30 bg-violet-800/10', textColor: 'text-violet-400', dotColor: 'bg-violet-500' },
  { id: 'done', label: 'Done', color: 'border-emerald-600/30 bg-emerald-800/10', textColor: 'text-emerald-400', dotColor: 'bg-emerald-500' },
];

const PRIORITY_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#3b82f6',
  None: '#475569',
};

const NEON_STYLES: Record<string, string> = {
  red: 'shadow-[0_0_0_1.5px_#ef4444,0_0_12px_#ef444440]',
  blue: 'shadow-[0_0_0_1.5px_#3b82f6,0_0_12px_#3b82f640]',
  green: 'shadow-[0_0_0_1.5px_#22c55e,0_0_12px_#22c55e40]',
};

const DEFAULT_COL_WIDTH = 280;
const WIP_LIMIT = 5;

function formatDueDate(date: Date | string) {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return { label: 'Today', color: 'text-amber-400' };
  if (diff === 1) return { label: 'Tomorrow', color: 'text-blue-400' };
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'text-red-400' };
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'text-slate-500' };
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: IOrgTask;
  onEdit: (task: IOrgTask) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (task: IOrgTask) => void;
  onToggleMinimize: (task: IOrgTask) => void;
  onAddDays: (id: string, days: number) => void;
  onSubtasksChange: (id: string, subtasks: NonNullable<IOrgTask['subtasks']>) => void;
  onCycleNeon: (task: IOrgTask) => void;
  isDragging?: boolean;
}

function TaskCard({
  task, onEdit, onDelete, onToggleComplete, onToggleMinimize,
  onAddDays, onSubtasksChange, onCycleNeon, isDragging,
}: TaskCardProps) {
  const [hovering, setHovering] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: task._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const dueInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  const addSubtask = () => {
    const t = newSubtask.trim();
    if (!t) return;
    const updated = [...(task.subtasks || []), { title: t, isCompleted: false }];
    onSubtasksChange(task._id, updated);
    setNewSubtask('');
  };

  const toggleSubtask = (idx: number) => {
    const updated = (task.subtasks || []).map((s, i) =>
      i === idx ? { ...s, isCompleted: !s.isCompleted } : s
    );
    onSubtasksChange(task._id, updated);
  };

  const deleteSubtask = (idx: number) => {
    const updated = (task.subtasks || []).filter((_, i) => i !== idx);
    onSubtasksChange(task._id, updated);
  };

  const neonStyle = task.neonColor ? NEON_STYLES[task.neonColor] : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onContextMenu={(e) => { e.preventDefault(); onCycleNeon(task); }}
      className={`bg-[#111827] border border-white/8 rounded-2xl overflow-hidden select-none transition-shadow ${neonStyle} ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Priority bar */}
      <div className="h-0.5 w-full" style={{ background: PRIORITY_COLORS[task.priority || 'None'] }} />

      <div className="p-3" {...attributes} {...listeners}>
        {/* Header row */}
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
              task.isCompleted
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                : 'border-white/20 hover:border-emerald-500/50'
            }`}
          >
            {task.isCompleted && <CheckIcon className="w-2.5 h-2.5" />}
          </button>
          <p className={`flex-1 text-sm leading-snug font-medium ${task.isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
            {task.title}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMinimize(task); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
          >
            {task.isMinimized ? <ChevronRightIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {task.priority && task.priority !== 'None' && (
            <span
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ color: PRIORITY_COLORS[task.priority], background: PRIORITY_COLORS[task.priority] + '20' }}
            >
              {task.priority}
            </span>
          )}
          {task.category && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-white/5 text-slate-400">{task.category}</span>
          )}
          {dueInfo && (
            <span className={`text-xs ${dueInfo.color} flex items-center gap-0.5`}>
              <CalendarIcon className="w-3 h-3" />
              {dueInfo.label}
            </span>
          )}
        </div>

        {/* Subtask progress */}
        {totalSubtasks > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-xs">{completedSubtasks}/{totalSubtasks} subtasks</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500/70 rounded-full transition-all"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action row on hover */}
        {hovering && (
          <div
            className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task._id); }}
              className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-700 text-xs mx-1">|</span>
            <span className="text-slate-600 text-xs mr-1">+</span>
            {[1, 3, 7].map(d => (
              <button
                key={d}
                onClick={(e) => { e.stopPropagation(); onAddDays(task._id, d); }}
                className="px-1.5 py-0.5 rounded text-xs text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
              >
                {d}d
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expanded section */}
      {!task.isMinimized && (
        <div className="px-3 pb-3 border-t border-white/5">
          {task.description && (
            <p className="text-slate-500 text-xs mt-2 mb-2 leading-relaxed">{task.description}</p>
          )}
          {/* Subtask list */}
          <div className="space-y-1 mt-2">
            {(task.subtasks || []).map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 group/sub">
                <button
                  onClick={() => toggleSubtask(idx)}
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    s.isCompleted ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/20 hover:border-emerald-500/40'
                  }`}
                >
                  {s.isCompleted && <CheckIcon className="w-2 h-2 text-emerald-400" />}
                </button>
                <span className={`flex-1 text-xs ${s.isCompleted ? 'line-through text-slate-500' : 'text-slate-300'}`}>{s.title}</span>
                <button
                  onClick={() => deleteSubtask(idx)}
                  className="opacity-0 group-hover/sub:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          {/* Add subtask */}
          <div className="flex gap-1.5 mt-2">
            <input
              ref={subtaskInputRef}
              type="text"
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
              placeholder="Add subtask..."
              className="flex-1 bg-white/3 border border-white/5 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/30"
            />
            <button
              onClick={addSubtask}
              className="p-1 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
  col: typeof COLUMNS[0];
  tasks: IOrgTask[];
  width: number;
  minimized: boolean;
  onToggleMinimize: () => void;
  onResize: (delta: number) => void;
  onAddTask: (status: Status) => void;
  onEditTask: (task: IOrgTask) => void;
  onDeleteTask: (id: string) => void;
  onToggleComplete: (task: IOrgTask) => void;
  onToggleTaskMinimize: (task: IOrgTask) => void;
  onAddDays: (id: string, days: number) => void;
  onSubtasksChange: (id: string, subtasks: NonNullable<IOrgTask['subtasks']>) => void;
  onCycleNeon: (task: IOrgTask) => void;
}

function Column({
  col, tasks, width, minimized, onToggleMinimize, onResize,
  onAddTask, onEditTask, onDeleteTask, onToggleComplete,
  onToggleTaskMinimize, onAddDays, onSubtasksChange, onCycleNeon,
}: ColumnProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: col.id });
  const isWipExceeded = col.id === 'in-progress' && tasks.length >= WIP_LIMIT;
  const resizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      onResize(startWidth.current + (ev.clientX - startX.current));
    };
    const onUp = () => {
      resizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (minimized) {
    return (
      <div
        className={`flex flex-col items-center py-4 gap-2 border rounded-2xl cursor-pointer hover:bg-white/5 transition-colors ${col.color}`}
        style={{ width: 48 }}
        onClick={onToggleMinimize}
        title={col.label}
      >
        <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
        <span className={`text-xs font-medium writing-mode-vertical ${col.textColor}`} style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
          {col.label}
        </span>
        <span className="text-slate-500 text-xs">{tasks.length}</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col shrink-0" style={{ width }}>
      <div className={`flex-1 flex flex-col border rounded-2xl overflow-hidden ${col.color} ${isOver ? 'ring-1 ring-indigo-500/40' : ''}`}>
        {/* Column header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
          <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
          <span className={`text-sm font-semibold flex-1 ${col.textColor}`}>{col.label}</span>
          <span className="text-slate-600 text-xs bg-white/5 px-1.5 py-0.5 rounded-md">{tasks.length}</span>
          {isWipExceeded && (
            <span className="text-amber-400 text-xs bg-amber-400/10 px-1.5 py-0.5 rounded-md">WIP!</span>
          )}
          <button
            onClick={onToggleMinimize}
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            <MinusIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Task list */}
        <div ref={setDropRef} className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[60px]">
          <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
            {tasks.map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onToggleComplete={onToggleComplete}
                onToggleMinimize={onToggleTaskMinimize}
                onAddDays={onAddDays}
                onSubtasksChange={onSubtasksChange}
                onCycleNeon={onCycleNeon}
              />
            ))}
          </SortableContext>
          {tasks.length === 0 && (
            <div className="h-12 flex items-center justify-center border border-dashed border-white/5 rounded-xl">
              <span className="text-slate-700 text-xs">Drop here</span>
            </div>
          )}
        </div>

        {/* Add task */}
        <div className="p-2 border-t border-white/5">
          <button
            onClick={() => onAddTask(col.id)}
            className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Add task
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/30 transition-colors rounded-full"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}

// ─── Board View ───────────────────────────────────────────────────────────────

export default function BoardView() {
  const [tasks, setTasks] = useState<IOrgTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editTask, setEditTask] = useState<Partial<IOrgTask> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<Status>('backlog');
  const [activeId, setActiveId] = useState<string | null>(null);

  const [minimizedCols, setMinimizedCols] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('org_minimized_cols') || '{}'); } catch { return {}; }
  });

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('org_col_widths') || '{}'); } catch { return {}; }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/org/tasks');
      const data = await res.json();
      if (data.success) setTasks(data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const persistTask = useCallback(async (id: string, updates: Partial<IOrgTask>) => {
    try {
      await fetch(`/api/org/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch {}
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t._id !== id));
    try { await fetch(`/api/org/tasks/${id}`, { method: 'DELETE' }); } catch { fetchTasks(); }
  }, [fetchTasks]);

  const handleToggleComplete = useCallback((task: IOrgTask) => {
    const updated = !task.isCompleted;
    setTasks(prev => prev.map(t => t._id === task._id ? { ...t, isCompleted: updated } as IOrgTask : t));
    persistTask(task._id, { isCompleted: updated });
  }, [persistTask]);

  const handleToggleMinimize = useCallback((task: IOrgTask) => {
    const updated = !task.isMinimized;
    setTasks(prev => prev.map(t => t._id === task._id ? { ...t, isMinimized: updated } as IOrgTask : t));
    persistTask(task._id, { isMinimized: updated });
  }, [persistTask]);

  const handleAddDays = useCallback((id: string, days: number) => {
    setTasks(prev => prev.map(t => {
      if (t._id !== id) return t;
      const d = new Date(t.dueDate);
      d.setDate(d.getDate() + days);
      persistTask(id, { dueDate: d });
      return { ...t, dueDate: d } as IOrgTask;
    }));
  }, [persistTask]);

  const handleSubtasksChange = useCallback((id: string, subtasks: NonNullable<IOrgTask['subtasks']>) => {
    setTasks(prev => prev.map(t => t._id === id ? { ...t, subtasks } as IOrgTask : t));
    persistTask(id, { subtasks });
  }, [persistTask]);

  const handleCycleNeon = useCallback((task: IOrgTask) => {
    const cycle: (IOrgTask['neonColor'])[] = ['red', 'blue', 'green', null];
    const currentIdx = cycle.indexOf(task.neonColor || null);
    const next = cycle[(currentIdx + 1) % cycle.length];
    setTasks(prev => prev.map(t => t._id === task._id ? { ...t, neonColor: next } as IOrgTask : t));
    persistTask(task._id, { neonColor: next });
  }, [persistTask]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t._id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;

    // Check if dropped over a column
    const overColumn = COLUMNS.find(c => c.id === overId);
    if (overColumn) {
      if (activeTask.status !== overColumn.id) {
        setTasks(prev => prev.map(t => t._id === active.id ? { ...t, status: overColumn.id } as IOrgTask : t));
        await persistTask(active.id as string, { status: overColumn.id });
      }
      return;
    }

    // Dropped over another task
    const overTask = tasks.find(t => t._id === overId);
    if (!overTask) return;

    if (activeTask.status !== overTask.status) {
      // Cross-column move
      const updatedTasks = tasks.map(t => t._id === active.id ? { ...t, status: overTask.status } as IOrgTask : t);
      setTasks(updatedTasks);
      await persistTask(active.id as string, { status: overTask.status });
    } else {
      // Same column reorder
      const colTasks = tasks.filter(t => t.status === activeTask.status);
      const oldIdx = colTasks.findIndex(t => t._id === active.id);
      const newIdx = colTasks.findIndex(t => t._id === overId);
      if (oldIdx === newIdx) return;

      const reordered = arrayMove(colTasks, oldIdx, newIdx);
      const updates = reordered.map((t, i) => ({ id: t._id, order: i }));

      setTasks(prev => {
        const otherTasks = prev.filter(t => t.status !== activeTask.status);
        const merged = [...otherTasks, ...reordered.map((t, i) => ({ ...t, order: i } as IOrgTask))];
        return merged;
      });

      try {
        await fetch('/api/org/tasks/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        });
      } catch {}
    }
  }, [tasks, persistTask]);

  const toggleColMinimize = useCallback((colId: string) => {
    setMinimizedCols(prev => {
      const updated = { ...prev, [colId]: !prev[colId] };
      localStorage.setItem('org_minimized_cols', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleColResize = useCallback((colId: string, width: number) => {
    const clamped = Math.max(220, Math.min(500, width));
    setColWidths(prev => {
      const updated = { ...prev, [colId]: clamped };
      localStorage.setItem('org_col_widths', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const tasksByStatus = useMemo(() => {
    const map: Record<Status, IOrgTask[]> = {
      backlog: [], 'this-week': [], 'in-progress': [], review: [], done: [],
    };
    for (const t of filteredTasks) {
      if (map[t.status]) map[t.status].push(t);
    }
    return map;
  }, [filteredTasks]);

  const activeTask = tasks.find(t => t._id === activeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="w-8 h-8 rounded-full border-2 border-white/10 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/8 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/40"
          />
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-6">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
          <div className="flex gap-4 h-full items-start">
            {COLUMNS.map(col => (
              <Column
                key={col.id}
                col={col}
                tasks={tasksByStatus[col.id]}
                width={colWidths[col.id] || DEFAULT_COL_WIDTH}
                minimized={!!minimizedCols[col.id]}
                onToggleMinimize={() => toggleColMinimize(col.id)}
                onResize={(w) => handleColResize(col.id, w)}
                onAddTask={(status) => { setNewTaskStatus(status); setEditTask(null); setShowModal(true); }}
                onEditTask={(task) => { setEditTask(task); setShowModal(true); }}
                onDeleteTask={handleDelete}
                onToggleComplete={handleToggleComplete}
                onToggleTaskMinimize={handleToggleMinimize}
                onAddDays={handleAddDays}
                onSubtasksChange={handleSubtasksChange}
                onCycleNeon={handleCycleNeon}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="bg-[#111827] border border-indigo-500/40 rounded-2xl p-3 shadow-2xl opacity-90 w-64">
                <p className="text-white text-sm font-medium">{activeTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {showModal && (
        <OrgTaskFormModal
          task={editTask ? editTask : { status: newTaskStatus }}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSaved={() => { setShowModal(false); setEditTask(null); fetchTasks(); }}
        />
      )}
    </div>
  );
}
