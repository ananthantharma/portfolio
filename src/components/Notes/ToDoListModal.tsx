import { Dialog, Transition } from '@headlessui/react';
import {
    ArrowDownIcon,
    ArrowTopRightOnSquareIcon,
    ArrowUpIcon,
    CheckCircleIcon,
    TrashIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import React, { Fragment, useEffect, useMemo, useState } from 'react';

import { INotePage } from '@/models/NotePage';
import { IToDo } from '@/models/ToDo';

interface ToDoListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: INotePage) => void;
}

type SortField = 'priority' | 'dueDate' | 'title' | 'category';
type SortDirection = 'asc' | 'desc';

const ToDoListModal: React.FC<ToDoListModalProps> = React.memo(({ isOpen, onClose, onNavigate }) => {
    const [todos, setTodos] = useState<IToDo[]>([]);
    const [loading, setLoading] = useState(false);
    const [sortField, setSortField] = useState<SortField>('dueDate');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [showCompleted, setShowCompleted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTodos();
        }
    }, [isOpen]);

    const fetchTodos = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/todos');
            const data = await response.json();
            if (data.success) {
                setTodos(data.data);
            }
        } catch (error) {
            console.error('Error fetching todos:', error);
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
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const filteredTodos = useMemo(() => {
        return todos.filter(t => t.isCompleted === showCompleted);
    }, [todos, showCompleted]);

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
                                    <button className="text-gray-400 hover:text-gray-500" onClick={onClose}>
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </Dialog.Title>

                                {!showCompleted && (
                                    <div className="flex gap-2 mb-4 flex-shrink-0">
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
    );
});

ToDoListModal.displayName = 'ToDoListModal';
export default ToDoListModal;
