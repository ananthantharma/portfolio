import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FileText } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import { INotePage } from '@/models/NotePage';

import { ColorPicker } from './ColorPicker';
import { ICON_options, IconPicker } from './IconPicker';
import { SortableItem } from './SortableItem';

interface PageListProps {
  pages: INotePage[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onAddPage: (title: string, color?: string, icon?: string, image?: string | null) => void;
  onRenamePage: (id: string, title: string, color?: string, icon?: string, image?: string | null) => void;
  onDeletePage: (id: string) => void;
  onReorderPages: (newOrder: INotePage[]) => void;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const PageList: React.FC<PageListProps> = React.memo(
  ({
    isCollapsed,
    loading,
    onAddPage,
    onDeletePage,
    onRenamePage,
    onReorderPages,
    onSelectPage,
    onToggleCollapse,
    pages,
    selectedPageId,
  }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageColor, setNewPageColor] = useState('#000000');
    const [newPageIcon, setNewPageIcon] = useState('FileText');
    const [newPageImage, setNewPageImage] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editColor, setEditColor] = useState('#000000');
    const [editIcon, setEditIcon] = useState('FileText');
    const [editImage, setEditImage] = useState<string | null>(null);

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
        const { active, over } = event;

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
        onAddPage(newPageTitle, newPageColor, newPageIcon, newPageImage);
        setNewPageTitle('');
        setNewPageColor('#000000');
        setNewPageIcon('FileText');
        setNewPageImage(null);
        setIsAdding(false);
      }
    };

    const handleAddToday = () => {
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      onAddPage(today, '#000000', 'Calendar', null);
    };

    const startEditing = (page: INotePage) => {
      setEditingId(page._id as string);
      setEditTitle(page.title);
      setEditColor(page.color || '#000000');
      setEditIcon(page.icon || 'FileText');
      setEditImage(page.image || null);
    };

    const handleRename = () => {
      if (editingId && editTitle.trim()) {
        onRenamePage(editingId, editTitle, editColor, editIcon, editImage);
        setEditingId(null);
        setEditTitle('');
        setEditColor('#000000');
        setEditIcon('FileText');
        setEditImage(null);
      }
    };

    const handleAddClick = () => {
      if (isCollapsed) onToggleCollapse();
      setIsAdding(true);
    };

    const handleIconSelect = (icon: string, image?: string | null) => {
      if (editingId) {
        setEditIcon(icon);
        setEditImage(image || null);
      } else {
        setNewPageIcon(icon);
        setNewPageImage(image || null);
      }
    };

    const clientId = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;

    if (loading) {
      return (
        <div className="flex h-full items-center justify-center text-gray-500">
          {isCollapsed ? <div className="h-4 w-4 animate-pulse rounded bg-gray-200" /> : 'Loading...'}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          {!isCollapsed && <h2 className="text-lg font-semibold text-gray-700">Pages</h2>}
          <div className={`flex items-center gap-2 ${isCollapsed ? 'mx-auto flex-col' : ''}`}>
            <button
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand Pages' : 'Collapse Pages'}>
              {isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
            </button>
            {!isCollapsed && (
              <>
                <button
                  className="rounded-full p-1 hover:bg-gray-100 text-gray-600"
                  onClick={handleAddToday}
                  title="Add Today">
                  <CalendarIcon className="h-5 w-5" />
                </button>
                <button
                  className="rounded-full p-1 hover:bg-gray-100 text-gray-600"
                  onClick={handleAddClick}
                  title="Add Page">
                  <PlusIcon className="h-5 w-5" />
                </button>
              </>
            )}
            {isCollapsed && (
              <button
                className="rounded-full p-1 hover:bg-gray-100 text-gray-600 mt-2"
                onClick={handleAddClick}
                title="Add Page">
                <PlusIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isAdding && !isCollapsed && (
            <div className="p-2">
              <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <IconPicker
                    onSelectIcon={handleIconSelect}
                    selectedIcon={newPageIcon}
                    selectedImage={newPageImage}
                  />
                  <ColorPicker selectedColor={newPageColor} onSelectColor={setNewPageColor} />
                </div>
                <input
                  autoFocus
                  className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={e => setNewPageTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setIsAdding(false);
                  }}
                  placeholder="New Page Title"
                  type="text"
                  value={newPageTitle}
                />
                <div className="flex justify-end gap-2">
                  <button className="text-gray-500 hover:text-red-600" onClick={() => setIsAdding(false)}>
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <button className="text-blue-500 hover:text-green-600" onClick={handleAdd}>
                    <CheckIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext items={pages.map(p => p._id as string)} strategy={verticalListSortingStrategy}>
              <ul className={`space-y-1 ${isCollapsed ? 'px-1 py-2' : 'p-2'}`}>
                {pages.map(page => {
                  const PageIcon = ICON_options[page.icon as keyof typeof ICON_options] || FileText;

                  if (editingId === page._id && !isCollapsed) {
                    return (
                      <div className="p-2" key={page._id as string}>
                        <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <IconPicker
                              onSelectIcon={handleIconSelect}
                              selectedIcon={editIcon}
                              selectedImage={editImage}
                            />
                            <ColorPicker selectedColor={editColor} onSelectColor={setEditColor} />
                          </div>
                          <input
                            autoFocus
                            className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRename();
                              if (e.key === 'Escape') setEditingId(null);
                              e.stopPropagation();
                            }}
                            onPointerDown={e => e.stopPropagation()}
                            type="text"
                            value={editTitle}
                          />
                          <div className="flex justify-end gap-2">
                            <button className="text-gray-500 hover:text-red-600" onClick={() => setEditingId(null)}>
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                            <button className="text-blue-500 hover:text-green-600" onClick={handleRename}>
                              <CheckIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <SortableItem id={page._id as string} key={page._id as string}>
                      <div
                        className={`group flex cursor-pointer items-center rounded-md transition-colors ${isCollapsed ? 'justify-center p-2' : 'justify-between p-3'
                          } ${selectedPageId === page._id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        onClick={() => onSelectPage(page._id as string)}
                        title={page.title}>
                        <div
                          className={`flex items-center overflow-hidden gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                          <div className="flex items-center justify-center flex-shrink-0 relative">
                            {page.image ? (
                              <img
                                src={`https://cdn.brandfetch.io/${page.image}?c=${clientId}`}
                                alt={page.title}
                                className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} object-contain`}
                                onError={e => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <PageIcon
                              className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} ${page.image ? 'hidden' : ''} ${selectedPageId === page._id
                                ? 'text-blue-600'
                                : 'text-gray-400 group-hover:text-gray-600'
                                }`}
                            />
                            {page.color && page.color !== '#000000' && (
                              <span
                                className="absolute -bottom-1 -right-1 block h-2 w-2 rounded-full ring-1 ring-white"
                                style={{ backgroundColor: page.color }}
                              />
                            )}
                          </div>
                          {!isCollapsed && (
                            <div className="flex flex-col overflow-hidden">
                              <span className="truncate">{page.title}</span>
                              <span className="truncate text-[10px] text-gray-400 font-normal">
                                {new Date(page.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {!isCollapsed && (
                          <div className="hidden space-x-1 group-hover:flex">
                            <button
                              className="text-gray-400 hover:text-blue-600 p-1"
                              onClick={e => {
                                e.stopPropagation();
                                startEditing(page);
                              }}>
                              <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="text-gray-400 hover:text-red-600 p-1"
                              onClick={e => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this page?')) {
                                  onDeletePage(page._id as string);
                                }
                              }}>
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </SortableItem>
                  );
                })}
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
