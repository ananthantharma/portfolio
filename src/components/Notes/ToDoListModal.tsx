/* eslint-disable simple-import-sort/imports, react/jsx-sort-props, react-memo/require-usememo */
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, Listbox, Transition } from '@headlessui/react';
import {
    ArrowDownIcon,
    ArrowTopRightOnSquareIcon,
    ArrowUpIcon,
    CheckCircleIcon,
    ChevronUpDownIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
    XMarkIcon,
    PaperClipIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

import { INotePage } from '@/models/NotePage';
import { IToDo } from '@/models/ToDo';
import TaskFormModal, { TaskFormData } from './TaskFormModal';

interface ToDoListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: INotePage) => void;
}

type SortField = 'priority' | 'dueDate' | 'title' | 'category';
type SortDirection = 'asc' | 'desc';

const PRIORITIES = ['High', 'Medium', 'Low', 'None'];
const CATEGORIES = [
    'Urgent!', 'Sourcing!', 'Boss!', 'Staff! (Team)', 'Projects!', 'Admin!', 'Personal!'
];

// Helper for filter dropdowns
const FilterDropdown = React.memo(({ value, onChange, options, label }: { value: string, onChange: (val: string) => void, options: string[], label: string }) => (
    <Listbox value={value} onChange={onChange}>
        <div className="relative">
            <Listbox.Button className="relative w-32 cursor-default rounded-lg bg-white py-1.5 pl-3 pr-8 text-left border border-gray-200 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-xs">
                <span className="block truncate">{value === 'All' ? label : value}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </span>
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-xs z-10">
                    <Listbox.Option value="All" className={({ active }) => `relative cursor-default select-none py-2 pl-3 pr-4 ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}`}>
                        {({ selected }) => (
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>All</span>
                        )}
                    </Listbox.Option>
                    {options.map((opt, idx) => (
                        <Listbox.Option key={idx} value={opt} className={({ active }) => `relative cursor-default select-none py-2 pl-3 pr-4 ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}`}>
                            {({ selected }) => (
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{opt}</span>
                            )}
                        </Listbox.Option>
                    ))}
                </Listbox.Options>
            </Transition>
        </div>
    </Listbox>
));
FilterDropdown.displayName = 'FilterDropdown';

