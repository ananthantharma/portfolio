/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {ChevronLeft, ChevronRight} from 'lucide-react';
import React, {useMemo, useState} from 'react';

import {PRIORITY_META, startOfDay, Task} from './types';

interface CalendarViewProps {
  tasks: Task[]; // active + completed, unfiltered by date
  selectedId: string | null;
  onOpen: (task: Task) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarView({tasks, selectedId, onOpen}: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  const withDue = useMemo(() => tasks.filter(t => t.dueDate), [tasks]);

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({length: 42}, (_, i) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      return date;
    });
  }, [cursor]);

  const today = startOfDay(new Date());
  const monthLabel = cursor.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});

  return (
    <div className="mx-auto max-w-5xl px-6 pb-8 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">{monthLabel}</h2>
        <div className="ml-auto flex items-center gap-1">
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => setCursor(startOfDay(new Date()))}>
            Today
          </button>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700">
        {WEEKDAY_LABELS.map(w => (
          <div
            className="bg-slate-50 py-2 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            key={w}>
            {w}
          </div>
        ))}
        {days.map((date, i) => {
          const inMonth = date.getMonth() === cursor.getMonth();
          const isToday = sameDay(date, today);
          const dayTasks = withDue.filter(t => sameDay(new Date(t.dueDate as string), date));
          return (
            <div
              className={`min-h-[92px] bg-white p-1.5 dark:bg-slate-800 ${inMonth ? '' : 'opacity-40'}`}
              key={i}>
              <p
                className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10.5px] font-bold ${
                  isToday ? 'bg-orange-500 text-white' : 'text-slate-400 dark:text-slate-500'
                }`}>
                {date.getDate()}
              </p>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(t => (
                  <button
                    className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] font-medium transition-colors ${
                      t._id === selectedId ? 'bg-orange-100 text-orange-800' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    } ${t.isCompleted ? 'text-slate-300 line-through dark:text-slate-600' : 'text-slate-600 dark:text-slate-300'}`}
                    key={t._id}
                    onClick={() => onOpen(t)}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_META[t.priority].dot}`} />
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="px-1 text-[9.5px] font-semibold text-slate-400">+{dayTasks.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
