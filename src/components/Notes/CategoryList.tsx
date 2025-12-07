'use client';

import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';

import { INoteCategory } from '@/models/NoteCategory';

interface CategoryListProps {
  categories: INoteCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  onAddCategory: (name: string, color?: string) => void;
  onRenameCategory: (id: string, name: string, color?: string) => void;
  onDeleteCategory: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const CategoryList: React.FC<CategoryListProps> = React.memo(
  ({ categories, isCollapsed, onAddCategory, onDeleteCategory, onRenameCategory, onSelectCategory, onToggleCollapse, selectedCategoryId }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#000000');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#000000');

    const handleAdd = () => {
      if (newCategoryName.trim()) {
        onAddCategory(newCategoryName, newCategoryColor);
        setNewCategoryName('');
        setNewCategoryColor('#000000');
        setIsAdding(false);
      }
    };

    const startEditing = (category: INoteCategory) => {
      setEditingId(category._id as string);
      setEditName(category.name);
      setEditColor(category.color || '#000000');
    };

    const handleRename = () => {
      if (editingId && editName.trim()) {
        onRenameCategory(editingId, editName, editColor);
        setEditingId(null);
        setEditName('');
        setEditColor('#000000');
      }
    };

    return (
      <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50">
        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'} border-b border-gray-200 p-4 transition-all`}>
          <h2 className={`font-semibold text-gray-700 ${isCollapsed ? 'text-lg' : 'text-lg'}`}>
            {isCollapsed ? 'N' : 'Notebooks'}
          </h2>
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <button
                className="rounded-full p-1 hover:bg-gray-200 text-gray-600"
                onClick={() => setIsAdding(true)}
                title="Add Notebook">
                <PlusIcon className="h-5 w-5" />
              </button>
            )}
            <button
              className="rounded-full p-1 hover:bg-gray-200 text-gray-500"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto">
            {isAdding && (
              <div className="p-2">
                <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                  <input
                    className="h-6 w-6 cursor-pointer rounded-full border-0 p-0"
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    title="Pick a color"
                    type="color"
                    value={newCategoryColor}
                  />
                  <input
                    autoFocus
                    className="w-full border-none p-0 text-sm focus:ring-0 text-gray-900"
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAdd();
                      if (e.key === 'Escape') setIsAdding(false);
                    }}
                    placeholder="New Notebook"
                    type="text"
                    value={newCategoryName}
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

            <ul className="space-y-1 p-2">
              {categories.map(category => (
                <li key={category._id as string}>
                  {editingId === category._id ? (
                    <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                      <input
                        className="h-6 w-6 cursor-pointer rounded-full border-0 p-0"
                        onChange={(e) => setEditColor(e.target.value)}
                        title="Pick a color"
                        type="color"
                        value={editColor}
                      />
                      <input
                        autoFocus
                        className="w-full border-none p-0 text-sm focus:ring-0 text-gray-900"
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        type="text"
                        value={editName}
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
                      className={`group flex cursor-pointer items-center justify-between rounded-md p-2 text-sm ${selectedCategoryId === category._id
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      onClick={() => onSelectCategory(category._id as string)}>
                      <div className="flex items-center gap-2 truncate">
                        {category.color && (
                          <span
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        <span className="truncate">{category.name}</span>
                      </div>
                      <div className="hidden space-x-1 group-hover:flex">
                        <button
                          className="text-gray-500 hover:text-blue-600"
                          onClick={e => {
                            e.stopPropagation();
                            startEditing(category);
                          }}>
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-gray-500 hover:text-red-600"
                          onClick={e => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this notebook and all its pages?')) {
                              onDeleteCategory(category._id as string);
                            }
                          }}>
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
);

CategoryList.displayName = 'CategoryList';

export default CategoryList;
