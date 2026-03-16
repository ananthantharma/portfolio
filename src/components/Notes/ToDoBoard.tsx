/* eslint-disable react/jsx-sort-props, react-memo/require-usememo, react-memo/require-memo, simple-import-sort/imports */
import React, {useMemo, useState, useCallback} from 'react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {IToDo} from '@/models/ToDo';
import {
  FlagIcon,
  PaperClipIcon,
  CalendarIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  PauseCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {INotePage} from '@/models/NotePage';
import {CheckCircleIcon as CheckCircleSolid} from '@heroicons/react/24/solid';

interface ToDoBoardProps {
  todos: IToDo[];
  onStatusChange: (id: string, newStatus: IToDo['status']) => void;
  onEdit: (todo: IToDo) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (todo: IToDo) => void;
  onAddDays: (id: string, days: number) => void;
  onSubtasksChange?: (id: string, subtasks: any[]) => void;
  onNavigate: (page: INotePage, tabId?: string) => void;
  onCycleNeonColor?: (todo: IToDo) => void;
  onToggleMinimize?: (todo: IToDo) => void;
  onReorder?: (activeId: string, overId: string) => void;
  onClose: () => void;
}

const COLUMNS: {
  id: string;
  title: string;
  icon: React.ReactNode;
  dotColor: string;
  headerGradient: string;
  headerText: string;
  borderColor: string;
  dropHighlight: string;
  emptyIcon: React.ReactNode;
  emptyText: string;
}[] = [
  {
    id: 'todo',
    title: 'To Do',
    icon: <div className="h-2.5 w-2.5 rounded-sm bg-gray-400" />,
    dotColor: 'bg-gray-400',
    headerGradient: 'from-gray-50 to-gray-100/50',
    headerText: 'text-gray-600',
    borderColor: 'border-gray-200',
    dropHighlight: 'ring-gray-300 bg-gray-50/50',
    emptyIcon: <ClockIcon className="h-6 w-6 text-gray-200" />,
    emptyText: 'No tasks yet',
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    icon: <div className="h-2.5 w-2.5 rounded-sm bg-amber-400" />,
    dotColor: 'bg-amber-400',
    headerGradient: 'from-amber-50 to-amber-100/30',
    headerText: 'text-amber-700',
    borderColor: 'border-amber-200',
    dropHighlight: 'ring-amber-300 bg-amber-50/30',
    emptyIcon: <ArrowPathIcon className="h-6 w-6 text-amber-200" />,
    emptyText: 'Nothing in progress',
  },
  {
    id: 'action-with-others',
    title: 'Action w/ Others',
    icon: <div className="h-2.5 w-2.5 rounded-sm bg-sky-400" />,
    dotColor: 'bg-sky-400',
    headerGradient: 'from-sky-50 to-sky-100/30',
    headerText: 'text-sky-700',
    borderColor: 'border-sky-200',
    dropHighlight: 'ring-sky-300 bg-sky-50/30',
    emptyIcon: <UserGroupIcon className="h-6 w-6 text-sky-200" />,
    emptyText: 'Waiting on others',
  },
  {
    id: 'escalation-required',
    title: 'Escalation Required',
    icon: <div className="h-2.5 w-2.5 rounded-sm bg-rose-500" />,
    dotColor: 'bg-rose-500',
    headerGradient: 'from-rose-50 to-rose-100/30',
    headerText: 'text-rose-700',
    borderColor: 'border-rose-200',
    dropHighlight: 'ring-rose-300 bg-rose-50/30',
    emptyIcon: <ExclamationTriangleIcon className="h-6 w-6 text-rose-200" />,
    emptyText: 'Needs review',
  },
  {
    id: 'parked',
    title: 'Parked',
    icon: <div className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />,
    dotColor: 'bg-indigo-500',
    headerGradient: 'from-indigo-50 to-indigo-100/30',
    headerText: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    dropHighlight: 'ring-indigo-300 bg-indigo-50/30',
    emptyIcon: <PauseCircleIcon className="h-6 w-6 text-indigo-200" />,
    emptyText: 'On hold for now',
  },
  {
    id: 'done',
    title: 'Done',
    icon: <div className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />,
    dotColor: 'bg-emerald-400',
    headerGradient: 'from-emerald-50 to-emerald-100/30',
    headerText: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    dropHighlight: 'ring-emerald-300 bg-emerald-50/30',
    emptyIcon: <CheckCircleSolid className="h-6 w-6 text-emerald-200" />,
    emptyText: 'Completed tasks appear here',
  },
];

const WIP_LIMIT = 5;

const priorityAccent: Record<string, string> = {
  High: 'bg-red-500',
  Medium: 'bg-amber-400',
  Low: 'bg-emerald-400',
  None: 'bg-gray-200',
};

const priorityLabel: Record<string, {color: string; bg: string}> = {
  High: {color: 'text-red-700', bg: 'bg-red-50'},
  Medium: {color: 'text-amber-700', bg: 'bg-amber-50'},
  Low: {color: 'text-emerald-700', bg: 'bg-emerald-50'},
  None: {color: 'text-gray-500', bg: 'bg-gray-50'},
};

const getRelativeDate = (dateString: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return {text: `${Math.abs(diffDays)}d overdue`, className: 'text-red-600 font-semibold', isOverdue: true};
  if (diffDays === 0) return {text: 'Today', className: 'text-amber-600 font-medium', isOverdue: false};
  if (diffDays === 1) return {text: 'Tomorrow', className: 'text-amber-500', isOverdue: false};
  if (diffDays <= 7) return {text: `${diffDays}d left`, className: 'text-gray-500', isOverdue: false};
  return {
    text: new Date(dateString).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
    className: 'text-gray-400',
    isOverdue: false,
  };
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  BOARD                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

const ToDoBoard: React.FC<ToDoBoardProps> = ({
  todos,
  onStatusChange,
  onEdit,
  onDelete,
  onToggleComplete,
  onAddDays,
  onSubtasksChange,
  onNavigate,
  onCycleNeonColor,
  onToggleMinimize,
  onReorder,
  onClose,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // PointerSensor requires 8px movement before activating → separates click from drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {distance: 8},
    }),
  );

  const activeTodo = useMemo(() => todos.find(t => t._id === activeId), [todos, activeId]);

  const getStatus = useCallback((todo: IToDo): string => todo.status || (todo.isCompleted ? 'done' : 'todo'), []);

  const filteredTodos = useMemo(() => {
    if (!searchQuery.trim()) return todos;
    const q = searchQuery.toLowerCase();
    return todos.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q),
    );
  }, [todos, searchQuery]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const {active, over} = event;
      if (over && active.id !== over.id) {
        let newStatus = over.id as IToDo['status'];
        const targetColumn = COLUMNS.find(c => c.id === newStatus);

        if (!targetColumn) {
          const overTask = todos.find(t => t._id === over.id);
          const activeTask = todos.find(t => t._id === active.id);

          if (overTask && activeTask) {
            newStatus = getStatus(overTask) as IToDo['status'];

            // Check if within the same column
            if (getStatus(activeTask) === newStatus) {
              if (onReorder) {
                onReorder(active.id as string, over.id as string);
              }
              setActiveId(null);
              return; // Skip status change
            }
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
    },
    [todos, getStatus, onStatusChange, onReorder],
  );

  // Column task counts
  const columnCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    COLUMNS.forEach(col => {
      counts[col.id] = filteredTodos.filter(t => getStatus(t) === col.id).length;
    });
    return counts;
  }, [filteredTodos, getStatus]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top bar: search + column summary */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50/70 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-5 text-xs text-gray-400 ml-auto">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex items-center gap-1.5">
              {col.icon}
              <span className="font-medium">{columnCounts[col.id]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        measuring={{droppable: {strategy: MeasuringStrategy.Always}}}>
        <div className="flex gap-3 flex-1 overflow-x-auto pb-2 min-h-0">
          {COLUMNS.map(col => (
            <Column
              key={col.id}
              col={col}
              todos={filteredTodos.filter(t => getStatus(t) === col.id)}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleComplete={onToggleComplete}
              onAddDays={onAddDays}
              onSubtasksChange={onSubtasksChange}
              onNavigate={onNavigate}
              onCycleNeonColor={onCycleNeonColor}
              onToggleMinimize={onToggleMinimize}
              onClose={onClose}
              activeId={activeId}
            />
          ))}
        </div>

        {/* Drag Overlay — this is the ONLY visible dragged element */}
        <DragOverlay dropAnimation={null}>{activeTodo ? <TaskCard todo={activeTodo} isOverlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  COLUMN                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

const Column = ({
  col,
  todos,
  onEdit,
  onDelete,
  onToggleComplete,
  onAddDays,
  onSubtasksChange,
  onNavigate,
  onCycleNeonColor,
  onToggleMinimize,
  onClose,
  activeId,
}: {
  col: (typeof COLUMNS)[0];
  todos: IToDo[];
  onEdit: (t: IToDo) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (t: IToDo) => void;
  onAddDays: (id: string, days: number) => void;
  onSubtasksChange?: (id: string, subtasks: any[]) => void;
  onNavigate: (page: INotePage, tabId?: string) => void;
  onCycleNeonColor?: (todo: IToDo) => void;
  onToggleMinimize?: (todo: IToDo) => void;
  onClose: () => void;
  activeId: string | null;
}) => {
  const {setNodeRef, isOver} = useDroppable({id: col.id});
  const isOverWipLimit = col.id === 'in-progress' && todos.length > WIP_LIMIT;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[240px] max-w-[320px] flex flex-col rounded-2xl border transition-all duration-200 ${
        isOver ? `${col.borderColor} ring-2 ${col.dropHighlight}` : `${col.borderColor} bg-white/40`
      }`}>
      {/* Header */}
      <div
        className={`px-3.5 py-2.5 rounded-t-2xl flex justify-between items-center bg-gradient-to-b ${col.headerGradient} border-b ${col.borderColor}`}>
        <div className="flex items-center gap-2">
          {col.icon}
          <h3 className={`font-semibold text-[11px] uppercase tracking-widest ${col.headerText}`}>{col.title}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {isOverWipLimit && (
            <ExclamationTriangleIcon
              className="h-3.5 w-3.5 text-amber-500"
              title={`WIP: ${todos.length}/${WIP_LIMIT}`}
            />
          )}
          <span
            className={`text-[10px] font-bold min-w-[20px] text-center py-0.5 px-1.5 rounded-md ${
              isOverWipLimit ? 'bg-amber-200 text-amber-800' : 'bg-white/70 text-gray-400 border border-gray-100'
            }`}>
            {todos.length}
          </span>
        </div>
      </div>

      {/* Cards container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {todos.length === 0 && (
          <div
            className={`flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed ${col.borderColor} gap-1.5`}>
            {col.emptyIcon}
            <span className="text-[11px] text-gray-300">{col.emptyText}</span>
          </div>
        )}
        <SortableContext items={todos.map(t => t._id)} strategy={verticalListSortingStrategy}>
          {todos.map(todo => (
            <DraggableTask
              key={todo._id}
              todo={todo}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleComplete={onToggleComplete}
              onAddDays={onAddDays}
              onSubtasksChange={onSubtasksChange}
              onNavigate={onNavigate}
              onCycleNeonColor={onCycleNeonColor}
              onToggleMinimize={onToggleMinimize}
              onClose={onClose}
              isBeingDragged={activeId === todo._id}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DRAGGABLE WRAPPER                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

const DraggableTask = ({
  todo,
  onEdit,
  onDelete,
  onToggleComplete,
  onAddDays,
  onSubtasksChange,
  onNavigate,
  onCycleNeonColor,
  onToggleMinimize,
  onClose,
  isBeingDragged,
}: {
  todo: IToDo;
  onEdit: (t: IToDo) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (t: IToDo) => void;
  onAddDays: (id: string, days: number) => void;
  onSubtasksChange?: (id: string, subtasks: any[]) => void;
  onNavigate: (page: INotePage, tabId?: string) => void;
  onCycleNeonColor?: (todo: IToDo) => void;
  onToggleMinimize?: (todo: IToDo) => void;
  onClose: () => void;
  isBeingDragged: boolean;
}) => {
  const {attributes, listeners, setNodeRef, transform, transition} = useSortable({
    id: todo._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // When dragging: show a faded placeholder. The DragOverlay renders the visible card.
  if (isBeingDragged) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-20 pointer-events-none">
        <TaskCard todo={todo} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard
        todo={todo}
        onEdit={() => onEdit(todo)}
        onDelete={() => onDelete(todo._id)}
        onToggleComplete={() => onToggleComplete(todo)}
        onAddDays={days => onAddDays(todo._id, days)}
        onSubtasksChange={subtasks => onSubtasksChange?.(todo._id, subtasks)}
        onNavigate={onNavigate}
        onCycleNeonColor={() => onCycleNeonColor?.(todo)}
        onToggleMinimize={() => onToggleMinimize?.(todo)}
        onClose={onClose}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CHECKLIST SECTION (inline on card)                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

const ChecklistSection = ({
  todo,
  onSubtasksChange,
}: {
  todo: IToDo;
  onSubtasksChange?: (subtasks: any[]) => void;
}) => {
  const [newItemText, setNewItemText] = useState('');
  const subtasks = todo.subtasks || [];
  const doneCount = subtasks.filter(s => s.isCompleted).length;
  const pct = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0;

  const handleAdd = () => {
    const text = newItemText.trim();
    if (!text || !onSubtasksChange) return;
    onSubtasksChange([...subtasks, {title: text, isCompleted: false}]);
    setNewItemText('');
  };

  const handleToggle = (idx: number) => {
    if (!onSubtasksChange) return;
    const updated = [...subtasks];
    updated[idx] = {...updated[idx], isCompleted: !updated[idx].isCompleted};
    onSubtasksChange(updated);
  };

  const handleDelete = (idx: number) => {
    if (!onSubtasksChange) return;
    onSubtasksChange(subtasks.filter((_, i) => i !== idx));
  };

  return (
    <div className="mt-3 space-y-2" onPointerDown={e => e.stopPropagation()}>
      <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
        <span>Checklist</span>
        {subtasks.length > 0 && (
          <span className={pct === 100 ? 'text-emerald-500' : ''}>{doneCount}/{subtasks.length}</span>
        )}
      </div>

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? 'bg-emerald-400' : 'bg-indigo-400'}`}
            style={{width: `${pct}%`}}
          />
        </div>
      )}

      {/* Items */}
      <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
        {subtasks.map((st, idx) => (
          <div key={st._id || idx} className="flex items-start gap-2 group/st">
            <button
              onClick={e => {
                e.stopPropagation();
                handleToggle(idx);
              }}
              className={`flex-shrink-0 mt-0.5 transition-colors ${
                st.isCompleted ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'
              }`}>
              {st.isCompleted ? (
                <CheckIcon className="h-3.5 w-3.5 stroke-[3]" />
              ) : (
                <div className="h-3 w-3 rounded-sm border border-gray-300" />
              )}
            </button>
            <span
              className={`text-[11px] leading-tight flex-1 ${
                st.isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'
              }`}>
              {st.title}
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                handleDelete(idx);
              }}
              className="opacity-0 group-hover/st:opacity-100 p-0.5 text-gray-300 hover:text-red-400 transition-all"
              title="Remove">
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new item */}
      {onSubtasksChange && (
        <div className="flex items-center gap-1.5">
          <PlusIcon className="h-3 w-3 text-gray-300 flex-shrink-0" />
          <input
            type="text"
            value={newItemText}
            onChange={e => setNewItemText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add item..."
            className="flex-1 text-[11px] bg-transparent border-none outline-none text-gray-600 placeholder:text-gray-300 py-0.5"
          />
          {newItemText.trim() && (
            <button
              onClick={handleAdd}
              className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-600 transition-colors">
              Add
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TASK CARD                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

const TaskCard = ({
  todo,
  isOverlay,
  onEdit,
  onDelete,
  onToggleComplete,
  onAddDays,
  onSubtasksChange,
  onNavigate,
  onCycleNeonColor,
  onToggleMinimize,
  onClose,
}: {
  todo: IToDo;
  isOverlay?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleComplete?: () => void;
  onAddDays?: (days: number) => void;
  onSubtasksChange?: (subtasks: any[]) => void;
  onNavigate?: (page: INotePage, tabId?: string) => void;
  onCycleNeonColor?: () => void;
  onToggleMinimize?: () => void;
  onClose?: () => void;
}) => {
  const isDone = todo.status === 'done' || todo.isCompleted;
  const isMinimized = todo.isMinimized ?? true;
  const dateInfo = todo.dueDate ? getRelativeDate(todo.dueDate) : null;
  const subtaskCount = todo.subtasks?.length || 0;
  const subtaskDone = todo.subtasks?.filter(s => s.isCompleted).length || 0;
  const subtaskPct = subtaskCount > 0 ? Math.round((subtaskDone / subtaskCount) * 100) : 0;
  const prio = priorityLabel[todo.priority] || priorityLabel.None;


  const neonColors = {
    red: 'before:bg-[conic-gradient(from_0deg,transparent,#ff3333,transparent)]',
    blue: 'before:bg-[conic-gradient(from_0deg,transparent,#3366ff,transparent)]',
    green: 'before:bg-[conic-gradient(from_0deg,transparent,#33ff33,transparent)]',
  };

  return (
    <div
      onContextMenu={e => {
        if (!isOverlay && onCycleNeonColor) {
          e.preventDefault();
          onCycleNeonColor();
        }
      }}
      className={`relative group rounded-xl border transition-all duration-150 overflow-hidden ${
        todo.neonColor && neonColors[todo.neonColor]
          ? `isolate ring-0 border-transparent bg-white shadow-sm hover:shadow-md before:absolute before:-z-20 before:-inset-[100%] before:animate-[spin_3s_linear_infinite] ${
              neonColors[todo.neonColor]
            } before:content-[""] after:absolute after:inset-[3.5px] after:-z-10 after:bg-white after:rounded-[10px] after:content-[""]`
          : isOverlay
          ? 'shadow-2xl ring-2 ring-gray-900/10 rotate-[1.5deg] scale-[1.03] bg-white'
          : isDone
          ? 'bg-gray-50/60 border-gray-100 opacity-55'
          : dateInfo?.isOverdue
          ? 'bg-white border-red-200 hover:border-red-300 hover:shadow-md'
          : 'bg-white border-gray-150 hover:border-gray-300 hover:shadow-md'
      } ${!isOverlay ? 'cursor-grab active:cursor-grabbing' : ''}`}>
      {/* Priority top accent line */}
      <div className={`h-[3px] w-full ${priorityAccent[todo.priority] || priorityAccent.None}`} />

      <div className="px-3 py-2.5">
        {/* Title row with actions */}
        <div className="flex items-start gap-2">
          {/* Complete checkbox */}
          {onToggleComplete && (
            <button
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onToggleComplete();
              }}
              onPointerDown={e => e.stopPropagation()}
              className={`flex-shrink-0 mt-0.5 transition-all ${
                isDone ? 'text-emerald-500 scale-110' : 'text-gray-300 hover:text-emerald-400'
              }`}
              title={isDone ? 'Mark incomplete' : 'Mark complete'}>
              {isDone ? (
                <CheckCircleSolid className="h-[18px] w-[18px]" />
              ) : (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-gray-300 hover:border-emerald-400 transition-colors" />
              )}
            </button>
          )}

          <div className="flex-1 min-w-0">
            <h4
              className={`text-[13px] font-medium leading-snug line-clamp-2 ${
                isDone ? 'line-through text-gray-400' : 'text-gray-800'
              }`}>
              {todo.title}
            </h4>
            {/* Next Task Preview (only if minimized and has pending subtasks) */}
            {isMinimized && todo.subtasks && todo.subtasks.some(s => !s.isCompleted) && (
              <div className="mt-1 flex items-center gap-1.5 py-1 px-2 rounded-lg bg-indigo-50/50 border border-indigo-100/50">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-medium text-indigo-600 truncate">
                  {todo.subtasks.find(s => !s.isCompleted)?.title}
                </span>
              </div>
            )}
          </div>

          {/* Hover actions */}
          {!isOverlay && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {onEdit && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    onEdit();
                  }}
                  onPointerDown={e => e.stopPropagation()}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                  title="Edit">
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDelete();
                  }}
                  onPointerDown={e => e.stopPropagation()}
                  className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                  title="Delete">
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Minimize toggle */}
          {onToggleMinimize && !isOverlay && (
            <button
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onToggleMinimize();
              }}
              onPointerDown={e => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
              title={isMinimized ? 'Expand' : 'Collapse'}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-4 w-4 transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`}>
                <path
                  fillRule="evenodd"
                  d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {!isMinimized && (
          <>
            {/* Metadata row */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {/* Priority badge */}
              {todo.priority && todo.priority !== 'None' && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-md font-medium ${prio.bg} ${prio.color}`}>
                  <FlagIcon className="h-2.5 w-2.5" />
                  {todo.priority}
                </span>
              )}
              {/* Category badge */}
              {todo.category && (
                <span className="inline-block px-1.5 py-0.5 text-[10px] rounded-md bg-gray-100 text-gray-500 font-medium">
                  {todo.category.replace('!', '')}
                </span>
              )}
              {todo.aiGenerated && (
                <span className="text-[9px] text-violet-500 font-bold px-1 rounded bg-violet-50">AI</span>
              )}
            </div>

            {/* Checklist Section – Inline Editable */}
            <ChecklistSection todo={todo} onSubtasksChange={onSubtasksChange} />

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
              <div className="flex items-center gap-3">
                {dateInfo && (
                  <span className={`flex items-center gap-1 ${dateInfo.className}`}>
                    <CalendarIcon className="h-3 w-3" />
                    {dateInfo.text}
                  </span>
                )}
                {!isOverlay && onAddDays && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        onAddDays(1);
                      }}
                      onPointerDown={e => e.stopPropagation()}
                      className="px-1 py-0.5 text-[9px] font-medium text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Add 1 Day">
                      +1
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        onAddDays(3);
                      }}
                      onPointerDown={e => e.stopPropagation()}
                      className="px-1 py-0.5 text-[9px] font-medium text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Add 3 Days">
                      +3
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        onAddDays(7);
                      }}
                      onPointerDown={e => e.stopPropagation()}
                      className="px-1 py-0.5 text-[9px] font-medium text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Add 7 Days">
                      +7
                    </button>
                  </div>
                )}
                {todo.attachments && todo.attachments.length > 0 && (
                  <div className="flex items-center gap-1">
                    {todo.attachments.map((att, idx) => {
                      const isDrive = att.storageType === 'drive';
                      const link = isDrive ? att.webViewLink : `/api/todos/attachment?todoId=${todo._id}&index=${idx}`;
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
                          onClick={e => e.stopPropagation()}
                          onPointerDown={e => e.stopPropagation()}>
                          <PaperClipIcon className="h-3 w-3" />
                        </a>
                      );
                    })}
                  </div>
                )}
                {!isOverlay && onNavigate && typeof todo.sourcePageId !== 'string' && todo.sourcePageId?.title && (
                  <button
                    className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-indigo-500 transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      const targetId =
                        todo.tabId && !todo.tabId.startsWith('new-') && !todo.tabId.startsWith('default-')
                          ? todo.tabId
                          : todo.tabName;
                      onNavigate(todo.sourcePageId as unknown as INotePage, targetId);
                      onClose?.();
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    title="Go to Note">
                    <ArrowTopRightOnSquareIcon className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[80px]"> {todo.sourcePageId.title}</span>
                  </button>
                )}
              </div>

              {/* Subtask progress micro-bar */}
              {subtaskCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                      style={{width: `${subtaskPct}%`}}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <CheckIcon className="h-2.5 w-2.5" />
                    {subtaskDone}/{subtaskCount}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default ToDoBoard;
