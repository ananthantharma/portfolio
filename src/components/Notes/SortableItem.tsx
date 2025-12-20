import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import React from 'react';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

export function SortableItem({id, children}: SortableItemProps) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
