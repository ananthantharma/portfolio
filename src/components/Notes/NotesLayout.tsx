'use client';

import {ExclamationTriangleIcon, FlagIcon, MagnifyingGlassIcon} from '@heroicons/react/24/outline'; // Add icon for Key Tasks button
import axios from 'axios';
import React, {useCallback, useEffect, useState} from 'react';

import {INoteCategory} from '@/models/NoteCategory';
import {INotePage} from '@/models/NotePage';
import {INoteSection} from '@/models/NoteSection';

import CategoryList from './CategoryList';
import FlaggedItemsModal from './FlaggedItemsModal';
import NoteEditor from './NoteEditor';
import PageList from './PageList';
import SearchModal from './SearchModal';
import SectionList from './SectionList';

const NotesLayout: React.FC = React.memo(() => {
  const [categories, setCategories] = useState<INoteCategory[]>([]);
  const [sections, setSections] = useState<INoteSection[]>([]);
  const [pages, setPages] = useState<INotePage[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [isKeyTasksOpen, setIsKeyTasksOpen] = useState(false);
  const [isImportantOpen, setIsImportantOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch sections when category changes
  useEffect(() => {
    // Reset downstream state immediately to avoid stale data
    setSections([]);
    setPages([]);
    setSelectedSectionId(null);
    setSelectedPageId(null);

    if (selectedCategoryId) {
      fetchSections(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  // Fetch pages when section changes
  useEffect(() => {
    setPages([]);
    setSelectedPageId(null);

    if (selectedSectionId) {
      fetchPages(selectedSectionId);
    }
  }, [selectedSectionId]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/notes/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSections = async (categoryId: string) => {
    setLoadingSections(true);
    try {
      const response = await axios.get(`/api/notes/sections?categoryId=${categoryId}`);
      setSections(response.data.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoadingSections(false);
    }
  };

  const fetchPages = async (sectionId: string) => {
    setLoadingPages(true);
    try {
      const response = await axios.get(`/api/notes/pages?sectionId=${sectionId}`);
      setPages(response.data.data);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  const fetchFlaggedTasks = useCallback(async () => {
    const response = await axios.get('/api/notes/pages?isFlagged=true');
    return response.data.data;
  }, []);

  const fetchImportantTasks = useCallback(async () => {
    const response = await axios.get('/api/notes/pages?isImportant=true');
    return response.data.data;
  }, []);

  const fetchSearchResults = useCallback(async (query: string) => {
    const response = await axios.get(`/api/notes/pages?search=${encodeURIComponent(query)}`);
    return response.data.data;
  }, []);

  const handleJumpToTask = useCallback(async (task: INotePage) => {
    setIsKeyTasksOpen(false);
    setIsImportantOpen(false);
    setIsSearchOpen(false);

    // We cast sectionId to unknown then to INoteSection because it's populated but typed as string | INoteSection
    const sectionObj = task.sectionId as unknown as INoteSection;

    if (!sectionObj || !sectionObj.categoryId) {
      alert('Cannot locate note: Missing section info.');
      return;
    }

    const targetCategoryId = sectionObj.categoryId as unknown as string;
    const targetSectionId = sectionObj._id as string;
    const targetPageId = task._id as string;

    setSelectedCategoryId(targetCategoryId);
    setTimeout(() => {
      setSelectedSectionId(targetSectionId);
      setTimeout(() => {
        setSelectedPageId(targetPageId);
      }, 150);
    }, 150);
  }, []);

  // Category Operations
  const handleAddCategory = useCallback(async (name: string, color?: string) => {
    try {
      const response = await axios.post('/api/notes/categories', {name, color});
      setCategories(prev => [...prev, response.data.data]);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }, []);

  const handleRenameCategory = useCallback(async (id: string, name: string, color?: string) => {
    try {
      const response = await axios.put(`/api/notes/categories/${id}`, {name, color});
      setCategories(prev => prev.map(cat => (cat._id === id ? response.data.data : cat)));
    } catch (error) {
      console.error('Error renaming category:', error);
    }
  }, []);

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/notes/categories/${id}`);
        setCategories(prev => prev.filter(cat => cat._id !== id));
        if (selectedCategoryId === id) setSelectedCategoryId(null);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    },
    [selectedCategoryId],
  );

  const handleReorderCategories = useCallback(async (newOrder: INoteCategory[]) => {
    setCategories(newOrder); // Optimistic update
    try {
      await axios.put('/api/notes/categories/reorder', {
        items: newOrder.map((cat, index) => ({id: cat._id, order: index})),
      });
    } catch (error) {
      console.error('Error reordering categories:', error);
      fetchCategories(); // Revert on error
    }
  }, []);

  // Section Operations
  const handleAddSection = useCallback(
    async (name: string, color?: string) => {
      if (!selectedCategoryId) return;
      try {
        const response = await axios.post('/api/notes/sections', {
          name,
          color,
          categoryId: selectedCategoryId,
        });
        setSections(prev => [...prev, response.data.data]);
        setSelectedSectionId(response.data.data._id);
      } catch (error) {
        console.error('Error adding section:', error);
      }
    },
    [selectedCategoryId],
  );

  const handleRenameSection = useCallback(async (id: string, name: string, color?: string) => {
    try {
      const response = await axios.put(`/api/notes/sections/${id}`, {name, color});
      setSections(prev => prev.map(sec => (sec._id === id ? response.data.data : sec)));
    } catch (error) {
      console.error('Error renaming section:', error);
    }
  }, []);

  const handleDeleteSection = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/notes/sections/${id}`);
        setSections(prev => prev.filter(sec => sec._id !== id));
        if (selectedSectionId === id) setSelectedSectionId(null);
      } catch (error) {
        console.error('Error deleting section:', error);
      }
    },
    [selectedSectionId],
  );

  const handleReorderSections = useCallback(
    async (newOrder: INoteSection[]) => {
      setSections(newOrder);
      try {
        await axios.put('/api/notes/sections/reorder', {
          items: newOrder.map((sec, index) => ({id: sec._id, order: index})),
        });
      } catch (error) {
        console.error('Error reordering sections:', error);
        if (selectedCategoryId) fetchSections(selectedCategoryId);
      }
    },
    [selectedCategoryId],
  );

  // Page Operations
  const handleAddPage = useCallback(
    async (title: string, color?: string) => {
      if (!selectedSectionId) return;
      try {
        const response = await axios.post('/api/notes/pages', {
          title,
          color,
          sectionId: selectedSectionId,
        });
        setPages(prev => [response.data.data, ...prev]);
        setSelectedPageId(response.data.data._id as string);
      } catch (error) {
        console.error('Error adding page:', error);
      }
    },
    [selectedSectionId],
  );

  const handleRenamePage = useCallback(async (id: string, title: string, color?: string) => {
    try {
      const response = await axios.put(`/api/notes/pages/${id}`, {title, color});
      setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
    } catch (error) {
      console.error('Error renaming page:', error);
    }
  }, []);

  const handleDeletePage = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/notes/pages/${id}`);
        setPages(prev => prev.filter(page => page._id !== id));
        if (selectedPageId === id) setSelectedPageId(null);
      } catch (error) {
        console.error('Error deleting page:', error);
      }
    },
    [selectedPageId],
  );

  const handleSavePageContent = useCallback(async (id: string, content: string) => {
    try {
      const response = await axios.put(`/api/notes/pages/${id}`, {content});
      setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
    } catch (error) {
      console.error('Error saving page content:', error);
    }
  }, []);

  const handleReorderPages = useCallback(
    async (newOrder: INotePage[]) => {
      setPages(newOrder);
      try {
        await axios.put('/api/notes/pages/reorder', {
          items: newOrder.map((page, index) => ({id: page._id, order: index})),
        });
      } catch (error) {
        console.error('Error reordering pages:', error);
        if (selectedSectionId) fetchPages(selectedSectionId);
      }
    },
    [selectedSectionId],
  );

  const handleToggleFlag = useCallback(async (id: string, field: 'isFlagged' | 'isImportant', value: boolean) => {
    try {
      const response = await axios.put(`/api/notes/pages/${id}`, {[field]: value});
      setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
    } catch (error) {
      console.error('Error toggling flag', error);
    }
  }, []);

  const selectedPage = pages.find(p => p._id === selectedPageId) || null;

  const handleOpenImportant = useCallback(() => setIsImportantOpen(true), []);
  const handleOpenKeyTasks = useCallback(() => setIsKeyTasksOpen(true), []);
  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
  const handleCloseImportant = useCallback(() => setIsImportantOpen(false), []);
  const handleCloseKeyTasks = useCallback(() => setIsKeyTasksOpen(false), []);
  const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);
  const handleToggleCategoryCollapse = useCallback(
    () => setIsCategoryCollapsed(!isCategoryCollapsed),
    [isCategoryCollapsed],
  );
  const handleToggleSectionCollapse = useCallback(
    () => setIsSectionCollapsed(!isSectionCollapsed),
    [isSectionCollapsed],
  );

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden bg-white shadow-xl">
      {/* Top Toolbar for Key Tasks - Added this wrapper div for the main layout to include header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-sm font-semibold text-gray-500">Workspace</span>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 border border-gray-200"
            onClick={handleOpenSearch}>
            <MagnifyingGlassIcon className="h-4 w-4" />
            Search
          </button>
          <button
            className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-orange-600 shadow-sm hover:bg-gray-50 border border-orange-200"
            onClick={handleOpenImportant}>
            <ExclamationTriangleIcon className="h-4 w-4" />
            Important
          </button>
          <button
            className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm hover:bg-gray-50 border border-red-200"
            onClick={handleOpenKeyTasks}>
            <FlagIcon className="h-4 w-4" />
            Key Tasks
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Column 1: Categories */}
        <div
          className={`${
            isCategoryCollapsed ? 'w-16' : 'w-64'
          } flex-shrink-0 border-r border-gray-200 transition-all duration-300`}>
          <CategoryList
            categories={categories}
            isCollapsed={isCategoryCollapsed}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onRenameCategory={handleRenameCategory}
            onReorderCategories={handleReorderCategories}
            onSelectCategory={setSelectedCategoryId}
            onToggleCollapse={handleToggleCategoryCollapse}
            selectedCategoryId={selectedCategoryId}
          />
        </div>

        {/* Column 2: Sections */}
        <div
          className={`${
            isSectionCollapsed ? 'w-16' : 'w-64'
          } flex-shrink-0 border-r border-gray-200 transition-all duration-300`}>
          <SectionList
            isCollapsed={isSectionCollapsed}
            loading={loadingSections}
            onAddSection={handleAddSection}
            onDeleteSection={handleDeleteSection}
            onRenameSection={handleRenameSection}
            onReorderSections={handleReorderSections}
            onSelectSection={setSelectedSectionId}
            onToggleCollapse={handleToggleSectionCollapse}
            sections={sections}
            selectedSectionId={selectedSectionId}
          />
        </div>

        {/* Column 3: Pages */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200">
          <PageList
            loading={loadingPages}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onRenamePage={handleRenamePage}
            onReorderPages={handleReorderPages}
            onSelectPage={setSelectedPageId}
            pages={pages}
            selectedPageId={selectedPageId}
          />
        </div>

        {/* Column 4: Editor */}
        <div className="flex-1 overflow-hidden">
          <NoteEditor onSave={handleSavePageContent} onToggleFlag={handleToggleFlag} page={selectedPage} />
        </div>
      </div>

      <FlaggedItemsModal
        fetchItems={fetchFlaggedTasks}
        icon="flag"
        isOpen={isKeyTasksOpen}
        onClose={handleCloseKeyTasks}
        onSelectTask={handleJumpToTask}
        title="Key Tasks"
      />

      <FlaggedItemsModal
        fetchItems={fetchImportantTasks}
        icon="important"
        isOpen={isImportantOpen}
        onClose={handleCloseImportant}
        onSelectTask={handleJumpToTask}
        title="Important"
      />

      <SearchModal
        fetchItems={fetchSearchResults}
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        onSelectTask={handleJumpToTask}
      />
    </div>
  );
});

NotesLayout.displayName = 'NotesLayout';

export default NotesLayout;
