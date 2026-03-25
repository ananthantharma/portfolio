/* eslint-disable simple-import-sort/imports, react/jsx-sort-props, react-memo/require-usememo, react-memo/require-memo, @typescript-eslint/no-explicit-any */
import React, {Fragment, useEffect, useMemo, useRef, useState} from 'react';
import {Dialog, Transition} from '@headlessui/react';
import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  ListBulletIcon,
  PaperClipIcon,
  PencilIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
  SparklesIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';
import {CheckCircleIcon as CheckCircleIconSolid} from '@heroicons/react/24/solid';
import {INotePage} from '@/models/NotePage';
import {IToDo} from '@/models/ToDo';
import TaskFormModal, {TaskFormData} from './TaskFormModal';
import SmartInput from './SmartInput';
import ToDoBoard from './ToDoBoard';
import EmailTaskModal from './EmailTaskModal';

interface ToDoListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: INotePage, tabId?: string) => void;
  isDirectCreateOpen?: boolean;
  onCloseDirectCreate?: () => void;
  isStandalone?: boolean;
  initialView?: 'list' | 'board';
}

type SortField = 'priority' | 'dueDate' | 'title' | 'category';
type SortDirection = 'asc' | 'desc';

const CATEGORIES = ['Urgent!', 'Sourcing!', 'Boss!', 'Staff! (Team)', 'Projects!', 'Admin!', 'Personal!'];

