/* eslint-disable object-curly-spacing */
/* eslint-disable react-memo/require-usememo */
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  Bookmark as BookmarkIcon,
  Edit2,
  ExternalLink,
  Folder,
  FolderEdit,
  FolderInput,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';

import Page from '../components/Layout/Page';
import Header from '../components/Sections/Header';

interface BookmarkData {
  _id: string;
  title: string;
  url: string;
  category: string;
  description?: string;
  path: string[];
  added_timestamp?: string;
  icon?: string;
}

interface EditForm {
  title: string;
  url: string;
  category: string;
  description: string;
}

interface DraggableBookmarkProps {
  bookmark: BookmarkData;
  onEdit: (b: BookmarkData) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
  editForm: EditForm;
  setEditForm: (form: EditForm) => void;
  saveEdit: (id: string) => void;
  cancelEdit: () => void;
}

// Draggable Bookmark Component
const DraggableBookmark = memo(
  ({ bookmark, onEdit, onDelete, isEditing, editForm, setEditForm, saveEdit, cancelEdit }: DraggableBookmarkProps) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: `bookmark-${bookmark._id}`,
      data: { type: 'bookmark', bookmark },
      disabled: isEditing, // Disable drag when editing
    });

    const style = transform
      ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
      }
      : undefined;

    if (isDragging) {
      return (
        <div
          className="bg-neutral-800 border border-orange-500/50 rounded-lg p-4 opacity-50 shadow-xl"
          ref={setNodeRef}
          style={style}
        />
      );
    }

    return (
      <div
        className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 hover:border-orange-500/50 transition-all touch-none"
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}>
        {isEditing ? (
          <div className="space-y-3" onPointerDown={e => e.stopPropagation()}>
            <input
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Title"
              type="text"
              value={editForm.title}
            />
            <input
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              onChange={e => setEditForm({ ...editForm, url: e.target.value })}
              placeholder="URL"
              type="url"
              value={editForm.url}
            />
            <input
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              onChange={e => setEditForm({ ...editForm, category: e.target.value })}
              placeholder="Category"
              type="text"
              value={editForm.category}
            />
            <textarea
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Description (optional)"
              rows={2}
              value={editForm.description}
            />
            <div className="flex gap-2">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                onClick={() => saveEdit(bookmark._id)}>
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                onClick={cancelEdit}>
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            {bookmark.icon ? (
              <img
                alt=""
                className="w-6 h-6 rounded flex-shrink-0 mt-0.5"
                onError={e => {
                  e.currentTarget.style.display = 'none';
                }}
                src={bookmark.icon}
              />
            ) : (
              <BookmarkIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <a
                className="text-white font-medium hover:text-orange-500 transition-colors block"
                href={bookmark.url}
                onPointerDown={e => e.stopPropagation()} // Allow clicking link without dragging
                rel="noopener noreferrer"
                target="_blank">
                {bookmark.title}
              </a>
              {bookmark.description && (
                <p className="text-neutral-500 text-sm mt-2 leading-relaxed">{bookmark.description}</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0" onPointerDown={e => e.stopPropagation()}>
              <a
                className="p-2 text-neutral-400 hover:text-orange-500 transition-colors"
                href={bookmark.url}
                rel="noopener noreferrer"
                target="_blank"
                title="Open">
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                className="p-2 text-neutral-400 hover:text-blue-500 transition-colors"
                onClick={() => onEdit(bookmark)}
                title="Edit">
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                onClick={() => onDelete(bookmark._id)}
                title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

interface DroppableCategoryProps {
  category: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onMerge: () => void;
  isEditing: boolean;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  saveCategoryRename: (old: string) => void;
  setEditingCategory: (cat: string | null) => void;
  mergingCategory: string | null;
  setMergingCategory: (cat: string | null) => void;
  mergeCategories: (from: string, to: string) => void;
  categories: string[];
}

// Droppable Category Component
const DroppableCategory = memo(
  ({
    category,
    count,
    isSelected,
    onClick,
    onEdit,
    onMerge,
    isEditing,
    newCategoryName,
    setNewCategoryName,
    saveCategoryRename,
    setEditingCategory,
    mergingCategory,
    setMergingCategory,
    mergeCategories,
    categories,
  }: DroppableCategoryProps) => {
    // Make it droppable (for bookmarks and other categories)
    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: `category-${category}`,
      data: { type: 'category', category },
    });

    // Make it draggable (for merging)
    const {
      attributes,
      listeners,
      setNodeRef: setDragRef,
      transform,
      isDragging,
    } = useDraggable({
      id: `category-drag-${category}`,
      data: { type: 'category', category },
      disabled: isEditing || !!mergingCategory,
    });

    const style = transform
      ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
      }
      : undefined;

    // Combine refs
    const setRefs = (node: HTMLElement | null) => {
      setDropRef(node);
      setDragRef(node);
    };

    if (isEditing) {
      return (
        <div className="flex items-center gap-1 p-1 bg-neutral-700 rounded-lg">
          <input
            autoFocus
            className="flex-1 px-2 py-1 text-sm bg-neutral-900 text-white rounded border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') saveCategoryRename(category);
              if (e.key === 'Escape') setEditingCategory(null);
            }}
            type="text"
            value={newCategoryName}
          />
          <button className="p-1 text-green-400 hover:text-green-300" onClick={() => saveCategoryRename(category)}>
            <Save className="w-4 h-4" />
          </button>
          <button className="p-1 text-neutral-400 hover:text-neutral-300" onClick={() => setEditingCategory(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }

    if (mergingCategory === category) {
      return (
        <div className="p-2 bg-neutral-700 rounded-lg">
          <p className="text-xs text-neutral-400 mb-2">Merge into:</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {categories
              .filter(c => c !== category)
              .map(targetCategory => (
                <button
                  className="w-full text-left px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-600 rounded"
                  key={targetCategory}
                  onClick={() => mergeCategories(category, targetCategory)}>
                  {targetCategory}
                </button>
              ))}
          </div>
          <button
            className="w-full mt-2 px-2 py-1 text-xs text-neutral-400 hover:text-white"
            onClick={() => setMergingCategory(null)}>
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div
        className={`relative group touch-none ${isOver ? 'ring-2 ring-orange-500 ring-inset rounded-lg' : ''} ${isDragging ? 'opacity-50' : ''
          }`}
        ref={setRefs}
        style={style}
        {...listeners}
        {...attributes}>
        <div className="flex items-center">
          <button
            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${isSelected ? 'bg-orange-500 text-white font-medium' : 'text-neutral-300 hover:bg-neutral-700'
              }`}
            onClick={onClick}>
            {category}
            <span className="float-right text-xs opacity-70">({count})</span>
          </button>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pr-2 absolute right-0 top-1/2 -translate-y-1/2 bg-neutral-800/80 backdrop-blur-sm rounded-l-md">
            <button
              className="p-1 text-neutral-400 hover:text-blue-400"
              onClick={e => {
                e.stopPropagation();
                onEdit();
              }}
              onPointerDown={e => e.stopPropagation()}
              title="Rename category">
              <FolderEdit className="w-3 h-3" />
            </button>
            <button
              className="p-1 text-neutral-400 hover:text-purple-400"
              onClick={e => {
                e.stopPropagation();
                onMerge();
              }}
              onPointerDown={e => e.stopPropagation()}
              title="Merge category">
              <FolderInput className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  },
);

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', url: '', category: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [mergingCategory, setMergingCategory] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newBookmarkForm, setNewBookmarkForm] = useState<EditForm>({
    title: '',
    url: '',
    category: '',
    description: '',
  });
  type DragItem = { type: 'bookmark'; bookmark: BookmarkData } | { type: 'category'; category: string };
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
  );

  const fetchBookmarks = useCallback(async () => {
    try {
      const res = await fetch('/api/bookmarks');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load bookmarks');
      }

      setBookmarks(data.bookmarks || []);
      setLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bookmarks';
      setError(errorMessage);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const categories = Array.from(new Set(bookmarks.map(b => b.category))).sort();

  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch =
      searchQuery === '' ||
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bookmark.description && bookmark.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || bookmark.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedBookmarks = filteredBookmarks.reduce(
    (acc, bookmark) => {
      if (!acc[bookmark.category]) {
        acc[bookmark.category] = [];
      }
      acc[bookmark.category].push(bookmark);
      return acc;
    },
    {} as Record<string, BookmarkData[]>,
  );

  const startEdit = useCallback((bookmark: BookmarkData) => {
    setEditingId(bookmark._id);
    setEditForm({
      title: bookmark.title,
      url: bookmark.url,
      category: bookmark.category,
      description: bookmark.description || '',
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({ title: '', url: '', category: '', description: '' });
  }, []);

  const saveEdit = useCallback(async (id: string, data?: EditForm) => {
    try {
      const response = await fetch(`/api/bookmarks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || editForm),
      });

      if (response.ok) {
        fetchBookmarks();
        cancelEdit();
      } else {
        alert('Failed to update bookmark');
      }
    } catch {
      alert('Failed to update bookmark');
    }
  }, [editForm, fetchBookmarks, cancelEdit]);

  const deleteBookmark = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this bookmark?')) return;

    try {
      const response = await fetch(`/api/bookmarks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchBookmarks();
      } else {
        alert('Failed to delete bookmark');
      }
    } catch {
      alert('Failed to delete bookmark');
    }
  }, [fetchBookmarks]);

  const startCategoryEdit = useCallback((category: string) => {
    setEditingCategory(category);
    setNewCategoryName(category);
  }, []);

  const saveCategoryRename = useCallback(async (oldCategory: string) => {
    if (!newCategoryName.trim() || newCategoryName === oldCategory) {
      setEditingCategory(null);
      return;
    }

    try {
      const response = await fetch('/api/categories/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCategory, newCategory: newCategoryName }),
      });

      if (response.ok) {
        fetchBookmarks();
        setEditingCategory(null);
        if (selectedCategory === oldCategory) {
          setSelectedCategory(newCategoryName);
        }
      } else {
        alert('Failed to rename category');
      }
    } catch {
      alert('Failed to rename category');
    }
  }, [fetchBookmarks, newCategoryName, selectedCategory]);

  const startCategoryMerge = useCallback((category: string) => {
    setMergingCategory(category);
  }, []);

  const mergeCategories = useCallback(async (fromCategory: string, toCategory: string) => {
    if (fromCategory === toCategory) {
      setMergingCategory(null);
      return;
    }

    if (!confirm(`Merge all bookmarks from "${fromCategory}" into "${toCategory}"?`)) {
      setMergingCategory(null);
      return;
    }

    try {
      const response = await fetch('/api/categories/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCategory: fromCategory, newCategory: toCategory }),
      });

      if (response.ok) {
        fetchBookmarks();
        setMergingCategory(null);
        if (selectedCategory === fromCategory) {
          setSelectedCategory(toCategory);
        }
      } else {
        alert('Failed to merge categories');
      }
    } catch {
      alert('Failed to merge categories');
    }
  }, [fetchBookmarks, selectedCategory]);

  const createBookmark = useCallback(async () => {
    if (!newBookmarkForm.title || !newBookmarkForm.url || !newBookmarkForm.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBookmarkForm),
      });

      if (response.ok) {
        fetchBookmarks();
        setIsCreating(false);
        setNewBookmarkForm({ title: '', url: '', category: '', description: '' });
      } else {
        alert('Failed to create bookmark');
      }
    } catch {
      alert('Failed to create bookmark');
    }
  }, [fetchBookmarks, newBookmarkForm]);

  // Drag and Drop Handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveDragItem(active.data.current as DragItem);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragItem(null);

      if (!over) return;

      const activeType = active.data.current?.type;
      const overType = over.data.current?.type;

      // Case 1: Dragging Bookmark to Category
      if (activeType === 'bookmark' && overType === 'category') {
        const bookmark = active.data.current?.bookmark as BookmarkData;
        const targetCategory = over.data.current?.category as string;

        if (bookmark.category !== targetCategory) {
          // Optimistic update (optional, but good for UX)
          // For now, just call API
          saveEdit(bookmark._id, {
            title: bookmark.title,
            url: bookmark.url,
            category: targetCategory,
            description: bookmark.description || '',
          });
        }
      }

      // Case 2: Dragging Category to Category (Merge)
      if (activeType === 'category' && overType === 'category') {
        const sourceCategory = active.data.current?.category as string;
        const targetCategory = over.data.current?.category as string;

        if (sourceCategory !== targetCategory) {
          mergeCategories(sourceCategory, targetCategory);
        }
      }
    },
    [saveEdit, mergeCategories],
  );

  return (
    <Page description="My curated collection of bookmarks" title="Bookmarks - Ananthan">
      <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors}>
        <Header />
        <div className="min-h-screen bg-neutral-900 pt-16">
          <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <div className="w-64 bg-neutral-800 border-r border-neutral-700 overflow-y-auto flex-shrink-0">
              <div className="p-4">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-orange-500" />
                  Categories
                </h2>
                <div className="space-y-1">
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === null
                      ? 'bg-orange-500 text-white font-medium'
                      : 'text-neutral-300 hover:bg-neutral-700'
                      }`}
                    onClick={() => setSelectedCategory(null)}>
                    All Bookmarks
                    <span className="float-right text-xs opacity-70">({bookmarks.length})</span>
                  </button>
                  {categories.map(category => (
                    <DroppableCategory
                      categories={categories}
                      category={category}
                      count={bookmarks.filter(b => b.category === category).length}
                      isEditing={editingCategory === category}
                      isSelected={selectedCategory === category}
                      key={category}
                      mergeCategories={mergeCategories}
                      mergingCategory={mergingCategory}
                      newCategoryName={newCategoryName}
                      onClick={() => setSelectedCategory(category)}
                      onEdit={() => startCategoryEdit(category)}
                      onMerge={() => startCategoryMerge(category)}
                      saveCategoryRename={saveCategoryRename}
                      setEditingCategory={setEditingCategory}
                      setMergingCategory={setMergingCategory}
                      setNewCategoryName={setNewCategoryName}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <BookmarkIcon className="w-8 h-8 text-orange-500" />
                    {selectedCategory || 'All Bookmarks'}
                  </h1>
                  <p className="text-neutral-400">
                    {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-5 h-5" />
                    <input
                      className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search bookmarks..."
                      type="text"
                      value={searchQuery}
                    />
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    <p className="mt-4 text-neutral-400">Loading bookmarks...</p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">{error}</div>
                )}

                {/* Bookmarks List */}
                {!loading && !error && (
                  <div className="space-y-6">
                    {Object.entries(groupedBookmarks).map(([category, items]) => (
                      <div key={category}>
                        {!selectedCategory && (
                          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                            <Folder className="w-5 h-5 text-orange-500" />
                            {category}
                          </h2>
                        )}
                        <div className="grid grid-cols-1 gap-3">
                          {items.map(bookmark => (
                            <DraggableBookmark
                              bookmark={bookmark}
                              cancelEdit={cancelEdit}
                              editForm={editForm}
                              isEditing={editingId === bookmark._id}
                              key={bookmark._id}
                              onDelete={deleteBookmark}
                              onEdit={startEdit}
                              saveEdit={saveEdit}
                              setEditForm={setEditForm}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredBookmarks.length === 0 && (
                  <div className="text-center py-12">
                    <BookmarkIcon className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
                    <p className="text-neutral-400 text-lg">No bookmarks found</p>
                    <p className="text-neutral-600 text-sm mt-2">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating Action Button */}
          <button
            className="fixed bottom-8 right-8 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
            onClick={() => setIsCreating(true)}
            title="Add new bookmark">
            <Plus className="w-6 h-6" />
          </button>

          {/* Create Bookmark Modal */}
          {isCreating && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-neutral-800 rounded-lg p-6 max-w-md w-full border border-neutral-700">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-orange-500" />
                  New Bookmark
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Title *</label>
                    <input
                      autoFocus
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      onChange={e => setNewBookmarkForm({ ...newBookmarkForm, title: e.target.value })}
                      placeholder="Enter bookmark title"
                      type="text"
                      value={newBookmarkForm.title}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">URL *</label>
                    <input
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      onChange={e => setNewBookmarkForm({ ...newBookmarkForm, url: e.target.value })}
                      placeholder="https://example.com"
                      type="url"
                      value={newBookmarkForm.url}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Category *</label>
                    <input
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      list="categories-list"
                      onChange={e => setNewBookmarkForm({ ...newBookmarkForm, category: e.target.value })}
                      placeholder="Enter category"
                      type="text"
                      value={newBookmarkForm.category}
                    />
                    <datalist id="categories-list">
                      {categories.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Description</label>
                    <textarea
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      onChange={e => setNewBookmarkForm({ ...newBookmarkForm, description: e.target.value })}
                      placeholder="Optional description"
                      rows={3}
                      value={newBookmarkForm.description}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                      onClick={createBookmark}>
                      <Save className="w-4 h-4" />
                      Create
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                      onClick={() => {
                        setIsCreating(false);
                        setNewBookmarkForm({ title: '', url: '', category: '', description: '' });
                      }}>
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDragItem?.type === 'bookmark' ? (
            <div className="bg-neutral-800 border border-orange-500 rounded-lg p-4 shadow-2xl w-80 opacity-90 cursor-grabbing">
              <div className="flex items-start gap-3">
                <BookmarkIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium block truncate">{activeDragItem.bookmark.title}</span>
                  <span className="text-neutral-500 text-sm block truncate">{activeDragItem.bookmark.url}</span>
                </div>
              </div>
            </div>
          ) : activeDragItem?.type === 'category' ? (
            <div className="bg-orange-500 text-white px-3 py-2 rounded-lg shadow-xl font-medium w-48 cursor-grabbing flex items-center gap-2">
              <Folder className="w-4 h-4" />
              {activeDragItem.category}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Page>
  );
}
