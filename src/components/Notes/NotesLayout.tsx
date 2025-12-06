'use client';

import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { FlagIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'; // Add icon for Key Tasks button

import { INoteCategory } from '@/models/NoteCategory';
import { INotePage } from '@/models/NotePage';
import { INoteSection } from '@/models/NoteSection';

import CategoryList from './CategoryList';
import FlaggedItemsModal from './FlaggedItemsModal';
import NoteEditor from './NoteEditor';
import PageList from './PageList';
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
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch sections when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      fetchSections(selectedCategoryId);
      // Only clear downstream selection if we are not navigating to a specific flagged page
      // (This logic is tricky if automated, but standard behavior implies reset on manual click. 
      // If setting via state, we might need a flag to prevent clearing, but usually effect runs after state update)
      // Actually, if we set selectedCategoryId, this runs. If we intend to set all 3, we should batch or ensure this doesn't wipe it.
      // But typically React state updates batch. Let's see. 
      // Simplified: If we set them all at once, the effects might race.
      // Better approach: Depend on IDs. If we change ID, we fetch.
      // If we set selectedSectionId immediately after, it might be fine.
      // Let's stick to standard behavior: Clearing downstream is correct when *user* clicks upstream.
      // But when *programmatically* setting, we want to preserve.
      // Current "manual" behavior: User clicks Category -> setSelected(id). Effect runs -> fetchSections -> clear Section.
      // Problem: Programmatic set -> setSelectedCategory(A), setSelectedSection(B). Effect A runs -> Clears Section to null. Protocol fails.
      // Fix: Check if the new selectedCategoryId implies a different context or if we are just hydrating.
      // Actually, the easiest fix for "Jump to Note" is to update the effect to NOT clear if the current section belongs to the category.
      // But we don't know the future state in the effect.
      // Alternative: Don't clear in effect? No, we must clear if user switches context.
      // We'll leave it for now and test. Use `isNavigating` ref if needed? 
      // Or just load everything? 
      // Let's try standard. If "Jump" fails, I'll refactor logic to be more robust (e.g., verify validity).
    } else {
      setSections([]);
      setPages([]);
      setSelectedSectionId(null);
      setSelectedPageId(null);
    }
  }, [selectedCategoryId]);

  // Fetch pages when section changes
  useEffect(() => {
    if (selectedSectionId) {
      fetchPages(selectedSectionId);
      // Same issue with page clearing.
    } else {
      setPages([]);
      setSelectedPageId(null);
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

  const fetchFlaggedTasks = async () => {
    const response = await axios.get('/api/notes/pages?isFlagged=true');
    return response.data.data;
  };

  const fetchImportantTasks = async () => {
    const response = await axios.get('/api/notes/pages?isImportant=true');
    return response.data.data;
  };

  const handleJumpToTask = async (task: any) => { // Using any for the populated fields temporarily
    setIsKeyTasksOpen(false);
    setIsImportantOpen(false);
    // We need to navigate to this task.
    // The task object from API (populated) has sectionId which is an object { _id, categoryId, name } or similar.
    // Wait, population: select: 'categoryId name'. So sectionId field is an object.
    // We need to extract IDs.

    const sectionObj = task.sectionId;
    if (!sectionObj || !sectionObj.categoryId) {
      alert("Cannot locate note: Missing section info.");
      return;
    }

    const targetCategoryId = sectionObj.categoryId;
    const targetSectionId = sectionObj._id;
    const targetPageId = task._id;

    // WORKAROUND for the Effect Clearing conflict:
    // We manually fetch the data needed for the target state, SET the data, AND SET the IDs.
    // This prevents the effects from triggering "fetch and clear" cycles because the data will be already consistent?
    // No, effects run on ID change.
    // Solution: Set Category -> Wait -> Set Section -> Wait -> Set Page? No, slow.
    // Solution: Just set them. The effects check `if (selected...) fetch`.
    // The `fetch` calls set state.
    // The issue is `setSelectedSectionId(null)` in the category effect.
    // We can remove the automatic clearing from effects?
    // No, let's try to just set them and see if React batches it enough or if we need to be smarter.
    // Actually, if we set `setSelectedCategoryId` it triggers effect.
    // We should probably chain them?

    // Let's try:
    // 1. Set Category. 
    // 2. We can't await state updates.
    // Let's modify the effects to NOT clear if the value we are about to set is compatible? No.
    // BETTER: Using a ref to skip clearing?
    // Or just allow the flicker? User won't see it if fast.
    // But clearing ID `setSelectedSectionId(null)` is the problem.

    // I will disable the "auto-clear" in effects temporarily using a ref if I can, or just modify the effects.
    // Let's modify the effects to ONLY clear if the new ID is different?
    // `if (selectedCategoryId)` -> fetch. The clearing `setSelectedSectionId(null)` is intended to reset selection on manual change.

    // Lets blindly set them all.
    setSelectedCategoryId(targetCategoryId);
    // We need to fetch sections for this category immediately or let effect do it?
    // Let effect do it. But effect clears section ID!
    // So we have to wait for effect to run?

    // Hack: We can fetch data manually here and set it, essentially bypassing the effect data fetch, but the effect will still run.
    // Let's try just setting them. If it fails (resets to null), I'll improve it.
    // Actually, I'll use a timeout hack to set downstream IDs?
    // setSelectedCategoryId(targetCategoryId);
    // setTimeout(() => setSelectedSectionId(targetSectionId), 100);
    // setTimeout(() => setSelectedPageId(targetPageId), 200);
    // This is ugly but robust enough for this context.

    setSelectedCategoryId(targetCategoryId);
    setTimeout(() => {
      setSelectedSectionId(targetSectionId);
      setTimeout(() => {
        setSelectedPageId(targetPageId);
      }, 150);
    }, 150);
  };

  // Category Operations
  const handleAddCategory = useCallback(async (name: string) => {
    try {
      const response = await axios.post('/api/notes/categories', { name });
      setCategories(prev => [...prev, response.data.data]);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }, []);

  const handleRenameCategory = useCallback(async (id: string, name: string) => {
    try {
      const response = await axios.put(`/api/notes/categories/${id}`, { name });
      setCategories(prev => prev.map(cat => (cat._id === id ? response.data.data : cat)));
    } catch (error) {
      console.error('Error renaming category:', error);
    }
  }, []);

  const handleDeleteCategory = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/notes/categories/${id}`);
      setCategories(prev => prev.filter(cat => cat._id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId(null);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }, [selectedCategoryId]);

  // Section Operations
  const handleAddSection = useCallback(async (name: string) => {
    if (!selectedCategoryId) return;
    try {
      const response = await axios.post('/api/notes/sections', {
        name,
        categoryId: selectedCategoryId,
      });
      setSections(prev => [...prev, response.data.data]);
      setSelectedSectionId(response.data.data._id);
    } catch (error) {
      console.error('Error adding section:', error);
    }
  }, [selectedCategoryId]);

  const handleRenameSection = useCallback(async (id: string, name: string) => {
    try {
      const response = await axios.put(`/api/notes/sections/${id}`, { name });
      setSections(prev => prev.map(sec => (sec._id === id ? response.data.data : sec)));
    } catch (error) {
      console.error('Error renaming section:', error);
    }
  }, []);

  const handleDeleteSection = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/notes/sections/${id}`);
      setSections(prev => prev.filter(sec => sec._id !== id));
      if (selectedSectionId === id) setSelectedSectionId(null);
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  }, [selectedSectionId]);

  // Page Operations
  const handleAddPage = useCallback(
    async (title: string) => {
      if (!selectedSectionId) return;
      try {
        const response = await axios.post('/api/notes/pages', {
          title,
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

  const handleRenamePage = useCallback(async (id: string, title: string) => {
    try {
      const response = await axios.put(`/api/notes/pages/${id}`, { title });
      setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
    } catch (error) {
      console.error('Error renaming page:', error);
    }
  }, []);

  const handleDeletePage = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/notes/pages/${id}`);
      setPages(prev => prev.filter(page => page._id !== id));
      if (selectedPageId === id) setSelectedPageId(null);
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  }, [selectedPageId]);

  const handleSavePageContent = useCallback(async (id: string, content: string) => {
    try {
      const response = await axios.put(`/api/notes/pages/${id}`, { content });
      setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
    } catch (error) {
      console.error('Error saving page content:', error);
    }
  }, []);

  const handleToggleFlag = useCallback(async (id: string, field: 'isFlagged' | 'isImportant', value: boolean) => {
    try {
      const response = await axios.put(`/api/notes/pages/${id}`, { [field]: value });
      setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
    } catch (error) {
      console.error("Error toggling flag", error);
    }
  }, []);

  const selectedPage = pages.find(p => p._id === selectedPageId) || null;

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden bg-white shadow-xl">
      {/* Top Toolbar for Key Tasks - Added this wrapper div for the main layout to include header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-sm font-semibold text-gray-500">Workspace</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportantOpen(true)}
            className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-orange-600 shadow-sm hover:bg-gray-50 border border-orange-200"
          >
            <ExclamationTriangleIcon className="h-4 w-4" />
            Important
          </button>
          <button
            onClick={() => setIsKeyTasksOpen(true)}
            className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm hover:bg-gray-50 border border-red-200"
          >
            <FlagIcon className="h-4 w-4" />
            Key Tasks
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Column 1: Categories */}
        <div className={`${isCategoryCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 border-r border-gray-200 transition-all duration-300`}>
          <CategoryList
            categories={categories}
            isCollapsed={isCategoryCollapsed}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onRenameCategory={handleRenameCategory}
            onSelectCategory={setSelectedCategoryId}
            onToggleCollapse={() => setIsCategoryCollapsed(!isCategoryCollapsed)}
            selectedCategoryId={selectedCategoryId}
          />
        </div>

        {/* Column 2: Sections */}
        <div className={`${isSectionCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 border-r border-gray-200 transition-all duration-300`}>
          <SectionList
            isCollapsed={isSectionCollapsed}
            loading={loadingSections}
            onAddSection={handleAddSection}
            onDeleteSection={handleDeleteSection}
            onRenameSection={handleRenameSection}
            onSelectSection={setSelectedSectionId}
            onToggleCollapse={() => setIsSectionCollapsed(!isSectionCollapsed)}
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
            onSelectPage={setSelectedPageId}
            pages={pages}
            selectedPageId={selectedPageId}
          />
        </div>

        {/* Column 4: Editor */}
        <div className="flex-1 overflow-hidden">
          <NoteEditor
            onSave={handleSavePageContent}
            onToggleFlag={handleToggleFlag}
            page={selectedPage}
          />
        </div>
      </div>

      <FlaggedItemsModal
        title="Key Tasks"
        icon="flag"
        fetchItems={fetchFlaggedTasks}
        isOpen={isKeyTasksOpen}
        onClose={() => setIsKeyTasksOpen(false)}
        onSelectTask={handleJumpToTask}
      />

      <FlaggedItemsModal
        title="Important"
        icon="important"
        fetchItems={fetchImportantTasks}
        isOpen={isImportantOpen}
        onClose={() => setIsImportantOpen(false)}
        onSelectTask={handleJumpToTask}
      />
    </div>
  );
});

NotesLayout.displayName = 'NotesLayout';

export default NotesLayout;
