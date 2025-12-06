import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { INoteCategory } from '@/models/NoteCategory';

interface CategoryListProps {
    categories: INoteCategory[];
    selectedCategoryId: string | null;
    onSelectCategory: (id: string) => void;
    onAddCategory: (name: string) => void;
    onRenameCategory: (id: string, name: string) => void;
    onDeleteCategory: (id: string) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({
    categories,
    selectedCategoryId,
    onSelectCategory,
    onAddCategory,
    onRenameCategory,
    onDeleteCategory,
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleAdd = () => {
        if (newCategoryName.trim()) {
            onAddCategory(newCategoryName);
            setNewCategoryName('');
            setIsAdding(false);
        }
    };

    const startEditing = (category: INoteCategory) => {
        setEditingId(category._id as string);
        setEditName(category.name);
    };

    const handleRename = () => {
        if (editingId && editName.trim()) {
            onRenameCategory(editingId, editName);
            setEditingId(null);
            setEditName('');
        }
    };

    return (
        <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-700">Notebooks</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="rounded-full p-1 hover:bg-gray-200 text-gray-600"
                    title="Add Notebook"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isAdding && (
                    <div className="p-2">
                        <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="New Notebook"
                                className="w-full border-none p-0 text-sm focus:ring-0"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAdd();
                                    if (e.key === 'Escape') setIsAdding(false);
                                }}
                            />
                            <button onClick={handleAdd} className="text-green-600">
                                <CheckIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => setIsAdding(false)} className="text-red-600">
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                <ul className="space-y-1 p-2">
                    {categories.map((category) => (
                        <li key={category._id as string}>
                            {editingId === category._id ? (
                                <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full border-none p-0 text-sm focus:ring-0"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRename();
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                    />
                                    <button onClick={handleRename} className="text-green-600">
                                        <CheckIcon className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="text-red-600">
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className={`group flex cursor-pointer items-center justify-between rounded-md p-2 text-sm ${selectedCategoryId === category._id
                                            ? 'bg-blue-100 text-blue-900'
                                            : 'text-gray-700 hover:bg-gray-200'
                                        }`}
                                    onClick={() => onSelectCategory(category._id as string)}
                                >
                                    <span className="truncate">{category.name}</span>
                                    <div className="hidden space-x-1 group-hover:flex">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEditing(category);
                                            }}
                                            className="text-gray-500 hover:text-blue-600"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this notebook and all its pages?')) {
                                                    onDeleteCategory(category._id as string);
                                                }
                                            }}
                                            className="text-gray-500 hover:text-red-600"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default CategoryList;
