/* eslint-disable react/jsx-sort-props, react-memo/require-usememo, react-memo/require-memo, simple-import-sort/imports */
import React, { useMemo } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragStartEvent, DragEndEvent, pointerWithin } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { IToDo } from '@/models/ToDo';
import { FlagIcon, PaperClipIcon, CalendarIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ToDoBoardProps {
    todos: IToDo[];
    onStatusChange: (id: string, newStatus: IToDo['status']) => void;
    onEdit: (todo: IToDo) => void;
    onDelete: (id: string) => void;
}

const COLUMNS = [
    { id: 'todo', title: 'To Do', color: 'border-gray-200', headerBg: 'bg-gray-50', headerText: 'text-gray-600', dotColor: 'bg-gray-400' },
    { id: 'in-progress', title: 'In Progress', color: 'border-amber-200', headerBg: 'bg-amber-50', headerText: 'text-amber-700', dotColor: 'bg-amber-400' },
    { id: 'done', title: 'Done', color: 'border-emerald-200', headerBg: 'bg-emerald-50', headerText: 'text-emerald-700', dotColor: 'bg-emerald-400' }
];

const WIP_LIMIT = 5;

const ToDoBoard: React.FC<ToDoBoardProps> = ({ todos, onStatusChange, onEdit, onDelete }) => {
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const activeTodo = useMemo(() => todos.find(t => t._id === activeId), [todos, activeId]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            let newStatus = over.id as IToDo['status'];
            let targetColumn = COLUMNS.find(c => c.id === newStatus);

            if (!targetColumn) {
                const overTask = todos.find(t => t._id === over.id);
                if (overTask) {
                    newStatus = overTask.status || (overTask.isCompleted ? 'done' : 'todo');
                    targetColumn = COLUMNS.find(c => c.id === newStatus);
                }
            }

            if (targetColumn) {
                const todo = todos.find(t => t._id === active.id);
                if (todo && (todo.status || (todo.isCompleted ? 'done' : 'todo')) !== newStatus) {
                    onStatusChange(active.id as string, newStatus);
                }
            }
        }
        setActiveId(null);
    };

    return (
        <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={pointerWithin}
        >
            <div className="flex gap-4 h-full overflow-x-auto pb-4">
                {COLUMNS.map(col => (
                    <Column
                        key={col.id}
                        col={col}
                        todos={todos.filter(t => (t.status || (t.isCompleted ? 'done' : 'todo')) === col.id)}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </div>
            <DragOverlay>
                {activeTodo ? <TaskCard todo={activeTodo} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
};

const Column = ({ col, todos, onEdit, onDelete }: {
    col: typeof COLUMNS[0], todos: IToDo[], onEdit: (t: IToDo) => void, onDelete: (id: string) => void
}) => {
    const { setNodeRef } = useDroppable({ id: col.id });
    const isOverWipLimit = col.id === 'in-progress' && todos.length > WIP_LIMIT;

    return (
        <div ref={setNodeRef} className={`flex-1 min-w-[280px] flex flex-col h-full rounded-xl border ${col.color} bg-gray-50/30`}>
            <div className={`p-3 border-b ${col.color} rounded-t-xl flex justify-between items-center ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                    <h3 className={`font-semibold text-xs uppercase tracking-wider ${col.headerText}`}>{col.title}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                    {isOverWipLimit && (
                        <div className="flex items-center gap-1 text-amber-600" title={`WIP limit exceeded (${WIP_LIMIT})`}>
                            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                        </div>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOverWipLimit
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-white/80 text-gray-500 border border-gray-200'
                        }`}>
                        {todos.length}
                    </span>
                </div>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[80px]">
                {todos.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-gray-300">
                        Drop tasks here
                    </div>
                )}
                {todos.map(todo => (
                    <DraggableTask key={todo._id} todo={todo} onEdit={onEdit} onDelete={onDelete} />
                ))}
            </div>
        </div>
    );
};

const DraggableTask = ({ todo, onEdit, onDelete }: { todo: IToDo, onEdit: (t: IToDo) => void, onDelete: (id: string) => void }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: todo._id,
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
    } : undefined;

    if (isDragging) {
        return <div ref={setNodeRef} style={style} className="opacity-30"><TaskCard todo={todo} /></div>;
    }

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <TaskCard todo={todo} onClick={() => onEdit(todo)} onDelete={() => onDelete(todo._id)} />
        </div>
    );
};

const TaskCard = ({ todo, isOverlay, onClick, onDelete }: { todo: IToDo, isOverlay?: boolean, onClick?: () => void, onDelete?: () => void }) => {
    const isDone = todo.status === 'done' || todo.isCompleted;
    const isOverdue = !isDone && new Date(todo.dueDate) < new Date();

    const priorityColors: Record<string, string> = {
        High: 'bg-red-500',
        Medium: 'bg-amber-400',
        Low: 'bg-emerald-500',
        None: 'bg-gray-300',
    };

    return (
        <div
            onClick={onClick}
            className={`relative group bg-white p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${isOverlay ? 'scale-[1.02] shadow-xl ring-2 ring-gray-900/10 rotate-1' : ''
                } ${isDone ? 'opacity-60 border-gray-100' : isOverdue ? 'border-red-200 hover:border-red-300' : 'border-gray-150 hover:border-gray-300 hover:shadow-sm'}`}
        >
            {/* Priority indicator */}
            <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full ${priorityColors[todo.priority] || priorityColors.None}`} />

            <div className="pl-2">
                <h4 className={`text-[13px] font-medium text-gray-800 line-clamp-2 ${isDone ? 'line-through text-gray-400' : ''}`}>
                    {todo.title}
                </h4>

                {todo.category && (
                    <span className="inline-block px-1.5 py-0.5 mt-1.5 text-[10px] rounded-md bg-gray-50 text-gray-500 font-medium">
                        {todo.category.replace('!', '')}
                    </span>
                )}

                <div className="mt-2 flex items-center justify-between text-gray-400 text-[11px]">
                    <div className="flex items-center gap-2">
                        {todo.dueDate && (
                            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                                <CalendarIcon className="h-3 w-3" />
                                {new Date(todo.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        )}
                        {todo.attachments && todo.attachments.length > 0 && (
                            <PaperClipIcon className="h-3 w-3" />
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {todo.aiGenerated && (
                            <span className="text-[9px] text-violet-500 font-bold px-1 rounded bg-violet-50">AI</span>
                        )}
                        {todo.priority && todo.priority !== 'None' && (
                            <FlagIcon className={`h-3 w-3 ${todo.priority === 'High' ? 'text-red-500' :
                                todo.priority === 'Medium' ? 'text-amber-400' : 'text-emerald-500'
                                }`} />
                        )}
                    </div>
                </div>
            </div>

            {!isOverlay && onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white/90 backdrop-blur-sm shadow-sm rounded-md border border-gray-100"
                    title="Delete task"
                >
                    <TrashIcon className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
};

export default ToDoBoard;
