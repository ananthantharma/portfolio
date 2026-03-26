/* eslint-disable */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { IOrgHabit } from '@/models/OrgHabit';

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

const PRESET_ICONS = ['⚡', '🏃', '💪', '📚', '💧', '🧘', '🍎', '✍️', '🎯', '🌱', '🏋️', '🎵', '🔥', '⭐', '💡', '🛡️', '❤️', '🏊', '🚴', '🧠'];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function getThisWeekDays(): string[] {
  const today = new Date();
  const days: string[] = [];
  // Get Mon-Sun of current week
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function isTargetDay(habit: IOrgHabit, dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay(); // 0=Sun
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekdays') return dow >= 1 && dow <= 5;
  if (habit.frequency === 'weekends') return dow === 0 || dow === 6;
  if (habit.frequency === 'custom') return habit.targetDays?.includes(dow) ?? false;
  return false;
}

// ─── Habit Form Modal ─────────────────────────────────────────────────────────

interface HabitFormData {
  title: string;
  description: string;
  icon: string;
  color: string;
  frequency: IOrgHabit['frequency'];
  targetDays: number[];
}

function HabitFormModal({
  habit,
  onClose,
  onSaved,
}: {
  habit?: Partial<IOrgHabit>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<HabitFormData>({
    title: habit?.title || '',
    description: habit?.description || '',
    icon: habit?.icon || '⚡',
    color: habit?.color || '#6366f1',
    frequency: habit?.frequency || 'daily',
    targetDays: habit?.targetDays || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleTargetDay = (day: number) => {
    setForm(f => ({
      ...f,
      targetDays: f.targetDays.includes(day)
        ? f.targetDays.filter(d => d !== day)
        : [...f.targetDays, day],
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const url = habit?._id ? `/api/org/habits/${habit._id}` : '/api/org/habits';
      const method = habit?._id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111827] border border-white/8 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-white font-semibold">{habit?._id ? 'Edit Habit' : 'New Habit'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Icon picker */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Icon</label>
            <div className="grid grid-cols-10 gap-1 p-2 bg-white/5 border border-white/10 rounded-xl">
              {PRESET_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  className={`text-lg p-1 rounded-lg transition-colors ${form.icon === ic ? 'bg-indigo-500/30' : 'hover:bg-white/5'}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Title + description */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Habit name..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Frequency</label>
            <div className="grid grid-cols-4 gap-2">
              {(['daily', 'weekdays', 'weekends', 'custom'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setForm(prev => ({ ...prev, frequency: f }))}
                  className={`py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                    form.frequency === f
                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400'
                      : 'border-white/8 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Custom days */}
          {form.frequency === 'custom' && (
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Days</label>
              <div className="flex gap-2">
                {DAY_SHORT.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleTargetDay(i)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                      form.targetDays.includes(i)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/5 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
          >
            {saving && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />}
            {habit?._id ? 'Save Changes' : 'Create Habit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Habit Card ───────────────────────────────────────────────────────────────

function HabitCard({
  habit,
  todayStr,
  last7Days,
  onEdit,
  onDelete,
  onToggle,
  toggling,
}: {
  habit: IOrgHabit;
  todayStr: string;
  last7Days: string[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  const [hovering, setHovering] = useState(false);
  const completionMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const c of habit.completions || []) m[c.date] = c.completed;
    return m;
  }, [habit.completions]);

  const doneToday = completionMap[todayStr] === true;

  const frequencyLabel = {
    daily: 'Every day',
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    custom: habit.targetDays?.map(d => DAY_LABELS[d]).join(', ') || 'Custom',
  }[habit.frequency];

  return (
    <div
      className="bg-[#111827] border border-white/8 rounded-2xl p-4 flex items-center gap-4 group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{ background: habit.color + '22' }}
      >
        {habit.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold text-sm">{habit.title}</h3>
          {habit.streak > 0 && (
            <span className="text-amber-400 text-xs font-medium">🔥 {habit.streak}</span>
          )}
          {hovering && (
            <div className="flex gap-1 ml-auto">
              <button onClick={onEdit} className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                <PencilIcon className="w-3 h-3" />
              </button>
              <button onClick={onDelete} className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        {habit.description && (
          <p className="text-slate-500 text-xs mt-0.5 truncate">{habit.description}</p>
        )}
        <p className="text-slate-600 text-xs mt-0.5">{frequencyLabel}</p>

        {/* Last 7 days grid */}
        <div className="flex gap-1 mt-2">
          {last7Days.map(dateStr => {
            const isTarget = isTargetDay(habit, dateStr);
            const done = completionMap[dateStr] === true;
            return (
              <div
                key={dateStr}
                title={dateStr}
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{
                  background: !isTarget
                    ? 'transparent'
                    : done
                    ? habit.color + 'cc'
                    : 'rgba(255,255,255,0.05)',
                  border: !isTarget ? '1px dashed rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {done && isTarget && <CheckIcon className="w-2.5 h-2.5 text-white" style={{ opacity: 0.9 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Today check button */}
      <button
        onClick={onToggle}
        disabled={toggling}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border-2 shrink-0 ${
          doneToday
            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
            : 'border-white/10 bg-white/3 text-slate-500 hover:border-white/30 hover:text-slate-300'
        }`}
      >
        {toggling ? (
          <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        ) : (
          <CheckIcon className={`w-5 h-5 ${doneToday ? '' : 'opacity-40'}`} />
        )}
      </button>
    </div>
  );
}

// ─── Habits View ──────────────────────────────────────────────────────────────

export default function HabitsView() {
  const [habits, setHabits] = useState<IOrgHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editHabit, setEditHabit] = useState<Partial<IOrgHabit> | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const todayStr = getTodayStr();
  const last7Days = useMemo(() => getLast7Days(), []);
  const thisWeekDays = useMemo(() => getThisWeekDays(), []);

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/org/habits');
      const data = await res.json();
      if (data.success) setHabits(data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const handleToggle = async (habit: IOrgHabit) => {
    const existingCompletion = habit.completions?.find(c => c.date === todayStr);
    const nowCompleted = !(existingCompletion?.completed);
    setTogglingIds(prev => new Set(prev).add(habit._id));
    try {
      const res = await fetch(`/api/org/habits/${habit._id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, completed: nowCompleted }),
      });
      const data = await res.json();
      if (data.success) setHabits(prev => prev.map(h => h._id === habit._id ? data.data : h));
    } catch {}
    setTogglingIds(prev => { const s = new Set(prev); s.delete(habit._id); return s; });
  };

  const handleDelete = async (id: string) => {
    setHabits(prev => prev.filter(h => h._id !== id));
    try { await fetch(`/api/org/habits/${id}`, { method: 'DELETE' }); } catch { fetchHabits(); }
  };

  const stats = useMemo(() => {
    const completedToday = habits.filter(h =>
      h.completions?.some(c => c.date === todayStr && c.completed)
    ).length;
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.bestStreak || 0), 0);
    const completionsThisWeek = habits.reduce((sum, h) =>
      sum + (h.completions?.filter(c => thisWeekDays.includes(c.date) && c.completed).length || 0), 0
    );
    return { total: habits.length, completedToday, bestStreak, completionsThisWeek };
  }, [habits, todayStr, thisWeekDays]);

  return (
    <div className="p-6 space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Habits', value: stats.total },
          { label: 'Done Today', value: `${stats.completedToday}/${stats.total}`, color: 'text-emerald-400' },
          { label: 'Best Streak', value: `${stats.bestStreak}d`, color: 'text-amber-400' },
          { label: 'This Week', value: stats.completionsThisWeek, color: 'text-indigo-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-white/8 rounded-2xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color || 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Your Habits</h2>
        <button
          onClick={() => { setEditHabit(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Habit
        </button>
      </div>

      {/* Habit list */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white/3 rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      )}

      {!loading && habits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <BoltIcon className="w-12 h-12 text-slate-700" />
          <p className="text-slate-500">No habits yet. Build your first habit!</p>
          <button
            onClick={() => { setEditHabit(null); setShowModal(true); }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
          >
            Add Habit
          </button>
        </div>
      )}

      {!loading && habits.length > 0 && (
        <div className="space-y-3">
          {habits.map(habit => (
            <HabitCard
              key={habit._id}
              habit={habit}
              todayStr={todayStr}
              last7Days={last7Days}
              onEdit={() => { setEditHabit(habit); setShowModal(true); }}
              onDelete={() => handleDelete(habit._id)}
              onToggle={() => handleToggle(habit)}
              toggling={togglingIds.has(habit._id)}
            />
          ))}
        </div>
      )}

      {/* This Week's Progress heatmap */}
      {!loading && habits.length > 0 && (
        <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">This Week's Progress</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-slate-500 text-xs text-left pr-4 py-1 font-normal w-32">Habit</th>
                  {thisWeekDays.map((d, i) => (
                    <th key={d} className="text-slate-500 text-xs font-normal text-center w-8">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                    </th>
                  ))}
                  <th className="text-slate-500 text-xs font-normal text-right pl-4 w-16">Done</th>
                </tr>
              </thead>
              <tbody>
                {habits.map(habit => {
                  const completionMap: Record<string, boolean> = {};
                  for (const c of habit.completions || []) completionMap[c.date] = c.completed;
                  const weekDone = thisWeekDays.filter(d => completionMap[d] === true).length;
                  const weekTarget = thisWeekDays.filter(d => isTargetDay(habit, d)).length;
                  return (
                    <tr key={habit._id}>
                      <td className="py-1.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{habit.icon}</span>
                          <span className="text-slate-300 text-xs truncate max-w-[80px]">{habit.title}</span>
                        </div>
                      </td>
                      {thisWeekDays.map(d => {
                        const isTarget = isTargetDay(habit, d);
                        const done = completionMap[d] === true;
                        return (
                          <td key={d} className="text-center py-1.5">
                            <div
                              className="w-6 h-6 rounded mx-auto"
                              style={{
                                background: !isTarget
                                  ? 'transparent'
                                  : done
                                  ? habit.color + 'cc'
                                  : 'rgba(255,255,255,0.04)',
                                border: !isTarget ? 'none' : '1px solid rgba(255,255,255,0.06)',
                              }}
                            />
                          </td>
                        );
                      })}
                      <td className="text-right pl-4">
                        <span className="text-slate-400 text-xs">{weekDone}/{weekTarget}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <HabitFormModal
          habit={editHabit || undefined}
          onClose={() => { setShowModal(false); setEditHabit(null); }}
          onSaved={() => { setShowModal(false); setEditHabit(null); fetchHabits(); }}
        />
      )}
    </div>
  );
}
