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
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import React, { useCallback, useState } from 'react';

import { INoteCategory } from '@/models/NoteCategory';

import { ColorPicker } from './ColorPicker';
import { ICON_options, IconPicker } from './IconPicker';
import { SortableItem } from './SortableItem';

interface CategoryListProps {
  categories: INoteCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  onAddCategory: (name: string, color?: string, icon?: string, image?: string | null) => void;
  onRenameCategory: (id: string, name: string, color?: string, icon?: string, image?: string | null) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories: (newOrder: INoteCategory[]) => void;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const CategoryList: React.FC<CategoryListProps> = React.memo(
  ({
    categories,
    isCollapsed,
    loading,
    onAddCategory,
    onDeleteCategory,
    onRenameCategory,
    onReorderCategories,
    onSelectCategory,
    onToggleCollapse,
    selectedCategoryId,
  }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#000000');
    const [newCategoryIcon, setNewCategoryIcon] = useState('Folder');
    const [newCategoryImage, setNewCategoryImage] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#000000');
    const [editIcon, setEditIcon] = useState('Folder');
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
          const oldIndex = categories.findIndex(c => c._id === active.id);
          const newIndex = categories.findIndex(c => c._id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(categories, oldIndex, newIndex);
            onReorderCategories(newOrder);
          }
        }
      },
      [categories, onReorderCategories],
    );

    const handleAdd = () => {
      if (newCategoryName.trim()) {
        onAddCategory(newCategoryName, newCategoryColor, newCategoryIcon, newCategoryImage);
        setNewCategoryName('');
        setNewCategoryColor('#000000');
        setNewCategoryIcon('Folder');
        setNewCategoryImage(null);
        setIsAdding(false);
      }
    };

    const startEditing = (category: INoteCategory) => {
      setEditingId(category._id as string);
      setEditName(category.name);
      setEditColor(category.color || '#000000');
      setEditIcon(category.icon || 'Folder');
      setEditImage(category.image || null);
    };

    const handleRename = () => {
      if (editingId && editName.trim()) {
        onRenameCategory(editingId, editName, editColor, editIcon, editImage);
        setEditingId(null);
        setEditName('');
        setEditColor('#000000');
        setEditIcon('Folder');
        setEditImage(null);
      }
    };

    const handleIconSelect = (icon: string, image?: string | null) => {
      if (editingId) {
        setEditIcon(icon);
        setEditImage(image || null);
      } else {
        setNewCategoryIcon(icon);
        setNewCategoryImage(image || null);
      }
    };


    if (loading) {
      return (
        <div className="flex h-full items-center justify-center text-gray-500">
          {isCollapsed ? <div className="h-4 w-4 animate-pulse rounded bg-gray-200" /> : 'Loading...'}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
          {!isCollapsed && <h2 className="text-xs font-semibold uppercase text-gray-400">Notebooks</h2>}
          <div className={`flex items-center gap-1 ${isCollapsed ? 'mx-auto flex-col' : ''}`}>
            <button
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand Notebooks' : 'Collapse Notebooks'}>
              {isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
            </button>
            <button
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                setIsAdding(true);
              }}
              title="Add Notebook">
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        {!isCollapsed ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {isAdding && (
              <div className="mb-2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg ring-1 ring-black/5 relative z-20">
                <div className="mb-3">
                  <input
                    autoFocus
                    className="w-full border-b border-gray-200 px-1 py-1 text-sm font-medium outline-none focus:border-blue-500"
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAdd();
                      if (e.key === 'Escape') setIsAdding(false);
                      e.stopPropagation();
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    placeholder="Notebook Name"
                    type="text"
                    value={newCategoryName}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <IconPicker
                    onSelectIcon={handleIconSelect}
                    selectedIcon={newCategoryIcon}
                    selectedImage={newCategoryImage}
                  />
                </div>
                <div className="mb-3">
                  <ColorPicker onSelectColor={setNewCategoryColor} selectedColor={newCategoryColor} />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                    onClick={() => setIsAdding(false)}>
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
                    onClick={handleAdd}>
                    Add
                  </button>
                </div>
              </div>
            )}

            <div
              className="flex-1 overflow-y-auto"
              onClick={e => e.stopPropagation()} // Prevent bubble up
              onPointerDown={e => e.stopPropagation()} // Prevent drag initiation
            >
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
                <SortableContext items={categories.map(c => c._id as string)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-1">
                    {categories.map(category => {
                      const CategoryIcon =
                        ICON_options[category.icon as keyof typeof ICON_options] || ICON_options.Folder;

                      if (editingId === category._id) {
                        return (
                          <div
                            className="rounded-xl border border-blue-100 bg-white p-3 shadow-md ring-2 ring-blue-50 relative z-20"
                            key={category._id as string}>
                            <div className="mb-3">
                              <input
                                autoFocus
                                className="w-full border-b border-gray-200 px-1 py-1 text-sm font-medium outline-none focus:border-blue-500"
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRename();
                                  if (e.key === 'Escape') setEditingId(null);
                                  e.stopPropagation();
                                }}
                                onPointerDown={e => e.stopPropagation()}
                                type="text"
                                value={editName}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <IconPicker
                                onSelectIcon={handleIconSelect}
                                selectedIcon={editIcon}
                                selectedImage={editImage}
                              />
                            </div>
                            <div className="mb-3">
                              <ColorPicker onSelectColor={setEditColor} selectedColor={editColor} />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                                onClick={() => setEditingId(null)}>
                                Cancel
                              </button>
                              <button
                                className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 shadow-sm shadow-green-200"
                                onClick={handleRename}>
                                Save
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <SortableItem id={category._id as string} key={category._id as string}>
                          <div
                            className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${selectedCategoryId === category._id
                              ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 font-medium'
                              : 'text-gray-600 hover:bg-gray-100/50 hover:text-gray-900'
                              }`}
                            onClick={() => onSelectCategory(category._id as string)}>
                            {/* Accent Bar */}
                            {selectedCategoryId === category._id && (
                              <div className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
                            )}

                            <div className="flex items-center gap-3 overflow-hidden">
                              {category.image ? (
                                <img
                                  src={`/api/notes/brandfetch?domain=${category.image}`}
                                  alt={category.name}
                                  className="h-4 w-4 object-contain"
                                  onError={e => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <CategoryIcon
                                className={`h-4 w-4 shrink-0 transition-colors ${category.image ? 'hidden' : ''
                                  } ${selectedCategoryId === category._id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`}
                                style={{
                                  color:
                                    category.color && category.color !== '#000000' ? category.color : undefined,
                                }}
                              />
                              <span className="truncate">{category.name}</span>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                onClick={e => {
                                  e.stopPropagation();
                                  startEditing(category);
                                }}>
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                onClick={e => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this notebook?')) {
                                    onDeleteCategory(category._id as string);
                                  }
                                }}>
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </SortableItem>
                      );
                    })}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pt-4">
            {categories.map(category => {
              const CategoryIcon = ICON_options[category.icon as keyof typeof ICON_options] || ICON_options.Folder;
              const isSelected = selectedCategoryId === category._id;
              return (
                <button
                  className={`p-2 rounded-lg transition-all ${isSelected ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'hover:bg-gray-100'
                    }`}
                  key={category._id as string}
                  onClick={() => onSelectCategory(category._id as string)}
                  title={category.name}>
                  {category.image ? (
                    <img
                      src={`/api/notes/brandfetch?domain=${category.image}`}
                      alt={category.name}
                      className="h-5 w-5 object-contain"
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <CategoryIcon
                    className={`h-5 w-5 ${category.image ? 'hidden' : ''} ${isSelected ? 'text-gray-800' : 'text-gray-500'}`}
                    style={{ color: isSelected ? undefined : category.color }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);

CategoryList.displayName = 'CategoryList';

export default CategoryList;
