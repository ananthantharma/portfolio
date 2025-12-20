import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CalendarIcon, CheckIcon, PencilIcon, PlusIcon, TrashIcon, XMarkIcon} from '@heroicons/react/24/outline';
import React, {useCallback, useState} from 'react';

import {INotePage} from '@/models/NotePage';

import {SortableItem} from './SortableItem';

interface PageListProps {
  pages: INotePage[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onAddPage: (title: string, color?: string) => void;
  onRenamePage: (id: string, title: string, color?: string) => void;
  onDeletePage: (id: string) => void;
  onReorderPages: (newOrder: INotePage[]) => void;
  loading: boolean;
}

const PageList: React.FC<PageListProps> = React.memo(
  ({loading, onAddPage, onDeletePage, onRenamePage, onReorderPages, onSelectPage, pages, selectedPageId}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageColor, setNewPageColor] = useState('#000000');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editColor, setEditColor] = useState('#000000');

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const {active, over} = event;

        if (over && active.id !== over.id) {
          const oldIndex = pages.findIndex(p => p._id === active.id);
          const newIndex = pages.findIndex(p => p._id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(pages, oldIndex, newIndex);
            onReorderPages(newOrder);
          }
        }
      },
      [pages, onReorderPages],
    );

    const handleAdd = () => {
      if (newPageTitle.trim()) {
        onAddPage(newPageTitle, newPageColor);
        setNewPageTitle('');
        setNewPageColor('#000000');
        setIsAdding(false);
      }
    };

    const handleAddToday = () => {
      const today = new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
      onAddPage(today);
    };

    const startEditing = (page: INotePage) => {
      setEditingId(page._id as string);
      setEditTitle(page.title);
      setEditColor(page.color || '#000000');
    };

    const handleRename = () => {
      if (editingId && editTitle.trim()) {
        onRenamePage(editingId, editTitle, editColor);
        setEditingId(null);
        setEditTitle('');
        setEditColor('#000000');
      }
    };

    if (loading) {
      return <div className="flex h-full items-center justify-center text-gray-500">Loading pages...</div>;
    }

    return (
      <div className="flex h-full flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-700">Pages</h2>
          <div className="flex gap-2">
            <button
              className="rounded-full p-1 hover:bg-gray-100 text-gray-600"
              onClick={handleAddToday}
              title="Add Today">
              <CalendarIcon className="h-5 w-5" />
            </button>
            <button
              className="rounded-full p-1 hover:bg-gray-100 text-gray-600"
              onClick={() => setIsAdding(true)}
              title="Add Page">
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isAdding && (
            <div className="p-2">
              <div className="flex items-center space-x-2 rounded-md bg-gray-50 p-2 shadow-sm border border-gray-200">
                <input
                  className="h-6 w-6 cursor-pointer rounded-full border-0 p-0"
                  onChange={e => setNewPageColor(e.target.value)}
                  title="Pick a color"
                  type="color"
                  value={newPageColor}
                />
                <input
                  autoFocus
                  className="w-full border-none bg-transparent p-0 text-sm focus:ring-0 text-gray-900"
                  onChange={e => setNewPageTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setIsAdding(false);
                  }}
                  placeholder="New Page"
                  type="text"
                  value={newPageTitle}
                />
                <button className="text-green-600" onClick={handleAdd}>
                  <CheckIcon className="h-4 w-4" />
                </button>
                <button className="text-red-600" onClick={() => setIsAdding(false)}>
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext items={pages.map(p => p._id as string)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1 p-2">
                {pages.map(page => (
                  <SortableItem id={page._id as string} key={page._id as string}>
                    {editingId === page._id ? (
                      <div className="flex items-center space-x-2 rounded-md bg-gray-50 p-2 shadow-sm border border-gray-200">
                        <input
                          className="h-6 w-6 cursor-pointer rounded-full border-0 p-0"
                          onChange={e => setEditColor(e.target.value)}
                          onKeyDown={e => e.stopPropagation()}
                          onPointerDown={e => e.stopPropagation()}
                          title="Pick a color"
                          type="color"
                          value={editColor}
                        />
                        <input
                          autoFocus
                          className="w-full border-none bg-transparent p-0 text-sm focus:ring-0 text-gray-900"
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename();
                            if (e.key === 'Escape') setEditingId(null);
                            e.stopPropagation();
                          }}
                          // Prevent drag usage on inputs
                          onPointerDown={e => e.stopPropagation()}
                          type="text"
                          value={editTitle}
                        />
                        <button className="text-green-600" onClick={handleRename}>
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button className="text-red-600" onClick={() => setEditingId(null)}>
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`group flex cursor-pointer items-center justify-between rounded-md p-3 text-sm transition-colors ${
                          selectedPageId === page._id
                            ? 'bg-gray-100 font-medium text-gray-900 border-l-4 border-blue-500'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        onClick={() => onSelectPage(page._id as string)}>
                        <div className="flex flex-col overflow-hidden">
                          <div className="flex items-center gap-2">
                            {page.color && (
                              <span
                                className="h-3 w-3 rounded-full flex-shrink-0"
                                style={{backgroundColor: page.color}}
                              />
                            )}
                            <span className="truncate">{page.title}</span>
                          </div>
                          <span className="truncate text-xs text-gray-400">
                            {new Date(page.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="hidden space-x-1 group-hover:flex">
                          <button
                            className="text-gray-400 hover:text-blue-600"
                            onClick={e => {
                              e.stopPropagation();
                              startEditing(page);
                            }}>
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            className="text-gray-400 hover:text-red-600"
                            onClick={e => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this page?')) {
                                onDeletePage(page._id as string);
                              }
                            }}>
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    );
  },
);

PageList.displayName = 'PageList';

export default PageList;
