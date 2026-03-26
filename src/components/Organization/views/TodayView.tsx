/* eslint-disable */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  CheckIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import OrgTaskFormModal from '../modals/OrgTaskFormModal';
import { IOrgTask } from '@/models/OrgTask';
import { IOrgHabit } from '@/models/OrgHabit';

interface CalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  colorId?: string;
}

interface Props {
  onNewTask: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#3b82f6',
  None: '#475569',
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function isToday(dateStr: string) {
  return dateStr.split('T')[0] === getTodayStr();
}

function isDueToday(date: Date | string) {
  const d = new Date(date);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return d <= today;
}

export default function TodayView({ onNewTask }: Props) {
  const [tasks, setTasks] = useState<IOrgTask[]>([]);
  const [habits, setHabits] = useState<IOrgHabit[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingHabits, setLoadingHabits] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [calendarError, setCalendarError] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [editTask, setEditTask] = useState<Partial<IOrgTask> | null>(null);
  const [togglingHabit, setTogglingHabit] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch('/api/org/tasks');
      const data = await res.json();
      if (data.success) setTasks(data.data);
    } catch {}
    setLoadingTasks(false);
  }, []);

  const fetchHabits = useCallback(async () => {
    setLoadingHabits(true);
    try {
      const res = await fetch('/api/org/habits');
      const data = await res.json();
      if (data.success) setHabits(data.data);
    } catch {}
    setLoadingHabits(false);
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/calendar/events');
      const data = await res.json();
      if (data.error === 'auth_error' || !data.success) {
        setCalendarError(true);
        setEvents([]);
      } else {
        setEvents(data.events || []);
        setCalendarError(false);
      }
    } catch {
      setCalendarError(true);
    }
    setLoadingEvents(false);
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchHabits();
    fetchEvents();
  }, [fetchTasks, fetchHabits, fetchEvents]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = quickTitle.trim();
    if (!t) return;
    try {
      await fetch('/api/org/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, dueDate: new Date().toISOString() }),
      });
      setQuickTitle('');
      fetchTasks();
    } catch {}
  };

  const handleCompleteTask = async (task: IOrgTask) => {
    const updated = !task.isCompleted;
    setTasks(prev => prev.map(t => t._id === task._id ? { ...t, isCompleted: updated } : t));
    try {
      await fetch(`/api/org/tasks/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: updated, status: updated ? 'done' : task.status }),
      });
    } catch {
      fetchTasks();
    }
  };

  const handleToggleHabit = async (habit: IOrgHabit) => {
    const todayStr = getTodayStr();
    const existingCompletion = habit.completions?.find(c => c.date === todayStr);
    const nowCompleted = !(existingCompletion?.completed);
    setTogglingHabit(habit._id);
    try {
      const res = await fetch(`/api/org/habits/${habit._id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, completed: nowCompleted }),
      });
      const data = await res.json();
      if (data.success) {
        setHabits(prev => prev.map(h => h._id === habit._id ? data.data : h));
      }
    } catch {}
    setTogglingHabit(null);
  };

  const todayEvents = events.filter(e => {
    const dt = e.start?.dateTime || e.start?.date;
    if (!dt) return false;
    return isToday(dt);
  });

  const dueTodayTasks = tasks
    .filter(t => !t.isCompleted && isDueToday(t.dueDate))
    .slice(0, 8);

  const todayStr = getTodayStr();
  const habitsCompletedToday = habits.filter(h =>
    h.completions?.some(c => c.date === todayStr && c.completed)
  ).length;

  const activeGoals = 0; // fetching goals separately would be ideal, keep 0 for now
  const activeTasks = tasks.filter(t => !t.isCompleted).length;

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Quick add bar */}
      <form onSubmit={handleQuickAdd} className="flex gap-3">
        <input
          type="text"
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          placeholder="Quick add a task for today..."
          className="flex-1 bg-[#111827] border border-white/8 rounded-2xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/40 transition-colors"
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Add
        </button>
      </form>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Date hero + stats */}
        <div className="space-y-4">
          <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
            <p className="text-slate-500 text-sm">{dateLabel}</p>
            <h2 className="text-white text-2xl font-bold mt-1">{getGreeting()} 👋</h2>
            <p className="text-slate-400 text-sm mt-1">Here's your overview for today.</p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Active Tasks</p>
              <p className="text-white text-2xl font-bold">{activeTasks}</p>
            </div>
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Due Today</p>
              <p className="text-white text-2xl font-bold">{dueTodayTasks.length}</p>
            </div>
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Habits Done</p>
              <p className="text-white text-2xl font-bold">
                {habitsCompletedToday}
                <span className="text-slate-500 text-base font-normal">/{habits.length}</span>
              </p>
            </div>
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Events</p>
              <p className="text-white text-2xl font-bold">{todayEvents.length}</p>
            </div>
          </div>
        </div>

        {/* Center: Today's schedule */}
        <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDaysIcon className="w-4 h-4 text-indigo-400" />
            <h3 className="text-white font-semibold text-sm">Today's Schedule</h3>
          </div>

          {calendarError && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <ExclamationTriangleIcon className="w-8 h-8 text-amber-400/60" />
              <p className="text-slate-400 text-sm text-center">
                Connect Google Calendar to see events.
                <br />
                <span className="text-slate-500 text-xs">Re-login with calendar permissions.</span>
              </p>
            </div>
          )}

          {loadingEvents && !calendarError && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-white/10 mt-2 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-2.5 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingEvents && !calendarError && todayEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CalendarDaysIcon className="w-8 h-8 text-slate-600" />
              <p className="text-slate-500 text-sm">No events today</p>
            </div>
          )}

          {!loadingEvents && !calendarError && todayEvents.length > 0 && (
            <div className="space-y-3">
              {todayEvents.map(event => {
                const startDt = event.start?.dateTime || event.start?.date || '';
                const endDt = event.end?.dateTime || event.end?.date || '';
                const isAllDay = !event.start?.dateTime;
                const startTime = isAllDay ? 'All day' : formatTime(startDt);
                const endTime = !isAllDay && endDt ? formatTime(endDt) : '';
                return (
                  <div key={event.id} className="flex gap-3 items-start group">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{event.summary || 'Untitled'}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {startTime}{endTime ? ` – ${endTime}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Due today & overdue */}
        <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" />
            <h3 className="text-white font-semibold text-sm">Due Today & Overdue</h3>
          </div>

          {loadingTasks && (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!loadingTasks && dueTodayTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircleIcon className="w-8 h-8 text-emerald-500/50" />
              <p className="text-slate-500 text-sm">All caught up!</p>
            </div>
          )}

          {!loadingTasks && dueTodayTasks.map(task => (
            <div key={task._id} className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0 group">
              <div
                className="w-1 rounded-full self-stretch shrink-0"
                style={{ background: PRIORITY_COLORS[task.priority || 'None'] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 text-sm leading-snug truncate">{task.title}</p>
                {task.category && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs bg-white/5 text-slate-500">
                    {task.category}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleCompleteTask(task)}
                className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center shrink-0 hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors mt-0.5"
              >
                {task.isCompleted && <CheckIcon className="w-3 h-3 text-emerald-400" />}
              </button>
            </div>
          ))}

          {!loadingTasks && dueTodayTasks.length > 0 && (
            <button
              onClick={onNewTask}
              className="mt-3 w-full text-center text-xs text-slate-500 hover:text-indigo-400 transition-colors py-1"
            >
              + Add task
            </button>
          )}
        </div>
      </div>

      {/* Today's Habits */}
      <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">⚡</span>
          <h3 className="text-white font-semibold text-sm">Today's Habits</h3>
        </div>

        {loadingHabits && (
          <div className="flex gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-36 h-24 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!loadingHabits && habits.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">No habits tracked yet. Add some in the Habits view.</p>
        )}

        {!loadingHabits && habits.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {habits.map(habit => {
              const doneToday = habit.completions?.some(c => c.date === todayStr && c.completed);
              const isToggling = togglingHabit === habit._id;
              return (
                <div
                  key={habit._id}
                  className="shrink-0 w-36 bg-white/3 border border-white/8 rounded-2xl p-4 flex flex-col items-center gap-2"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: habit.color + '22' }}
                  >
                    {habit.icon}
                  </div>
                  <p className="text-white text-xs font-medium text-center leading-snug line-clamp-2">{habit.title}</p>
                  {habit.streak > 0 && (
                    <p className="text-amber-400 text-xs">🔥 {habit.streak}</p>
                  )}
                  <button
                    onClick={() => handleToggleHabit(habit)}
                    disabled={isToggling}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                      doneToday
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                    }`}
                  >
                    {isToggling ? (
                      <span className="w-3 h-3 rounded-full border border-white/20 border-t-white animate-spin" />
                    ) : (
                      <CheckIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editTask && (
        <OrgTaskFormModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSaved={() => { setEditTask(null); fetchTasks(); }}
        />
      )}
    </div>
  );
}
