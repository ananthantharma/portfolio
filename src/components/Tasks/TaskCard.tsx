/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {CalendarDays, CheckCircle2, Circle, ListChecks, Paperclip, StickyNote, Timer} from 'lucide-react';
import React from 'react';

import {daysUntil, formatDue, formatMinutes, PRIORITY_META, subtaskProgress, Task} from './types';

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  selected: boolean;
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

export default function TaskCard({task, compact, selected, onOpen, onToggleComplete}: TaskCardProps) {
  const done = task.isCompleted;
  const d = daysUntil(task.dueDate);
  const overdue = !done && d !== null && d < 0;
  const dueToday = !done && d === 0;
  const {done: subDone, total: subTotal} = subtaskProgress(task);
  const prio = PRIORITY_META[task.priority];

  return (
    <div
      className={`group relative cursor-pointer rounded-2xl border bg-white transition-all ${
        selected
          ? 'border-orange-400 shadow-[0_4px_20px_-6px_rgba(234,88,12,0.25)]'
          : 'border-slate-200/80 shadow-sm hover:-translate-y-px hover:border-slate-300 hover:shadow-md'
      } ${done ? 'opacity-60' : ''} ${compact ? 'p-3' : 'p-3.5'}`}
      onClick={() => onOpen(task)}>
      {/* Priority spine */}
      <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full ${prio.dot} ${task.priority === 'None' ? 'opacity-0' : ''}`} />

      <div className="flex items-start gap-2.5 pl-1.5">
        <button
          className="mt-0.5 shrink-0 text-slate-300 transition-colors hover:text-emerald-500"
          onClick={e => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          title={done ? 'Mark as not done' : 'Mark as done'}>
          {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className={`text-[13.5px] font-semibold leading-snug text-slate-800 ${done ? 'line-through decoration-slate-300' : ''}`}>
            {task.title}
          </p>

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-slate-400">
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 ${
                  overdue ? 'text-rose-600' : dueToday ? 'text-orange-600' : ''
                }`}>
                <CalendarDays className="h-3 w-3" /> {formatDue(task.dueDate)}
              </span>
            )}
            {subTotal > 0 && (
              <span className={`flex items-center gap-1 ${subDone === subTotal ? 'text-emerald-600' : ''}`}>
                <ListChecks className="h-3 w-3" /> {subDone}/{subTotal}
              </span>
            )}
            {task.estimatedTime ? (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" /> {formatMinutes(task.estimatedTime)}
              </span>
            ) : null}
            {task.notes && <StickyNote className="h-3 w-3" />}
            {(task.attachments?.length || 0) > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> {task.attachments!.length}
              </span>
            )}
            {task.category && (
              <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-600 ring-1 ring-inset ring-indigo-100">
                {task.category}
              </span>
            )}
            {(task.tags || []).slice(0, compact ? 2 : 4).map(tag => (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500" key={tag}>
                #{tag}
              </span>
            ))}
          </div>

          {/* Subtask progress bar */}
          {subTotal > 0 && !compact && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${subDone === subTotal ? 'bg-emerald-400' : 'bg-orange-400'}`}
                style={{width: `${(subDone / subTotal) * 100}%`}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
