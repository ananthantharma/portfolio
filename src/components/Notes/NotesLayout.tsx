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
  UsersIcon,
  Cog6ToothIcon,
  SparklesIcon,
  TableCellsIcon,
  ArrowsPointingOutIcon, // For Focus Mode
  ArrowsPointingInIcon, // For Focus Mode Exit
  DocumentPlusIcon,
  PlusCircleIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import useDetectOutsideClick from '@/hooks/useDetectOutsideClick';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';

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
import ToDoListModal from './ToDoListModal';
import UserProfileMenu from '../UserProfileMenu';
import MovePageModal from './MovePageModal';
import { BadgeSettingsProvider } from './BadgeSettingsContext';
import { BadgeSettingsModal } from './BadgeSettingsModal';
import CommandPalette from './CommandPalette';
import BookmarkListModal from './BookmarkListModal';

import SourcingEventModal from './SourcingEventModal';
import SourcingListModal from './SourcingListModal';
import { TableAppModal } from './HighPerformanceTable/TableAppModal';
import UnifiedAIChatModal from './UnifiedAIChatModal';

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
  const [isSourcingModalOpen, setIsSourcingModalOpen] = useState(false);
  const [isSourcingListOpen, setIsSourcingListOpen] = useState(false);

  const [sourcingEventCount, setSourcingEventCount] = useState(0);
  const [isTableAppOpen, setIsTableAppOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

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

  const fetchSourcingCount = useCallback(async () => {
    try {
      // Optimized: Use ?count=true to get lightweight count
      const response = await axios.get('/api/sourcing/events?count=true');
      if (response.data && typeof response.data.count === 'number') {
        setSourcingEventCount(response.data.count);
      } else if (Array.isArray(response.data)) {
        setSourcingEventCount(response.data.length); // Fallback
      }
    } catch (error) {
      console.error('Error fetching sourcing count:', error);
    }
  }, []);

  useEffect(() => {
    fetchActiveTaskCount();
    fetchSourcingCount();
    // Optional: Poll every minute or so
    const interval = setInterval(() => {
      fetchActiveTaskCount();
      fetchSourcingCount();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchActiveTaskCount, fetchSourcingCount]);

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
  const [isRewriteDropdownOpen, setIsRewriteDropdownOpen] = useState(false);
  const rewriteDropdownRef = useRef<HTMLDivElement>(null);
  useDetectOutsideClick(rewriteDropdownRef, () => setIsRewriteDropdownOpen(false));
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
      <div className="flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden bg-slate-50 text-slate-900 font-['Inter',system-ui,sans-serif]">
        {/* Top Navigation / Breadcrumbs Bar */}

        {!isFocusMode && (
          <div className="flex flex-col md:flex-row flex-shrink-0 items-start md:items-center justify-between mx-3 md:mx-5 my-3 rounded-2xl border border-white/60 bg-white/60 backdrop-blur-2xl px-3 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] z-40 transition-all duration-300 gap-3 md:gap-0 ring-1 ring-slate-900/5">
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

            <div className="flex items-center gap-2 w-full md:w-auto pb-1 md:pb-0 scrollbar-hide" style={{ overflowX: 'auto', overflowY: 'visible' }}>
              {dbSize && <span className="text-[10px] text-slate-400 font-mono tracking-tight mr-1 bg-white/50 px-1.5 py-0.5 rounded-md ring-1 ring-slate-200/50">{dbSize}</span>}

              {/* ── Core Tools ── */}
              <div className="flex items-center gap-1 rounded-xl bg-white/50 p-1 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-md">
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 transition-all duration-300 ease-out"
                  onClick={handleQuickNote}
                  title="Quick Note">
                  <DocumentPlusIcon className="h-3.5 w-3.5 group-hover:text-emerald-500 transition-colors duration-200" />
                  <span className="hidden lg:inline">Quick</span>
                </button>
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-sky-600 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 transition-all duration-300 ease-out"
                  onClick={handleOpenSearch}
                  title="Command Palette (Ctrl+K)">
                  <MagnifyingGlassIcon className="h-3.5 w-3.5 group-hover:text-sky-500 transition-colors duration-200" />
                  <span className="hidden lg:inline">Search</span>
                  <kbd className="hidden lg:inline ml-0.5 text-[9px] text-slate-400 font-mono bg-slate-100/80 px-1 py-0.5 rounded group-hover:bg-sky-50 group-hover:text-sky-500 transition-colors">
                    ⌘K
                  </kbd>
                </button>
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 transition-all duration-300 ease-out relative"
                  onClick={handleOpenToDoList}>
                  <ClipboardDocumentListIcon className="h-3.5 w-3.5 group-hover:text-teal-500 transition-colors duration-200" />
                  <span className="hidden lg:inline">Tasks</span>
                  {activeTaskCount > 0 && (
                    <>
                      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 animate-ping rounded-full bg-rose-400 opacity-60"></span>
                      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white">
                        {activeTaskCount}
                      </span>
                    </>
                  )}
                </button>
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-rose-600 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 transition-all duration-300 ease-out"
                  onClick={() => setIsDirectTaskCreateOpen(true)}
                  title="New Task">
                  <PlusCircleIcon className="h-3.5 w-3.5 group-hover:text-rose-500 transition-colors duration-200" />
                  <span className="hidden lg:inline">New Task</span>
                </button>
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 transition-all duration-300 ease-out"
                  onClick={handleOpenContactList}
                  title="Contacts">
                  <UsersIcon className="h-3.5 w-3.5 group-hover:text-indigo-500 transition-colors duration-200" />
                  <span className="hidden xl:inline">Contacts</span>
                </button>
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 transition-all duration-300 ease-out"
                  onClick={() => setIsBookmarksOpen(true)}
                  title="Bookmarks">
                  <BookmarkIcon className="h-3.5 w-3.5 group-hover:text-blue-500 transition-colors duration-200" />
                  <span className="hidden xl:inline">Bookmarks</span>
                </button>
              </div>

              {/* Focus Mode */}
              <button
                className="group rounded-xl p-1.5 text-slate-400 bg-white/50 hover:bg-white hover:text-amber-500 shadow-sm ring-1 ring-slate-200/50 hover:ring-amber-200 transition-all duration-300 ease-out"
                onClick={toggleFocusMode}
                title="Focus Mode (Cmd+\)">
                <ArrowsPointingOutIcon className="h-4 w-4 transition-colors duration-200" />
              </button>

              {/* ── AI & Tools (Restricted) ── */}
              {session?.user?.email === 'lankanprinze@gmail.com' && (
                <>
                  <div className="flex items-center gap-1 rounded-xl bg-violet-50/40 p-1 shadow-sm ring-1 ring-violet-200/50 backdrop-blur-md">
                    {/* Rewrite Dropdown */}
                    <div className="relative" ref={rewriteDropdownRef}>
                      <button
                        className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-violet-600 hover:shadow-sm ring-1 ring-transparent hover:ring-violet-200 transition-all duration-300 ease-out ${isRewriteDropdownOpen ? 'bg-white text-violet-600 shadow-sm ring-violet-200' : ''
                          }`}
                        title="AI Rewrite Tools"
                        onClick={() => setIsRewriteDropdownOpen(!isRewriteDropdownOpen)}>
                        <PencilSquareIcon
                          className={`h-3.5 w-3.5 transition-colors duration-200 ${isRewriteDropdownOpen ? 'text-violet-500' : 'group-hover:text-violet-500'
                            }`}
                        />
                        <span className="hidden xl:inline">Rewrite</span>
                      </button>
                      {isRewriteDropdownOpen && (
                        <div className="fixed mt-1.5 w-52 bg-white/95 backdrop-blur-2xl border border-violet-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] py-1.5 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200"
                          style={{ top: rewriteDropdownRef.current ? rewriteDropdownRef.current.getBoundingClientRect().bottom + 6 : undefined, right: rewriteDropdownRef.current ? window.innerWidth - rewriteDropdownRef.current.getBoundingClientRect().right : undefined }}>
                          <button
                            onClick={() => {
                              handleOpenRewrite();
                              setIsRewriteDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-[11px] text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors rounded-lg mx-0.5 flex items-center gap-2"
                            style={{ width: 'calc(100% - 4px)' }}>
                            <PencilSquareIcon className="h-3 w-3 text-indigo-400" />
                            Advanced Rewrite
                          </button>
                          <button
                            onClick={() => {
                              handleOpenSimpleRewrite();
                              setIsRewriteDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-[11px] text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors rounded-lg mx-0.5 flex items-center gap-2"
                            style={{ width: 'calc(100% - 4px)' }}>
                            <PencilSquareIcon className="h-3 w-3 text-purple-400" />
                            Simple Rewrite
                          </button>
                          <div className="h-px bg-slate-100 my-1 mx-2" />
                          <button
                            onClick={() => {
                              handleOpenSimpleRewriteOpenAI();
                              setIsRewriteDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-[11px] text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors rounded-lg mx-0.5 flex items-center gap-2"
                            style={{ width: 'calc(100% - 4px)' }}>
                            <SparklesIcon className="h-3 w-3 text-teal-400" />
                            GPT Rewrite
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-orange-600 hover:shadow-sm ring-1 ring-transparent hover:ring-orange-200 transition-all duration-300 ease-out"
                      onClick={handleOpenImageExtract}
                      title="Extract from Image">
                      <PhotoIcon className="h-3.5 w-3.5 group-hover:text-orange-500 transition-colors duration-200" />
                      <span className="hidden 2xl:inline">Image</span>
                    </button>
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-cyan-600 hover:shadow-sm ring-1 ring-transparent hover:ring-cyan-200 transition-all duration-300 ease-out"
                      onClick={handleOpenAssessment}
                      title="Document Assessment">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-3.5 w-3.5 group-hover:text-cyan-500 transition-colors duration-200">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                      <span className="hidden 2xl:inline">Assess</span>
                    </button>
                  </div>

                  {/* ── Sourcing & Apps ── */}
                  <div className="flex items-center gap-1 rounded-xl bg-blue-50/40 p-1 shadow-sm ring-1 ring-blue-200/50 backdrop-blur-md">
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm ring-1 ring-transparent hover:ring-blue-200 transition-all duration-300 ease-out relative"
                      onClick={() => setIsSourcingListOpen(true)}
                      title="View All Sourcing Events">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors duration-200">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
                        />
                      </svg>
                      <span className="hidden lg:inline">Sourcing</span>
                      {sourcingEventCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white ring-2 ring-white">
                          {sourcingEventCount}
                        </span>
                      )}
                    </button>
                    <button
                      className="group rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm ring-1 ring-transparent hover:ring-emerald-200 transition-all duration-300 ease-out"
                      onClick={() => setIsSourcingModalOpen(true)}
                      title="Create Sourcing Event">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-3.5 h-3.5 group-hover:text-emerald-500 transition-colors duration-200">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm ring-1 ring-transparent hover:ring-indigo-200 transition-all duration-300 ease-out"
                      onClick={() => setIsTableAppOpen(true)}
                      title="Table App">
                      <TableCellsIcon className="w-3.5 h-3.5 group-hover:text-indigo-500 transition-colors duration-200" />
                      <span className="hidden 2xl:inline">Tables</span>
                    </button>
                  </div>

                  {/* Chat — Premium Accent Button */}
                  <button
                    className="group flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-[12px] font-medium text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-0.5 ml-1"
                    onClick={handleOpenAIChat}
                    title="Chat Assistant">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-violet-300" />
                    <span className="hidden lg:inline">Chat</span>
                  </button>
                </>
              )}

              {/* ── Flags & Settings ── */}
              <div className="flex items-center gap-1 rounded-xl bg-white/50 p-1 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-md ml-auto md:ml-2">
                <button
                  className="group rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-amber-500 hover:shadow-sm transition-all duration-300 ease-out relative ring-1 ring-transparent hover:ring-amber-200"
                  onClick={handleOpenImportant}
                  title="Important">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  {totalImportant > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white ring-2 ring-white shadow-sm">
                      {totalImportant}
                    </span>
                  )}
                </button>
                <button
                  className="group rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-rose-500 hover:shadow-sm transition-all duration-300 ease-out relative ring-1 ring-transparent hover:ring-rose-200"
                  onClick={handleOpenKeyTasks}
                  title="Key Tasks">
                  <FlagIcon className="h-4 w-4" />
                  {totalFlagged > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white shadow-sm">
                      {totalFlagged}
                    </span>
                  )}
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5" />
                <button
                  onClick={handleOpenSettings}
                  className="group rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 hover:shadow-sm transition-all duration-300 ease-out ring-1 ring-transparent hover:ring-slate-200"
                  title="Settings">
                  <Cog6ToothIcon className="h-4 w-4 group-hover:rotate-45 transition-transform duration-300" />
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
              onSelectCategory={setSelectedCategoryId}
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
              onSelectSection={setSelectedSectionId}
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
        <SourcingEventModal
          isOpen={isSourcingModalOpen}
          onClose={() => setIsSourcingModalOpen(false)}
          sourcePageId={selectedPageId || undefined}
          defaultEventName={selectedPage?.title || ''}
          defaultDescription=""
        />
        <SourcingListModal isOpen={isSourcingListOpen} onClose={() => setIsSourcingListOpen(false)} />

        <TableAppModal isOpen={isTableAppOpen} onClose={() => setIsTableAppOpen(false)} />

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

        {/* ── Floating Action Button: New Task ── */}
        <div className="fixed bottom-6 right-6 z-[9998] group">
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-3 px-3 py-1.5 bg-gray-900/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap translate-y-1 group-hover:translate-y-0">
            New Task
            <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900/90" />
          </div>

          {/* Ping ring */}
          {activeTaskCount === 0 && (
            <span className="absolute inset-0 rounded-full bg-rose-400 opacity-30 animate-ping" />
          )}

          {/* Button */}
          <button
            onClick={() => setIsDirectTaskCreateOpen(true)}
            className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500 text-white shadow-xl shadow-rose-500/30 hover:shadow-2xl hover:shadow-rose-500/40 hover:scale-110 active:scale-95 transition-all duration-200 border border-white/20"
            title="New Task"
          >
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
    </BadgeSettingsProvider>
  );
});

NotesLayout.displayName = 'NotesLayout';

export default NotesLayout;
