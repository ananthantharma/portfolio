/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  AlarmClockPlus,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ListChecks,
  Lock,
  Paperclip,
  Repeat,
  StickyNote,
  Timer,
} from 'lucide-react';
import React from 'react';

import {
  colorForLabel,
  daysUntil,
  formatDue,
  formatMinutes,
  isBlocked,
  isPinned,
  NEON_COLORS,
  PRIORITY_META,
  staleDays,
  subtaskProgress,
  Task,
} from './types';

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  selected: boolean;
  allTasks?: Task[];
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onSnooze?: (task: Task) => void;
  onToggleMinimize?: (task: Task) => void;
  onContextMenu?: (task: Task, e: React.MouseEvent) => void;
  bulkMode?: boolean;
  bulkSelected?: boolean;
  onBulkToggle?: (task: Task) => void;
}

export default function TaskCard({
  task,
  compact,
  selected,
  allTasks,
  onOpen,
  onToggleComplete,
  onSnooze,
  onToggleMinimize,
  onContextMenu,
  bulkMode,
  bulkSelected,
  onBulkToggle,
}: TaskCardProps) {
  const done = task.isCompleted;
  const d = daysUntil(task.dueDate);
  const overdue = !done && d !== null && d < 0;
  const dueToday = !done && d === 0;
  const {done: subDone, total: subTotal} = subtaskProgress(task);
  const prio = PRIORITY_META[task.priority];
  const pinned = isPinned(task);
  const neon = NEON_COLORS.find(n => n.key === task.neonColor);
  const blocked = allTasks ? isBlocked(task, allTasks) : false;
  const stale = !done && staleDays(task) >= 14;

  const handleClick = () => {
    if (bulkMode && onBulkToggle) onBulkToggle(task);
    else onOpen(task);
  };

  if (task.isMinimized && !compact) {
    return (
      <div
        className={`group flex items-center gap-2 rounded-xl border bg-white px-3 py-2 transition-all dark:bg-slate-800 ${
          selected ? 'border-orange-400' : 'border-slate-200/80 hover:border-slate-300 dark:border-slate-700'
        }`}
        onClick={handleClick}
        onContextMenu={e => onContextMenu?.(task, e)}>
        <button
          className="shrink-0 text-slate-300 hover:text-emerald-500"
          onClick={e => {
            e.stopPropagation();
            onToggleComplete(task);
          }}>
          {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4" />}
        </button>
        <p className={`min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-700 dark:text-slate-200 ${done ? 'line-through opacity-50' : ''}`}>
          {task.title}
        </p>
        {task.dueDate && (
          <span className={`shrink-0 text-[10.5px] ${overdue ? 'text-rose-500' : 'text-slate-400'}`}>{formatDue(task.dueDate)}</span>
        )}
        {onToggleMinimize && (
          <button
            className="shrink-0 text-slate-300 opacity-0 hover:text-slate-600 group-hover:opacity-100"
            onClick={e => {
              e.stopPropagation();
              onToggleMinimize(task);
            }}
            title="Expand card">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group relative cursor-pointer rounded-2xl border bg-white transition-all dark:bg-slate-800 ${
        selected
          ? 'border-orange-400 shadow-[0_4px_20px_-6px_rgba(234,88,12,0.25)]'
          : 'border-slate-200/80 shadow-sm hover:-translate-y-px hover:border-slate-300 hover:shadow-md dark:border-slate-700'
      } ${done ? 'opacity-60' : ''} ${compact ? 'p-3' : 'p-3.5'} ${
        pinned && neon ? `ring-2 ${neon.ring}` : ''
      }`}
      onClick={handleClick}
      onContextMenu={e => onContextMenu?.(task, e)}>
      {/* Priority spine */}
      <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full ${prio.dot} ${task.priority === 'None' ? 'opacity-0' : ''}`} />

      <div className="flex items-start gap-2.5 pl-1.5">
        {bulkMode ? (
          <button
            className="mt-0.5 shrink-0"
            onClick={e => {
              e.stopPropagation();
              onBulkToggle?.(task);
            }}>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                bulkSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
              }`}>
              {bulkSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
            </div>
          </button>
        ) : (
          <button
            className="mt-0.5 shrink-0 text-slate-300 transition-colors hover:text-emerald-500"
            onClick={e => {
              e.stopPropagation();
              onToggleComplete(task);
            }}
            title={done ? 'Mark as not done' : 'Mark as done'}>
            {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5" />}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {stale && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title="No activity in 2+ weeks" />}
            <p className={`text-[13.5px] font-semibold leading-snug text-slate-800 dark:text-slate-100 ${done ? 'line-through decoration-slate-300' : ''}`}>
              {task.title}
            </p>
            {task.recurrence?.freq && task.recurrence.freq !== 'none' && (
              <span title={`Repeats ${task.recurrence.freq}`}>
                <Repeat className="h-3 w-3 shrink-0 text-violet-400" />
              </span>
            )}
            {blocked && (
              <span title="Blocked by another task">
                <Lock className="h-3 w-3 shrink-0 text-slate-400" />
              </span>
            )}
          </div>

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
                <Timer className="h-3 w-3" />
                {formatMinutes(task.estimatedTime)}
                {(task.actualMinutes || 0) > 0 && ` (${formatMinutes(task.actualMinutes)} logged)`}
              </span>
            ) : null}
            {task.notes && <StickyNote className="h-3 w-3" />}
            {(task.attachments?.length || 0) > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> {task.attachments!.length}
              </span>
            )}
            {task.category && (
              <span
                className="rounded-md px-1.5 py-0.5 ring-1 ring-inset"
                style={{
                  backgroundColor: `${colorForLabel(task.category)}14`,
                  color: colorForLabel(task.category),
                  borderColor: `${colorForLabel(task.category)}33`,
                }}>
                {task.category}
              </span>
            )}
            {(task.tags || []).slice(0, compact ? 2 : 4).map(tag => (
              <span
                className="rounded-md px-1.5 py-0.5"
                key={tag}
                style={{backgroundColor: `${colorForLabel(tag)}14`, color: colorForLabel(tag)}}>
                #{tag}
              </span>
            ))}
          </div>

          {/* Subtask progress bar */}
          {subTotal > 0 && !compact && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={`h-full rounded-full transition-all ${subDone === subTotal ? 'bg-emerald-400' : 'bg-orange-400'}`}
                style={{width: `${(subDone / subTotal) * 100}%`}}
              />
            </div>
          )}
        </div>

        {/* Hover actions */}
        <div className="absolute right-2 top-2 hidden items-center gap-0.5 group-hover:flex">
          {onToggleMinimize && (
            <button
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-600 dark:border-slate-600 dark:bg-slate-700"
              onClick={e => {
                e.stopPropagation();
                onToggleMinimize(task);
              }}
              title="Collapse to one line">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          )}
          {onSnooze && !done && (
            <button
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-slate-600 dark:bg-slate-700"
              onClick={e => {
                e.stopPropagation();
                onSnooze(task);
              }}
              title="Push to tomorrow">
              <AlarmClockPlus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
