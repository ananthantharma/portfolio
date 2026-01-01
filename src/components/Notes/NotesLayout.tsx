/* eslint-disable simple-import-sort/imports */
'use client';

import axios from 'axios'; // Moved up
import {
  ChevronRightIcon, // For breadcrumbs
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PhotoIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState } from 'react';

import { INoteCategory } from '@/models/NoteCategory';
import { INotePage } from '@/models/NotePage';
import { INoteSection } from '@/models/NoteSection';

import StandaloneRewriteModal from '../StandaloneRewriteModal';
import CategoryList from './CategoryList';
import ContactListModal from './ContactListModal';
import FlaggedItemsModal from './FlaggedItemsModal';
import AssessmentModal from './AssessmentModal';
import ImageExtractionModal from './ImageExtractionModal';
import NoteEditor from './NoteEditor';
import PageList from './PageList';
import SearchModal from './SearchModal';
import SectionList from './SectionList';
import ToDoListModal from './ToDoListModal';
import UserProfileMenu from '../UserProfileMenu';

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
  const [isPageCollapsed, setIsPageCollapsed] = useState(false);

  // Database Stats State
  const [dbSize, setDbSize] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch sections when category changes
  useEffect(() => {
    setSections([]);
    setPages([]);
    setSelectedSectionId(null);
    setSelectedPageId(null);

    if (selectedCategoryId) {
      fetchSections(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  // Active Task Count Logic
  const [activeTaskCount, setActiveTaskCount] = useState(0);

  const fetchActiveTaskCount = useCallback(async () => {
    try {
      const response = await axios.get('/api/todos');
      if (response.data.success && Array.isArray(response.data.data)) {
        // Filter for incomplete tasks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const incomplete = response.data.data.filter((todo: any) => !todo.isCompleted);
        setActiveTaskCount(incomplete.length);
      }
    } catch (error) {
      console.error('Error fetching active task count:', error);
    }
  }, []);

  useEffect(() => {
    fetchActiveTaskCount();
    // Optional: Poll every minute or so
    const interval = setInterval(fetchActiveTaskCount, 60000);
    return () => clearInterval(interval);
  }, [fetchActiveTaskCount]);

  // Fetch pages when section changes
  useEffect(() => {
    setPages([]);
    setSelectedPageId(null);

    if (selectedSectionId) {
      fetchPages(selectedSectionId);
    }
  }, [selectedSectionId]);

  useEffect(() => {
    const fetchDbStats = async () => {
      try {
        const response = await axios.get('/api/database-stats');
        if (response.data.success) {
          setDbSize(formatBytes(response.data.data.totalSizeBytes));
        }
      } catch (error) {
        console.error('Error fetching DB stats:', error);
      }
    };
    fetchDbStats();
  }, []);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/notes/categories');
      if (response.data && Array.isArray(response.data.data)) {
        setCategories(response.data.data);
      } else {
        console.error('Invalid categories data received:', response.data);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
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

  const fetchSearchResults = useCallback(
    async (query: string, searchPageTitlesOnly: boolean, searchSectionNamesOnly: boolean) => {
      const response = await axios.get(
        `/api/notes/pages?search=${encodeURIComponent(
          query,
        )}&searchPageTitlesOnly=${searchPageTitlesOnly}&searchSectionNamesOnly=${searchSectionNamesOnly}&_t=${Date.now()}`,
      );
      return response.data.data;
    },
    [],
  );

  const handleJumpToTask = useCallback(async (task: INotePage) => {
    setIsKeyTasksOpen(false);
    setIsImportantOpen(false);
    setIsSearchOpen(false);

    // Casting to any to access potentially populated fields or special types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extendedTask = task as any;

    if (extendedTask.type === 'section') {
      const targetCategoryId = extendedTask.sectionId.categoryId;
      setSelectedCategoryId(targetCategoryId);

      if ((extendedTask.title as string).startsWith('[Section]')) {
        const targetSectionId = extendedTask._id;
        setTimeout(() => {
          setSelectedSectionId(targetSectionId);
          setSelectedPageId(null);
        }, 150);
      } else {
        setTimeout(() => {
          setSelectedSectionId(null);
          setSelectedPageId(null);
        }, 150);
      }
    } else {
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
    }
  }, []);

  // Category Operations
  const handleAddCategory = useCallback(async (name: string, color?: string, icon?: string, image?: string | null) => {
    try {
      const response = await axios.post('/api/notes/categories', { name, color, icon, image });
      setCategories(prev => [...prev, response.data.data]);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }, []);

  const handleRenameCategory = useCallback(
    async (id: string, name: string, color?: string, icon?: string, image?: string | null) => {
      try {
        const response = await axios.put(`/api/notes/categories/${id}`, { name, color, icon, image });
        setCategories(prev => prev.map(cat => (cat._id === id ? response.data.data : cat)));
      } catch (error) {
        console.error('Error renaming category:', error);
      }
    },
    [],
  );

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
        items: newOrder.map((cat, index) => ({ id: cat._id, order: index })),
      });
    } catch (error) {
      console.error('Error reordering categories:', error);
      fetchCategories(); // Revert on error
    }
  }, []);

  // Section Operations
  const handleAddSection = useCallback(
    async (name: string, color?: string, icon?: string, image?: string | null) => {
      if (!selectedCategoryId) return;
      try {
        const response = await axios.post('/api/notes/sections', {
          name,
          color,
          icon,
          image,
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

  const handleRenameSection = useCallback(
    async (id: string, name: string, color?: string, icon?: string, image?: string | null) => {
      try {
        const response = await axios.put(`/api/notes/sections/${id}`, { name, color, icon, image });
        setSections(prev => prev.map(sec => (sec._id === id ? response.data.data : sec)));
      } catch (error) {
        console.error('Error renaming section:', error);
      }
    },
    [],
  );

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
          items: newOrder.map((sec, index) => ({ id: sec._id, order: index })),
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
    async (title: string, color?: string, icon?: string, image?: string | null) => {
      if (!selectedSectionId) return;
      try {
        const response = await axios.post('/api/notes/pages', {
          title,
          color,
          icon,
          image,
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

  const handleRenamePage = useCallback(
    async (id: string, title: string, color?: string, icon?: string, image?: string | null) => {
      try {
        const response = await axios.put(`/api/notes/pages/${id}`, { title, color, icon, image });
        setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
      } catch (error) {
        console.error('Error renaming page:', error);
      }
    },
    [],
  );

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
      const response = await axios.put(`/api/notes/pages/${id}`, { content });
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
          items: newOrder.map((page, index) => ({ id: page._id, order: index })),
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
      const response = await axios.put(`/api/notes/pages/${id}`, { [field]: value });
      setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
    } catch (error) {
      console.error('Error toggling flag', error);
    }
  }, []);

  const selectedPage = pages.find(p => p._id === selectedPageId) || null;
  const currentCategory = categories.find(c => c._id === selectedCategoryId);
  const currentSection = sections.find(s => s._id === selectedSectionId);

  const handleOpenImportant = useCallback(() => setIsImportantOpen(true), []);
  const handleOpenKeyTasks = useCallback(() => setIsKeyTasksOpen(true), []);
  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
  const handleCloseImportant = useCallback(() => setIsImportantOpen(false), []);
  const handleCloseKeyTasks = useCallback(() => setIsKeyTasksOpen(false), []);
  const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);

  const [isToDoListOpen, setIsToDoListOpen] = useState(false);
  const handleOpenToDoList = useCallback(() => setIsToDoListOpen(true), []);
  const handleCloseToDoList = useCallback(() => setIsToDoListOpen(false), []);

  const [isContactListOpen, setIsContactListOpen] = useState(false);
  const handleOpenContactList = useCallback(() => setIsContactListOpen(true), []);
  const handleCloseContactList = useCallback(() => setIsContactListOpen(false), []);

  const handleToggleCategoryCollapse = useCallback(
    () => setIsCategoryCollapsed(!isCategoryCollapsed),
    [isCategoryCollapsed],
  );
  const handleToggleSectionCollapse = useCallback(
    () => setIsSectionCollapsed(!isSectionCollapsed),
    [isSectionCollapsed],
  );
  const handleTogglePageCollapse = useCallback(() => setIsPageCollapsed(!isPageCollapsed), [isPageCollapsed]);

  // Standalone Rewrite Modal
  const [isRewriteOpen, setIsRewriteOpen] = useState(false);
  const handleOpenRewrite = useCallback(() => setIsRewriteOpen(true), []);
  const handleCloseRewrite = useCallback(() => setIsRewriteOpen(false), []);
  const { data: session } = useSession();

  // Image Extraction Modal
  const [isImageExtractOpen, setIsImageExtractOpen] = useState(false);
  const handleOpenImageExtract = useCallback(() => setIsImageExtractOpen(true), []);
  const handleCloseImageExtract = useCallback(() => setIsImageExtractOpen(false), []);

  // Assessment Modal
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const handleOpenAssessment = useCallback(() => setIsAssessmentOpen(true), []);
  const handleCloseAssessment = useCallback(() => setIsAssessmentOpen(false), []);

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden bg-gray-100 font-sans">
      {/* Top Navigation / Breadcrumbs Bar */}
      <div className="flex items-center justify-between border-b border-gray-200/60 bg-white/70 backdrop-blur-md px-4 py-3 shadow-sm z-50">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <HomeIcon className="h-4 w-4 text-gray-400" />
          <span className="font-medium">Workspace</span>
          {currentCategory && (
            <>
              <ChevronRightIcon className="h-3 w-3 text-gray-300" />
              <span className="font-medium text-gray-700 flex items-center gap-2">
                {currentCategory.icon && (
                  <span className="text-gray-400">
                    {/* Simple text fallback if icon component lookup is complex here, or just name */}
                  </span>
                )}
                {currentCategory.name}
              </span>
            </>
          )}
          {currentSection && (
            <>
              <ChevronRightIcon className="h-3 w-3 text-gray-300" />
              <span className="font-medium text-gray-700">{currentSection.name}</span>
            </>
          )}
          {selectedPage && (
            <>
              <ChevronRightIcon className="h-3 w-3 text-gray-300" />
              <span className="font-medium text-gray-900">{selectedPage.title || 'Untitled'}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {dbSize && <span className="text-xs text-gray-400 mr-2 font-mono">{dbSize}</span>}
          <div className="h-4 w-px bg-gray-200"></div>

          <button
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-blue-600 transition-all"
            onClick={handleOpenSearch}>
            <MagnifyingGlassIcon className="h-3.5 w-3.5" />
            Search
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-teal-600 transition-all relative"
            onClick={handleOpenToDoList}>
            <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
            Tasks
            {activeTaskCount > 0 && (
              <>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.8)] ring-1 ring-white">
                  {activeTaskCount}
                </span>
              </>
            )}
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-indigo-600 transition-all"
            onClick={handleOpenContactList}>
            <UsersIcon className="h-3.5 w-3.5" />
            Contacts
          </button>


          <div className="h-4 w-px bg-gray-200"></div>

          {/* Restricted Buttons */}
          {session?.user?.email === 'lankanprinze@gmail.com' && (
            <>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-pink-600 transition-all"
                onClick={handleOpenRewrite}>
                <PencilSquareIcon className="h-3.5 w-3.5" />
                Rewrite
              </button>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-indigo-600 transition-all"
                onClick={handleOpenImageExtract}
              </button>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-indigo-600 transition-all"
                onClick={handleOpenImageExtract}
                title="Extract Text from Image">
                <PhotoIcon className="h-3.5 w-3.5" />
                OCR
              </button>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-cyan-600 transition-all"
                onClick={handleOpenAssessment}
                title="Document Assessment">
                {/* Using ClipboardDocumentListIcon as placeholder or need new icon. DocumentTextIcon is used in modal. */}
                {/* Re-using ClipboardDocumentListIcon or importing DocumentTextIcon would be better. */}
                {/* Let's use generic PenciSquare logic or Photo. I'll use ClipboardDocumentListIcon for now OR import DocumentTextIcon from outline above. */}
                {/* Wait, DocumentTextIcon is NOT imported in NotesLayout. import it? */}
                {/* I will use ClipboardDocumentListIcon which IS imported, but it's used for Tasks. */}
                {/* Let's verify imports. DocumentTextIcon is NOT in imports. */}
                {/* I'll use PhotoIcon temporarily OR I can add DocumentTextIcon to imports. */}
                {/* Better to add DocumentTextIcon to imports. */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Assessment
              </button>
            </>
          )}

          <div className="h-4 w-px bg-gray-200"></div>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            onClick={handleOpenImportant}
            title="Important">
            <ExclamationTriangleIcon className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={handleOpenKeyTasks}
            title="Key Tasks">
            <FlagIcon className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-gray-200"></div>

          {/* User Profile Menu */}
          <div className="flex items-center">
            <UserProfileMenu />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content Area with Glassmorphism Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200/50 -z-10" />

        {/* Column 1: Categories */}
        <div
          className={`${isCategoryCollapsed ? 'w-14' : 'w-64'
            } flex-shrink-0 border-r border-gray-200/60 bg-white/40 backdrop-blur-xl transition-[width] duration-300 ease-in-out z-20`}>
          <CategoryList
            categories={categories}
            isCollapsed={isCategoryCollapsed}
            loading={false}
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
          className={`${isSectionCollapsed ? 'w-14' : 'w-64'
            } flex-shrink-0 border-r border-gray-200/60 bg-white/60 backdrop-blur-xl transition-[width] duration-300 ease-in-out z-10`}>
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
        <div
          className={`${isPageCollapsed ? 'w-14' : 'w-64'
            } flex-shrink-0 border-r border-gray-200/60 bg-white/80 backdrop-blur-xl transition-[width] duration-300 ease-in-out z-0`}>
          <PageList
            isCollapsed={isPageCollapsed}
            loading={loadingPages}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onRenamePage={handleRenamePage}
            onReorderPages={handleReorderPages}
            onSelectPage={setSelectedPageId}
            onToggleCollapse={handleTogglePageCollapse}
            pages={pages}
            selectedPageId={selectedPageId}
          />
        </div>

        {/* Column 4: Editor */}
        <div className="flex-1 overflow-hidden bg-white shadow-xl z-30 m-4 rounded-xl border border-gray-100">
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

      <ToDoListModal isOpen={isToDoListOpen} onClose={handleCloseToDoList} onNavigate={handleJumpToTask} />
      <ContactListModal isOpen={isContactListOpen} onClose={handleCloseContactList} />
      <SearchModal
        fetchItems={fetchSearchResults}
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        onSelectTask={handleJumpToTask}
      />
      <StandaloneRewriteModal isOpen={isRewriteOpen} onClose={handleCloseRewrite} />
      <ImageExtractionModal isOpen={isImageExtractOpen} onClose={handleCloseImageExtract} />
      <AssessmentModal isOpen={isAssessmentOpen} onClose={handleCloseAssessment} />
    </div >
  );
});

NotesLayout.displayName = 'NotesLayout';

export default NotesLayout;
