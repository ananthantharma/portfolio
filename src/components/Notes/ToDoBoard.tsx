/* eslint-disable react/jsx-sort-props, react-memo/require-usememo, react-memo/require-memo, simple-import-sort/imports */
import React, { useMemo, useState } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragStartEvent, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { IToDo } from '@/models/ToDo';
import {
    FlagIcon, PaperClipIcon, CalendarIcon, TrashIcon,
    PencilIcon, CheckIcon, MagnifyingGlassIcon,
    ExclamationTriangleIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

interface ToDoBoardProps {
    todos: IToDo[];
    onStatusChange: (id: string, newStatus: IToDo['status']) => void;
    onEdit: (todo: IToDo) => void;
    onDelete: (id: string) => void;
    onToggleComplete: (todo: IToDo) => void;
}

const COLUMNS: {
    id: string;
    title: string;
    dotColor: string;
    headerBg: string;
    headerText: string;
    borderColor: string;
    accentColor: string;
}[] = [
        { id: 'todo', title: 'To Do', dotColor: 'bg-gray-400', headerBg: 'bg-gray-50', headerText: 'text-gray-600', borderColor: 'border-gray-200', accentColor: 'bg-gray-100' },
        { id: 'in-progress', title: 'In Progress', dotColor: 'bg-amber-400', headerBg: 'bg-amber-50', headerText: 'text-amber-700', borderColor: 'border-amber-200', accentColor: 'bg-amber-50' },
        { id: 'action-with-others', title: 'Action with Others', dotColor: 'bg-sky-400', headerBg: 'bg-sky-50', headerText: 'text-sky-700', borderColor: 'border-sky-200', accentColor: 'bg-sky-50' },
        { id: 'done', title: 'Done', dotColor: 'bg-emerald-400', headerBg: 'bg-emerald-50', headerText: 'text-emerald-700', borderColor: 'border-emerald-200', accentColor: 'bg-emerald-50' },
    ];

const WIP_LIMIT = 5;

const priorityColors: Record<string, string> = {
    High: 'bg-red-500',
    Medium: 'bg-amber-400',
    Low: 'bg-emerald-500',
    None: 'bg-gray-300',
};

const getRelativeDate = (dateString: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, className: 'text-red-600 font-semibold', isOverdue: true };
    if (diffDays === 0) return { text: 'Today', className: 'text-amber-600 font-medium', isOverdue: false };
    if (diffDays === 1) return { text: 'Tomorrow', className: 'text-amber-500', isOverdue: false };
    if (diffDays <= 7) return { text: `${diffDays}d left`, className: 'text-gray-500', isOverdue: false };
    return { text: new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), className: 'text-gray-400', isOverdue: false };
};

