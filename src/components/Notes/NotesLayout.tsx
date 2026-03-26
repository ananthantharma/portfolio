/* eslint-disable simple-import-sort/imports */
'use client';

import axios from 'axios';
import {
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PhotoIcon,
  CalendarDaysIcon,
  UsersIcon,
  Cog6ToothIcon,
  SparklesIcon,
  ArrowsPointingOutIcon, // For Focus Mode
  ArrowsPointingInIcon, // For Focus Mode Exit
  DocumentPlusIcon,
  PlusCircleIcon,
  BookmarkIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState, useMemo } from 'react';

import { INoteCategory } from '@/models/NoteCategory';
import { INotePage } from '@/models/NotePage';
import { INoteSection } from '@/models/NoteSection';

import StandaloneRewriteModal from '../StandaloneRewriteModal';
import SimpleRewriteModal from './SimpleRewriteModal';
import SimpleRewriteOpenAIModal from './SimpleRewriteOpenAIModal';
import CategoryList from './CategoryList';
import ContactListModal from './ContactListModal';
import FlaggedItemsModal from './FlaggedItemsModal';
import AssessmentModal from './AssessmentModal';
import ImageExtractionModal from './ImageExtractionModal';
import NoteEditor from './NoteEditor';
import PageList from './PageList';
// import SearchModal from './SearchModal'; // Replaced by CommandPalette
import SectionList from './SectionList';
import ExecutiveModal from './ExecutiveModal';
import ToDoListModal from './ToDoListModal';
import UserProfileMenu from '../UserProfileMenu';
import MovePageModal from './MovePageModal';
import GoogleCalendarModal from './GoogleCalendarModal';
import { BadgeSettingsProvider } from './BadgeSettingsContext';
import { BadgeSettingsModal } from './BadgeSettingsModal';
import CommandPalette from './CommandPalette';
import BookmarkListModal from './BookmarkListModal';
import AudioCaptureModal from './AudioCaptureModal';

import UnifiedAIChatModal from './UnifiedAIChatModal';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

