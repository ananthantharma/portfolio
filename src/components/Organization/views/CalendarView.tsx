/* eslint-disable */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { IOrgTask } from '@/models/OrgTask';

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  colorId?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#3b82f6',
  None: '#475569',
};

function toDateStr(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

interface NewEventForm {
  summary: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<IOrgTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [calAuthError, setCalAuthError] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [today] = useState(() => new Date());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventForm, setNewEventForm] = useState<NewEventForm>({
    summary: '',
    description: '',
    date: toDateStr(today),
    startTime: '09:00',
    endTime: '10:00',
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventError, setEventError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes] = await Promise.all([
        fetch('/api/org/tasks'),
        fetch('/api/calendar/events'),
      ]);
      const tasksData = await tasksRes.json();
      const eventsData = await eventsRes.json();

      if (tasksData.success) setTasks(tasksData.data);
      if (eventsData.error === 'auth_error' || !eventsData.success) {
        setCalAuthError(true);
        setEvents([]);
      } else {
        setEvents(eventsData.events || []);
        setCalAuthError(false);
      }
    } catch {
      setCalAuthError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const dt = e.start?.dateTime || e.start?.date;
      if (!dt) continue;
      const dateStr = dt.split('T')[0];
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(e);
    }
    return map;
  }, [events]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, IOrgTask[]> = {};
    for (const t of tasks) {
      if (!t.dueDate || t.isCompleted) continue;
      const dateStr = new Date(t.dueDate).toISOString().split('T')[0];
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(t);
    }
    return map;
  }, [tasks]);

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length < totalCells) cells.push(null);

  const todayStr = toDateStr(today);
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];
  const selectedDayTasks = selectedDay ? (tasksByDate[selectedDay] || []) : [];

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEvent(true);
    setEventError('');
    try {
      const startISO = `${newEventForm.date}T${newEventForm.startTime}:00`;
      const endISO = `${newEventForm.date}T${newEventForm.endTime}:00`;
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: newEventForm.summary,
          description: newEventForm.description || undefined,
          start: { dateTime: startISO },
          end: { dateTime: endISO },
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error('Failed to create event');
      setShowNewEvent(false);
      fetchData();
    } catch (err) {
      setEventError(err instanceof Error ? err.message : 'Failed to create event');
    }
    setSavingEvent(false);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main calendar */}
      <div className="flex-1 flex flex-col p-6 overflow-auto min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h2 className="text-white font-semibold text-lg min-w-[180px] text-center">{monthName}</h2>
            <button onClick={nextMonth} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ChevronRightIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Today
            </button>
          </div>
          <button
            onClick={() => setShowNewEvent(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Event
          </button>
        </div>

        {calAuthError && (
          <div className="mb-4 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-amber-300 text-sm font-medium">Google Calendar not connected</p>
              <p className="text-amber-400/70 text-xs mt-0.5">Sign out and sign back in with calendar permissions to see your events.</p>
            </div>
          </div>
        )}

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-slate-500 text-xs font-medium py-2">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1 flex-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-white/3 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-24 rounded-xl opacity-20" />;
              }
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDay;
              const dayEvents = eventsByDate[dateStr] || [];
              const dayTasks = tasksByDate[dateStr] || [];
              const overflow = dayEvents.length + dayTasks.length - 3;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`h-24 p-1.5 rounded-xl border cursor-pointer transition-all overflow-hidden ${
                    isToday
                      ? 'bg-indigo-600/20 border-indigo-500/40'
                      : isSelected
                      ? 'bg-white/8 border-white/20'
                      : 'bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/10'
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-indigo-500 text-white' : 'text-slate-400'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div key={ev.id} className="flex items-center gap-1 overflow-hidden">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                        <span className="text-indigo-300 text-[10px] truncate leading-tight">{ev.summary || 'Event'}</span>
                      </div>
                    ))}
                    {dayTasks.slice(0, Math.max(0, 2 - dayEvents.length)).map(t => (
                      <div key={t._id} className="flex items-center gap-1 overflow-hidden">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                        <span className="text-violet-300 text-[10px] truncate leading-tight">{t.title}</span>
                      </div>
                    ))}
                    {overflow > 0 && (
                      <span className="text-slate-500 text-[10px]">+{overflow} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedDay && (
        <div className="w-80 shrink-0 border-l border-white/5 flex flex-col overflow-hidden" style={{ background: '#0c1220' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-white font-semibold text-sm">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-slate-500 hover:text-white transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedDayEvents.length === 0 && selectedDayTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CalendarDaysIcon className="w-8 h-8 text-slate-700" />
                <p className="text-slate-500 text-sm">Nothing scheduled</p>
              </div>
            )}

            {selectedDayEvents.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Calendar Events</p>
                <div className="space-y-2">
                  {selectedDayEvents.map(ev => {
                    const startDt = ev.start?.dateTime;
                    const endDt = ev.end?.dateTime;
                    return (
                      <div key={ev.id} className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3">
                        <p className="text-white text-sm font-medium">{ev.summary || 'Untitled'}</p>
                        {startDt && (
                          <p className="text-indigo-300/70 text-xs mt-0.5">
                            {formatTime(startDt)}{endDt ? ` – ${formatTime(endDt)}` : ''}
                          </p>
                        )}
                        {ev.description && (
                          <p className="text-slate-400 text-xs mt-1 leading-relaxed line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDayTasks.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Tasks Due</p>
                <div className="space-y-2">
                  {selectedDayTasks.map(task => (
                    <div key={task._id} className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-3 flex items-start gap-2">
                      <div
                        className="w-1 rounded-full self-stretch shrink-0 mt-0.5"
                        style={{ background: PRIORITY_COLORS[task.priority || 'None'] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">Due</span>
                          {task.category && (
                            <span className="text-xs text-slate-500">{task.category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Event Modal */}
      {showNewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewEvent(false)} />
          <div className="relative w-full max-w-md bg-[#111827] border border-white/8 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-white font-semibold">New Calendar Event</h2>
              <button onClick={() => setShowNewEvent(false)} className="text-slate-500 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Title</label>
                <input
                  type="text"
                  required
                  value={newEventForm.summary}
                  onChange={e => setNewEventForm(f => ({ ...f, summary: e.target.value }))}
                  placeholder="Event title..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  required
                  value={newEventForm.date}
                  onChange={e => setNewEventForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Start Time</label>
                  <input
                    type="time"
                    value={newEventForm.startTime}
                    onChange={e => setNewEventForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">End Time</label>
                  <input
                    type="time"
                    value={newEventForm.endTime}
                    onChange={e => setNewEventForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  value={newEventForm.description}
                  onChange={e => setNewEventForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>
              {eventError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{eventError}</p>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowNewEvent(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
                >
                  {savingEvent && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />}
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
