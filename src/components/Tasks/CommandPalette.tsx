/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  CheckCircle2,
  Columns3,
  CornerDownLeft,
  FileText,
  Grid2x2,
  Moon,
  Plus,
  Rows3,
  Search,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import {Task, ViewMode} from './types';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

interface TaskCommandPaletteProps {
  tasks: Task[];
  onClose: () => void;
  onOpenTask: (task: Task) => void;
  onNewTask: () => void;
  onSetView: (v: ViewMode) => void;
  onToggleDark: () => void;
  onToggleFocus: () => void;
  isDark: boolean;
}

export default function CommandPalette({
  tasks,
  onClose,
  onOpenTask,
  onNewTask,
  onSetView,
  onToggleDark,
  onToggleFocus,
  isDark,
}: TaskCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commands: Command[] = useMemo(
    () => [
      {id: 'new', label: 'Create a new task', icon: <Plus className="h-4 w-4" />, run: onNewTask},
      {id: 'list', label: 'Switch to List view', icon: <Rows3 className="h-4 w-4" />, run: () => onSetView('list')},
      {id: 'board', label: 'Switch to Board view', icon: <Columns3 className="h-4 w-4" />, run: () => onSetView('board')},
      {id: 'matrix', label: 'Switch to Matrix view', icon: <Grid2x2 className="h-4 w-4" />, run: () => onSetView('matrix')},
      {id: 'calendar', label: 'Switch to Calendar view', icon: <Grid2x2 className="h-4 w-4" />, run: () => onSetView('calendar')},
      {id: 'insights', label: 'Switch to Insights view', icon: <Sparkles className="h-4 w-4" />, run: () => onSetView('insights')},
      {id: 'focus', label: 'Toggle Focus mode', icon: <Target className="h-4 w-4" />, run: onToggleFocus},
      {
        id: 'theme',
        label: isDark ? 'Switch to light theme' : 'Switch to dark theme',
        icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        run: onToggleDark,
      },
    ],
    [onNewTask, onSetView, onToggleFocus, onToggleDark, isDark],
  );

  const q = query.trim().toLowerCase();
  const matchedCommands = q ? commands.filter(c => c.label.toLowerCase().includes(q)) : commands;
  const matchedTasks = q ? tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 8) : [];
  const total = matchedCommands.length + matchedTasks.length;

  const runAt = (index: number) => {
    if (index < matchedCommands.length) {
      matchedCommands[index].run();
    } else {
      const task = matchedTasks[index - matchedCommands.length];
      if (task) onOpenTask(task);
    }
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, total - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    }
    if (e.key === 'Enter' && total > 0) runAt(highlighted);
  };

  return (
    <div
      className="fixed inset-0 z-[240] flex items-start justify-center bg-slate-900/40 px-4 pt-[14vh] backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
        onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-300" />
          <input
            className="flex-1 bg-transparent text-[14px] text-slate-800 outline-none placeholder:text-slate-300 dark:text-white"
            onChange={e => {
              setQuery(e.target.value);
              setHighlighted(0);
            }}
            placeholder="Search tasks or run a command…"
            ref={inputRef}
            value={query}
          />
          <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-600 dark:bg-slate-700">
            ESC
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2 [scrollbar-width:thin]">
          {total === 0 && <p className="px-3 py-6 text-center text-[12px] text-slate-400">No matches.</p>}
          {matchedCommands.length > 0 && (
            <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">Commands</p>
          )}
          {matchedCommands.map((c, i) => (
            <button
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                i === highlighted ? 'bg-orange-50 dark:bg-orange-500/10' : ''
              }`}
              key={c.id}
              onClick={() => runAt(i)}
              onMouseEnter={() => setHighlighted(i)}>
              <span className="text-orange-500">{c.icon}</span>
              <span className="flex-1 text-[13px] font-medium text-slate-700 dark:text-slate-200">{c.label}</span>
              {i === highlighted && <CornerDownLeft className="h-3.5 w-3.5 text-orange-400" />}
            </button>
          ))}
          {matchedTasks.length > 0 && (
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">Tasks</p>
          )}
          {matchedTasks.map((t, i) => {
            const idx = matchedCommands.length + i;
            return (
              <button
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  idx === highlighted ? 'bg-orange-50 dark:bg-orange-500/10' : ''
                }`}
                key={t._id}
                onClick={() => runAt(idx)}
                onMouseEnter={() => setHighlighted(idx)}>
                {t.isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <FileText className="h-4 w-4 text-slate-300" />
                )}
                <span className="flex-1 truncate text-[13px] text-slate-700 dark:text-slate-200">{t.title}</span>
                {idx === highlighted && <CornerDownLeft className="h-3.5 w-3.5 text-orange-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
