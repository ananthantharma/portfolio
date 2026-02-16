import React, { useMemo } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { IToDo } from '@/models/ToDo';
import { FlagIcon, PaperClipIcon, CalendarIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ToDoBoardProps {
    todos: IToDo[];
    onStatusChange: (id: string, newStatus: IToDo['status']) => void;
    onEdit: (todo: IToDo) => void;
    onDelete: (id: string) => void;
}

const COLUMNS = [
    { id: 'todo', title: 'To Do', color: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
    { id: 'in-progress', title: 'In Progress', color: 'bg-amber-50 border-amber-100 text-amber-700' },
    { id: 'done', title: 'Done', color: 'bg-green-50 border-green-100 text-green-700' }
];

const ToDoBoard: React.FC<ToDoBoardProps> = ({ todos, onStatusChange, onEdit, onDelete }) => {
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const activeTodo = useMemo(() => todos.find(t => t._id === activeId), [todos, activeId]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            // Check if over is a column
            const columnId = over.id as IToDo['status'];
            if (COLUMNS.find(c => c.id === columnId)) {
                onStatusChange(active.id as string, columnId);
            }
        }
        setActiveId(null);
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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

const Column = ({ col, todos, onEdit, onDelete }: { col: any, todos: IToDo[], onEdit: (t: IToDo) => void, onDelete: (id: string) => void }) => {
    const { setNodeRef } = useDroppable({ id: col.id });

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[300px] flex flex-col h-full rounded-xl bg-gray-50/50 border border-gray-100">
            <div className={`p-3 border-b ${col.color.replace('bg-', 'bg-opacity-50 ')} rounded-t-xl flex justify-between items-center bg-white`}>
                <h3 className={`font-semibold text-sm ${col.color.split(' ')[2]}`}>{col.title}</h3>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm text-gray-500">
                    {todos.length}
                </span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
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
        return <div ref={setNodeRef} style={style} className="opacity-50"><TaskCard todo={todo} /></div>;
    }

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <TaskCard todo={todo} onClick={() => onEdit(todo)} onDelete={() => onDelete(todo._id)} />
        </div>
    );
};

const TaskCard = ({ todo, isOverlay, onClick, onDelete }: { todo: IToDo, isOverlay?: boolean, onClick?: () => void, onDelete?: () => void }) => {
    const isDone = todo.status === 'done' || todo.isCompleted;

    return (
        <div
            onClick={onClick}
            className={`relative group bg-white p-3 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-all ${isOverlay ? 'scale-105 shadow-xl rotate-2' : ''} ${isDone ? 'opacity-80' : ''}`}
        >
            <div className="flex justify-between items-start gap-2">
                <h4 className={`text-sm font-medium text-gray-800 line-clamp-2 ${isDone ? 'line-through text-gray-500' : ''}`}>
                    {todo.title}
                </h4>
                {todo.priority && todo.priority !== 'None' && (
                    <FlagIcon className={`h-4 w-4 flex-shrink-0 ${todo.priority === 'High' ? 'text-red-500 fill-red-50' :
                        todo.priority === 'Medium' ? 'text-amber-500' : 'text-green-500'
                        }`} />
                )}
            </div>

            {todo.category && (
                <span className="inline-block px-2 py-0.5 mt-2 text-[10px] rounded bg-gray-100 text-gray-600 border border-gray-200">
                    {todo.category}
                </span>
            )}

            <div className="mt-3 flex items-center justify-between text-gray-400 text-xs">
                <div className="flex items-center gap-2">
                    {todo.dueDate && (
                        <div className={`flex items-center gap-1 ${new Date(todo.dueDate) < new Date() && !isDone ? 'text-red-500' : ''}`}>
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(todo.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                    {todo.attachments && todo.attachments.length > 0 && (
                        <PaperClipIcon className="h-3 w-3" />
                    )}
                </div>
                {todo.aiGenerated && (
                    <span className="text-[9px] text-indigo-400 font-medium px-1 rounded bg-indigo-50">AI</span>
                )}
            </div>

            {!isOverlay && onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded-md"
                    title="Delete task"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};

export default ToDoBoard;
