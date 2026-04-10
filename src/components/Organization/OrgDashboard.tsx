'use client';

import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {FileText, Users, Flag, Clock, CalendarDays, Plus, ChevronRight, Pin, Sparkles} from 'lucide-react';
import {Category, Page, ViewType} from './OrganizationLayout';

interface OrgDashboardProps {
  categories: Category[];
  stats: any;
  onNavigate: (view: ViewType) => void;
}

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {dateTime?: string; date?: string};
  end?: {dateTime?: string; date?: string};
  htmlLink?: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});
}

function formatEventDate(event: CalendarEvent): string {
  const raw = event.start?.dateTime || event.start?.date;
  if (!raw) return '';
  const d = new Date(raw);
  if (event.start?.date && !event.start?.dateTime) {
    return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  }
  return (
    d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) +
    ' ' +
    d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})
  );
}

export default function OrgDashboard({categories, stats, onNavigate}: OrgDashboardProps) {
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [calError, setCalError] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingCal, setLoadingCal] = useState(true);
  const [quickCapture, setQuickCapture] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);

  // Derive stats totals
  const totalPages = stats ? Object.keys(stats.pages || {}).length : 0;
  const totalFlagged = stats
    ? Object.values((stats.pages as Record<string, any>) || {}).filter((p: any) => p.flagged > 0).length
    : 0;
  const dueSoon = stats
    ? Object.values((stats.pages as Record<string, any>) || {}).filter(
        (p: any) => p.todo?.minDays !== null && p.todo?.minDays !== undefined && p.todo.minDays <= 3,
      ).length
    : 0;

  useEffect(() => {
    // Fetch recent pages
    axios
      .get('/api/notes/pages?search=')
      .then(res => {
        if (res.data.success) {
          const sorted = [...res.data.data].sort(
            (a: Page, b: Page) =>
              new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime(),
          );
          setRecentPages(sorted.slice(0, 8));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPages(false));

    // Fetch upcoming calendar events
    const now = new Date();
    const future = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    axios
      .get(`/api/calendar?timeMin=${now.toISOString()}&timeMax=${future.toISOString()}&maxResults=5`)
      .then(res => {
        if (res.data.success) {
          setCalEvents(res.data.data.slice(0, 5));
        }
      })
      .catch(() => setCalError(true))
      .finally(() => setLoadingCal(false));
  }, []);

  const handleQuickCapture = async () => {
    if (!quickCapture.trim() || capturing) return;
    if (categories.length === 0) return;

    setCapturing(true);
    try {
      // Ensure "Quick Notes" section exists in first category
      const firstCat = categories[0];
      const sectionsRes = await axios.get(`/api/notes/sections?categoryId=${firstCat._id}`);
      let sections = sectionsRes.data.data || [];
      let quickSection = sections.find((s: any) => s.name === 'Quick Notes');

      if (!quickSection) {
        const newSec = await axios.post('/api/notes/sections', {
          name: 'Quick Notes',
          categoryId: firstCat._id,
        });
        quickSection = newSec.data.data;
      }

      await axios.post('/api/notes/pages', {
        title: quickCapture.trim().slice(0, 60),
        sectionId: quickSection._id,
        tabs: [{title: 'Main', content: quickCapture.trim(), order: 0}],
      });

      setQuickCapture('');
      setCaptureSuccess(true);
      setTimeout(() => setCaptureSuccess(false), 2500);
    } catch (err) {
      console.error('Quick capture failed', err);
    } finally {
      setCapturing(false);
    }
  };

  const getSectionName = (page: Page): string => {
    const s = page.sectionId;
    if (typeof s === 'object' && s !== null && 'name' in s) return (s as any).name;
    return '';
  };

  const totalContacts = 0; // contacts fetched separately

  const statCards = [
    {
      label: 'Total Pages',
      value: totalPages,
      icon: FileText,
      color: 'indigo',
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-100',
    },
    {
      label: 'Contacts',
      value: totalContacts,
      icon: Users,
      color: 'emerald',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
    },
    {
      label: 'Flagged Items',
      value: totalFlagged,
      icon: Flag,
      color: 'amber',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
    },
    {
      label: 'Due Soon',
      value: dueSoon,
      icon: Clock,
      color: 'rose',
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100',
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{getGreeting()} ✨</h1>
            <p className="text-slate-500 mt-1 text-sm">{formatDate(new Date())}</p>
            <p className="text-slate-600 mt-3 text-sm">
              You have <span className="font-semibold text-indigo-600">{totalPages} notes</span>
              {dueSoon > 0 && (
                <>
                  {' '}
                  and <span className="font-semibold text-rose-600">{dueSoon} tasks due soon</span>
                </>
              )}
              .
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({label, value, icon: Icon, bg, text, border}) => (
          <div
            key={label}
            className={`bg-white rounded-xl border ${border} p-4 shadow-sm hover:shadow-md transition-shadow`}>
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${text}`} />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Capture */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-500" />
          Quick Capture
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Capture a thought..."
            value={quickCapture}
            onChange={e => setQuickCapture(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickCapture()}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
            disabled={categories.length === 0}
          />
          <button
            onClick={handleQuickCapture}
            disabled={capturing || !quickCapture.trim() || categories.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
            {capturing ? '...' : 'Save'}
          </button>
        </div>
        {captureSuccess && <p className="text-emerald-600 text-xs mt-2">Note saved to Quick Notes!</p>}
        {categories.length === 0 && (
          <p className="text-slate-400 text-xs mt-2">Create a category in Notes to enable quick capture.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Notes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Recent Notes</h2>
            <button
              onClick={() => onNavigate('notes')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4">
            {loadingPages ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentPages.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No notes yet</p>
                <button onClick={() => onNavigate('notes')} className="mt-2 text-indigo-600 text-xs hover:underline">
                  Create your first note
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recentPages.map(page => (
                  <button
                    key={page._id}
                    onClick={() => onNavigate('notes')}
                    className="text-left p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate leading-snug">{page.title}</p>
                      <div className="flex gap-1 shrink-0">
                        {page.isFlagged && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />}
                        {page.isImportant && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5" />}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{getSectionName(page)}</p>
                    {page.updatedAt && (
                      <p className="text-xs text-slate-300 mt-1">
                        {new Date(page.updatedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Upcoming Calendar Events */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                Upcoming
              </h2>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                Calendar <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-4">
              {loadingCal ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : calError ? (
                <div className="text-center py-4">
                  <p className="text-slate-400 text-xs">Calendar not connected.</p>
                  <button
                    onClick={() => onNavigate('calendar')}
                    className="mt-1 text-indigo-600 text-xs hover:underline">
                    Connect Google Calendar
                  </button>
                </div>
              ) : calEvents.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">No upcoming events</p>
              ) : (
                <div className="space-y-2">
                  {calEvents.map(event => (
                    <div key={event.id} className="flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 font-medium truncate">{event.summary || '(No title)'}</p>
                        <p className="text-xs text-slate-400">{formatEventDate(event)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pinned placeholder */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Pin className="w-4 h-4 text-slate-400" />
              Pinned Items
            </h2>
            <div className="text-center py-4">
              <Pin className="w-6 h-6 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-xs">Pin important notes to see them here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
