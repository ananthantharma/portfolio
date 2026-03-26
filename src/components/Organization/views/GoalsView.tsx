/* eslint-disable */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { IOrgGoal } from '@/models/OrgGoal';

type Category = 'All' | 'Work' | 'Personal' | 'Health' | 'Finance' | 'Learning' | 'Other';

const CATEGORIES: IOrgGoal['category'][] = ['Work', 'Personal', 'Health', 'Finance', 'Learning', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
  Work: 'bg-blue-500/20 text-blue-300',
  Personal: 'bg-violet-500/20 text-violet-300',
  Health: 'bg-emerald-500/20 text-emerald-300',
  Finance: 'bg-amber-500/20 text-amber-300',
  Learning: 'bg-pink-500/20 text-pink-300',
  Other: 'bg-slate-500/20 text-slate-300',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-indigo-500/20 text-indigo-400',
  paused: 'bg-slate-500/20 text-slate-400',
};

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

const PRESET_EMOJIS = ['🎯', '🚀', '💪', '📚', '💰', '❤️', '🧘', '🏋️', '✍️', '🎨', '🏆', '⭐', '🔥', '💡', '🌟', '🎵', '🏃', '🌱', '💎', '🛡️'];

function getDaysRemaining(targetDate: Date | string) {
  const t = new Date(targetDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - now.getTime()) / 86400000);
}

function ProgressCircle({ progress, color }: { progress: number; color: string }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
      <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle
        cx="30" cy="30" r={r} fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="30" y="35" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">
        {Math.round(progress)}%
      </text>
    </svg>
  );
}

interface GoalFormData {
  title: string;
  description: string;
  category: IOrgGoal['category'];
  color: string;
  emoji: string;
  targetDate: string;
  status: IOrgGoal['status'];
  milestones: { title: string; isCompleted: boolean }[];
}

