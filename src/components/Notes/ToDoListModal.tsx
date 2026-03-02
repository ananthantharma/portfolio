/* eslint-disable simple-import-sort/imports, react/jsx-sort-props, react-memo/require-usememo, react-memo/require-memo, @typescript-eslint/no-explicit-any */
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  ArrowDownIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ListBulletIcon,
  PaperClipIcon,
  PencilIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
  SparklesIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { INotePage } from '@/models/NotePage';
import { IToDo } from '@/models/ToDo';
import TaskFormModal, { TaskFormData } from './TaskFormModal';
import SmartInput from './SmartInput';
import ToDoBoard from './ToDoBoard';
import EmailTaskModal from './EmailTaskModal';

interface ToDoListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: INotePage, tabId?: string) => void;
  isDirectCreateOpen?: boolean;
  onCloseDirectCreate?: () => void;
}

type SortField = 'priority' | 'dueDate' | 'title' | 'category';
type SortDirection = 'asc' | 'desc';

const CATEGORIES = ['Urgent!', 'Sourcing!', 'Boss!', 'Staff! (Team)', 'Projects!', 'Admin!', 'Personal!'];

// Progress Ring SVG Component
const ProgressRing = React.memo(({ completed, total }: { completed: number; total: number }) => {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center gap-2">
      <svg className="h-10 w-10 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-gray-600">{percentage}%</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] font-semibold text-gray-700">
          {completed}/{total}
        </span>
        <span className="text-[10px] text-gray-400">done</span>
      </div>
    </div>
  );
});
ProgressRing.displayName = 'ProgressRing';

