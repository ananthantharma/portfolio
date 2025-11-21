import {
  Bookmark,
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
import {useEffect, useState} from 'react';

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

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({title: '', url: '', category: '', description: ''});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [mergingCategory, setMergingCategory] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newBookmarkForm, setNewBookmarkForm] = useState({title: '', url: '', category: '', description: ''});

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
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
  };

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

  const startEdit = (bookmark: BookmarkData) => {
    setEditingId(bookmark._id);
    setEditForm({
      title: bookmark.title,
      url: bookmark.url,
      category: bookmark.category,
      description: bookmark.description || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({title: '', url: '', category: '', description: ''});
  };

  const saveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/bookmarks/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(editForm),
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
  };

  const deleteBookmark = async (id: string) => {
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
  };

  const startCategoryEdit = (category: string) => {
    setEditingCategory(category);
    setNewCategoryName(category);
  };

  const saveCategoryRename = async (oldCategory: string) => {
    if (!newCategoryName.trim() || newCategoryName === oldCategory) {
      setEditingCategory(null);
      return;
    }

    try {
      const response = await fetch('/api/categories/update', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({oldCategory, newCategory: newCategoryName}),
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
  };

  const startCategoryMerge = (category: string) => {
    setMergingCategory(category);
  };

  const mergeCategories = async (fromCategory: string, toCategory: string) => {
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
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({oldCategory: fromCategory, newCategory: toCategory}),
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
  };

  const createBookmark = async () => {
    if (!newBookmarkForm.title || !newBookmarkForm.url || !newBookmarkForm.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newBookmarkForm),
      });

      if (response.ok) {
        fetchBookmarks();
        setIsCreating(false);
        setNewBookmarkForm({title: '', url: '', category: '', description: ''});
      } else {
        alert('Failed to create bookmark');
      }
    } catch {
      alert('Failed to create bookmark');
    }
  };

  return (
    <Page description="My curated collection of bookmarks" title="Bookmarks - Ananthan">
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
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === null
                      ? 'bg-orange-500 text-white font-medium'
                      : 'text-neutral-300 hover:bg-neutral-700'
                  }`}
                  onClick={() => setSelectedCategory(null)}>
                  All Bookmarks
                  <span className="float-right text-xs opacity-70">({bookmarks.length})</span>
                </button>
                {categories.map(category => {
                  const count = bookmarks.filter(b => b.category === category).length;
                  return (
                    <div className="relative group" key={category}>
                      {editingCategory === category ? (
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
                          <button
                            className="p-1 text-green-400 hover:text-green-300"
                            onClick={() => saveCategoryRename(category)}>
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 text-neutral-400 hover:text-neutral-300"
                            onClick={() => setEditingCategory(null)}>
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : mergingCategory === category ? (
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
                      ) : (
                        <div className="flex items-center">
                          <button
                            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              selectedCategory === category
                                ? 'bg-orange-500 text-white font-medium'
                                : 'text-neutral-300 hover:bg-neutral-700'
                            }`}
                            onClick={() => setSelectedCategory(category)}>
                            {category}
                            <span className="float-right text-xs opacity-70">({count})</span>
                          </button>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pr-2">
                            <button
                              className="p-1 text-neutral-400 hover:text-blue-400"
                              onClick={() => startCategoryEdit(category)}
                              title="Rename category">
                              <FolderEdit className="w-3 h-3" />
                            </button>
                            <button
                              className="p-1 text-neutral-400 hover:text-purple-400"
                              onClick={() => startCategoryMerge(category)}
                              title="Merge category">
                              <FolderInput className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-6">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <Bookmark className="w-8 h-8 text-orange-500" />
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
                          <div
                            className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 hover:border-orange-500/50 transition-all"
                            key={bookmark._id}>
                            {editingId === bookmark._id ? (
                              // Edit Mode
                              <div className="space-y-3">
                                <input
                                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                                  placeholder="Title"
                                  type="text"
                                  value={editForm.title}
                                />
                                <input
                                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  onChange={e => setEditForm({...editForm, url: e.target.value})}
                                  placeholder="URL"
                                  type="url"
                                  value={editForm.url}
                                />
                                <input
                                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  onChange={e => setEditForm({...editForm, category: e.target.value})}
                                  placeholder="Category"
                                  type="text"
                                  value={editForm.category}
                                />
                                <textarea
                                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                  onChange={e => setEditForm({...editForm, description: e.target.value})}
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
                              // View Mode
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
                                  <Bookmark className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <a
                                    className="text-white font-medium hover:text-orange-500 transition-colors"
                                    href={bookmark.url}
                                    rel="noopener noreferrer"
                                    target="_blank">
                                    {bookmark.title}
                                  </a>
                                  {bookmark.description && (
                                    <p className="text-neutral-500 text-sm mt-2 leading-relaxed">
                                      {bookmark.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
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
                                    onClick={() => startEdit(bookmark)}
                                    title="Edit">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                                    onClick={() => deleteBookmark(bookmark._id)}
                                    title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && filteredBookmarks.length === 0 && (
                <div className="text-center py-12">
                  <Bookmark className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
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
                    onChange={e => setNewBookmarkForm({...newBookmarkForm, title: e.target.value})}
                    placeholder="Enter bookmark title"
                    type="text"
                    value={newBookmarkForm.title}
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">URL *</label>
                  <input
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={e => setNewBookmarkForm({...newBookmarkForm, url: e.target.value})}
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
                    onChange={e => setNewBookmarkForm({...newBookmarkForm, category: e.target.value})}
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
                    onChange={e => setNewBookmarkForm({...newBookmarkForm, description: e.target.value})}
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
                      setNewBookmarkForm({title: '', url: '', category: '', description: ''});
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
    </Page>
  );
}
