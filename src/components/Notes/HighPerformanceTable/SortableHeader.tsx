import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ColumnDefinition } from './types';
import clsx from 'clsx';
import { Bars2Icon, XMarkIcon } from '@heroicons/react/24/outline'; // Bars2Icon as drag handle

interface SortableHeaderProps {
    column: ColumnDefinition;
    onResizeStart: (id: string) => void;
    onRemove: (id: string) => void;
}

export function SortableHeader({ column, onResizeStart, onRemove }: SortableHeaderProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: column.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        width: column.width,
        minWidth: column.width,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={clsx(
                "relative px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 border-r border-gray-200 group flex items-center justify-between select-none",
                column.id === 'name' && "sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" // Name col is sticky, but might be issues if reordered away. Usually name is fixed index 0. We might allow reordering ONLY non-sticky cols or handle stickiness dynamically. For now assuming Name is always first/fixed or handled gracefully.
            )}
        >
            <div className="flex items-center gap-2 w-full overflow-hidden">
                {/* Drag Handle (only show for non-sticky if desired, or all) */}
                {column.id !== 'name' && (
                    <div {...attributes} {...listeners} className="cursor-grab hover:text-gray-700">
                        <Bars2Icon className="w-4 h-4" />
                    </div>
                )}

                <span className="truncate">{column.label}</span>
            </div>

            <div className="flex items-center">
                {/* Remove Column Button (except core ones like name) */}
                {column.id !== 'name' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(column.id); }}
                        className="p-1 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove Column"
                    >
                        <XMarkIcon className="w-3 h-3" />
                    </button>
                )}

                {/* Resizer Handle */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 transition-colors z-10"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Stop drag start
                        onResizeStart(column.id);
                    }}
                />
            </div>
        </div>
    );
}