// Filter Pill Component
const FilterPill = React.memo(
  ({
    label,
    active,
    onClick,
    variant = 'default',
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'warning' | 'success';
  }) => {
    const colors = {
      default: active
        ? 'bg-gray-900 text-white shadow-sm'
        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200',
      danger: active
        ? 'bg-red-600 text-white shadow-sm'
        : 'bg-white text-red-600 hover:bg-red-50 border border-red-200',
      warning: active
        ? 'bg-amber-500 text-white shadow-sm'
        : 'bg-white text-amber-600 hover:bg-amber-50 border border-amber-200',
      success: active
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-200',
    };

    return (
      <button
        className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 ${colors[variant]}`}
        onClick={onClick}>
        {label}
      </button>
    );
  },
);
FilterPill.displayName = 'FilterPill';

const ToDoListModal: React.FC<ToDoListModalProps> = React.memo(
  ({ isOpen, onClose, onNavigate, isDirectCreateOpen, onCloseDirectCreate }) => {
    const [todos, setTodos] = useState<IToDo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>('dueDate');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [showCompleted, setShowCompleted] = useState(false);

    // Filters
    const [filterPriority, setFilterPriority] = useState<string>('All');
    const [filterCategory, setFilterCategory] = useState<string>('All');

    // Edit/Create State
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<IToDo | null>(null);

    // New Features State
    const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [prefilledData, setPrefilledData] = useState<Partial<TaskFormData> | undefined>(undefined);

    // AI Priority State
    const [isAIPrioritizing, setIsAIPrioritizing] = useState(false);

    useEffect(() => {
      if (isOpen || isDirectCreateOpen) {
        fetchTodos();
      }
    }, [isOpen, isDirectCreateOpen]);

    useEffect(() => {
      if (isDirectCreateOpen) {
        setEditingTask(null);
        setPrefilledData(undefined);
        setIsTaskFormOpen(true);
      }
    }, [isDirectCreateOpen]);

    const fetchTodos = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/todos');
        const data = await response.json();
        if (data.success) {
          setTodos(data.data);
        } else {
          setError(data.error || 'Failed to fetch tasks');
        }
      } catch (error) {
        console.error('Error fetching todos:', error);
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    const handleToggleComplete = async (todo: IToDo) => {
      try {
        const newStatus = !todo.isCompleted;
        setTodos(prev => prev.map(t => (t._id === todo._id ? ({ ...t, isCompleted: newStatus } as IToDo) : t)));
        await fetch(`/api/todos/${todo._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isCompleted: newStatus }),
        });
      } catch (error) {
        console.error('Error updating status:', error);
        fetchTodos();
      }
    };

    const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this task?')) return;
      try {
        setTodos(prev => prev.filter(t => t._id !== id));
        await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.error('Error deleting task:', error);
        fetchTodos();
      }
    };

    const handleEdit = (todo: IToDo) => {
      setEditingTask(todo);
      setPrefilledData(undefined);
      setIsTaskFormOpen(true);
    };

    const handleCreateStandalone = () => {
      setEditingTask(null);
      setPrefilledData(undefined);
      setIsTaskFormOpen(true);
    };

    const handleSmartAdd = (data: { title: string; priority: string; dueDate: Date | null }) => {
      setEditingTask(null);
      setPrefilledData({
        title: data.title,
        priority: data.priority,
        dueDate: data.dueDate || new Date(),
      } as any);
      setIsTaskFormOpen(true);
    };

    const handleEmailProceed = (data: Partial<TaskFormData>) => {
      setPrefilledData(data);
      setIsTaskFormOpen(true);
    };

    const handleStatusChange = async (id: string, newStatus: IToDo['status']) => {
      setTodos(prev => prev.map(t => (t._id === id ? ({ ...t, status: newStatus } as any) : t)));
      try {
        await fetch(`/api/todos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (error) {
        console.error('Failed to update status', error);
        fetchTodos();
      }
    };

    const handleCycleNeonColor = async (todo: IToDo) => {
      try {
        const colors: Array<'red' | 'blue' | 'green' | null> = ['red', 'blue', 'green', null];
        const currentIndex = colors.indexOf(todo.neonColor || null);
        const nextIndex = (currentIndex + 1) % colors.length;
        const newValue = colors[nextIndex];

        setTodos(prev => prev.map(t => (t._id === todo._id ? ({ ...t, neonColor: newValue } as any) : t)));
        await fetch(`/api/todos/${todo._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ neonColor: newValue }),
        });
      } catch (error) {
        console.error('Error cycling neon color:', error);
        fetchTodos();
      }
    };

    const handleToggleMinimize = async (todo: IToDo) => {
      try {
        const newValue = !(todo.isMinimized ?? true);
        setTodos(prev => prev.map(t => (t._id === todo._id ? ({ ...t, isMinimized: newValue } as any) : t)));
        await fetch(`/api/todos/${todo._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isMinimized: newValue }),
        });
      } catch (error) {
        console.error('Error toggling minimize:', error);
        fetchTodos();
      }
    };

    const handleAddDays = async (id: string, days: number) => {
      const todo = todos.find(t => t._id === id);
      if (!todo) return;
      const newDueDate = new Date(todo.dueDate);
      newDueDate.setDate(newDueDate.getDate() + days);

      setTodos(prev => prev.map(t => (t._id === id ? ({ ...t, dueDate: newDueDate.toISOString() } as any) : t)));
      try {
        await fetch(`/api/todos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dueDate: newDueDate.toISOString() }),
        });
      } catch (error) {
        console.error('Failed to update due date', error);
        fetchTodos();
      }
    };

    const handleUpdateNotes = async (id: string, newNotes: string) => {
      setTodos(prev => prev.map(t => (t._id === id ? ({ ...t, notes: newNotes } as any) : t)));
      try {
        await fetch(`/api/todos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: newNotes }),
        });
      } catch (error) {
        console.error('Failed to update notes', error);
        fetchTodos();
      }
    };

    const handleSaveTask = async (data: TaskFormData) => {
      try {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('priority', data.priority);
        formData.append('dueDate', data.dueDate.toISOString());
        formData.append('category', data.category);
        formData.append('notes', data.notes);

        if (data.newFiles) {
          data.newFiles.forEach(file => {
            formData.append('files', file);
          });
        }

        if (data.driveAttachments) {
          formData.append('driveAttachments', JSON.stringify(data.driveAttachments));
        }

        if (data.blobAttachments) {
          formData.append('blobAttachments', JSON.stringify(data.blobAttachments));
        }

        if (editingTask && data.attachments) {
          formData.append('existingAttachments', JSON.stringify(data.attachments));
        }

        if (editingTask) {
          const res = await fetch(`/api/todos/${editingTask._id}`, {
            method: 'PUT',
            body: formData,
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update task');
          }
        } else {
          const res = await fetch('/api/todos', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create task');
          }
        }
        setIsTaskFormOpen(false);
        setEditingTask(null);
        fetchTodos();
      } catch (error) {
        console.error('Error saving task:', error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alert(`Failed to save task: ${(error as any).message}`);
      }
    };

    const handleSort = (field: SortField) => {
      if (sortField === field) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    };

    // AI Priority Suggest
    const handleAIPrioritySuggest = async () => {
      const unprioritized = todos.filter(t => !t.isCompleted && (!t.priority || t.priority === 'None'));
      if (unprioritized.length === 0) return;
      setIsAIPrioritizing(true);
      try {
        const taskList = unprioritized
          .map(
            t => `- "${t.title}" (due: ${new Date(t.dueDate).toLocaleDateString()}, category: ${t.category || 'None'})`,
          )
          .join('\n');

        const res = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `You are a task prioritization assistant. Analyze these tasks and assign priorities (High, Medium, or Low) based on urgency, due date proximity, and category importance. Return ONLY a JSON array like [{"title":"exact task title","priority":"High|Medium|Low"}].\n\nTasks:\n${taskList}`,
          }),
        });
        const data = await res.json();
        const text = data.text || data.result || '';

        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);
          // Apply suggestions
          for (const suggestion of suggestions) {
            const matchingTodo = unprioritized.find(
              t => t.title.toLowerCase().trim() === suggestion.title?.toLowerCase().trim(),
            );
            if (matchingTodo && ['High', 'Medium', 'Low'].includes(suggestion.priority)) {
              await fetch(`/api/todos/${matchingTodo._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority: suggestion.priority }),
              });
            }
          }
          fetchTodos();
        }
      } catch (err) {
        console.error('AI Priority suggestion failed:', err);
      } finally {
        setIsAIPrioritizing(false);
      }
    };

    const filteredTodos = useMemo(() => {
      return todos.filter(t => {
        if (t.isCompleted !== showCompleted) return false;
        if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
        if (filterCategory !== 'All' && t.category !== filterCategory) return false;
        return true;
      });
    }, [todos, showCompleted, filterPriority, filterCategory]);

    const sortedTodos = useMemo(() => {
      return [...filteredTodos].sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'priority': {
            const priorityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1, None: 0 };
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            break;
          }
          case 'dueDate':
            comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'category':
            comparison = (a.category || '').localeCompare(b.category || '');
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }, [filteredTodos, sortField, sortDirection]);

    // Stats
    const totalTasks = todos.length;
    const completedTasks = todos.filter(t => t.isCompleted).length;
    const overdueTasks = todos.filter(t => !t.isCompleted && new Date(t.dueDate) < new Date()).length;
    const unprioritizedCount = todos.filter(t => !t.isCompleted && (!t.priority || t.priority === 'None')).length;

    const getPriorityDot = (priority: string) => {
      const colors: Record<string, string> = {
        High: 'bg-red-500',
        Medium: 'bg-amber-400',
        Low: 'bg-emerald-500',
        None: 'bg-gray-300',
      };
      return <span className={`inline-block h-2 w-2 rounded-full ${colors[priority] || colors.None}`} />;
    };

    const getCategoryStyle = (categoryName: string | undefined) => {
      if (!categoryName) return 'bg-gray-50 text-gray-500';
      const map: Record<string, string> = {
        'Urgent!': 'bg-red-50 text-red-700',
        'Sourcing!': 'bg-amber-50 text-amber-700',
        'Boss!': 'bg-violet-50 text-violet-700',
        'Staff! (Team)': 'bg-blue-50 text-blue-700',
        'Projects!': 'bg-emerald-50 text-emerald-700',
        'Admin!': 'bg-gray-100 text-gray-700',
        'Personal!': 'bg-teal-50 text-teal-700',
      };
      return map[categoryName] || 'bg-gray-50 text-gray-500';
    };

    const getDateInfo = (dateString: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dateString);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0)
        return { text: `${Math.abs(diffDays)}d overdue`, className: 'text-red-600 font-semibold', isOverdue: true };
      if (diffDays === 0) return { text: 'Today', className: 'text-amber-600 font-semibold', isOverdue: false };
      if (diffDays === 1) return { text: 'Tomorrow', className: 'text-amber-500', isOverdue: false };
      if (diffDays <= 7) return { text: `${diffDays}d left`, className: 'text-gray-600', isOverdue: false };
      return {
        text: new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        className: 'text-gray-400',
        isOverdue: false,
      };
    };

    return (
      <>
        <Transition appear={true} as={Fragment} show={isOpen}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => {
              if (!isTaskFormOpen) onClose();
            }}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-2">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-200"
                  enterFrom="opacity-0 scale-[0.98] translate-y-2"
                  enterTo="opacity-100 scale-100 translate-y-0"
                  leave="ease-in duration-150"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95">
                  <Dialog.Panel className="w-full max-w-[96vw] xl:max-w-[96vw] transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl ring-1 ring-black/5 transition-all h-[94vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                      <div className="flex items-center gap-5">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Tasks</h3>
                          {overdueTasks > 0 && (
                            <p className="text-[11px] text-red-500 font-medium mt-0.5">{overdueTasks} overdue</p>
                          )}
                        </div>
                        <ProgressRing completed={completedTasks} total={totalTasks} />
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Active/Completed Toggle */}
                        <div className="flex bg-gray-100 rounded-lg p-0.5 mr-2">
                          <button
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!showCompleted ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            onClick={() => setShowCompleted(false)}>
                            Active
                          </button>
                          <button
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${showCompleted ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            onClick={() => setShowCompleted(true)}>
                            Completed
                          </button>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                          <button
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list'
                              ? 'bg-white shadow-sm text-gray-800'
                              : 'text-gray-400 hover:text-gray-600'
                              }`}
                            onClick={() => setViewMode('list')}
                            title="List View">
                            <ListBulletIcon className="h-4 w-4" />
                          </button>
                          <button
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'board'
                              ? 'bg-white shadow-sm text-gray-800'
                              : 'text-gray-400 hover:text-gray-600'
                              }`}
                            onClick={() => setViewMode('board')}
                            title="Kanban Board">
                            <Squares2X2Icon className="h-4 w-4" />
                          </button>
                        </div>

                        {/* AI Priority */}
                        {unprioritizedCount > 0 && (
                          <button
                            onClick={handleAIPrioritySuggest}
                            disabled={isAIPrioritizing}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors disabled:opacity-50"
                            title={`Auto-prioritize ${unprioritizedCount} tasks`}>
                            <SparklesIcon className={`h-3.5 w-3.5 ${isAIPrioritizing ? 'animate-spin' : ''}`} />
                            {isAIPrioritizing ? 'Analyzing...' : `Prioritize ${unprioritizedCount}`}
                          </button>
                        )}

                        {/* Email Create */}
                        <button
                          onClick={() => setIsEmailModalOpen(true)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Create from Email">
                          <EnvelopeIcon className="h-4 w-4" />
                        </button>

                        {/* Add Task */}
                        <button
                          onClick={handleCreateStandalone}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-xs font-medium"
                          title="Add New Task">
                          <PlusIcon className="h-3.5 w-3.5" />
                          New Task
                        </button>

                        <div className="w-px h-6 bg-gray-200 mx-1" />

                        <button
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={onClose}>
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Smart Input */}
                    <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/50">
                      <SmartInput onAdd={handleSmartAdd} />
                    </div>

                    {/* Filter Pills */}
                    {!showCompleted && (
                      <div className="px-6 py-2.5 flex items-center gap-4 border-b border-gray-50 flex-shrink-0">
                        {/* Priority Filters */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">
                            Priority
                          </span>
                          <FilterPill
                            label="All"
                            active={filterPriority === 'All'}
                            onClick={() => setFilterPriority('All')}
                          />
                          <FilterPill
                            label="High"
                            active={filterPriority === 'High'}
                            onClick={() => setFilterPriority('High')}
                            variant="danger"
                          />
                          <FilterPill
                            label="Medium"
                            active={filterPriority === 'Medium'}
                            onClick={() => setFilterPriority('Medium')}
                            variant="warning"
                          />
                          <FilterPill
                            label="Low"
                            active={filterPriority === 'Low'}
                            onClick={() => setFilterPriority('Low')}
                            variant="success"
                          />
                        </div>

                        <div className="w-px h-5 bg-gray-200" />

                        {/* Category Filters */}
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1 flex-shrink-0">
                            Category
                          </span>
                          <FilterPill
                            label="All"
                            active={filterCategory === 'All'}
                            onClick={() => setFilterCategory('All')}
                          />
                          {CATEGORIES.map(cat => (
                            <FilterPill
                              key={cat}
                              label={cat.replace('!', '')}
                              active={filterCategory === cat}
                              onClick={() => setFilterCategory(cat)}
                            />
                          ))}
                        </div>

                        <div className="w-px h-5 bg-gray-200" />

                        {/* Sort */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">
                            Sort
                          </span>
                          {(['priority', 'dueDate', 'title', 'category'] as SortField[]).map(field => (
                            <button
                              className={`px-2 py-1 text-[10px] font-medium rounded-md flex items-center gap-1 capitalize transition-colors ${sortField === field ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                              key={field}
                              onClick={() => handleSort(field)}>
                              {field === 'dueDate' ? 'Due' : field}
                              {sortField === field &&
                                (sortDirection === 'asc' ? (
                                  <ArrowUpIcon className="h-2.5 w-2.5" />
                                ) : (
                                  <ArrowDownIcon className="h-2.5 w-2.5" />
                                ))}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-3">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500 mb-3" />
                          <p className="text-sm">Loading tasks...</p>
                        </div>
                      ) : error ? (
                        <div className="text-center py-12 text-red-500 bg-red-50 rounded-xl border border-red-100 mx-4">
                          <p className="font-medium">Unable to load tasks</p>
                          <p className="text-sm mt-1 mb-3">{error}</p>
                          <button
                            onClick={fetchTodos}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-red-700 bg-white border border-red-200 hover:bg-red-50 transition-colors">
                            Try Again
                          </button>
                        </div>
                      ) : sortedTodos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                          <CheckCircleIcon className="h-12 w-12 text-gray-200 mb-3" />
                          <p className="text-sm font-medium text-gray-500">
                            {showCompleted ? 'No completed tasks' : 'All caught up! 🎉'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {showCompleted
                              ? 'Complete some tasks to see them here'
                              : 'Create a new task to get started'}
                          </p>
                        </div>
                      ) : viewMode === 'board' ? (
                        <ToDoBoard
                          todos={filteredTodos}
                          onStatusChange={handleStatusChange}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggleComplete={handleToggleComplete}
                          onAddDays={handleAddDays}
                          onNotesChange={handleUpdateNotes}
                          onNavigate={onNavigate}
                          onCycleNeonColor={handleCycleNeonColor}
                          onToggleMinimize={handleToggleMinimize}
                          onClose={onClose}
                        />
                      ) : (
                        <div className="space-y-1.5">
                          {sortedTodos.map(todo => {
                            const dateInfo = getDateInfo(todo.dueDate);
                            return (
                              <div
                                className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-150 ${todo.isCompleted
                                  ? 'bg-gray-50/50 opacity-60'
                                  : dateInfo.isOverdue
                                    ? 'bg-white hover:bg-red-50/30 border border-red-100 hover:border-red-200'
                                    : 'bg-white hover:bg-gray-50/80 border border-gray-100 hover:border-gray-200'
                                  }`}
                                key={todo._id}>
                                {/* Overdue accent */}
                                {dateInfo.isOverdue && !todo.isCompleted && (
                                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-red-400 rounded-r-full" />
                                )}

                                {/* Checkbox */}
                                <button
                                  className={`flex-shrink-0 transition-colors ${todo.isCompleted ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500'
                                    }`}
                                  onClick={() => handleToggleComplete(todo)}>
                                  {todo.isCompleted ? (
                                    <CheckCircleIconSolid className="h-5 w-5" />
                                  ) : (
                                    <CheckCircleIcon className="h-5 w-5" />
                                  )}
                                </button>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {getPriorityDot(todo.priority)}
                                    <h4
                                      className={`text-[13px] font-medium truncate ${todo.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'
                                        }`}>
                                      {todo.title}
                                    </h4>
                                    {todo.category && (
                                      <span
                                        className={`inline-block px-1.5 py-0.5 text-[10px] rounded-md font-medium ${getCategoryStyle(
                                          todo.category,
                                        )}`}>
                                        {todo.category.replace('!', '')}
                                      </span>
                                    )}
                                    {todo.attachments && todo.attachments.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        {todo.attachments.map((att, idx) => {
                                          const isDrive = att.storageType === 'drive';
                                          const link = isDrive
                                            ? att.webViewLink
                                            : `/api/todos/attachment?todoId=${todo._id}&index=${idx}`;
                                          return (
                                            <a
                                              key={idx}
                                              href={link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`transition-colors ${isDrive
                                                ? 'text-blue-400 hover:text-blue-600'
                                                : 'text-gray-300 hover:text-gray-500'
                                                }`}
                                              title={`${isDrive ? 'Drive' : 'Download'} - ${att.name}`}
                                              onClick={e => e.stopPropagation()}>
                                              <PaperClipIcon className="h-3 w-3" />
                                            </a>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className={`flex items-center gap-1 text-[11px] ${dateInfo.className}`}>
                                      <CalendarDaysIcon className="h-3 w-3" />
                                      {dateInfo.text}
                                    </span>
                                    {!todo.isCompleted && (
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 border-l border-gray-200 pl-1.5 flex-shrink-0">
                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleAddDays(todo._id, 1);
                                          }}
                                          className="px-1 py-0.5 text-[9px] font-medium text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                          title="Add 1 Day">
                                          +1
                                        </button>
                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleAddDays(todo._id, 3);
                                          }}
                                          className="px-1 py-0.5 text-[9px] font-medium text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                          title="Add 3 Days">
                                          +3
                                        </button>
                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleAddDays(todo._id, 7);
                                          }}
                                          className="px-1 py-0.5 text-[9px] font-medium text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                          title="Add 7 Days">
                                          +7
                                        </button>
                                      </div>
                                    )}
                                    {typeof todo.sourcePageId !== 'string' && todo.sourcePageId?.title && (
                                      <button
                                        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                                        onClick={() => {
                                          const targetId =
                                            todo.tabId &&
                                              !todo.tabId.startsWith('new-') &&
                                              !todo.tabId.startsWith('default-')
                                              ? todo.tabId
                                              : todo.tabName;
                                          onNavigate(todo.sourcePageId as unknown as INotePage, targetId);
                                          onClose();
                                        }}
                                        title="Go to Note">
                                        <ArrowTopRightOnSquareIcon className="h-2.5 w-2.5" />
                                        {todo.sourcePageId.title}
                                      </button>
                                    )}
                                    {todo.notes && (
                                      <p className="text-[11px] text-gray-400 truncate max-w-xs">{todo.notes}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                    onClick={() => handleEdit(todo)}
                                    title="Edit">
                                    <PencilIcon className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                    onClick={() => handleDelete(todo._id)}
                                    title="Delete">
                                    <TrashIcon className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        <div className="relative z-[60]">
          <TaskFormModal
            isOpen={isTaskFormOpen}
            onClose={() => {
              setIsTaskFormOpen(false);
              if (isDirectCreateOpen && onCloseDirectCreate) {
                onCloseDirectCreate();
              }
            }}
            onSave={handleSaveTask}
            initialData={prefilledData ? ({ ...prefilledData } as any) : editingTask || undefined}
            title={editingTask ? 'Edit Task' : 'New Task'}
          />
          <EmailTaskModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            onProceed={handleEmailProceed}
          />
        </div>
      </>
    );
  },
);

ToDoListModal.displayName = 'ToDoListModal';
export default ToDoListModal;