const ToDoListModal: React.FC<ToDoListModalProps> = React.memo(({ isOpen, onClose, onNavigate }) => {
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

    useEffect(() => {
        if (isOpen) {
            fetchTodos();
        }
    }, [isOpen]);

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
            // Optimistic update
            setTodos(prev => prev.map(t => t._id === todo._id ? { ...t, isCompleted: newStatus } as IToDo : t));

            await fetch(`/api/todos/${todo._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isCompleted: newStatus }),
            });
        } catch (error) {
            console.error('Error updating status:', error);
            fetchTodos(); // Revert
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            // Optimistic update
            setTodos(prev => prev.filter(t => t._id !== id));
            await fetch(`/api/todos/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.error('Error deleting task:', error);
            fetchTodos(); // Revert
        }
    };

    const handleEdit = (todo: IToDo) => {
        setEditingTask(todo);
        setIsTaskFormOpen(true);
    };

    const handleCreateStandalone = () => {
        setEditingTask(null);
        setIsTaskFormOpen(true);
    };

    const handleSaveTask = async (data: TaskFormData) => {
        try {
            if (editingTask) {
                // Update existing
                await fetch(`/api/todos/${editingTask._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
            } else {
                // Create new standalone
                await fetch('/api/todos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
            }
            setIsTaskFormOpen(false);
            setEditingTask(null);
            // Refresh list to show change
            fetchTodos();
        } catch (error) {
            console.error('Error saving task:', error);
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

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'High':
                return <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">High</span>;
            case 'Medium':
                return <span className="inline-flex items-center gap-1 rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Medium</span>;
            case 'Low':
                return <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Low</span>;
            default:
                return <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">None</span>;
        }
    };

    const getCategoryStyle = (categoryName: string | undefined) => {
        if (!categoryName) return 'bg-gray-50 text-gray-500 border border-gray-200';
        const map: Record<string, string> = {
            'Urgent!': 'bg-red-50 text-red-700 border border-red-200',
            'Sourcing!': 'bg-amber-50 text-amber-700 border border-amber-200',
            'Boss!': 'bg-purple-50 text-purple-700 border border-purple-200',
            'Staff! (Team)': 'bg-blue-50 text-blue-700 border border-blue-200',
            'Projects!': 'bg-green-50 text-green-700 border border-green-200',
            'Admin!': 'bg-gray-50 text-gray-700 border border-gray-200',
            'Personal!': 'bg-teal-50 text-teal-700 border border-teal-200',
        };
        return map[categoryName] || 'bg-gray-50 text-gray-500 border border-gray-200';
    };

    const getDateStyle = (dateString: Date) => {
        const today = new Date();
        const target = new Date(dateString);
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 3) return 'text-red-700 font-bold';
        if (diffDays >= 7) return 'text-green-700 font-medium';
        return 'text-gray-500';
    };

    return (
        <>
            <Transition appear={true} as={Fragment} show={isOpen}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all h-[80vh] flex flex-col">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center mb-4 flex-shrink-0 border-b pb-3">
                                        <div className="flex items-center gap-4">
                                            <span>To Do List</span>
                                            <div className="flex bg-gray-100 rounded-lg p-1">
                                                <button
                                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${!showCompleted ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                                    onClick={() => setShowCompleted(false)}>
                                                    Active
                                                </button>
                                                <button
                                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${showCompleted ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                                    onClick={() => setShowCompleted(true)}>
                                                    Completed
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <FilterDropdown label="Priority" value={filterPriority} onChange={setFilterPriority} options={PRIORITIES} />
                                            <FilterDropdown label="Category" value={filterCategory} onChange={setFilterCategory} options={CATEGORIES} />

                                            <button
                                                onClick={handleCreateStandalone}
                                                className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors ml-2"
                                                title="Add New Task">
                                                <PlusIcon className="h-5 w-5" />
                                            </button>

                                            <button className="text-gray-400 hover:text-gray-500 ml-4" onClick={onClose}>
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </Dialog.Title>

                                    {!showCompleted && (
                                        <div className="flex gap-2 mb-4 flex-shrink-0 flex-wrap">
                                            {(['priority', 'dueDate', 'title', 'category'] as SortField[]).map((field) => (
                                                <button
                                                    className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1 capitalize transition-colors ${sortField === field ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                    key={field}
                                                    onClick={() => handleSort(field)}>
                                                    {field === 'dueDate' ? 'Due Date' : field}
                                                    {sortField === field && (
                                                        sortDirection === 'asc' ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                                        {loading ? (
                                            <div className="text-center py-10 text-gray-400">Loading tasks...</div>
                                        ) : error ? (
                                            <div className="text-center py-10 text-red-500 bg-red-50 rounded-lg border border-red-100 mx-4">
                                                <p className="font-medium">Unable to load tasks</p>
                                                <p className="text-sm mt-1 mb-3">{error}</p>
                                                <button
                                                    onClick={fetchTodos}
                                                    className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                                    Try Again
                                                </button>
                                            </div>
                                        ) : sortedTodos.length === 0 ? (
                                            <div className="text-center py-10 text-gray-400">No {showCompleted ? 'completed' : 'active'} tasks found.</div>
                                        ) : (
                                            sortedTodos.map(todo => (
                                                <div className={`p-2 border rounded-lg transition-colors bg-white shadow-sm group ${todo.isCompleted ? 'border-gray-100 bg-gray-50 opacity-75' : 'border-gray-200 hover:border-indigo-200'}`} key={todo._id}>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            className={`flex-shrink-0 transition-colors ${todo.isCompleted ? 'text-green-500' : 'text-gray-300 hover:text-indigo-500'}`}
                                                            onClick={() => handleToggleComplete(todo)}
                                                            title={todo.isCompleted ? "Mark as active" : "Mark as complete"}>
                                                            {todo.isCompleted ? <CheckCircleIconSolid className="h-6 w-6" /> : <CheckCircleIcon className="h-6 w-6" />}
                                                        </button>

                                                        <div className="flex-1 min-w-0 flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className={`font-medium truncate ${todo.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{todo.title}</h4>
                                                                    {getPriorityBadge(todo.priority)}
                                                                    {todo.category && (
                                                                        <span className={`inline-block px-2 py-0.5 text-[10px] rounded-md ${getCategoryStyle(todo.category)}`}>
                                                                            {todo.category}
                                                                        </span>
                                                                    )}
                                                                    {todo.attachments && todo.attachments.length > 0 && (
                                                                        <span className="flex items-center gap-0.5 text-gray-400" title={`${todo.attachments.length} attachments`}>
                                                                            <PaperClipIcon className="h-3.5 w-3.5" />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 text-xs">
                                                                    <span className={getDateStyle(todo.dueDate)}>
                                                                        Due: {new Date(todo.dueDate).toLocaleDateString()}
                                                                    </span>
                                                                    {typeof todo.sourcePageId !== 'string' && todo.sourcePageId?.title && (
                                                                        <button
                                                                            className="flex items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                                                            onClick={() => {
                                                                                onNavigate(todo.sourcePageId as unknown as INotePage);
                                                                                onClose();
                                                                            }}
                                                                            title="Go to Note">
                                                                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                                                            {todo.sourcePageId.title}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {todo.notes && (
                                                                    <p className="mt-1 text-xs text-gray-500 truncate max-w-xl">
                                                                        {todo.notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                className="p-1 text-gray-400 hover:text-indigo-500 rounded-md hover:bg-indigo-50 transition-colors"
                                                                onClick={() => handleEdit(todo)}
                                                                title="Edit task">
                                                                <PencilIcon className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                                                                onClick={() => handleDelete(todo._id)}
                                                                title="Delete task">
                                                                <TrashIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <TaskFormModal
                isOpen={isTaskFormOpen}
                onClose={() => setIsTaskFormOpen(false)}
                onSave={handleSaveTask}
                initialData={editingTask || undefined}
                title={editingTask ? 'Edit Task' : 'New Task'}
            />
        </>
    );
});

ToDoListModal.displayName = 'ToDoListModal';
export default ToDoListModal;
