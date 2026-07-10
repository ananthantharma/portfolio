/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import React from 'react';

import TaskCard from './TaskCard';
import {daysUntil, Task} from './types';

interface MatrixViewProps {
  tasks: Task[]; // filtered, active only
  selectedId: string | null;
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onSnooze?: (task: Task) => void;
}

// Eisenhower classification: urgent = overdue or due within 2 days; important = High/Medium priority
function quadrantOf(task: Task): 'do' | 'schedule' | 'delegate' | 'someday' {
  const d = daysUntil(task.dueDate);
  const urgent = d !== null && d <= 2;
  const important = task.priority === 'High' || task.priority === 'Medium';
  if (urgent && important) return 'do';
  if (!urgent && important) return 'schedule';
  if (urgent && !important) return 'delegate';
  return 'someday';
}

const QUADRANTS: {key: ReturnType<typeof quadrantOf>; title: string; hint: string; tone: string}[] = [
  {key: 'do', title: 'Do first', hint: 'urgent + important', tone: 'border-rose-200 bg-rose-50/60 text-rose-700'},
  {key: 'schedule', title: 'Schedule', hint: 'important, not urgent', tone: 'border-orange-200 bg-orange-50/60 text-orange-700'},
  {key: 'delegate', title: 'Delegate', hint: 'urgent, not important', tone: 'border-sky-200 bg-sky-50/60 text-sky-700'},
  {key: 'someday', title: 'Someday', hint: 'neither', tone: 'border-slate-200 bg-slate-50/80 text-slate-500'},
];

export default function MatrixView({tasks, selectedId, onOpen, onToggleComplete, onSnooze}: MatrixViewProps) {
  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto px-6 pb-6 pt-4 md:grid-cols-2 md:grid-rows-2 md:overflow-hidden">
      {QUADRANTS.map(q => {
        const items = tasks.filter(t => quadrantOf(t) === q.key);
        return (
          <div className={`flex min-h-[220px] flex-col rounded-3xl border ${q.tone}`} key={q.key}>
            <div className="flex items-baseline gap-2 px-4 pb-1 pt-3.5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider">{q.title}</h3>
              <span className="text-[10.5px] font-medium opacity-60">{q.hint}</span>
              <span className="ml-auto rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold shadow-sm">
                {items.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]">
              {items.map(task => (
                <TaskCard
                  compact
                  key={task._id}
                  onOpen={onOpen}
                  onSnooze={onSnooze}
                  onToggleComplete={onToggleComplete}
                  selected={task._id === selectedId}
                  task={task}
                />
              ))}
              {items.length === 0 && (
                <p className="pt-6 text-center text-[11px] italic opacity-50">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