// Compact dropdown for filters
const FilterDropdown = React.memo(
  ({
    label,
    value,
    options,
    onChange,
    accentColor,
  }: {
    label: string;
    value: string;
    options: {label: string; value: string}[];
    onChange: (v: string) => void;
    accentColor?: string;
  }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    const current = options.find(o => o.value === value);
    const isActive = value !== 'All' && value !== options[0]?.value;

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            isActive
              ? `${accentColor || 'bg-white/20 border-white/30'} text-white`
              : 'bg-white/10 border-white/15 text-white/70 hover:bg-white/15 hover:text-white'
          }`}>
          <span>
            {label}: <span className="font-semibold">{current?.label ?? value}</span>
          </span>
          <ChevronDownIcon className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full mt-1.5 left-0 z-50 min-w-[140px] bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  value === opt.value ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);
FilterDropdown.displayName = 'FilterDropdown';

// Sort dropdown
const SortDropdown = React.memo(
  ({
    sortField,
    sortDirection,
    onSort,
  }: {
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (f: SortField) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fields: {value: SortField; label: string}[] = [
      {value: 'dueDate', label: 'Due Date'},
      {value: 'priority', label: 'Priority'},
      {value: 'title', label: 'Title'},
      {value: 'category', label: 'Category'},
    ];
    const current = fields.find(f => f.value === sortField);

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 border border-white/15 text-white/70 hover:bg-white/15 hover:text-white transition-all">
          Sort: <span className="text-white font-semibold">{current?.label}</span>
          <span className="ml-0.5 text-[10px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
          <ChevronDownIcon className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full mt-1.5 left-0 z-50 min-w-[140px] bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden">
            {fields.map(f => (
              <button
                key={f.value}
                onClick={() => {
                  onSort(f.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  sortField === f.value ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}>
                {f.label} {sortField === f.value && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);
SortDropdown.displayName = 'SortDropdown';

const ToDoListModal: React.FC<ToDoListModalProps> = React.memo(
  ({isOpen, onClose, onNavigate, isDirectCreateOpen, onCloseDirectCreate, isStandalone, initialView}) => {
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
    const [viewMode, setViewMode] = useState<'list' | 'board'>(initialView ?? (isStandalone ? 'list' : 'board'));
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
        setTodos(prev => prev.map(t => (t._id === todo._id ? ({...t, isCompleted: newStatus} as IToDo) : t)));
        await fetch(`/api/todos/${todo._id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({isCompleted: newStatus}),
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
        await fetch(`/api/todos/${id}`, {method: 'DELETE'});
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

    const handleSmartAdd = (data: {title: string; priority: string; dueDate: Date | null}) => {
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
      setTodos(prev => prev.map(t => (t._id === id ? ({...t, status: newStatus} as any) : t)));
      try {
        await fetch(`/api/todos/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({status: newStatus}),
        });
      } catch (error) {
        console.error('Failed to update status', error);
        fetchTodos();
      }
    };

    const handleReorder = async (activeId: string, overId: string) => {
      // Find the column these tasks belong to
      const colTodos = todos.filter(t => {
        const activeTodo = todos.find(a => a._id === activeId);
        return (
          activeTodo &&
          (t.status || (t.isCompleted ? 'done' : 'todo')) ===
            (activeTodo.status || (activeTodo.isCompleted ? 'done' : 'todo'))
        );
      });

      const sorted = [...colTodos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const activeIndex = sorted.findIndex(t => t._id === activeId);
      const overIndex = sorted.findIndex(t => t._id === overId);

      if (activeIndex === -1 || overIndex === -1) return;

      // Reorder array
      const reordered = [...sorted];
      const [moved] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, moved);

      // Assign new order values
      const updates = reordered.map((t, i) => ({id: t._id, order: i}));

      // Optimistic update
      setTodos(prev =>
        prev.map(t => {
          const update = updates.find(u => u.id === t._id);
          return update ? ({...t, order: update.order} as any) : t;
        }),
      );

      // Persist
      try {
        await fetch('/api/todos/reorder', {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({updates}),
        });
      } catch (error) {
        console.error('Error reordering todos:', error);
        fetchTodos();
      }
    };

    const handleCycleNeonColor = async (todo: IToDo) => {
      try {
        const colors: Array<'red' | 'blue' | 'green' | null> = ['red', 'blue', 'green', null];
        const currentIndex = colors.indexOf(todo.neonColor || null);
        const nextIndex = (currentIndex + 1) % colors.length;
        const newValue = colors[nextIndex];

        setTodos(prev => prev.map(t => (t._id === todo._id ? ({...t, neonColor: newValue} as any) : t)));
        await fetch(`/api/todos/${todo._id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({neonColor: newValue}),
        });
      } catch (error) {
        console.error('Error cycling neon color:', error);
        fetchTodos();
      }
    };

    const handleToggleMinimize = async (todo: IToDo) => {
      try {
        const newValue = !(todo.isMinimized ?? true);
        setTodos(prev => prev.map(t => (t._id === todo._id ? ({...t, isMinimized: newValue} as any) : t)));
        await fetch(`/api/todos/${todo._id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({isMinimized: newValue}),
        });
      } catch (error) {
        console.error('Error toggling minimize:', error);
        fetchTodos();
      }
    };

    const handleToggleAllMinimize = async (minimize: boolean) => {
      try {
        const toUpdate = todos.filter(t => (t.isMinimized ?? true) !== minimize);
        if (toUpdate.length === 0) return;

        setTodos(prev => prev.map(t => {
          const isTarget = toUpdate.some(u => u._id === t._id);
          return isTarget ? ({...t, isMinimized: minimize} as any) : t;
        }));

        await Promise.all(
          toUpdate.map(t => 
            fetch(`/api/todos/${t._id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({isMinimized: minimize}),
            })
          )
        );
      } catch (error) {
        console.error('Error toggling bulk minimize:', error);
        fetchTodos();
      }
    };

    const handleAddDays = async (id: string, days: number) => {
      const todo = todos.find(t => t._id === id);
      if (!todo) return;
      const newDueDate = new Date(todo.dueDate);
      newDueDate.setDate(newDueDate.getDate() + days);

      setTodos(prev => prev.map(t => (t._id === id ? ({...t, dueDate: newDueDate.toISOString()} as any) : t)));
      try {
        await fetch(`/api/todos/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({dueDate: newDueDate.toISOString()}),
        });
      } catch (error) {
        console.error('Failed to update due date', error);
        fetchTodos();
      }
    };

    const handleUpdateSubtasks = async (id: string, newSubtasks: any[]) => {
      setTodos(prev => prev.map(t => (t._id === id ? ({...t, subtasks: newSubtasks} as any) : t)));
      try {
        await fetch(`/api/todos/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({subtasks: newSubtasks}),
        });
      } catch (error) {
        console.error('Failed to update subtasks', error);
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

        if (data.subtasks) {
          formData.append('subtasks', JSON.stringify(data.subtasks));
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
          headers: {'Content-Type': 'application/json'},
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
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({priority: suggestion.priority}),
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
            const priorityOrder: Record<string, number> = {High: 3, Medium: 2, Low: 1, None: 0};
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
    const unprioritizedCount = todos.filter(t => !t.isCompleted && (!t.priority || t.priority === 'None')).length;

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
        return {text: `${Math.abs(diffDays)}d overdue`, className: 'text-red-600 font-semibold', isOverdue: true};
      if (diffDays === 0) return {text: 'Today', className: 'text-amber-600 font-semibold', isOverdue: false};
      if (diffDays === 1) return {text: 'Tomorrow', className: 'text-amber-500', isOverdue: false};
      if (diffDays <= 7) return {text: `${diffDays}d left`, className: 'text-gray-600', isOverdue: false};
      return {
        text: new Date(dateString).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
        className: 'text-gray-400',
        isOverdue: false,
      };
    };

    const content = (
      <div
        className={`w-full ${
          isStandalone
            ? 'h-screen flex flex-col'
            : 'max-w-[96vw] xl:max-w-[96vw] transform overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/5 h-[94vh] flex flex-col'
        } bg-[#0f1117] text-left transition-all`}>
        {/* ── Dark header ── */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3 bg-[#0f1117] border-b border-white/8">
          {/* Row 1: title + actions */}
          <div
            className={`flex ${
              isStandalone ? 'flex-col sm:flex-row items-start sm:items-center gap-4' : 'items-center justify-between'
            } mb-3`}>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">Tasks</h3>
                <div className="flex items-center ml-2 space-x-1">
                  <button
                    onClick={() => handleToggleAllMinimize(true)}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Collapse all cards"
                  >
                    <ArrowsPointingInIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleAllMinimize(false)}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Expand all cards"
                  >
                    <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Active / Done toggle */}
              <div className="flex bg-white/10 rounded-lg p-0.5 ml-auto sm:ml-0">
                <button
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    !showCompleted ? 'bg-white text-gray-900 shadow-sm' : 'text-white/50 hover:text-white/70'
                  }`}
                  onClick={() => setShowCompleted(false)}>
                  Active
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    showCompleted ? 'bg-white text-gray-900 shadow-sm' : 'text-white/50 hover:text-white/70'
                  }`}
                  onClick={() => setShowCompleted(true)}>
                  Done
                </button>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 ${
                isStandalone ? 'w-full overflow-x-auto pb-1 no-scrollbar justify-start' : ''
              }`}>
              {/* View toggle */}
              <div className="flex bg-white/10 rounded-lg p-0.5">
                <button
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-white/50 hover:text-white/70'
                  }`}
                  onClick={() => setViewMode('list')}
                  title="List View">
                  <ListBulletIcon className="h-4 w-4" />
                </button>
                <button
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'board' ? 'bg-white text-gray-800 shadow-sm' : 'text-white/50 hover:text-white/70'
                  }`}
                  onClick={() => setViewMode('board')}
                  title="Kanban">
                  <Squares2X2Icon className="h-4 w-4" />
                </button>
              </div>

              {/* AI Priority */}
              {unprioritizedCount > 0 && (!isStandalone || initialView === 'board') && (
                <button
                  onClick={handleAIPrioritySuggest}
                  disabled={isAIPrioritizing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-300 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/20 rounded-lg transition-all disabled:opacity-50"
                  title={`Auto-prioritize ${unprioritizedCount} tasks`}>
                  <SparklesIcon className={`h-3.5 w-3.5 ${isAIPrioritizing ? 'animate-spin' : ''}`} />
                  {isAIPrioritizing ? 'Analyzing…' : `AI Prioritize`}
                </button>
              )}

              {/* Email */}
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="p-2 text-white/40 hover:text-white/70 rounded-lg hover:bg-white/10 transition-colors"
                title="Create from Email">
                <EnvelopeIcon className="h-4 w-4" />
              </button>

              {/* New Task */}
              <button
                onClick={handleCreateStandalone}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-colors text-xs font-semibold shadow-lg shadow-indigo-500/20">
                <PlusIcon className="h-3.5 w-3.5" />
                New Task
              </button>

              {!isStandalone && (
                <>
                  <div className="w-px h-5 flex-shrink-0 bg-white/10" />

                  <button
                    className="p-2 flex-shrink-0 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                    onClick={onClose}>
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Row 2: smart input */}
          {(!isStandalone || initialView === 'board') && (
            <div className="mb-3">
              <SmartInput onAdd={handleSmartAdd} />
            </div>
          )}

          {/* Row 3: filter & sort dropdowns */}
          {!showCompleted && (!isStandalone || initialView === 'board') && (
            <div className="flex items-center gap-2 flex-wrap">
              <FilterDropdown
                label="Priority"
                value={filterPriority}
                options={[
                  {label: 'All', value: 'All'},
                  {label: '🔴 High', value: 'High'},
                  {label: '🟡 Medium', value: 'Medium'},
                  {label: '🟢 Low', value: 'Low'},
                ]}
                onChange={setFilterPriority}
                accentColor="bg-indigo-500/30 border-indigo-400/30"
              />
              <FilterDropdown
                label="Category"
                value={filterCategory}
                options={[
                  {label: 'All', value: 'All'},
                  ...CATEGORIES.map(c => ({label: c.replace('!', ''), value: c})),
                ]}
                onChange={setFilterCategory}
                accentColor="bg-indigo-500/30 border-indigo-400/30"
              />
              <SortDropdown sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              {/* Active filter count badge */}
              {(filterPriority !== 'All' || filterCategory !== 'All') && (
                <button
                  onClick={() => {
                    setFilterPriority('All');
                    setFilterCategory('All');
                  }}
                  className="px-2 py-1 text-[10px] font-medium text-red-400 bg-red-500/15 border border-red-400/20 rounded-md hover:bg-red-500/25 transition-colors">
                  Clear filters ×
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Content (light bg) ── */}
        <div className="flex-1 overflow-y-auto bg-[#f8f9fb] min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-500 mb-3" />
              <p className="text-sm">Loading tasks…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 bg-red-50 rounded-xl border border-red-100 mx-6 mt-4">
              <p className="font-medium">Unable to load tasks</p>
              <p className="text-sm mt-1 mb-3">{error}</p>
              <button
                onClick={fetchTodos}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-red-700 bg-white border border-red-200 hover:bg-red-50 transition-colors">
                Try Again
              </button>
            </div>
          ) : sortedTodos.length === 0 && viewMode === 'list' ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <CheckCircleIcon className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">
                {showCompleted ? 'No completed tasks yet' : 'All clear! 🎉'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {showCompleted ? 'Complete some tasks to see them here' : 'Add a task above to get started'}
              </p>
            </div>
          ) : viewMode === 'board' ? (
            <div className="h-full p-4">
              <ToDoBoard
                todos={[...filteredTodos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleComplete={handleToggleComplete}
                onAddDays={handleAddDays}
                onSubtasksChange={handleUpdateSubtasks}
                onNavigate={onNavigate}
                onCycleNeonColor={handleCycleNeonColor}
                onToggleMinimize={handleToggleMinimize}
                onReorder={handleReorder}
                onClose={onClose}
              />
            </div>
          ) : (
            <div className={`p-4 ${isStandalone ? 'space-y-3 sm:space-y-4 max-w-3xl mx-auto' : 'space-y-1'}`}>
              {sortedTodos.map(todo => {
                const dateInfo = getDateInfo(todo.dueDate);
                const priorityAccent: Record<string, string> = {
                  High: 'bg-red-500',
                  Medium: 'bg-amber-400',
                  Low: 'bg-emerald-400',
                  None: 'bg-gray-200',
                };

                if (isStandalone) {
                  return (
                    <div
                      className={`group relative flex items-start flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5 rounded-3xl transition-all duration-200 border shadow-sm ${
                        todo.isCompleted
                          ? 'bg-slate-50 border-gray-100 opacity-60'
                          : dateInfo.isOverdue
                          ? 'bg-white border-red-200 hover:shadow-md'
                          : 'bg-white border-gray-100/80 hover:border-indigo-100 hover:shadow-md'
                      }`}
                      key={todo._id}>
                      {/* Priority left bar for mobile */}
                      <div
                        className={`absolute left-0 inset-y-4 w-1 rounded-r-full ${
                          priorityAccent[todo.priority] || priorityAccent.None
                        }`}
                      />

                      <div className="flex gap-4 items-start w-full">
                        {/* Checkbox */}
                        <button
                          className={`flex-shrink-0 mt-0.5 transition-all ${
                            todo.isCompleted ? 'text-emerald-500 scale-110' : 'text-gray-300 hover:text-emerald-400'
                          }`}
                          onClick={() => handleToggleComplete(todo)}>
                          {todo.isCompleted ? (
                            <CheckCircleIconSolid className="h-6 w-6" />
                          ) : (
                            <div className="h-6 w-6 rounded-full border-2 border-gray-300 hover:border-emerald-400 transition-colors" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                          <div className="flex justify-between items-start">
                            <h4
                              className={`text-[15px] sm:text-[16px] font-semibold tracking-tight ${
                                todo.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                              }`}>
                                {todo.title}
                              </h4>

                              {/* Subtasks Checklist */}
                              <div className="mt-1 space-y-1">
                                {todo.subtasks && todo.subtasks.length > 0 && (
                                  <>
                                    {/* Next Subtask / Summary View */}
                                    {(todo.isMinimized ?? true) ? (
                                      <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-gray-50 border border-gray-100/50 max-w-fit">
                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                                        <span className="text-[11px] text-gray-500 truncate max-w-[200px]">
                                          {todo.subtasks.find(s => !s.isCompleted)?.title || 'All caught up!'}
                                        </span>
                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleToggleMinimize(todo);
                                          }}
                                          className="text-[10px] text-indigo-500 font-semibold hover:underline ml-1">
                                          Expand
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Checklist
                                          </span>
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              handleToggleMinimize(todo);
                                            }}
                                            className="text-[10px] text-gray-400 hover:text-gray-600 font-medium">
                                            Collapse
                                          </button>
                                        </div>
                                        <div className="space-y-1.5">
                                          {todo.subtasks.map((st, idx) => (
                                            <div key={st._id || idx} className="flex items-start gap-2 group/st">
                                              <button
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  const newSt = [...(todo.subtasks || [])];
                                                  newSt[idx] = {...newSt[idx], isCompleted: !newSt[idx].isCompleted};
                                                  handleUpdateSubtasks(todo._id, newSt);
                                                }}
                                                className={`flex-shrink-0 mt-0.5 transition-colors ${
                                                  st.isCompleted ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'
                                                }`}>
                                                {st.isCompleted ? (
                                                  <CheckCircleIconSolid className="h-3.5 w-3.5" />
                                                ) : (
                                                  <div className="h-3 w-3 rounded-sm border border-gray-300" />
                                                )}
                                              </button>
                                              <span
                                                className={`text-[12px] leading-tight flex-1 ${
                                                  st.isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'
                                                }`}>
                                                {st.title}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={() => handleEdit(todo)}
                                className="p-2 bg-gray-50 text-gray-500 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors">
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(todo._id)}
                                className="p-2 bg-gray-50 text-gray-500 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors">
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {todo.priority && todo.priority !== 'None' && (
                              <span
                                className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  todo.priority === 'High'
                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                    : todo.priority === 'Medium'
                                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                }`}>
                                {todo.priority}
                              </span>
                            )}
                            {todo.category && (
                              <span
                                className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-medium border border-gray-100 ${getCategoryStyle(
                                  todo.category,
                                )}`}>
                                {todo.category.replace('!', '')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-[12px] flex items-center gap-1.5 font-medium ${dateInfo.className}`}>
                              <CalendarDaysIcon className="h-4 w-4" />
                              {dateInfo.text}
                            </span>

                            {/* Quick date nudge (Mobile friendly) */}
                            {!todo.isCompleted && (
                              <div className="flex items-center gap-1 pb-1 sm:pb-0">
                                {[1, 3, 7].map(d => (
                                  <button
                                    key={d}
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleAddDays(todo._id, d);
                                    }}
                                    className="px-2 py-1 bg-gray-50 text-[10px] font-bold text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-100 rounded-lg transition-colors">
                                    +{d}d
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 border ${
                      todo.isCompleted
                        ? 'bg-white/60 border-gray-100 opacity-55'
                        : dateInfo.isOverdue
                        ? 'bg-white border-red-100 hover:border-red-200 hover:shadow-sm'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                    key={todo._id}>
                    {/* Priority bar */}
                    <div
                      className={`absolute left-0 inset-y-3 w-[3px] rounded-r-full ${
                        priorityAccent[todo.priority] || priorityAccent.None
                      }`}
                    />

                    {/* Checkbox */}
                    <button
                      className={`flex-shrink-0 ml-1 transition-all ${
                        todo.isCompleted ? 'text-emerald-500 scale-110' : 'text-gray-300 hover:text-emerald-400'
                      }`}
                      onClick={() => handleToggleComplete(todo)}>
                      {todo.isCompleted ? (
                        <CheckCircleIconSolid className="h-[18px] w-[18px]" />
                      ) : (
                        <div className="h-[18px] w-[18px] rounded-full border-2 border-gray-300 hover:border-emerald-400 transition-colors" />
                      )}
                    </button>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[13px] font-medium ${
                            todo.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'
                          }`}>
                          {todo.title}
                        </span>
                        {todo.category && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${getCategoryStyle(
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
                                  className={`transition-colors ${
                                    isDrive ? 'text-blue-400 hover:text-blue-600' : 'text-gray-300 hover:text-gray-500'
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

                      {/* Subtasks Checklist */}
                      {todo.subtasks && todo.subtasks.length > 0 && (
                        <div className="mt-1.5 flex flex-col gap-1">
                          {(todo.isMinimized ?? true) ? (
                            <div
                              className="flex items-center gap-2 group/pv cursor-pointer"
                              onClick={() => handleToggleMinimize(todo)}>
                              <div className="h-1 w-1 rounded-full bg-gray-300 group-hover/pv:bg-indigo-400" />
                              <span className="text-[11px] text-gray-400 truncate max-w-[300px]">
                                {todo.subtasks.find(s => !s.isCompleted)?.title || 'All complete'}
                              </span>
                              <span className="text-[10px] text-indigo-400 opacity-0 group-hover/pv:opacity-100 transition-opacity">
                                • Expand
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 space-y-1.5 pl-3 border-l-2 border-indigo-100 mb-2 py-1">
                              {todo.subtasks.map((st, idx) => (
                                <div key={st._id || idx} className="flex items-start gap-2">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      const newSt = [...(todo.subtasks || [])];
                                      newSt[idx] = {...newSt[idx], isCompleted: !newSt[idx].isCompleted};
                                      handleUpdateSubtasks(todo._id, newSt);
                                    }}
                                    className={`flex-shrink-0 mt-0.5 transition-colors ${
                                      st.isCompleted ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'
                                    }`}>
                                    {st.isCompleted ? (
                                      <CheckCircleIconSolid className="h-3 w-3" />
                                    ) : (
                                      <div className="h-2.5 w-2.5 rounded-sm border border-gray-300" />
                                    )}
                                  </button>
                                  <span
                                    className={`text-[11px] leading-tight flex-1 ${
                                      st.isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'
                                    }`}>
                                    {st.title}
                                  </span>
                                </div>
                              ))}
                              <button
                                onClick={() => handleToggleMinimize(todo)}
                                className="text-[10px] text-gray-400 hover:text-gray-600 font-medium pt-1">
                                Collapse checklist
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className={`text-[11px] flex items-center gap-1 ${dateInfo.className}`}>
                          <CalendarDaysIcon className="h-3 w-3" />
                          {dateInfo.text}
                        </span>
                        {/* Quick date nudge */}
                        {!todo.isCompleted && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity border-l border-gray-100 pl-2">
                            {[1, 3, 7].map(d => (
                              <button
                                key={d}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleAddDays(todo._id, d);
                                }}
                                className="px-1.5 py-0.5 text-[9px] font-semibold text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                +{d}d
                              </button>
                            ))}
                          </div>
                        )}
                        {typeof todo.sourcePageId !== 'string' && todo.sourcePageId?.title && (
                          <button
                            className="flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-indigo-500 transition-colors"
                            onClick={() => {
                              const targetId =
                                todo.tabId && !todo.tabId.startsWith('new-') && !todo.tabId.startsWith('default-')
                                  ? todo.tabId
                                  : todo.tabName;
                              onNavigate(todo.sourcePageId as unknown as INotePage, targetId);
                              onClose();
                            }}>
                            <ArrowTopRightOnSquareIcon className="h-2.5 w-2.5" />
                            {todo.sourcePageId.title}
                          </button>
                        )}
                        {todo.notes && <p className="text-[11px] text-gray-400 truncate max-w-xs">{todo.notes}</p>}
                      </div>
                    </div>

                    {/* Hover actions */}
                    <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
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
      </div>
    );

    const helperModals = (
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
          initialData={prefilledData ? ({...prefilledData} as any) : editingTask || undefined}
          title={editingTask ? 'Edit Task' : 'New Task'}
        />
        <EmailTaskModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          onProceed={handleEmailProceed}
        />
      </div>
    );

    if (isStandalone) {
      return (
        <React.Fragment>
          {content}
          {helperModals}
        </React.Fragment>
      );
    }

    return (
      <React.Fragment>
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
                  <Dialog.Panel as={Fragment}>{content}</Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
        {helperModals}
      </React.Fragment>
    );
  },
);

ToDoListModal.displayName = 'ToDoListModal';
export default ToDoListModal;