function GoalFormModal({
  goal,
  onClose,
  onSaved,
}: {
  goal?: Partial<IOrgGoal>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<GoalFormData>({
    title: goal?.title || '',
    description: goal?.description || '',
    category: goal?.category || 'Work',
    color: goal?.color || '#6366f1',
    emoji: goal?.emoji || '🎯',
    targetDate: goal?.targetDate
      ? new Date(goal.targetDate).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: goal?.status || 'active',
    milestones: goal?.milestones?.map(m => ({ title: m.title, isCompleted: m.isCompleted })) || [],
  });
  const [newMilestone, setNewMilestone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addMilestone = () => {
    const t = newMilestone.trim();
    if (!t) return;
    setForm(f => ({ ...f, milestones: [...f.milestones, { title: t, isCompleted: false }] }));
    setNewMilestone('');
  };

  const removeMilestone = (idx: number) => {
    setForm(f => ({ ...f, milestones: f.milestones.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const progress = form.milestones.length > 0
        ? Math.round((form.milestones.filter(m => m.isCompleted).length / form.milestones.length) * 100)
        : 0;
      const payload = { ...form, progress };
      const url = goal?._id ? `/api/org/goals/${goal._id}` : '/api/org/goals';
      const method = goal?._id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      <div className="relative w-full max-w-lg bg-[#111827] border border-white/8 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-white font-semibold">{goal?._id ? 'Edit Goal' : 'New Goal'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Emoji + Title row */}
          <div className="flex gap-3">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Icon</label>
              <div className="grid grid-cols-5 gap-1 p-2 bg-white/5 border border-white/10 rounded-xl w-36">
                {PRESET_EMOJIS.map(em => (
                  <button
                    key={em}
                    onClick={() => setForm(f => ({ ...f, emoji: em }))}
                    className={`text-lg p-0.5 rounded-lg transition-colors ${form.emoji === em ? 'bg-indigo-500/30' : 'hover:bg-white/5'}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Goal title..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
              />
              <label className="block text-slate-400 text-xs font-medium mb-1.5 mt-3 uppercase tracking-wide">Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 appearance-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c} style={{ background: '#1f2937' }}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Target Date</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Status</label>
            <div className="flex gap-2">
              {(['active', 'paused', 'completed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                    form.status === s ? STATUS_STYLES[s] + ' border-current' : 'border-white/8 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Milestones</label>
            <div className="space-y-1.5 mb-2">
              {form.milestones.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white/3 rounded-lg px-3 py-2 border border-white/5">
                  <span className="flex-1 text-sm text-slate-300">{m.title}</span>
                  <button onClick={() => removeMilestone(idx)} className="text-slate-600 hover:text-red-400">
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMilestone}
                onChange={e => setNewMilestone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMilestone(); } }}
                placeholder="Add milestone, press Enter..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
              />
              <button onClick={addMilestone} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

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
            {goal?._id ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onUpdate,
}: {
  goal: IOrgGoal;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updated: IOrgGoal) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const daysLeft = getDaysRemaining(goal.targetDate);
  const displayedMilestones = showAllMilestones ? goal.milestones : goal.milestones.slice(0, 3);

  const toggleMilestone = async (idx: number) => {
    const updatedMilestones = goal.milestones.map((m, i) =>
      i === idx ? { ...m, isCompleted: !m.isCompleted } : m
    );
    const progress = updatedMilestones.length > 0
      ? Math.round((updatedMilestones.filter(m => m.isCompleted).length / updatedMilestones.length) * 100)
      : 0;
    const status = progress === 100 ? 'completed' : goal.status === 'completed' ? 'active' : goal.status;

    const optimistic = { ...goal, milestones: updatedMilestones, progress, status } as IOrgGoal;
    onUpdate(optimistic);

    try {
      const res = await fetch(`/api/org/goals/${goal._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones: updatedMilestones, progress, status }),
      });
      const data = await res.json();
      if (data.success) onUpdate(data.data);
    } catch {}
  };

  return (
    <div
      className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden group transition-shadow hover:shadow-lg"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ borderLeft: `3px solid ${goal.color}` }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: goal.color + '22' }}
          >
            {goal.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-white font-semibold text-sm leading-snug">{goal.title}</h3>
              {hovering && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={onEdit} className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={onDelete} className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded text-xs ${CATEGORY_COLORS[goal.category]}`}>{goal.category}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_STYLES[goal.status]}`}>{goal.status}</span>
            </div>
          </div>
          <ProgressCircle progress={goal.progress} color={goal.color} />
        </div>

        {goal.description && (
          <p className="text-slate-500 text-xs mt-3 leading-relaxed line-clamp-2">{goal.description}</p>
        )}

        {/* Target date */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-slate-500 text-xs">
            {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className={`text-xs font-medium ${daysLeft < 0 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-slate-500'}`}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
          </span>
        </div>

        {/* Milestones */}
        {goal.milestones.length > 0 && (
          <div className="mt-4 border-t border-white/5 pt-3">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Milestones</p>
            <div className="space-y-1.5">
              {displayedMilestones.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2 group/ms">
                  <button
                    onClick={() => toggleMilestone(idx)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      m.isCompleted ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/20 hover:border-emerald-500/40'
                    }`}
                  >
                    {m.isCompleted && <CheckIcon className="w-2.5 h-2.5 text-emerald-400" />}
                  </button>
                  <span className={`text-xs flex-1 ${m.isCompleted ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                    {m.title}
                  </span>
                </div>
              ))}
            </div>
            {goal.milestones.length > 3 && (
              <button
                onClick={() => setShowAllMilestones(!showAllMilestones)}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {showAllMilestones ? (
                  <><ChevronDownIcon className="w-3 h-3" /> Show less</>
                ) : (
                  <><ChevronRightIcon className="w-3 h-3" /> {goal.milestones.length - 3} more</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Goals View ───────────────────────────────────────────────────────────────

export default function GoalsView() {
  const [goals, setGoals] = useState<IOrgGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category>('All');
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<Partial<IOrgGoal> | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/org/goals');
      const data = await res.json();
      if (data.success) setGoals(data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleDelete = async (id: string) => {
    setGoals(prev => prev.filter(g => g._id !== id));
    try { await fetch(`/api/org/goals/${id}`, { method: 'DELETE' }); } catch { fetchGoals(); }
  };

  const handleUpdate = (updated: IOrgGoal) => {
    setGoals(prev => prev.map(g => g._id === updated._id ? updated : g));
  };

  const filteredGoals = useMemo(() => {
    if (filter === 'All') return goals;
    return goals.filter(g => g.category === filter);
  }, [goals, filter]);

  const stats = useMemo(() => ({
    total: goals.length,
    active: goals.filter(g => g.status === 'active').length,
    completed: goals.filter(g => g.status === 'completed').length,
    avgProgress: goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
      : 0,
  }), [goals]);

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Goals', value: stats.total },
          { label: 'Active', value: stats.active, color: 'text-emerald-400' },
          { label: 'Completed', value: stats.completed, color: 'text-indigo-400' },
          { label: 'Avg Progress', value: `${stats.avgProgress}%`, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-white/8 rounded-2xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color || 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs + Add button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-1 overflow-x-auto">
          {(['All', ...CATEGORIES] as Category[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filter === cat
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditGoal(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Grid */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-white/3 rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      )}

      {!loading && filteredGoals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <TrophyIcon className="w-12 h-12 text-slate-700" />
          <p className="text-slate-500">No goals yet. Set your first goal!</p>
          <button
            onClick={() => { setEditGoal(null); setShowModal(true); }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
          >
            Add Goal
          </button>
        </div>
      )}

      {!loading && filteredGoals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGoals.map(goal => (
            <GoalCard
              key={goal._id}
              goal={goal}
              onEdit={() => { setEditGoal(goal); setShowModal(true); }}
              onDelete={() => handleDelete(goal._id)}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      {showModal && (
        <GoalFormModal
          goal={editGoal || undefined}
          onClose={() => { setShowModal(false); setEditGoal(null); }}
          onSaved={() => { setShowModal(false); setEditGoal(null); fetchGoals(); }}
        />
      )}
    </div>
  );
}
