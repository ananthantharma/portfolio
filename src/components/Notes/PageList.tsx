import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { INotePage } from '@/models/NotePage';

interface PageListProps {
    pages: INotePage[];
    selectedPageId: string | null;
    onSelectPage: (id: string) => void;
    onAddPage: (title: string) => void;
    onRenamePage: (id: string, title: string) => void;
    onDeletePage: (id: string) => void;
    loading: boolean;
}

const PageList: React.FC<PageListProps> = ({
    pages,
    selectedPageId,
    onSelectPage,
    onAddPage,
    onRenamePage,
    onDeletePage,
    loading,
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const handleAdd = () => {
        if (newPageTitle.trim()) {
            onAddPage(newPageTitle);
            setNewPageTitle('');
            setIsAdding(false);
        }
    };

    const startEditing = (page: INotePage) => {
        setEditingId(page._id as string);
        setEditTitle(page.title);
    };

    const handleRename = () => {
        if (editingId && editTitle.trim()) {
            onRenamePage(editingId, editTitle);
            setEditingId(null);
            setEditTitle('');
        }
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center text-gray-500">Loading pages...</div>;
    }

    return (
        <div className="flex h-full flex-col border-r border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-700">Pages</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="rounded-full p-1 hover:bg-gray-100 text-gray-600"
                    title="Add Page"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isAdding && (
                    <div className="p-2">
                        <div className="flex items-center space-x-2 rounded-md bg-gray-50 p-2 shadow-sm border border-gray-200">
                            <input
                                type="text"
                                value={newPageTitle}
                                onChange={(e) => setNewPageTitle(e.target.value)}
                                placeholder="New Page"
                                className="w-full border-none bg-transparent p-0 text-sm focus:ring-0"
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
                    {pages.map((page) => (
                        <li key={page._id as string}>
                            {editingId === page._id ? (
                                <div className="flex items-center space-x-2 rounded-md bg-gray-50 p-2 shadow-sm border border-gray-200">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full border-none bg-transparent p-0 text-sm focus:ring-0"
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
                                    className={`group flex cursor-pointer items-center justify-between rounded-md p-3 text-sm transition-colors ${selectedPageId === page._id
                                            ? 'bg-gray-100 font-medium text-gray-900 border-l-4 border-blue-500'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    onClick={() => onSelectPage(page._id as string)}
                                >
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="truncate">{page.title}</span>
                                        <span className="truncate text-xs text-gray-400">
                                            {new Date(page.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="hidden space-x-1 group-hover:flex">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEditing(page);
                                            }}
                                            className="text-gray-400 hover:text-blue-600"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this page?')) {
                                                    onDeletePage(page._id as string);
                                                }
                                            }}
                                            className="text-gray-400 hover:text-red-600"
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

export default PageList;
