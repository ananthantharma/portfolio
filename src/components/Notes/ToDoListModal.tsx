import { Dialog, Transition } from '@headlessui/react';
import { ArrowDownIcon, ArrowUpIcon, ExclamationCircleIcon, ExclamationTriangleIcon, MinusCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useMemo, useState } from 'react';

import { IToDo } from '@/models/ToDo';

interface ToDoListModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SortField = 'priority' | 'dueDate' | 'title' | 'category';
type SortDirection = 'asc' | 'desc';

const ToDoListModal: React.FC<ToDoListModalProps> = React.memo(({ isOpen, onClose }) => {
    const [todos, setTodos] = useState<IToDo[]>([]);
    const [loading, setLoading] = useState(false);
    const [sortField, setSortField] = useState<SortField>('dueDate');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedTodos = useMemo(() => {
        return [...todos].sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'priority': {
                    // Custom priority order
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
    }, [todos, sortField, sortDirection]);

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'High': return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
            case 'Medium': return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />;
            case 'Low': return <MinusCircleIcon className="h-5 w-5 text-green-500" />;
            default: return <MinusCircleIcon className="h-5 w-5 text-gray-300" />;
        }
    };

    // Helper to map category to color style (Redundant but safe for now to keep consistent with ToDoModal)
    const getCategoryStyle = (categoryName: string | undefined) => {
        if (!categoryName) return 'bg-gray-50 text-gray-500';
        const map: Record<string, string> = {
            'Urgent!': 'bg-red-100 text-red-800',
            'Sourcing!': 'bg-amber-100 text-amber-800',
            'Boss!': 'bg-purple-100 text-purple-800',
            'Staff! (Team)': 'bg-blue-100 text-blue-800',
            'Projects!': 'bg-green-100 text-green-800',
            'Admin!': 'bg-gray-100 text-gray-800',
            'Personal!': 'bg-teal-100 text-teal-800',
        };
        return map[categoryName] || 'bg-gray-100 text-gray-800';
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
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center mb-4 flex-shrink-0">
                                    To Do List
                                    <button className="text-gray-400 hover:text-gray-500" onClick={onClose}>
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </Dialog.Title>

                                {/* Sort Controls */}
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

                                {/* List */}
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                    {loading ? (
                                        <div className="text-center py-10 text-gray-400">Loading tasks...</div>
                                    ) : sortedTodos.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400">No tasks found.</div>
                                    ) : (
                                        sortedTodos.map(todo => (
                                            <div className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors bg-white shadow-sm" key={todo._id}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <div className="mt-1 flex-shrink-0" title={`Priority: ${todo.priority}`}>
                                                            {getPriorityIcon(todo.priority)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-gray-900 truncate">{todo.title}</h4>
                                                            {todo.category && (
                                                                <span className={`inline-block px-2 py-0.5 mt-1 text-xs rounded-md ${getCategoryStyle(todo.category)}`}>
                                                                    {todo.category}
                                                                </span>
                                                            )}
                                                            {todo.notes && (
                                                                <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-100">
                                                                    {todo.notes}
                                                                </p>
                                                            )}
                                                            <div className="mt-2 text-xs text-gray-400 flex gap-4">
                                                                <span>Due: {new Date(todo.dueDate).toLocaleDateString()}</span>
                                                                {typeof todo.sourcePageId !== 'string' && todo.sourcePageId?.title && (
                                                                    <span>Source: {todo.sourcePageId.title}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        {/* Future actions like Edit/Delete could go here */}
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
