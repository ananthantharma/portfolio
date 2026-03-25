'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  CheckSquare,
  Square,
  Plus,
  Clock,
  AlertTriangle,
  CheckCheck,
  Filter,
  Calendar,
  FileText,
  Loader2,
  Flag,
  LayoutList,
  Columns,
  ChevronDown,
} from 'lucide-react';

interface TodoItem {
  _id: string;
  title: string;
  isCompleted: boolean;
  dueDate?: string;
  priority?: string;
  status?: string;
  sourcePageId?: {
    _id: string;
    title: string;
    sectionId?: { categoryId?: string };
  } | string;
  createdAt?: string;
  tabName?: string;
}

type FilterTab = 'all' | 'due_soon' | 'overdue' | 'completed';
type GroupBy = 'page' | 'due_date' | 'priority';
type ViewMode = 'list' | 'kanban';

const KANBAN_COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'border-slate-200 bg-slate-50' },
  { id: 'in_progress', label: 'In Progress', color: 'border-indigo-200 bg-indigo-50' },
  { id: 'done', label: 'Done', color: 'border-emerald-200 bg-emerald-50' },
];

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-50 text-slate-700 border-slate-200',
};

function getDaysUntilDue(dueDate?: string): number | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDueDate(dueDate?: string): string {
  if (!dueDate) return '';
  const d = new Date(dueDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPageTitle(todo: TodoItem): string {
  if (!todo.sourcePageId) return 'No page';
  if (typeof todo.sourcePageId === 'string') return todo.sourcePageId;
  return todo.sourcePageId.title || 'Untitled';
}

export default function OrgTasksView() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('page');
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [movingTask, setMovingTask] = useState<string | null>(null);

  // Quick-add
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDue, setQuickDue] = useState('');
  const [quickPriority, setQuickPriority] = useState('medium');
  const [adding, setAdding] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/todos');
      if (res.data.success) {
        setTodos(res.data.data);
      } else {
        setError(res.data.error || 'Failed to load tasks');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const toggleComplete = async (todo: TodoItem) => {
    setToggling(prev => new Set([...prev, todo._id]));
    try {
      const res = await axios.put(`/api/todos/${todo._id}`, {
        isCompleted: !todo.isCompleted,
        status: !todo.isCompleted ? 'done' : 'todo',
      });
      if (res.data.success) {
        setTodos(prev => prev.map(t => t._id === todo._id ? { ...t, isCompleted: !t.isCompleted } : t));
      }
    } catch (err) { console.error(err); }
    finally { setToggling(prev => { const next = new Set(prev); next.delete(todo._id); return next; }); }
  };

  const addQuickTask = async () => {
    if (!quickTitle.trim()) return;
    setAdding(true);
    try {
      const formData = new FormData();
      formData.append('title', quickTitle.trim());
      formData.append('priority', quickPriority);
      if (quickDue) formData.append('dueDate', new Date(quickDue).toISOString());
      const res = await axios.post('/api/todos', formData);
      if (res.data.success) {
        setTodos(prev => [res.data.data, ...prev]);
        setQuickTitle('');
        setQuickDue('');
        setQuickPriority('medium');
        setShowQuickAdd(false);
      }
    } catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  const moveTask = async (todo: TodoItem, targetColumn: string) => {
    setMovingTask(todo._id);
    try {
      const isCompleted = targetColumn === 'done';
      const status = targetColumn === 'done' ? 'done' : targetColumn;
      const res = await axios.put(`/api/todos/${todo._id}`, { isCompleted, status });
      if (res.data.success) {
        setTodos(prev => prev.map(t => t._id === todo._id ? { ...t, isCompleted, status } : t));
      }
    } catch (err) { console.error(err); }
    finally { setMovingTask(null); }
  };

  // Filter
  const filtered = todos.filter(todo => {
    if (filterTab === 'completed') return todo.isCompleted;
    if (filterTab === 'all') return !todo.isCompleted;
    const days = getDaysUntilDue(todo.dueDate);
    if (filterTab === 'due_soon') return !todo.isCompleted && days !== null && days >= 0 && days <= 3;
    if (filterTab === 'overdue') return !todo.isCompleted && days !== null && days < 0;
    return true;
  });

  // Group
  const grouped: Record<string, TodoItem[]> = {};
  filtered.forEach(todo => {
    let key = 'Other';
    if (groupBy === 'page') {
      key = getPageTitle(todo);
    } else if (groupBy === 'due_date') {
      key = todo.dueDate ? formatDueDate(todo.dueDate) : 'No due date';
    } else if (groupBy === 'priority') {
      key = todo.priority ? (todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)) : 'No priority';
    }
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(todo);
  });

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    if (groupBy === 'priority') {
      return (PRIORITY_ORDER[a.toLowerCase()] ?? 99) - (PRIORITY_ORDER[b.toLowerCase()] ?? 99);
    }
    return a.localeCompare(b);
  });

  const filterCounts = {
    all: todos.filter(t => !t.isCompleted).length,
    due_soon: todos.filter(t => {
      const d = getDaysUntilDue(t.dueDate);
      return !t.isCompleted && d !== null && d >= 0 && d <= 3;
    }).length,
    overdue: todos.filter(t => {
      const d = getDaysUntilDue(t.dueDate);
      return !t.isCompleted && d !== null && d < 0;
    }).length,
    completed: todos.filter(t => t.isCompleted).length,
  };

  const FILTER_TABS: { id: FilterTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'all', label: 'All Active', icon: <CheckSquare className="w-3.5 h-3.5" />, count: filterCounts.all },
    { id: 'due_soon', label: 'Due Soon', icon: <Clock className="w-3.5 h-3.5" />, count: filterCounts.due_soon },
    { id: 'overdue', label: 'Overdue', icon: <AlertTriangle className="w-3.5 h-3.5" />, count: filterCounts.overdue },
    { id: 'completed', label: 'Completed', icon: <CheckCheck className="w-3.5 h-3.5" />, count: filterCounts.completed },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        {/* Filter tabs */}
        <div className="flex gap-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  filterTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
              title="List view"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-slate-200 ${
                viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
              title="Kanban view"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group by (list only) */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value as GroupBy)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
              >
                <option value="page">Group by Page</option>
                <option value="due_date">Group by Due Date</option>
                <option value="priority">Group by Priority</option>
              </select>
            </div>
          )}

          <button
            onClick={() => setShowQuickAdd(v => !v)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        </div>
      </div>

      {/* Quick add panel */}
      {showQuickAdd && (
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <div className="flex items-center gap-3 max-w-2xl">
            <input
              autoFocus
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addQuickTask(); if (e.key === 'Escape') setShowQuickAdd(false); }}
              placeholder="Task title..."
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
            />
            <input
              type="date"
              value={quickDue}
              onChange={e => setQuickDue(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700"
            />
            <select
              value={quickPriority}
              onChange={e => setQuickPriority(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              onClick={addQuickTask}
              disabled={adding || !quickTitle.trim()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-all"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </div>
      )}

      {/* Kanban view */}
      {viewMode === 'kanban' && !loading && !error && (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full min-w-max">
            {KANBAN_COLUMNS.map(col => {
              const colTodos = todos.filter(t => {
                if (col.id === 'done') return t.isCompleted;
                if (col.id === 'in_progress') return !t.isCompleted && t.status === 'in_progress';
                return !t.isCompleted && t.status !== 'in_progress';
              });
              return (
                <div key={col.id} className={`flex flex-col w-72 rounded-xl border ${col.color}`}>
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{col.label}</span>
                    <span className="text-xs text-slate-400 bg-white rounded-full px-2 py-0.5 border border-slate-200">{colTodos.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {colTodos.map(todo => {
                      const days = getDaysUntilDue(todo.dueDate);
                      const isOverdue = days !== null && days < 0 && !todo.isCompleted;
                      const isDueSoon = days !== null && days >= 0 && days <= 3 && !todo.isCompleted;
                      const isMoving = movingTask === todo._id;
                      return (
                        <div
                          key={todo._id}
                          className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <p className={`text-sm font-medium mb-1.5 ${todo.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {todo.title}
                          </p>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              {todo.priority && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium capitalize ${PRIORITY_COLORS[todo.priority] || PRIORITY_COLORS.low}`}>
                                  {todo.priority}
                                </span>
                              )}
                              {todo.dueDate && (
                                <span className={`flex items-center gap-0.5 text-xs ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-slate-400'}`}>
                                  <Calendar className="w-3 h-3" />
                                  {formatDueDate(todo.dueDate)}
                                </span>
                              )}
                            </div>
                            {/* Move dropdown */}
                            <div className="relative group">
                              <button
                                disabled={isMoving}
                                className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
                              >
                                {isMoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              <div className="absolute right-0 bottom-5 hidden group-hover:block z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-32">
                                {KANBAN_COLUMNS.filter(c => c.id !== col.id).map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => moveTask(todo, c.id)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                  >
                                    → {c.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {colTodos.length === 0 && (
                      <div className="text-center py-6 text-slate-300 text-xs">No tasks</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content (list view) */}
      <div className={`flex-1 overflow-y-auto p-6 ${viewMode === 'kanban' ? 'hidden' : ''}`}>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-10 h-10 text-amber-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Failed to load tasks</p>
            <p className="text-slate-400 text-xs mt-1">{error}</p>
            <button
              onClick={fetchTodos}
              className="mt-3 text-indigo-600 text-xs hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <CheckCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {filterTab === 'completed' ? 'No completed tasks' :
               filterTab === 'overdue' ? 'No overdue tasks' :
               filterTab === 'due_soon' ? 'No tasks due soon' :
               'No active tasks'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedGroups.map(([group, items]) => (
              <div key={group}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  {groupBy === 'page' && <FileText className="w-3.5 h-3.5" />}
                  {groupBy === 'due_date' && <Calendar className="w-3.5 h-3.5" />}
                  {groupBy === 'priority' && <Flag className="w-3.5 h-3.5" />}
                  {group}
                  <span className="text-slate-300 font-normal">({items.length})</span>
                </h3>
                <div className="space-y-2">
                  {items.map(todo => {
                    const days = getDaysUntilDue(todo.dueDate);
                    const isOverdue = days !== null && days < 0 && !todo.isCompleted;
                    const isDueSoon = days !== null && days >= 0 && days <= 3 && !todo.isCompleted;

                    return (
                      <div
                        key={todo._id}
                        className={`bg-white rounded-xl border px-4 py-3 flex items-start gap-3 hover:shadow-sm transition-all duration-200 ${
                          todo.isCompleted
                            ? 'border-slate-100 opacity-60'
                            : isOverdue
                            ? 'border-red-200'
                            : isDueSoon
                            ? 'border-amber-200'
                            : 'border-slate-200'
                        }`}
                      >
                        <button
                          onClick={() => toggleComplete(todo)}
                          disabled={toggling.has(todo._id)}
                          className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                        >
                          {toggling.has(todo._id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : todo.isCompleted ? (
                            <CheckSquare className="w-4 h-4 text-indigo-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${todo.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {todo.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {todo.sourcePageId && typeof todo.sourcePageId === 'object' && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <FileText className="w-3 h-3" />
                                {getPageTitle(todo)}
                              </span>
                            )}
                            {todo.dueDate && (
                              <span className={`flex items-center gap-1 text-xs font-medium ${
                                isOverdue ? 'text-red-600' :
                                isDueSoon ? 'text-amber-600' :
                                'text-slate-400'
                              }`}>
                                <Calendar className="w-3 h-3" />
                                {formatDueDate(todo.dueDate)}
                                {isOverdue && ' (Overdue)'}
                                {isDueSoon && !isOverdue && ` (${days === 0 ? 'Today' : `${days}d`})`}
                              </span>
                            )}
                          </div>
                        </div>

                        {todo.priority && (
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${
                            PRIORITY_COLORS[todo.priority] || PRIORITY_COLORS.low
                          }`}>
                            {todo.priority}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