const NotesLayout: React.FC = React.memo(() => {
  const [categories, setCategories] = useState<INoteCategory[]>([]);
  const [sections, setSections] = useState<INoteSection[]>([]);
  const [pages, setPages] = useState<INotePage[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [targetTabId, setTargetTabId] = useState<string | undefined>(undefined);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);

  // Sidebar visibility states
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);
  const [isPageCollapsed, setIsPageCollapsed] = useState(false);

  // Focus Mode
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Modal states
  const [isKeyTasksOpen, setIsKeyTasksOpen] = useState(false);
  const [isImportantOpen, setIsImportantOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAudioCaptureOpen, setIsAudioCaptureOpen] = useState(false);

  const [badgeCounts, setBadgeCounts] = useState<{
    pages: Record<string, { todo: { count: number; minDays: number | null }; important: number; flagged: number }>;
    sections: Record<string, { todo: { count: number; minDays: number | null }; important: number; flagged: number }>;
    categories: Record<string, { todo: { count: number; minDays: number | null }; important: number; flagged: number }>;
  }>({ pages: {}, sections: {}, categories: {} });

  // Resizable Sidebar State
  const [categoryWidth, setCategoryWidth] = useState(200);
  const [sectionWidth, setSectionWidth] = useState(200);
  const [pageWidth, setPageWidth] = useState(200);
  const [resizingCol, setResizingCol] = useState<'category' | 'section' | 'page' | null>(null);

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    const savedCategory = localStorage.getItem('NOTES_SELECTED_CATEGORY');
    if (savedCategory) setSelectedCategoryId(savedCategory);

    const savedSection = localStorage.getItem('NOTES_SELECTED_SECTION');
    if (savedSection) setSelectedSectionId(savedSection);

    const savedPage = localStorage.getItem('NOTES_SELECTED_PAGE');
    if (savedPage) setSelectedPageId(savedPage);

    const savedCategoryWidth = localStorage.getItem('NOTES_CATEGORY_WIDTH');
    if (savedCategoryWidth) setCategoryWidth(parseInt(savedCategoryWidth));

    const savedSectionWidth = localStorage.getItem('NOTES_SECTION_WIDTH');
    if (savedSectionWidth) setSectionWidth(parseInt(savedSectionWidth));

    const savedPageWidth = localStorage.getItem('NOTES_PAGE_WIDTH');
    if (savedPageWidth) setPageWidth(parseInt(savedPageWidth));

    const savedCategoryCollapsed = localStorage.getItem('NOTES_CATEGORY_COLLAPSED');
    if (savedCategoryCollapsed !== null) setIsCategoryCollapsed(savedCategoryCollapsed === 'true');

    const savedSectionCollapsed = localStorage.getItem('NOTES_SECTION_COLLAPSED');
    if (savedSectionCollapsed !== null) setIsSectionCollapsed(savedSectionCollapsed === 'true');

    const savedPageCollapsed = localStorage.getItem('NOTES_PAGE_COLLAPSED');
    if (savedPageCollapsed !== null) setIsPageCollapsed(savedPageCollapsed === 'true');

    const savedFocusMode = localStorage.getItem('NOTES_FOCUS_MODE');
    if (savedFocusMode !== null) setIsFocusMode(savedFocusMode === 'true');
  }, []);

  // Persistence: Save to localStorage when state changes
  useEffect(() => {
    if (selectedCategoryId) localStorage.setItem('NOTES_SELECTED_CATEGORY', selectedCategoryId);
    else localStorage.removeItem('NOTES_SELECTED_CATEGORY');
  }, [selectedCategoryId]);

  useEffect(() => {
    if (selectedSectionId) localStorage.setItem('NOTES_SELECTED_SECTION', selectedSectionId);
    else localStorage.removeItem('NOTES_SELECTED_SECTION');
  }, [selectedSectionId]);

  useEffect(() => {
    if (selectedPageId) localStorage.setItem('NOTES_SELECTED_PAGE', selectedPageId);
    else localStorage.removeItem('NOTES_SELECTED_PAGE');
  }, [selectedPageId]);

  // Page Content handlers
  useEffect(() => {
    localStorage.setItem('NOTES_CATEGORY_COLLAPSED', isCategoryCollapsed.toString());
  }, [isCategoryCollapsed]);

  useEffect(() => {
    localStorage.setItem('NOTES_SECTION_COLLAPSED', isSectionCollapsed.toString());
  }, [isSectionCollapsed]);

  useEffect(() => {
    localStorage.setItem('NOTES_PAGE_COLLAPSED', isPageCollapsed.toString());
  }, [isPageCollapsed]);

  useEffect(() => {
    localStorage.setItem('NOTES_FOCUS_MODE', isFocusMode.toString());
  }, [isFocusMode]);

  // Selection Wrappers to clear sub-selection only when manually changing
  const handleSelectCategory = useCallback((id: string | null) => {
    setSelectedCategoryId(id);
    if (id !== localStorage.getItem('NOTES_SELECTED_CATEGORY')) {
      setSelectedSectionId(null);
      setSelectedPageId(null);
    }
  }, []);

  const handleSelectSection = useCallback((id: string | null) => {
    setSelectedSectionId(id);
    if (id !== localStorage.getItem('NOTES_SELECTED_SECTION')) {
      setSelectedPageId(null);
    }
  }, []);

  const startResizing = useCallback((e: React.MouseEvent, col: 'category' | 'section' | 'page') => {
    setResizingCol(col);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!resizingCol) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCol === 'category') {
        setCategoryWidth(Math.max(200, Math.min(600, e.clientX)));
      } else if (resizingCol === 'section') {
        // Approximate x position for section start is categoryWidth
        // Width = Mouse X - Start X
        const startX = isCategoryCollapsed ? 56 : categoryWidth;
        setSectionWidth(Math.max(200, Math.min(600, e.clientX - startX)));
      } else if (resizingCol === 'page') {
        const startX = (isCategoryCollapsed ? 56 : categoryWidth) + (isSectionCollapsed ? 56 : sectionWidth);
        setPageWidth(Math.max(200, Math.min(600, e.clientX - startX)));
      }
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      document.body.style.cursor = 'default';
      // Save widths to localStorage when resizing stops
      localStorage.setItem('NOTES_CATEGORY_WIDTH', categoryWidth.toString());
      localStorage.setItem('NOTES_SECTION_WIDTH', sectionWidth.toString());
      localStorage.setItem('NOTES_PAGE_WIDTH', pageWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol, categoryWidth, sectionWidth, isCategoryCollapsed, isSectionCollapsed]);

  // Database Stats State
  const [dbSize, setDbSize] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch sections when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      fetchSections(selectedCategoryId);
    } else {
      setSections([]);
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
    const interval = setInterval(() => {
      fetchActiveTaskCount();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchActiveTaskCount]);

  // Fetch pages when section changes
  useEffect(() => {
    if (selectedSectionId) {
      fetchPages(selectedSectionId);
    } else {
      setPages([]);
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

    const fetchBadgeStats = async () => {
      try {
        const response = await axios.get('/api/notes/stats');
        if (response.data.success) {
          setBadgeCounts(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching badge stats:', error);
      }
    };
    fetchBadgeStats();
    // Poll for badges
    const interval = setInterval(fetchBadgeStats, 30000); // 30s poll
    return () => clearInterval(interval);
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

  const handleJumpToTask = useCallback(async (task: INotePage, tabId?: string) => {
    setIsKeyTasksOpen(false);
    setIsImportantOpen(false);
    setIsSearchOpen(false);
    setIsToDoListOpen(false); // Close ToDo list if open

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
          setTargetTabId(undefined);
        }, 150);
      } else {
        setTimeout(() => {
          setSelectedSectionId(null);
          setSelectedPageId(null);
          setTargetTabId(undefined);
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
          setTargetTabId(tabId); // Set target tab BEFORE page selection triggers editor load
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

  const handleQuickNote = useCallback(async () => {
    try {
      // 1. Fetch/Create 'Other Notes' Category
      let category = categories.find(c => c.name === 'Other Notes');
      if (!category) {
        const catRes = await axios.post('/api/notes/categories', { name: 'Other Notes' });
        category = catRes.data.data;
        setCategories(prev => [...prev, category as INoteCategory]);
      }

      // 2. Fetch/Create 'Other' Section
      // Using API directly to make sure we don't rely only on local state which might be empty
      const secRes = await axios.get(`/api/notes/sections?categoryId=${category!._id}`);
      let section = secRes.data.data.find((s: INoteSection) => s.name === 'Other');
      if (!section) {
        const createSecRes = await axios.post('/api/notes/sections', { name: 'Other', categoryId: category!._id });
        section = createSecRes.data.data;
        if (selectedCategoryId === category!._id) {
          setSections(prev => [...prev, section]);
        }
      }

      // 3. Create Page
      const pageRes = await axios.post('/api/notes/pages', { title: 'New Note', sectionId: section._id });
      const newPage = pageRes.data.data;

      // 4. Navigate to new Quick Note
      setSelectedCategoryId(category!._id as string);
      setTimeout(() => {
        setSelectedSectionId(section._id as string);
        setTimeout(() => {
          setSelectedPageId(newPage._id as string);
        }, 150);
      }, 150);
    } catch (error) {
      console.error('Error creating quick note:', error);
      alert('Failed to create quick note.');
    }
  }, [categories, selectedCategoryId]);

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

  const [selectedPageToMove, setSelectedPageToMove] = useState<INotePage | null>(null);

  const handleMovePage = useCallback(
    async (pageId: string, destSectionId: string) => {
      try {
        await axios.put(`/api/notes/pages/${pageId}`, { sectionId: destSectionId });
        if (selectedSectionId && destSectionId !== selectedSectionId) {
          setPages(prev => prev.filter(p => p._id !== pageId));
          if (selectedPageId === pageId) setSelectedPageId(null);
        }
        setSelectedPageToMove(null);
      } catch (error) {
        console.error('Error moving page:', error);
        alert('Failed to move page.');
      }
    },
    [selectedSectionId, selectedPageId],
  );

  const handleSavePageContent = useCallback(async (id: string, data: any) => {
    try {
      // data coming from NoteEditor is now the 'tabs' array
      const response = await axios.put(`/api/notes/pages/${id}`, { tabs: data });
      setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
    } catch (error) {
      console.error('Error saving page content:', error);
    }
  }, []);

  const handleTranscriptReady = useCallback(async (transcript: string) => {
    const selectedPage = pages.find(p => p._id === selectedPageId);
    if (!selectedPage || !selectedPageId) return;
    
    const currentTabs = selectedPage.tabs || [{ id: 'main', label: 'Note', content: '' }];
    const firstTab = currentTabs[0];
    const updatedContent = (firstTab.content || '') + (firstTab.content ? '\n\n' : '') + transcript;
    
    const updatedTabs = currentTabs.map((t, i) => 
      i === 0 ? { ...t, content: updatedContent } : t
    );

    await handleSavePageContent(selectedPageId, updatedTabs);
  }, [selectedPageId, pages, handleSavePageContent]);

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

  const [isDirectTaskCreateOpen, setIsDirectTaskCreateOpen] = useState(false);

  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

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

  // Simple Rewrite Modal
  const [isSimpleRewriteOpen, setIsSimpleRewriteOpen] = useState(false);
  const handleOpenSimpleRewrite = useCallback(() => setIsSimpleRewriteOpen(true), []);
  const handleCloseSimpleRewrite = useCallback(() => setIsSimpleRewriteOpen(false), []);

  // Simple Rewrite (OpenAI) Modal
  const [isSimpleRewriteOpenAIOpen, setIsSimpleRewriteOpenAIOpen] = useState(false);
  const handleOpenSimpleRewriteOpenAI = useCallback(() => setIsSimpleRewriteOpenAIOpen(true), []);
  const handleCloseSimpleRewriteOpenAI = useCallback(() => setIsSimpleRewriteOpenAIOpen(false), []);

  const { data: session } = useSession();

  // AI Chat Modal handlers
  const handleOpenAIChat = useCallback(() => setIsAIChatOpen(true), []);
  const handleCloseAIChat = useCallback(() => setIsAIChatOpen(false), []);

  // Determine API keys for AI Chat
  const geminiApiKey = useMemo(() => {
    if (session?.user && (session.user as any).googleApiEnabled) return 'GEMINI_SCOPED';
    return null;
  }, [session]);

  const openaiApiKey = useMemo(() => {
    if (session?.user && (session.user as any).openAiApiEnabled) return 'MANAGED';
    return null;
  }, [session]);

  // Image Extraction Modal
  const [isImageExtractOpen, setIsImageExtractOpen] = useState(false);
  const handleOpenImageExtract = useCallback(() => setIsImageExtractOpen(true), []);
  const handleCloseImageExtract = useCallback(() => setIsImageExtractOpen(false), []);

  // Assessment Modal
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const handleOpenAssessment = useCallback(() => setIsAssessmentOpen(true), []);
  const handleCloseAssessment = useCallback(() => setIsAssessmentOpen(false), []);

  // Badge Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);

  // Focus Mode Toggle
  const toggleFocusMode = useCallback(() => {
    setIsFocusMode(prev => !prev);
  }, []);

  // Create Page handler for CommandPalette
  const handleCreatePageFromPalette = useCallback(() => {
    if (selectedSectionId) {
      handleAddPage('New Page');
    }
  }, [selectedSectionId, handleAddPage]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K — Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      // Ctrl+\ / Cmd+\ — Focus Mode
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
      }
      // Ctrl+N / Cmd+N — New Page
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && selectedSectionId) {
        e.preventDefault();
        handleAddPage('New Page');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedSectionId, handleAddPage]);

  // Calculate total important and flagged counts
  const totalImportant = useMemo(() => {
    return Object.values(badgeCounts.pages).reduce((acc, curr) => acc + (curr.important || 0), 0);
  }, [badgeCounts.pages]);

  const totalFlagged = useMemo(() => {
    return Object.values(badgeCounts.pages).reduce((acc, curr) => acc + (curr.flagged || 0), 0);
  }, [badgeCounts.pages]);

  return (
    <BadgeSettingsProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900 font-['Inter',system-ui,sans-serif]">
        {/* Top Navigation / Breadcrumbs Bar */}

        {!isFocusMode && (
          <div className="flex flex-col md:flex-row flex-shrink-0 items-start md:items-center justify-between mx-3 md:mx-5 my-3 rounded-2xl border border-white/60 bg-white/60 backdrop-blur-2xl px-3 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] z-40 transition-all duration-300 gap-3 md:gap-0 ring-1 ring-slate-900/5 !overflow-visible">
            <div className="flex items-center gap-1.5 text-[13px] text-gray-400 overflow-x-auto whitespace-nowrap scrollbar-hide w-full md:w-auto pb-1 md:pb-0">
              <button
                onClick={() => {
                  setSelectedCategoryId(null);
                  setSelectedSectionId(null);
                  setSelectedPageId(null);
                }}
                className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors"
                title="Go to Workspace">
                <HomeIcon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium text-gray-500 hover:text-indigo-500">Workspace</span>
              </button>
              {currentCategory && (
                <>
                  <ChevronRightIcon className="h-3 w-3 flex-shrink-0" />
                  <button
                    onClick={() => {
                      setSelectedSectionId(null);
                      setSelectedPageId(null);
                    }}
                    className="font-medium text-gray-600 hover:text-indigo-500 transition-colors"
                    title={`Go to ${currentCategory.name}`}>
                    {currentCategory.name}
                  </button>
                </>
              )}
              {currentSection && (
                <>
                  <ChevronRightIcon className="h-3 w-3 flex-shrink-0" />
                  <button
                    onClick={() => {
                      setSelectedPageId(null);
                    }}
                    className="font-medium text-gray-600 hover:text-indigo-500 transition-colors"
                    title={`Go to ${currentSection.name}`}>
                    {currentSection.name}
                  </button>
                </>
              )}
              {selectedPage && (
                <>
                  <ChevronRightIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="font-semibold text-gray-900">{selectedPage.title || 'Untitled'}</span>
                </>
              )}
            </div>

            <div
              className="flex items-center gap-2 w-full md:w-auto pb-1 md:pb-0 scrollbar-hide"
              style={{ overflow: 'visible' }}>
              {dbSize && (
                <span className="text-[10px] text-slate-400 font-mono tracking-tight mr-1 bg-white/50 px-1.5 py-0.5 rounded-md ring-1 ring-slate-200/50">
                  {dbSize}
                </span>
              )}

              {/* ── All Tools Group ── */}
              <div className="flex items-center gap-1.5 rounded-2xl bg-white/50 p-1.5 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-md relative z-[100]">
                {/* 1. Core Tools */}
                <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                  <button
                    className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-fuchsia-600 hover:shadow-sm transition-all duration-300"
                    onClick={() => setIsExecutiveModalOpen(true)}
                    title="Executive Assistant">
                    <BriefcaseIcon className="h-3.5 w-3.5 group-hover:text-fuchsia-500 transition-colors" />
                    <span className="hidden lg:inline">Assistant</span>
                  </button>
                  <button
                    className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all duration-300"
                    onClick={() => setIsCalendarOpen(true)}
                    title="Google Calendar">
                    <CalendarDaysIcon className="h-3.5 w-3.5 group-hover:text-blue-500 transition-colors" />
                    <span className="hidden lg:inline">Calendar</span>
                  </button>
                  <button
                    className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-red-600 hover:shadow-sm transition-all duration-300"
                    onClick={() => setIsAudioCaptureOpen(true)}
                    title="System Audio Transcriber">
                    <MicrophoneIcon className="h-3.5 w-3.5 group-hover:text-red-500 transition-colors" />
                    <span className="hidden lg:inline">Listen</span>
                  </button>
                  <button
                    className="group rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-emerald-600 transition-all"
                    onClick={handleQuickNote}
                    title="Quick Note">
                    <DocumentPlusIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 2. Tasks & Search */}
                <div className="flex items-center gap-0.5 px-1 pr-1.5 border-r border-slate-200">
                  <button
                    className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium bg-white shadow-sm ring-1 ring-slate-200/60 hover:ring-sky-300 transition-all"
                    onClick={handleOpenSearch}
                    title="Command Palette (Ctrl+K)">
                    <MagnifyingGlassIcon className="h-3.5 w-3.5 text-sky-500" />
                    <span className="hidden xl:inline text-slate-400">Search</span>
                    <kbd className="hidden xl:inline ml-0.5 text-[9px] text-slate-300 font-mono">⌘K</kbd>
                  </button>
                  <div className="flex items-center">
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-rose-600 transition-all relative"
                      onClick={handleOpenToDoList}
                      title="View Tasks">
                      <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">Tasks</span>
                      {activeTaskCount > 0 && (
                        <span className="absolute -top-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white">
                          {activeTaskCount}
                        </span>
                      )}
                    </button>
                    <button
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      onClick={() => setIsDirectTaskCreateOpen(true)}
                      title="New Task">
                      <PlusCircleIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3. Resources Dropdown */}
                <Menu as="div" className="relative inline-block text-left">
                  <Menu.Button className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-indigo-600 transition-all">
                    <span>Resources</span>
                    <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500" />
                  </Menu.Button>
                  <Transition
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95">
                    <Menu.Items className="absolute left-0 top-full mt-2 w-48 origin-top-left rounded-xl bg-white p-1.5 shadow-2xl ring-1 ring-black/5 focus:outline-none z-[110]">
                      <Menu.Item>
                        {({active}) => (
                          <button
                            className={`${
                              active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'
                            } flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}
                            onClick={handleOpenContactList}>
                            <UsersIcon className="h-4 w-4 opacity-70" />
                            Contacts
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({active}) => (
                          <button
                            className={`${
                              active ? 'bg-blue-50 text-blue-600' : 'text-slate-600'
                            } flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}
                            onClick={() => setIsBookmarksOpen(true)}>
                            <BookmarkIcon className="h-4 w-4 opacity-70" />
                            Bookmarks
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({active}) => (
                          <Link
                            href="/organization"
                            className={`${
                              active ? 'bg-violet-50 text-violet-600' : 'text-slate-600'
                            } flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}>
                            <BuildingOffice2Icon className="h-4 w-4 opacity-70" />
                            Organization
                          </Link>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>

                {/* 4. AI & Tools Dropdown */}
                {session?.user?.email === 'lankanprinze@gmail.com' && (
                  <Menu as="div" className="relative inline-block text-left ml-0.5">
                    <Menu.Button className="group flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[12px] font-bold text-indigo-600 hover:bg-indigo-100 transition-all border border-indigo-100/50">
                      <SparklesIcon className="h-3.5 w-3.5" />
                      <span>AI Tools</span>
                      <ChevronDownIcon className="h-3.5 w-3.5 text-indigo-400" />
                    </Menu.Button>
                    <Transition
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95">
                      <Menu.Items className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-xl bg-white p-2 shadow-2xl ring-1 ring-black/5 focus:outline-none z-[110]">
                        <div className="px-2 pb-1.5 mb-1.5 border-b border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rewriting</p>
                        </div>
                        <Menu.Item>
                          {({active}) => (
                            <button
                              className={`${
                                active ? 'bg-slate-50 text-indigo-600' : 'text-slate-600'
                              } flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}
                              onClick={handleOpenRewrite}>
                              <PencilSquareIcon className="h-4 w-4 text-indigo-500" />
                              Advanced Rewrite
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({active}) => (
                            <button
                              className={`${
                                active ? 'bg-slate-50 text-purple-600' : 'text-slate-600'
                              } flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}
                              onClick={handleOpenSimpleRewrite}>
                              <PencilSquareIcon className="h-4 w-4 text-purple-500" />
                              Simple Rewrite
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({active}) => (
                            <button
                              className={`${
                                active ? 'bg-slate-50 text-teal-600' : 'text-slate-600'
                              } flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}
                              onClick={handleOpenSimpleRewriteOpenAI}>
                              <SparklesIcon className="h-4 w-4 text-teal-500" />
                              GPT Rewrite
                            </button>
                          )}
                        </Menu.Item>
                        <div className="px-2 py-1.5 my-1 border-y border-slate-100 bg-slate-50/30">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analysis</p>
                        </div>
                        <Menu.Item>
                          {({active}) => (
                            <button
                              className={`${
                                active ? 'bg-slate-50 text-orange-600' : 'text-slate-600'
                              } flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}
                              onClick={handleOpenImageExtract}>
                              <PhotoIcon className="h-4 w-4 text-orange-500" />
                              Extract from Image
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({active}) => (
                            <button
                              className={`${
                                active ? 'bg-slate-50 text-cyan-600' : 'text-slate-600'
                              } flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}
                              onClick={handleOpenAssessment}>
                              <DocumentPlusIcon className="h-4 w-4 text-cyan-500" />
                              Document Assessment
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                )}

                {/* 5. Main Action: Chat */}
                <button
                  className="group flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-1.5 text-[12px] font-bold text-white shadow-lg shadow-slate-900/10 hover:bg-black transition-all hover:-translate-y-0.5"
                  onClick={handleOpenAIChat}>
                  <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-violet-300" />
                  <span className="hidden lg:inline">AI Chat</span>
                </button>
              </div>

              {/* Focus Mode & More */}
              <div className="flex items-center gap-1 rounded-2xl bg-white/50 p-1 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-md ml-auto md:ml-0">
                <button
                  className="group rounded-lg p-2 text-slate-400 hover:bg-white hover:text-amber-500 transition-all"
                  onClick={toggleFocusMode}
                  title="Focus Mode (Cmd+\)">
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5" />
                <button
                  className="group rounded-lg p-2 text-slate-400 hover:bg-white hover:text-amber-500 transition-all relative"
                  onClick={handleOpenImportant}
                  title="Important Highlights">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  {totalImportant > 0 && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white ring-2 ring-white">
                      {totalImportant}
                    </span>
                  )}
                </button>
                <button
                  className="group rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-500 transition-all relative"
                  onClick={handleOpenKeyTasks}
                  title="Key Flags">
                  <FlagIcon className="h-4 w-4" />
                  {totalFlagged > 0 && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white">
                      {totalFlagged}
                    </span>
                  )}
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5" />
                <button
                  onClick={handleOpenSettings}
                  className="group rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                  title="Settings">
                  <Cog6ToothIcon className="h-4 w-4 group-hover:rotate-45 transition-transform" />
                </button>
              </div>

              {/* User Profile */}
              <div className="flex items-center ml-1">
                <UserProfileMenu />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden px-2 md:px-4 pb-4 gap-0 md:gap-3 relative">
          {/* Focus Mode Exit Button (Only visible in Focus Mode) */}
          {isFocusMode && (
            <button
              onClick={toggleFocusMode}
              className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow-lg border border-slate-200 text-slate-500 hover:text-indigo-600 transition-all opacity-60 hover:opacity-100 group"
              title="Exit Focus Mode">
              <ArrowsPointingInIcon className="h-5 w-5" />
            </button>
          )}

          {/* ─── 1. Categories Column ─── */}
          {/* Hidden in Focus Mode */}
          <div
            className={`flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] max-md:!w-full ${isCategoryCollapsed ? 'w-14 items-center' : ''
              } ${isFocusMode || selectedCategoryId ? 'max-md:hidden' : ''} ${isFocusMode ? 'hidden' : 'flex'}`}
            style={{ width: isCategoryCollapsed || isFocusMode ? undefined : categoryWidth }}>
            <CategoryList
              categories={categories}
              isCollapsed={isCategoryCollapsed}
              loading={false}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onRenameCategory={handleRenameCategory}
              onReorderCategories={handleReorderCategories}
              onSelectCategory={handleSelectCategory}
              onToggleCollapse={handleToggleCategoryCollapse}
              selectedCategoryId={selectedCategoryId}
              badgeCounts={badgeCounts.categories}
            />
            {!isCategoryCollapsed && !isFocusMode && (
              <div
                className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-slate-300 transition-colors z-10"
                onMouseDown={e => startResizing(e, 'category')}
              />
            )}
          </div>

          {/* ─── 2. Sections Column ─── */}
          <div
            className={`flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm md:ml-3 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] relative max-md:!w-full ${isSectionCollapsed ? 'w-14 items-center' : ''
              } ${!selectedCategoryId || selectedSectionId ? 'max-md:hidden' : ''} ${isFocusMode ? 'hidden' : 'flex'}`}
            style={{ width: isSectionCollapsed || isFocusMode ? undefined : sectionWidth }}>
            <SectionList
              sections={sections}
              selectedSectionId={selectedSectionId}
              onSelectSection={handleSelectSection}
              onAddSection={handleAddSection}
              onRenameSection={handleRenameSection}
              onDeleteSection={handleDeleteSection}
              onReorderSections={handleReorderSections}
              isCollapsed={isSectionCollapsed}
              onToggleCollapse={handleToggleSectionCollapse}
              badgeCounts={badgeCounts.sections}
              loading={loadingSections}
            />
            {/* Resize Handle */}
            {!isSectionCollapsed && !isFocusMode && (
              <div
                className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-slate-300 transition-colors z-10"
                onMouseDown={e => startResizing(e, 'section')}
              />
            )}
          </div>

          {/* ─── 3. Pages Column ─── */}
          <div
            className={`flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm md:ml-3 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] relative max-md:!w-full ${isPageCollapsed ? 'w-14 items-center' : ''
              } ${!selectedSectionId || selectedPageId ? 'max-md:hidden' : ''} ${isFocusMode ? 'hidden' : 'flex'}`}
            style={{ width: isPageCollapsed || isFocusMode ? undefined : pageWidth }}>
            <PageList
              pages={pages}
              selectedPageId={selectedPageId}
              onSelectPage={setSelectedPageId}
              onAddPage={handleAddPage}
              onRenamePage={handleRenamePage}
              onDeletePage={handleDeletePage}
              onMovePage={setSelectedPageToMove}
              onReorderPages={handleReorderPages}
              isCollapsed={isPageCollapsed}
              onToggleCollapse={handleTogglePageCollapse}
              badgeCounts={badgeCounts.pages}
              loading={loadingPages}
            />
            {/* Resize Handle */}
            {!isPageCollapsed && !isFocusMode && (
              <div
                className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-slate-300 transition-colors z-10"
                onMouseDown={e => startResizing(e, 'page')}
              />
            )}
          </div>

          {/* ─── 4. Editor Area ─── */}
          <div
            className={`flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/60 shadow-sm md:ml-3 flex flex-col overflow-hidden relative transition-all duration-500 max-md:!w-full max-md:!h-full ${!selectedPageId ? 'max-md:hidden' : ''
              } ${isFocusMode ? 'max-w-4xl mx-auto border-transparent shadow-none' : ''}`}>
            {selectedPageId ? (
              <NoteEditor
                key={selectedPageId}
                page={selectedPage || null} // Changed from undefined to null to match INotePage | null
                initialTabId={targetTabId}
                onSave={handleSavePageContent}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                  <PencilSquareIcon className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-sm font-medium">Select a page to start writing</p>
              </div>
            )}
          </div>
        </div>

        {/* Access Modals */}
        <ToDoListModal
          isOpen={isToDoListOpen}
          onClose={handleCloseToDoList}
          onNavigate={task => (task ? handleJumpToTask(task) : undefined)}
          isDirectCreateOpen={isDirectTaskCreateOpen}
          onCloseDirectCreate={() => setIsDirectTaskCreateOpen(false)}
        />
        <ContactListModal isOpen={isContactListOpen} onClose={handleCloseContactList} />
        <BookmarkListModal isOpen={isBookmarksOpen} onClose={() => setIsBookmarksOpen(false)} />

        {/* Other Modals... */}
        <SimpleRewriteModal isOpen={isSimpleRewriteOpen} onClose={handleCloseSimpleRewrite} />
        <SimpleRewriteOpenAIModal isOpen={isSimpleRewriteOpenAIOpen} onClose={handleCloseSimpleRewriteOpenAI} />
        <StandaloneRewriteModal isOpen={isRewriteOpen} onClose={handleCloseRewrite} />
        <ImageExtractionModal isOpen={isImageExtractOpen} onClose={handleCloseImageExtract} />
        <AssessmentModal isOpen={isAssessmentOpen} onClose={handleCloseAssessment} />

        {/* Unified AI Chat */}
        <UnifiedAIChatModal
          isOpen={isAIChatOpen}
          onClose={handleCloseAIChat}
          geminiApiKey={geminiApiKey}
          openaiApiKey={openaiApiKey}
        />

        {/* Flags Modals */}
        <FlaggedItemsModal
          isOpen={isKeyTasksOpen}
          onClose={handleCloseKeyTasks}
          title="Key Tasks"
          fetchItems={fetchFlaggedTasks}
          onSelectTask={handleJumpToTask}
          icon="flag"
        />
        <FlaggedItemsModal
          isOpen={isImportantOpen}
          onClose={handleCloseImportant}
          title="Important Items"
          fetchItems={fetchImportantTasks}
          onSelectTask={handleJumpToTask}
          icon="important"
        />

        {/* Command Palette (Replaces SearchModal) */}
        <CommandPalette
          isOpen={isSearchOpen}
          onClose={handleCloseSearch}
          fetchItems={fetchSearchResults}
          onSelectTask={handleJumpToTask}
          onCreatePage={selectedSectionId ? handleCreatePageFromPalette : undefined}
          currentPageContent={selectedPage?.tabs?.[0]?.content || ''}
          currentPageTitle={selectedPage?.title || ''}
        />

        {/* Sourcing Modals */}
        <ExecutiveModal
          isOpen={isExecutiveModalOpen}
          onClose={() => setIsExecutiveModalOpen(false)}
        />
        <GoogleCalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
        <AudioCaptureModal 
          isOpen={isAudioCaptureOpen} 
          onClose={() => setIsAudioCaptureOpen(false)} 
          onTranscriptReady={handleTranscriptReady}
        />
        <BadgeSettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />

        {selectedPageToMove && (
          <MovePageModal
            isOpen={!!selectedPageToMove}
            onClose={() => setSelectedPageToMove(null)}
            onMove={handleMovePage}
            categories={categories}
            pageId={selectedPageToMove._id as string}
            currentSectionId={selectedSectionId as string}
          />
        )}

        <BadgeSettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />

        {/* ── Floating Action Buttons ── */}
        <div className="fixed bottom-6 right-6 z-[9998] flex flex-col items-center gap-4">
          {/* Quick Note Button */}
          <div className="group relative flex items-center justify-center">
            {/* Tooltip */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-gray-900/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap translate-x-1 group-hover:translate-x-0">
              Quick Note
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 border-4 border-transparent border-l-gray-900/90" />
            </div>

            <button
              onClick={handleQuickNote}
              className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-110 active:scale-95 transition-all duration-200 border border-white/20"
              title="Quick Note">
              <DocumentPlusIcon className="h-6 w-6 drop-shadow-sm" />
            </button>
          </div>

          {/* New Task Button */}
          <div className="group relative flex items-center justify-center">
            {/* Tooltip */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-gray-900/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap translate-x-1 group-hover:translate-x-0">
              New Task
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 border-4 border-transparent border-l-gray-900/90" />
            </div>

            {/* Ping ring */}
            {activeTaskCount === 0 && (
              <span className="absolute inset-0 rounded-full bg-rose-400 opacity-30 animate-ping" />
            )}

            {/* Button */}
            <button
              onClick={() => setIsDirectTaskCreateOpen(true)}
              className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500 text-white shadow-xl shadow-rose-500/30 hover:shadow-2xl hover:shadow-rose-500/40 hover:scale-110 active:scale-95 transition-all duration-200 border border-white/20"
              title="New Task">
              {/* Task count badge */}
              {activeTaskCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-rose-600 ring-2 ring-rose-500 shadow-sm">
                  {activeTaskCount > 9 ? '9+' : activeTaskCount}
                </span>
              )}
              <PlusCircleIcon className="h-7 w-7 drop-shadow-sm" />
            </button>
          </div>
        </div>
      </div>
    </BadgeSettingsProvider>
  );
});

NotesLayout.displayName = 'NotesLayout';

export default NotesLayout;
