'use client';

import React, {useState, useEffect, useCallback} from 'react';
import axios from 'axios';
import {ChevronLeft, ChevronRight, Plus, CalendarDays, List, X, AlertCircle, Loader2, ExternalLink} from 'lucide-react';

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {dateTime?: string; date?: string};
  end?: {dateTime?: string; date?: string};
  htmlLink?: string;
}

interface OrgCalendarViewProps {
  accessToken?: string;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(dt?: string): string {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
}

function formatFullDate(dt?: string, date?: string): string {
  const raw = dt || date;
  if (!raw) return '';
  const d = new Date(raw);
  if (date && !dt) {
    return d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
  }
  return d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'}) + ' at ' + formatTime(dt);
}

function getEventDateKey(event: CalendarEvent): string {
  const raw = event.start?.date || event.start?.dateTime;
  if (!raw) return '';
  const d = new Date(raw);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface NewEventForm {
  summary: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

const EMPTY_FORM: NewEventForm = {
  summary: '',
  description: '',
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '10:00',
};

export default function OrgCalendarView({accessToken}: OrgCalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [calError, setCalError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState<NewEventForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverPos, setPopoverPos] = useState({x: 0, y: 0});

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setCalError(null);
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);
    try {
      const res = await axios.get(
        `/api/calendar?timeMin=${firstDay.toISOString()}&timeMax=${lastDay.toISOString()}&maxResults=100`,
      );
      if (res.data.success) {
        setEvents(res.data.data);
      } else {
        setCalError(res.data.error || 'Failed to fetch events');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to connect to calendar';
      setCalError(msg);
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else setViewMonth(m => m + 1);
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const createEvent = async () => {
    if (!newForm.summary.trim() || !newForm.startDate || !newForm.endDate) return;
    setCreating(true);
    try {
      const startDT = `${newForm.startDate}T${newForm.startTime}:00`;
      const endDT = `${newForm.endDate}T${newForm.endTime}:00`;
      const res = await axios.post('/api/calendar', {
        summary: newForm.summary,
        description: newForm.description,
        start: {dateTime: new Date(startDT).toISOString()},
        end: {dateTime: new Date(endDT).toISOString()},
      });
      if (res.data.success) {
        setShowNewModal(false);
        setNewForm(EMPTY_FORM);
        fetchEvents();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  // Build calendar grid
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startDayOfWeek = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDayOfWeek).fill(null),
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
  ];
  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay: Record<string, CalendarEvent[]> = {};
  events.forEach(ev => {
    const key = getEventDateKey(ev);
    if (key) {
      if (!eventsByDay[key]) eventsByDay[key] = [];
      eventsByDay[key].push(ev);
    }
  });

  // Group events by date for list view
  const groupedEvents = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    const key = getEventDateKey(ev);
    if (key) {
      if (!acc[key]) acc[key] = [];
      acc[key].push(ev);
    }
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedEvents).sort();

  const handleEventClick = (ev: CalendarEvent, e: React.MouseEvent) => {
    setSelectedEvent(ev);
    setPopoverPos({x: e.clientX, y: e.clientY});
  };

  if (!accessToken && calError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm p-8">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-800 font-semibold mb-2">Connect Google Calendar</h3>
          <p className="text-slate-500 text-sm mb-4">
            To use Calendar, sign out and sign back in to grant calendar permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold text-slate-900 w-40 text-center">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors">
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {calError && (
            <div className="flex items-center gap-1.5 text-amber-600 text-xs">
              <AlertCircle className="w-4 h-4" />
              {calError.includes('401') || calError.includes('access token')
                ? 'Re-sign in to enable calendar'
                : 'Calendar error'}
            </div>
          )}
          {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}

          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'month' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}>
              <CalendarDays className="w-3.5 h-3.5" /> Month
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>

          <button
            onClick={() => {
              const d = new Date();
              const pad = (n: number) => String(n).padStart(2, '0');
              const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
              setNewForm({...EMPTY_FORM, startDate: dateStr, endDate: dateStr});
              setShowNewModal(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
            <Plus className="w-3.5 h-3.5" />
            New Event
          </button>
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-auto">
        {calError && (
          <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Calendar not connected</p>
              <p className="text-xs text-amber-600 mt-1">
                Sign out and sign back in to grant Google Calendar access. The error was: {calError}
              </p>
            </div>
          </div>
        )}

        {viewMode === 'month' ? (
          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">
                  {d}
                </div>
              ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7 border-l border-t border-slate-200">
              {cells.map((day, idx) => {
                const isToday =
                  day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                const key = day
                  ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : null;
                const dayEvents = key ? eventsByDay[key] || [] : [];

                return (
                  <div key={idx} className="border-r border-b border-slate-200 min-h-[100px] p-1.5">
                    {day && (
                      <>
                        <div
                          className={`w-7 h-7 flex items-center justify-center text-xs font-medium rounded-full mb-1 ${
                            isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'
                          }`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map(ev => (
                            <button
                              key={ev.id}
                              onClick={e => handleEventClick(ev, e)}
                              className="w-full text-left text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 truncate hover:bg-indigo-200 transition-colors">
                              {ev.summary || '(No title)'}
                            </button>
                          ))}
                          {dayEvents.length > 3 && (
                            <p className="text-xs text-slate-400 px-1">+{dayEvents.length - 3} more</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {loading && !calError && sortedDates.length === 0 ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : sortedDates.length === 0 && !calError ? (
              <div className="text-center py-16">
                <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No events this month</p>
              </div>
            ) : (
              sortedDates.map(date => {
                const d = new Date(date + 'T00:00:00');
                const isToday =
                  d.getDate() === today.getDate() &&
                  d.getMonth() === today.getMonth() &&
                  d.getFullYear() === today.getFullYear();
                return (
                  <div key={date}>
                    <h3 className={`text-xs font-semibold mb-2 ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {isToday ? 'Today — ' : ''}
                      {d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})}
                    </h3>
                    <div className="space-y-2">
                      {groupedEvents[date].map(ev => (
                        <button
                          key={ev.id}
                          onClick={e => handleEventClick(ev, e)}
                          className="w-full text-left bg-white rounded-xl border border-slate-200 p-3 hover:border-indigo-300 hover:shadow-sm transition-all duration-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-slate-800">{ev.summary || '(No title)'}</p>
                                {ev.start?.dateTime && (
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {formatTime(ev.start.dateTime)}
                                    {ev.end?.dateTime && ` – ${formatTime(ev.end.dateTime)}`}
                                  </p>
                                )}
                                {ev.start?.date && !ev.start?.dateTime && (
                                  <p className="text-xs text-slate-400 mt-0.5">All day</p>
                                )}
                              </div>
                            </div>
                            {ev.htmlLink && <ExternalLink className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />}
                          </div>
                          {ev.description && (
                            <p className="text-xs text-slate-500 mt-1.5 ml-4 line-clamp-2">{ev.description}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Event detail popover */}
      {selectedEvent && (
        <div
          className="fixed z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-4 w-72"
          style={{
            top: Math.min(popoverPos.y + 10, window.innerHeight - 250),
            left: Math.min(popoverPos.x + 10, window.innerWidth - 300),
          }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-slate-900">{selectedEvent.summary || '(No title)'}</h3>
            <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-700 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            {formatFullDate(selectedEvent.start?.dateTime, selectedEvent.start?.date)}
            {selectedEvent.end?.dateTime && ` → ${formatTime(selectedEvent.end.dateTime)}`}
          </p>
          {selectedEvent.description && (
            <p className="text-xs text-slate-600 mb-3 border-t border-slate-100 pt-2 line-clamp-4">
              {selectedEvent.description}
            </p>
          )}
          {selectedEvent.htmlLink && (
            <a
              href={selectedEvent.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Google Calendar
            </a>
          )}
        </div>
      )}

      {/* Backdrop for popover */}
      {selectedEvent && <div className="fixed inset-0 z-40" onClick={() => setSelectedEvent(null)} />}

      {/* New Event Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">New Calendar Event</h2>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
                <input
                  value={newForm.summary}
                  onChange={e => setNewForm(f => ({...f, summary: e.target.value}))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Event title"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newForm.description}
                  onChange={e => setNewForm(f => ({...f, description: e.target.value}))}
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={newForm.startDate}
                    onChange={e =>
                      setNewForm(f => ({...f, startDate: e.target.value, endDate: f.endDate || e.target.value}))
                    }
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newForm.startTime}
                    onChange={e => setNewForm(f => ({...f, startTime: e.target.value}))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={newForm.endDate}
                    onChange={e => setNewForm(f => ({...f, endDate: e.target.value}))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newForm.endTime}
                    onChange={e => setNewForm(f => ({...f, endTime: e.target.value}))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700">
                Cancel
              </button>
              <button
                onClick={createEvent}
                disabled={creating || !newForm.summary.trim() || !newForm.startDate || !newForm.endDate}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
