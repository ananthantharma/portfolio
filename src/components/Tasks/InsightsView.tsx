/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {CheckCircle2, Flame, ListTodo, TrendingUp} from 'lucide-react';
import React, {useMemo} from 'react';

import {colorForLabel, completionStreak, PRIORITY_META, startOfDay, Task} from './types';

interface InsightsViewProps {
  tasks: Task[];
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function InsightsView({tasks}: InsightsViewProps) {
  const streak = useMemo(() => completionStreak(tasks), [tasks]);

  const last14 = useMemo(() => {
    const days: {date: Date; count: number}[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = startOfDay(new Date());
      d.setDate(d.getDate() - i);
      const count = tasks.filter(t => t.isCompleted && startOfDay(new Date(t.updatedAt)).getTime() === d.getTime()).length;
      days.push({date: d, count});
    }
    return days;
  }, [tasks]);

  const maxDay = Math.max(1, ...last14.map(d => d.count));

  const byPriority = useMemo(() => {
    const counts: Record<Task['priority'], number> = {High: 0, Medium: 0, Low: 0, None: 0};
    tasks.forEach(t => counts[t.priority]++);
    return counts;
  }, [tasks]);

  const byCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      const c = t.category || 'Uncategorized';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [tasks]);

  const total = tasks.length;
  const done = tasks.filter(t => t.isCompleted).length;
  const completionRate = total ? Math.round((done / total) * 100) : 0;
  const overdue = tasks.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const maxCategory = Math.max(1, ...byCategory.map(([, n]) => n));

  const statCard = (icon: React.ReactNode, label: string, value: string | number, tone: string) => (
    <div className={`flex items-center gap-3 rounded-2xl p-4 ${tone}`}>
      {icon}
      <div>
        <p className="text-2xl font-black leading-none">{value}</p>
        <p className="mt-1 text-[11px] font-medium opacity-70">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 pb-10 pt-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCard(
          <Flame className="h-6 w-6 text-orange-500" />,
          'Day streak',
          streak,
          'bg-orange-50 text-orange-800 dark:bg-orange-500/10 dark:text-orange-300',
        )}
        {statCard(
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
          'Completion rate',
          `${completionRate}%`,
          'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300',
        )}
        {statCard(
          <ListTodo className="h-6 w-6 text-indigo-500" />,
          'Total tasks',
          total,
          'bg-indigo-50 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300',
        )}
        {statCard(
          <TrendingUp className="h-6 w-6 text-rose-500" />,
          'Overdue now',
          overdue,
          'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300',
        )}
      </div>

      {/* Completion trend */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-[12px] font-bold uppercase tracking-wider text-slate-400">
          Completed — last 14 days
        </h3>
        <div className="flex items-end gap-1.5" style={{height: 110}}>
          {last14.map((d, i) => (
            <div className="flex flex-1 flex-col items-center gap-1" key={i}>
              <div
                aria-label={`${d.count} completed on ${d.date.toLocaleDateString()}`}
                className="w-full rounded-t-md bg-gradient-to-t from-orange-500 to-rose-400"
                role="img"
                style={{height: `${Math.max(3, (d.count / maxDay) * 88)}px`}}
                title={`${d.date.toLocaleDateString()}: ${d.count} completed`}
              />
              <span className="text-[9px] font-semibold text-slate-300">{DAY_LABELS[d.date.getDay()]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Priority breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-slate-400">By priority</h3>
          <div className="space-y-2.5">
            {(['High', 'Medium', 'Low', 'None'] as const).map(p => {
              const count = byPriority[p];
              const pct = total ? (count / total) * 100 : 0;
              return (
                <div className="flex items-center gap-2" key={p}>
                  <span className="w-16 shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {PRIORITY_META[p].label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div className={`h-full rounded-full ${PRIORITY_META[p].dot}`} style={{width: `${pct}%`}} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-slate-400">By category</h3>
          {byCategory.length === 0 ? (
            <p className="text-[12px] text-slate-400">No categories yet.</p>
          ) : (
            <div className="space-y-2.5">
              {byCategory.map(([cat, count]) => (
                <div className="flex items-center gap-2" key={cat}>
                  <span className="w-20 shrink-0 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {cat}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full"
                      style={{width: `${(count / maxCategory) * 100}%`, backgroundColor: colorForLabel(cat)}}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
