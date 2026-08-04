/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {DndContext, DragEndEvent, PointerSensor, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {ChevronDown, ChevronRight, GripVertical, Pin} from 'lucide-react';
import React, {useState} from 'react';

import TaskCard from './TaskCard';
import {DUE_GROUPS, dueGroupOf, isPinned, SortMode, Task} from './types';

interface ListViewProps {
  tasks: Task[]; // already filtered + sorted, active tasks
  completed: Task[]; // completed tasks (shown collapsed at bottom)
  showCompleted: boolean;
  selectedId: string | null;
  sortMode: SortMode;
  bulkMode: boolean;
  bulkSelected: Set<string>;
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleMinimize: (task: Task) => void;
  onContextMenu: (task: Task, e: React.MouseEvent) => void;
  onBulkToggle: (task: Task) => void;
  onReorderManual: (newOrder: Task[]) => void;
}

const GROUP_TONES: Record<string, string> = {
  overdue: 'text-rose-600',
  today: 'text-orange-600',
  tomorrow: 'text-amber-600',
  week: 'text-slate-600',
  later: 'text-slate-500',
  none: 'text-slate-400',
};

function SortableRow({task, children}: {task: Task; children: React.ReactNode}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: task._id});
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div className="flex items-center gap-1.5" ref={setNodeRef} style={style}>
      <button
        className="shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        title="Drag to reorder"
        {...attributes}
        {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function ListView({
  tasks,
  completed,
  showCompleted,
  selectedId,
  sortMode,
  bulkMode,
  bulkSelected,
  onOpen,
  onToggleComplete,
  onToggleMinimize,
  onContextMenu,
  onBulkToggle,
  onReorderManual,
}: ListViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 6}}));
  const manualMode = sortMode === 'manual' && !bulkMode;

  const toggleGroup = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const pinned = tasks.filter(isPinned);

  const card = (task: Task) => (
    <TaskCard
      bulkMode={bulkMode}
      bulkSelected={bulkSelected.has(task._id)}
      key={task._id}
      onBulkToggle={onBulkToggle}
      onContextMenu={onContextMenu}
      onOpen={onOpen}
      onToggleComplete={onToggleComplete}
      onToggleMinimize={onToggleMinimize}
      selected={task._id === selectedId}
      task={task}
    />
  );

  if (tasks.length === 0 && (!showCompleted || completed.length === 0)) {
    return (
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-4">
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 text-[14px] font-semibold text-slate-600 dark:text-slate-300">All clear</p>
          <p className="mt-1 text-[12px] text-slate-400">Nothing matches — add a task above or relax.</p>
        </div>
      </div>
    );
  }

  // Manual mode: one flat, freely-orderable list — due-date buckets and manual drag order
  // don't compose cleanly (a bucket's items aren't necessarily contiguous in the order field).
  if (manualMode) {
    const onDragEnd = (e: DragEndEvent) => {
      const {active, over} = e;
      if (!over || active.id === over.id) return;
      const oldIndex = tasks.findIndex(t => t._id === active.id);
      const newIndex = tasks.findIndex(t => t._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onReorderManual(arrayMove(tasks, oldIndex, newIndex));
    };
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-6 pb-24 pt-4">
        {pinned.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 px-1 pb-2">
              <Pin className="h-3.5 w-3.5 rotate-45 text-cyan-500" />
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Pinned</h3>
            </div>
            <div className="space-y-2">{pinned.map(card)}</div>
          </section>
        )}
        <section>
          <DndContext onDragEnd={onDragEnd} sensors={sensors}>
            <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {tasks.map(task => (
                  <SortableRow key={task._id} task={task}>
                    {card(task)}
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
        {showCompleted && completed.length > 0 && (
          <section>
            <h3 className="mb-2 px-1 text-[12px] font-bold uppercase tracking-wider text-emerald-600">Completed</h3>
            <div className="space-y-2">{completed.map(card)}</div>
          </section>
        )}
      </div>
    );
  }

  const groups = DUE_GROUPS.map(g => ({...g, items: tasks.filter(t => dueGroupOf(t) === g.key)})).filter(
    g => g.items.length > 0,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 pb-24 pt-4">
      {pinned.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 px-1 pb-2">
            <Pin className="h-3.5 w-3.5 rotate-45 text-cyan-500" />
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Pinned</h3>
          </div>
          <div className="space-y-2">{pinned.map(card)}</div>
        </section>
      )}

      {groups.map(group => {
        const isCollapsed = collapsed.has(group.key);
        return (
          <section key={group.key}>
            <button className="flex w-full items-center gap-1.5 px-1 pb-2" onClick={() => toggleGroup(group.key)}>
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              )}
              <h3 className={`text-[12px] font-bold uppercase tracking-wider ${GROUP_TONES[group.key]}`}>{group.label}</h3>
              <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700">
                {group.items.length}
              </span>
            </button>
            {!isCollapsed && <div className="space-y-2">{group.items.map(card)}</div>}
          </section>
        );
      })}

      {showCompleted && completed.length > 0 && (
        <section>
          <button className="flex w-full items-center gap-1.5 px-1 pb-2" onClick={() => toggleGroup('completed')}>
            {collapsed.has('completed') ? (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-emerald-600">Completed</h3>
            <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700">
              {completed.length}
            </span>
          </button>
          {!collapsed.has('completed') && <div className="space-y-2">{completed.map(card)}</div>}
        </section>
      )}
    </div>
  );
}
