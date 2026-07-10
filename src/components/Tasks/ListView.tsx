/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {ChevronDown, ChevronRight} from 'lucide-react';
import React, {useState} from 'react';

import TaskCard from './TaskCard';
import {DUE_GROUPS, dueGroupOf, Task} from './types';

interface ListViewProps {
  tasks: Task[]; // already filtered + sorted, active tasks
  completed: Task[]; // completed tasks (shown collapsed at bottom)
  showCompleted: boolean;
  selectedId: string | null;
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onSnooze?: (task: Task) => void;
}

const GROUP_TONES: Record<string, string> = {
  overdue: 'text-rose-600',
  today: 'text-orange-600',
  tomorrow: 'text-amber-600',
  week: 'text-slate-600',
  later: 'text-slate-500',
  none: 'text-slate-400',
};

export default function ListView({
  tasks,
  completed,
  showCompleted,
  selectedId,
  onOpen,
  onToggleComplete,
  onSnooze,
}: ListViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const groups = DUE_GROUPS.map(g => ({...g, items: tasks.filter(t => dueGroupOf(t) === g.key)})).filter(
    g => g.items.length > 0,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 pb-24 pt-4">
      {groups.length === 0 && (!showCompleted || completed.length === 0) && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/50 p-12 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 text-[14px] font-semibold text-slate-600">All clear</p>
          <p className="mt-1 text-[12px] text-slate-400">Nothing matches — add a task above or relax.</p>
        </div>
      )}

      {groups.map(group => {
        const isCollapsed = collapsed.has(group.key);
        return (
          <section key={group.key}>
            <button
              className="flex w-full items-center gap-1.5 px-1 pb-2"
              onClick={() => toggleGroup(group.key)}>
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              )}
              <h3 className={`text-[12px] font-bold uppercase tracking-wider ${GROUP_TONES[group.key]}`}>
                {group.label}
              </h3>
              <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                {group.items.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className="space-y-2">
                {group.items.map(task => (
                  <TaskCard
                    key={task._id}
                    onOpen={onOpen}
                    onSnooze={onSnooze}
                    onToggleComplete={onToggleComplete}
                    selected={task._id === selectedId}
                    task={task}
                  />
                ))}
              </div>
            )}
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
            <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
              {completed.length}
            </span>
          </button>
          {!collapsed.has('completed') && (
            <div className="space-y-2">
              {completed.map(task => (
                <TaskCard
                  key={task._id}
                  onOpen={onOpen}
                  onToggleComplete={onToggleComplete}
                  selected={task._id === selectedId}
                  task={task}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