const ToDoBoard: React.FC<ToDoBoardProps> = ({ todos, onStatusChange, onEdit, onDelete, onToggleComplete }) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fix drag offset: use PointerSensor with distance activation constraint
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );

    const activeTodo = useMemo(() => todos.find(t => t._id === activeId), [todos, activeId]);

    const getStatus = (todo: IToDo): string => todo.status || (todo.isCompleted ? 'done' : 'todo');

    const filteredTodos = useMemo(() => {
        if (!searchQuery.trim()) return todos;
        const q = searchQuery.toLowerCase();
        return todos.filter(t =>
            t.title.toLowerCase().includes(q) ||
            (t.category || '').toLowerCase().includes(q) ||
            (t.notes || '').toLowerCase().includes(q)
        );
    }, [todos, searchQuery]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            let newStatus = over.id as IToDo['status'];
            const targetColumn = COLUMNS.find(c => c.id === newStatus);

            if (!targetColumn) {
                // Dropped on another task card - find that task's column
                const overTask = todos.find(t => t._id === over.id);
                if (overTask) {
                    newStatus = (getStatus(overTask)) as IToDo['status'];
                }
            }

            const validColumn = COLUMNS.find(c => c.id === newStatus);
            if (validColumn) {
                const todo = todos.find(t => t._id === active.id);
                if (todo && getStatus(todo) !== newStatus) {
                    onStatusChange(active.id as string, newStatus);
                }
            }
        }
        setActiveId(null);
    };

    return (
        <div className="flex flex-col h-full gap-3">
            {/* Search Bar */}
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-colors"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                    {COLUMNS.map(col => {
                        const count = filteredTodos.filter(t => getStatus(t) === col.id).length;
                        return (
                            <div key={col.id} className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                                <span>{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Board */}
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-3 flex-1 overflow-x-auto pb-2 min-h-0">
                    {COLUMNS.map(col => (
                        <Column
                            key={col.id}
                            col={col}
                            todos={filteredTodos.filter(t => getStatus(t) === col.id)}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onToggleComplete={onToggleComplete}
                        />
                    ))}
                </div>
                <DragOverlay dropAnimation={null}>
                    {activeTodo ? <TaskCard todo={activeTodo} isOverlay /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};

/* ─── Column ───────────────────────────────────────────────────────────── */

const Column = ({ col, todos, onEdit, onDelete, onToggleComplete }: {
    col: typeof COLUMNS[0];
    todos: IToDo[];
    onEdit: (t: IToDo) => void;
    onDelete: (id: string) => void;
    onToggleComplete: (t: IToDo) => void;
}) => {
    const { setNodeRef, isOver } = useDroppable({ id: col.id });
    const isOverWipLimit = col.id === 'in-progress' && todos.length > WIP_LIMIT;

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 min-w-[250px] flex flex-col rounded-xl border transition-colors duration-150 ${isOver ? `${col.borderColor} ring-2 ring-offset-1 ring-gray-200/60` : col.borderColor
                } bg-white/50`}
        >
            {/* Column Header */}
            <div className={`px-3 py-2.5 border-b ${col.borderColor} rounded-t-xl flex justify-between items-center ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                    <h3 className={`font-semibold text-xs uppercase tracking-wider ${col.headerText}`}>
                        {col.title}
                    </h3>
                </div>
                <div className="flex items-center gap-1.5">
                    {isOverWipLimit && (
                        <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-600" title={`WIP: ${todos.length}/${WIP_LIMIT}`} />
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOverWipLimit
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-white/80 text-gray-500 border border-gray-200'
                        }`}>
                        {todos.length}
                    </span>
                </div>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
                {todos.length === 0 && (
                    <div className={`flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed ${col.borderColor} text-xs text-gray-300`}>
                        {col.id === 'action-with-others' ? (
                            <>
                                <UserGroupIcon className="h-5 w-5 mb-1 text-gray-200" />
                                <span>Waiting on others</span>
                            </>
                        ) : (
                            <span>Drop tasks here</span>
                        )}
                    </div>
                )}
                {todos.map(todo => (
                    <DraggableTask
                        key={todo._id}
                        todo={todo}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onToggleComplete={onToggleComplete}
                    />
                ))}
            </div>
        </div>
    );
};

/* ─── Draggable Wrapper ────────────────────────────────────────────────── */

const DraggableTask = ({ todo, onEdit, onDelete, onToggleComplete }: {
    todo: IToDo;
    onEdit: (t: IToDo) => void;
    onDelete: (id: string) => void;
    onToggleComplete: (t: IToDo) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: todo._id,
    });

    const style: React.CSSProperties = {
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.3 : 1,
        transition: isDragging ? 'none' : 'opacity 150ms ease',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <TaskCard
                todo={todo}
                onEdit={() => onEdit(todo)}
                onDelete={() => onDelete(todo._id)}
                onToggleComplete={() => onToggleComplete(todo)}
            />
        </div>
    );
};

/* ─── Task Card ────────────────────────────────────────────────────────── */

const TaskCard = ({ todo, isOverlay, onEdit, onDelete, onToggleComplete }: {
    todo: IToDo;
    isOverlay?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onToggleComplete?: () => void;
}) => {
    const isDone = todo.status === 'done' || todo.isCompleted;
    const dateInfo = todo.dueDate ? getRelativeDate(todo.dueDate) : null;
    const subtaskCount = todo.subtasks?.length || 0;
    const subtaskDone = todo.subtasks?.filter(s => s.isCompleted).length || 0;

    return (
        <div
            className={`relative group bg-white rounded-lg border transition-all duration-150 ${isOverlay
                    ? 'shadow-xl ring-2 ring-gray-900/10 rotate-[1deg] scale-[1.02]'
                    : isDone
                        ? 'border-gray-100 opacity-60'
                        : dateInfo?.isOverdue
                            ? 'border-red-200 hover:border-red-300 hover:shadow-sm'
                            : 'border-gray-150 hover:border-gray-300 hover:shadow-sm'
                } cursor-grab active:cursor-grabbing`}
        >
            {/* Priority accent bar */}
            <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${priorityColors[todo.priority] || priorityColors.None}`} />

            <div className="pl-3 pr-2 py-2.5">
                {/* Top row: title + actions */}
                <div className="flex items-start gap-2">
                    {/* Complete checkbox */}
                    {onToggleComplete && (
                        <button
                            onClick={e => { e.stopPropagation(); onToggleComplete(); }}
                            className={`flex-shrink-0 mt-0.5 transition-colors ${isDone ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500'}`}
                            title={isDone ? 'Mark incomplete' : 'Mark complete'}
                        >
                            {isDone
                                ? <CheckCircleSolid className="h-4 w-4" />
                                : <div className="h-4 w-4 rounded-full border-[1.5px] border-gray-300 hover:border-gray-500 transition-colors" />
                            }
                        </button>
                    )}

                    <h4 className={`flex-1 text-[13px] font-medium leading-snug line-clamp-2 ${isDone ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}>
                        {todo.title}
                    </h4>

                    {/* Hover Actions */}
                    {!isOverlay && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {onEdit && (
                                <button
                                    onClick={e => { e.stopPropagation(); onEdit(); }}
                                    className="p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                                    title="Edit task"
                                >
                                    <PencilIcon className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={e => { e.stopPropagation(); onDelete(); }}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                                    title="Delete task"
                                >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Category + Tags */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {todo.category && (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] rounded-md bg-gray-50 text-gray-500 font-medium">
                            {todo.category.replace('!', '')}
                        </span>
                    )}
                    {todo.aiGenerated && (
                        <span className="text-[9px] text-violet-500 font-bold px-1 rounded bg-violet-50">AI</span>
                    )}
                </div>

                {/* Bottom row: date, subtasks, attachments, priority */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                    <div className="flex items-center gap-2.5">
                        {dateInfo && (
                            <span className={`flex items-center gap-1 ${dateInfo.className}`}>
                                <CalendarIcon className="h-3 w-3" />
                                {dateInfo.text}
                            </span>
                        )}
                        {subtaskCount > 0 && (
                            <span className="flex items-center gap-1 text-gray-400">
                                <CheckIcon className="h-3 w-3" />
                                {subtaskDone}/{subtaskCount}
                            </span>
                        )}
                        {todo.attachments && todo.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5">
                                <PaperClipIcon className="h-3 w-3" />
                                {todo.attachments.length}
                            </span>
                        )}
                    </div>
                    {todo.priority && todo.priority !== 'None' && (
                        <FlagIcon className={`h-3 w-3 ${todo.priority === 'High' ? 'text-red-500' :
                                todo.priority === 'Medium' ? 'text-amber-400' : 'text-emerald-500'
                            }`} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ToDoBoard;
