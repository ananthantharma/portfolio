/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { IOrgTask } from '@/models/OrgTask';

interface Props {
  task?: Partial<IOrgTask>;
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITIES = ['High', 'Medium', 'Low', 'None'] as const;
const STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'this-week', label: 'This Week' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  High: 'border-red-500 bg-red-500/20 text-red-400',
  Medium: 'border-amber-500 bg-amber-500/20 text-amber-400',
  Low: 'border-blue-500 bg-blue-500/20 text-blue-400',
  None: 'border-slate-600 bg-slate-700/40 text-slate-400',
};

export default function OrgTaskFormModal({ task, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low' | 'None'>(task?.priority || 'None');
  const [status, setStatus] = useState(task?.status || 'backlog');
  const [dueDate, setDueDate] = useState(() => {
    if (task?.dueDate) {
      return new Date(task.dueDate).toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [category, setCategory] = useState(task?.category || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimatedMinutes?.toString() || '');
  const [subtasks, setSubtasks] = useState<{ title: string; isCompleted: boolean }[]>(
    task?.subtasks?.map(s => ({ title: s.title, isCompleted: s.isCompleted })) || []
  );
  const [newSubtask, setNewSubtask] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const addSubtask = () => {
    const trimmed = newSubtask.trim();
    if (!trimmed) return;
    setSubtasks(prev => [...prev, { title: trimmed, isCompleted: false }]);
    setNewSubtask('');
  };

  const removeSubtask = (idx: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtask();
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        dueDate: new Date(dueDate).toISOString(),
        category: category.trim() || undefined,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : undefined,
        subtasks,
      };

      const url = task?._id ? `/api/org/tasks/${task._id}` : '/api/org/tasks';
      const method = task?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save task');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/8 shadow-2xl overflow-hidden"
        style={{ background: '#111827' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-white font-semibold">{task?._id ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Title</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                    priority === p ? PRIORITY_COLORS[p] : 'border-white/8 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none"
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value} style={{ background: '#1f2937' }}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Row: due date + category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Design"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Estimated minutes */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Estimated Minutes</label>
            <input
              type="number"
              value={estimatedMinutes}
              onChange={e => setEstimatedMinutes(e.target.value)}
              placeholder="e.g. 60"
              min="0"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Subtasks</label>
            <div className="space-y-1.5 mb-2">
              {subtasks.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white/3 rounded-lg px-3 py-2 border border-white/5">
                  <span className="flex-1 text-sm text-slate-300">{s.title}</span>
                  <button onClick={() => removeSubtask(idx)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                placeholder="Add subtask, press Enter..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <button
                onClick={addSubtask}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {saving && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />}
            {task?._id ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
