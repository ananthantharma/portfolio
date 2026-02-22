import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
    XMarkIcon,
    PlusIcon,
    TrashIcon,
    LinkIcon,
    MagnifyingGlassIcon,
    BookmarkIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface IBookmark {
    _id: string;
    url: string;
    title: string;
    description: string;
    category: string;
}

interface BookmarkListModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_CATEGORIES = ['Work', 'Personal', 'Coding', 'Finance', 'Email', 'Other'];

export default function BookmarkListModal({ isOpen, onClose }: BookmarkListModalProps) {
    const [bookmarks, setBookmarks] = useState<IBookmark[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Custom categories derived from existing bookmarks
    const allCategories = useMemo(() => {
        const cats = new Set(DEFAULT_CATEGORIES);
        bookmarks.forEach(b => {
            if (b.category) cats.add(b.category);
        });
        return ['All', ...Array.from(cats)].sort();
    }, [bookmarks]);

    const fetchBookmarks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/bookmarks');
            if (res.data && res.data.bookmarks) {
                setBookmarks(res.data.bookmarks);
            }
        } catch (error) {
            console.error('Error fetching bookmarks', error);
            setBookmarks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchBookmarks();
        }
    }, [isOpen, fetchBookmarks]);

    const handleCreate = async () => {
        const newBookmark = {
            title: 'New Bookmark',
            url: 'https://',
            description: '',
            category: selectedCategory === 'All' ? 'Other' : selectedCategory
        };
        try {
            const res = await axios.post('/api/bookmarks', newBookmark);
            if (res.data.success && res.data.id) {
                setBookmarks(prev => [{ ...newBookmark, _id: res.data.id } as IBookmark, ...prev]);
            } else {
                fetchBookmarks();
            }
        } catch (error) {
            console.error('Error creating bookmark:', error);
            alert('Failed to create bookmark');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this bookmark?')) return;
        try {
            await axios.delete(`/api/bookmarks/${id}`);
            setBookmarks(prev => prev.filter(b => b._id !== id));
        } catch (error) {
            console.error('Error deleting bookmark:', error);
        }
    };

    const handleUpdate = async (id: string, field: keyof IBookmark, value: string) => {
        const bookmark = bookmarks.find(b => b._id === id);
        if (!bookmark) return;

        setBookmarks(prev => prev.map(b => b._id === id ? { ...b, [field]: value } : b));

        try {
            const updatedData = { ...bookmark, [field]: value };
            await axios.put(`/api/bookmarks/${id}`, {
                title: updatedData.title,
                url: updatedData.url,
                description: updatedData.description,
                category: updatedData.category
            });
        } catch (error) {
            console.error('Error updating bookmark', error);
        }
    };

    // Filter existing bookmarks
    const filteredBookmarks = useMemo(() => {
        return bookmarks.filter(b => {
            const matchCat = selectedCategory === 'All' || b.category === selectedCategory;
            const matchSearch = !searchQuery ||
                (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.url || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchCat && matchSearch;
        });
    }, [bookmarks, selectedCategory, searchQuery]);

    return (
        <Transition appear show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-[95vw] xl:max-w-6xl transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl ring-1 ring-black/5 transition-all flex flex-col h-[90vh]">

                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                                            <BookmarkIcon className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 leading-tight">
                                                Bookmarks
                                            </Dialog.Title>
                                            <p className="text-xs text-gray-500 font-medium">Manage and organize your quick links</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Toolbar */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-gray-100 bg-white flex-shrink-0">
                                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
                                        {allCategories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${selectedCategory === cat
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:w-64">
                                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search bookmarks..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                            />
                                        </div>
                                        <button
                                            onClick={handleCreate}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex-shrink-0"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                            Add New
                                        </button>
                                    </div>
                                </div>

                                {/* Content / Table */}
                                <div className="flex-1 overflow-auto bg-gray-50/30 p-4">
                                    {loading ? (
                                        <div className="flex justify-center py-12">
                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                                        </div>
                                    ) : filteredBookmarks.length === 0 ? (
                                        <div className="text-center py-16 text-gray-400">
                                            <BookmarkIcon className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                                            <p className="text-sm font-medium">No bookmarks found in this category.</p>
                                            <button
                                                onClick={handleCreate}
                                                className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
                                            >
                                                Create your first bookmark
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 grid-cols-1">
                                            {filteredBookmarks.map((bookmark) => (
                                                <div key={bookmark._id} className="group bg-white border border-gray-200 rounded-xl p-3 flex flex-col lg:flex-row gap-4 items-start lg:items-center hover:shadow-md hover:border-indigo-200 transition-all">

                                                    {/* Left: Link & Title */}
                                                    <div className="flex items-start gap-3 w-full lg:w-1/3 shrink-0">
                                                        <a
                                                            href={bookmark.url.startsWith('http') ? bookmark.url : `https://${bookmark.url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-1 flex-shrink-0 p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
                                                            title="Open Link in new tab"
                                                        >
                                                            <LinkIcon className="h-4 w-4" />
                                                        </a>
                                                        <div className="flex flex-col gap-2 w-full">
                                                            <input
                                                                type="text"
                                                                value={bookmark.title}
                                                                onChange={(e) => handleUpdate(bookmark._id, 'title', e.target.value)}
                                                                placeholder="Title / Description"
                                                                className="font-bold text-gray-900 border-b border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none bg-transparent px-1 py-0.5 text-sm transition-colors w-full"
                                                            />
                                                            <div className="flex items-center gap-1 w-full relative">
                                                                <input
                                                                    type="text"
                                                                    value={bookmark.url}
                                                                    onChange={(e) => handleUpdate(bookmark._id, 'url', e.target.value)}
                                                                    placeholder="https://..."
                                                                    className="text-xs text-indigo-600 border-b border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none bg-transparent px-1 py-0.5 w-full flex-1"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Middle: Notes / Description */}
                                                    <div className="flex-1 w-full mx-1">
                                                        <textarea
                                                            value={bookmark.description || ''}
                                                            onChange={(e) => handleUpdate(bookmark._id, 'description', e.target.value)}
                                                            placeholder="Add extra notes here..."
                                                            rows={2}
                                                            className="w-full text-sm text-gray-600 bg-gray-50 border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 outline-none resize-none transition-all placeholder:text-gray-300"
                                                        />
                                                    </div>

                                                    {/* Right: Category & Actions */}
                                                    <div className="flex items-center gap-3 w-full lg:w-auto lg:shrink-0 justify-between lg:justify-end">
                                                        <input
                                                            type="text"
                                                            value={bookmark.category || 'Other'}
                                                            onChange={(e) => handleUpdate(bookmark._id, 'category', e.target.value)}
                                                            placeholder="Category"
                                                            className="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 rounded-md px-2 py-1 w-28 text-center border border-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white outline-none transition-colors"
                                                            list="category-suggestions"
                                                        />
                                                        <datalist id="category-suggestions">
                                                            {allCategories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                                                        </datalist>

                                                        <button
                                                            onClick={() => handleDelete(bookmark._id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100"
                                                            title="Delete Bookmark"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
