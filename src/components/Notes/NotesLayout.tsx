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
  CloudIcon,
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
import AudioRecorderModal from './AudioRecorderModal';
import GoogleDriveModal from './GoogleDriveModal';

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
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [isAudioRecorderOpen, setIsAudioRecorderOpen] = useState(false);

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

  // Recent pages tracking (persisted in localStorage)
  const [recentPages, setRecentPages] = useState<Array<{
    id: string; title: string; categoryId: string; categoryName: string;
    sectionId: string; sectionName: string; timestamp: number;
  }>>([]);

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

  // Load recent pages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('NOTES_RECENT_PAGES');
    if (saved) {
      try { setRecentPages(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Track page visits for the dashboard
  useEffect(() => {
    if (!selectedPageId || !selectedCategoryId || !selectedSectionId) return;
    const page = pages.find(p => p._id === selectedPageId);
    const cat = categories.find(c => c._id === selectedCategoryId);
    const sec = sections.find(s => s._id === selectedSectionId);
    if (!page || !cat || !sec) return;
    setRecentPages(prev => {
      const filtered = prev.filter(p => p.id !== selectedPageId);
      const updated = [{
        id: selectedPageId,
        title: page.title || 'Untitled',
        categoryId: selectedCategoryId,
        categoryName: cat.name,
        sectionId: selectedSectionId,
        sectionName: sec.name,
        timestamp: Date.now(),
      }, ...filtered].slice(0, 8);
      localStorage.setItem('NOTES_RECENT_PAGES', JSON.stringify(updated));
      return updated;
    });
  }, [selectedPageId]);

  const handleJumpToRecentPage = useCallback((rp: { id: string; categoryId: string; sectionId: string }) => {
    setSelectedCategoryId(rp.categoryId);
    setTimeout(() => {
      setSelectedSectionId(rp.sectionId);
      setTimeout(() => setSelectedPageId(rp.id), 150);
    }, 150);
  }, []);

  const formatTimeAgo = useCallback((ts: number) => {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const dateStr = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }), []);

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

  const userName = useMemo(() => {
    const n = (session?.user as any)?.name || session?.user?.email || '';
    return n.split(' ')[0].split('@')[0];
  }, [session]);

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
      <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0d0f17] text-white font-['Inter',system-ui,sans-serif]">

        {/* ── Top Navigation Bar ── */}
        {!isFocusMode && (
          <div className="flex-shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/[0.06] bg-[#13151f] px-4 py-2.5 z-40 gap-2 md:gap-0 !overflow-visible">

            {/* Left: Brand + Breadcrumbs */}
            <div className="flex items-center gap-2 text-[12.5px] overflow-x-auto whitespace-nowrap scrollbar-hide w-full md:w-auto">
              <button
                onClick={() => { setSelectedCategoryId(null); setSelectedSectionId(null); setSelectedPageId(null); }}
                className="flex items-center gap-2.5 group"
                title="Go to Workspace">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
                  <HomeIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-semibold text-white/90 group-hover:text-violet-400 transition-colors tracking-tight">Notes</span>
              </button>
              {currentCategory && (
                <>
                  <ChevronRightIcon className="h-3 w-3 flex-shrink-0 text-white/20" />
                  <button onClick={() => { setSelectedSectionId(null); setSelectedPageId(null); }} className="font-medium text-white/40 hover:text-violet-400 transition-colors">
                    {currentCategory.name}
                  </button>
                </>
              )}
              {currentSection && (
                <>
                  <ChevronRightIcon className="h-3 w-3 flex-shrink-0 text-white/20" />
                  <button onClick={() => setSelectedPageId(null)} className="font-medium text-white/40 hover:text-violet-400 transition-colors">
                    {currentSection.name}
                  </button>
                </>
              )}
              {selectedPage && (
                <>
                  <ChevronRightIcon className="h-3 w-3 flex-shrink-0 text-white/20" />
                  <span className="font-semibold text-white/80">{selectedPage.title || 'Untitled'}</span>
                </>
              )}
            </div>

            {/* Right: Tools */}
            <div className="flex items-center gap-1.5 w-full md:w-auto scrollbar-hide overflow-x-auto md:overflow-visible ml-auto" style={{ overflow: 'visible' }}>
              {dbSize && (
                <span className="hidden xl:block text-[10px] text-white/20 font-mono tracking-tight bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {dbSize}
                </span>
              )}

              {/* Core Tools */}
              <div className="flex items-center gap-0.5 rounded-xl bg-white/[0.05] border border-white/[0.07] p-1 flex-shrink-0">
                <button
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-white/40 hover:bg-white/[0.08] hover:text-fuchsia-400 transition-all duration-200"
                  onClick={() => setIsExecutiveModalOpen(true)}
                  title="Executive Assistant">
                  <BriefcaseIcon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Assistant</span>
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-white/40 hover:bg-white/[0.08] hover:text-blue-400 transition-all duration-200"
                  onClick={() => setIsCalendarOpen(true)}
                  title="Google Calendar">
                  <CalendarDaysIcon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Calendar</span>
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-white/40 hover:bg-white/[0.08] hover:text-rose-400 transition-all duration-200"
                  onClick={() => setIsAudioRecorderOpen(true)}
                  title="Audio Recorder">
                  <MicrophoneIcon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Record</span>
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-white/40 hover:bg-white/[0.08] hover:text-emerald-400 transition-all duration-200"
                  onClick={() => setIsDriveOpen(true)}
                  title="Google Drive">
                  <CloudIcon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Drive</span>
                </button>
                <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
                <button
                  className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.08] hover:text-emerald-400 transition-all"
                  onClick={handleQuickNote}
                  title="Quick Note">
                  <DocumentPlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Search & Tasks */}
              <div className="flex items-center gap-0.5 rounded-xl bg-white/[0.05] border border-white/[0.07] p-1 flex-shrink-0">
                <button
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium bg-white/[0.07] border border-white/[0.1] hover:border-violet-500/40 text-white/40 hover:text-violet-400 transition-all"
                  onClick={handleOpenSearch}
                  title="Command Palette (Ctrl+K)">
                  <MagnifyingGlassIcon className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Search</span>
                  <kbd className="hidden xl:inline ml-0.5 text-[9px] text-white/20 font-mono">⌘K</kbd>
                </button>
                <div className="flex items-center">
                  <button
                    className="relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-white/40 hover:bg-white/[0.08] hover:text-rose-400 transition-all"
                    onClick={handleOpenToDoList}
                    title="View Tasks">
                    <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">Tasks</span>
                    {activeTaskCount > 0 && (
                      <span className="absolute -top-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-[#13151f]">
                        {activeTaskCount}
                      </span>
                    )}
                  </button>
                  <button
                    className="p-1.5 text-white/25 hover:text-rose-400 hover:bg-white/[0.08] rounded-lg transition-all"
                    onClick={() => setIsDirectTaskCreateOpen(true)}
                    title="New Task">
                    <PlusCircleIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Resources Dropdown */}
              <Menu as="div" className="relative inline-block text-left flex-shrink-0">
                <Menu.Button className="flex items-center gap-1.5 rounded-xl bg-white/[0.05] border border-white/[0.07] px-2.5 py-[7px] text-[11.5px] font-medium text-white/40 hover:bg-white/[0.1] hover:text-white/70 transition-all">
                  <span>Resources</span>
                  <ChevronDownIcon className="h-3 w-3 opacity-60" />
                </Menu.Button>
                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95">
                  <Menu.Items className="absolute left-0 top-full mt-2 w-48 origin-top-left rounded-2xl bg-[#1e2130] p-1.5 shadow-2xl ring-1 ring-white/10 border border-white/[0.08] focus:outline-none z-[110]">
                    <Menu.Item>
                      {({active}) => (
                        <button
                          className={`${active ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400'} flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}
                          onClick={handleOpenContactList}>
                          <UsersIcon className="h-4 w-4 opacity-70" />
                          Contacts
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({active}) => (
                        <button
                          className={`${active ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400'} flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}
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
                          className={`${active ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'} flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors`}>
                          <BuildingOffice2Icon className="h-4 w-4 opacity-70" />
                          Organization
                        </Link>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>

              {/* AI Tools Dropdown */}
              {session?.user?.email === 'lankanprinze@gmail.com' && (
                <Menu as="div" className="relative inline-block text-left flex-shrink-0">
                  <Menu.Button className="flex items-center gap-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 px-3 py-[7px] text-[11.5px] font-semibold text-violet-300 hover:bg-violet-500/30 transition-all">
                    <SparklesIcon className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">AI</span>
                    <ChevronDownIcon className="h-3 w-3 opacity-70" />
                  </Menu.Button>
                  <Transition
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95">
                    <Menu.Items className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-2xl bg-[#1e2130] p-2 shadow-2xl ring-1 ring-white/10 border border-white/[0.08] focus:outline-none z-[110]">
                      <div className="px-2 pb-1.5 mb-1.5 border-b border-white/[0.06]">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Rewriting</p>
                      </div>
                      <Menu.Item>
                        {({active}) => (
                          <button
                            className={`${active ? 'bg-white/[0.06]' : ''} flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-400 transition-colors`}
                            onClick={handleOpenRewrite}>
                            <PencilSquareIcon className="h-4 w-4 text-violet-400" />
                            Advanced Rewrite
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({active}) => (
                          <button
                            className={`${active ? 'bg-white/[0.06]' : ''} flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-400 transition-colors`}
                            onClick={handleOpenSimpleRewrite}>
                            <PencilSquareIcon className="h-4 w-4 text-purple-400" />
                            Simple Rewrite
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({active}) => (
                          <button
                            className={`${active ? 'bg-white/[0.06]' : ''} flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-400 transition-colors`}
                            onClick={handleOpenSimpleRewriteOpenAI}>
                            <SparklesIcon className="h-4 w-4 text-teal-400" />
                            GPT Rewrite
                          </button>
                        )}
                      </Menu.Item>
                      <div className="px-2 py-1.5 my-1 border-y border-white/[0.06]">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Analysis</p>
                      </div>
                      <Menu.Item>
                        {({active}) => (
                          <button
                            className={`${active ? 'bg-white/[0.06]' : ''} flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-400 transition-colors`}
                            onClick={handleOpenImageExtract}>
                            <PhotoIcon className="h-4 w-4 text-orange-400" />
                            Extract from Image
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({active}) => (
                          <button
                            className={`${active ? 'bg-white/[0.06]' : ''} flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-400 transition-colors`}
                            onClick={handleOpenAssessment}>
                            <DocumentPlusIcon className="h-4 w-4 text-cyan-400" />
                            Document Assessment
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              )}

              {/* AI Chat CTA */}
              <button
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-[7px] text-[12px] font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 hover:-translate-y-px active:translate-y-0 transition-all flex-shrink-0"
                onClick={handleOpenAIChat}>
                <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 text-violet-200" />
                <span className="hidden lg:inline">AI Chat</span>
              </button>

              {/* Utility cluster */}
              <div className="flex items-center gap-0.5 rounded-xl bg-white/[0.05] border border-white/[0.07] p-1 flex-shrink-0">
                <button
                  className="rounded-lg p-2 text-white/25 hover:bg-white/[0.08] hover:text-amber-400 transition-all"
                  onClick={toggleFocusMode}
                  title="Focus Mode (Cmd+\)">
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                </button>
                <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
                <button
                  className="relative rounded-lg p-2 text-white/25 hover:bg-white/[0.08] hover:text-amber-400 transition-all"
                  onClick={handleOpenImportant}
                  title="Important Highlights">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  {totalImportant > 0 && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white ring-2 ring-[#13151f]">
                      {totalImportant}
                    </span>
                  )}
                </button>
                <button
                  className="relative rounded-lg p-2 text-white/25 hover:bg-white/[0.08] hover:text-rose-400 transition-all"
                  onClick={handleOpenKeyTasks}
                  title="Key Flags">
                  <FlagIcon className="h-4 w-4" />
                  {totalFlagged > 0 && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-[#13151f]">
                      {totalFlagged}
                    </span>
                  )}
                </button>
                <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
                <button
                  onClick={handleOpenSettings}
                  className="rounded-lg p-2 text-white/25 hover:bg-white/[0.08] hover:text-white/60 group transition-all"
                  title="Settings">
                  <Cog6ToothIcon className="h-4 w-4 group-hover:rotate-45 transition-transform duration-300" />
                </button>
              </div>

              {/* User Profile */}
              <div className="flex items-center ml-1 flex-shrink-0">
                <UserProfileMenu />
              </div>
            </div>
          </div>
        )}

        {/* ── Main Panel ── */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Focus Mode Exit */}
          {isFocusMode && (
            <button
              onClick={toggleFocusMode}
              className="absolute top-4 right-4 z-50 p-2 bg-white/[0.08] backdrop-blur-sm rounded-full shadow-lg border border-white/20 text-white/40 hover:text-violet-400 transition-all opacity-60 hover:opacity-100"
              title="Exit Focus Mode">
              <ArrowsPointingInIcon className="h-5 w-5" />
            </button>
          )}

          {/* ─── 1. Categories Column ─── */}
          <div
            className={`flex flex-col bg-[#13151f] border-r border-white/[0.06] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] max-md:!w-full relative ${isCategoryCollapsed ? 'w-14 items-center' : ''} ${isFocusMode || selectedCategoryId ? 'max-md:hidden' : ''} ${isFocusMode ? 'hidden' : 'flex'}`}
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
                className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-violet-500/40 transition-colors z-10"
                onMouseDown={e => startResizing(e, 'category')}
              />
            )}
          </div>

          {/* ─── 2. Sections Column ─── */}
          <div
            className={`flex flex-col bg-[#13151f] border-r border-white/[0.06] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] relative max-md:!w-full ${isSectionCollapsed ? 'w-14 items-center' : ''} ${!selectedCategoryId || selectedSectionId ? 'max-md:hidden' : ''} ${isFocusMode ? 'hidden' : 'flex'}`}
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
            {!isSectionCollapsed && !isFocusMode && (
              <div
                className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-violet-500/40 transition-colors z-10"
                onMouseDown={e => startResizing(e, 'section')}
              />
            )}
          </div>

          {/* ─── 3. Pages Column ─── */}
          <div
            className={`flex flex-col bg-[#17192a] border-r border-white/[0.06] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] relative max-md:!w-full ${isPageCollapsed ? 'w-14 items-center' : ''} ${!selectedSectionId || selectedPageId ? 'max-md:hidden' : ''} ${isFocusMode ? 'hidden' : 'flex'}`}
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
            {!isPageCollapsed && !isFocusMode && (
              <div
                className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-violet-500/40 transition-colors z-10"
                onMouseDown={e => startResizing(e, 'page')}
              />
            )}
          </div>

          {/* ─── 4. Editor / Dashboard Area ─── */}
          <div
            className={`flex-1 min-w-0 bg-[#0d0f17] flex flex-col overflow-hidden relative transition-all duration-500 max-md:!w-full max-md:!h-full ${!selectedPageId ? 'max-md:hidden' : ''} ${isFocusMode ? 'bg-white' : selectedPageId ? 'p-3' : ''}`}>

            {/* ── Page open: Editor ── */}
            {selectedPageId ? (
              <div className={`h-full bg-white overflow-hidden ${isFocusMode ? '' : 'rounded-2xl shadow-2xl shadow-black/40'}`}>
                <NoteEditor
                  key={selectedPageId}
                  page={selectedPage || null}
                  initialTabId={targetTabId}
                  onSave={handleSavePageContent}
                />
              </div>

            /* ── Section selected, no page: Pages overview grid ── */
            ) : selectedSectionId ? (
              <div className="h-full overflow-y-auto custom-scrollbar px-6 py-8">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-1">
                        {currentCategory?.name}
                      </p>
                      <h1 className="text-xl font-bold text-white/80">{currentSection?.name}</h1>
                      <p className="text-sm text-white/25 mt-0.5">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => handleAddPage('New Page')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-[12px] font-semibold transition-all shadow-lg shadow-violet-600/20">
                      <DocumentPlusIcon className="h-3.5 w-3.5" /> New Page
                    </button>
                  </div>

                  {pages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                        <PencilSquareIcon className="h-8 w-8 text-white/[0.1]" />
                      </div>
                      <p className="text-[13px] text-white/25">No pages yet. Create your first one.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {pages.map(page => {
                        const badge = badgeCounts.pages[page._id as string];
                        return (
                          <button
                            key={page._id as string}
                            onClick={() => setSelectedPageId(page._id as string)}
                            className="group text-left p-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-violet-500/30 transition-all duration-200">
                            <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center mb-3 group-hover:bg-violet-500/20 transition-colors">
                              <PencilSquareIcon className="h-4 w-4 text-white/25 group-hover:text-violet-400 transition-colors" />
                            </div>
                            <p className="text-[12.5px] font-medium text-white/60 group-hover:text-white/90 transition-colors truncate leading-tight mb-2">
                              {page.title || 'Untitled'}
                            </p>
                            {badge?.todo?.count > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-rose-400/70 bg-rose-500/10 border border-rose-500/15 px-1.5 py-0.5 rounded-full">
                                <ClipboardDocumentListIcon className="h-2.5 w-2.5" />
                                {badge.todo.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handleAddPage('New Page')}
                        className="group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.07] hover:border-violet-500/40 hover:bg-white/[0.04] transition-all min-h-[110px]">
                        <PlusCircleIcon className="h-6 w-6 text-white/20 group-hover:text-violet-400 transition-colors" />
                        <span className="text-[11px] text-white/25 group-hover:text-violet-400 transition-colors font-medium">New Page</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

            /* ── Category selected, no section: Sections overview grid ── */
            ) : selectedCategoryId ? (
              <div className="h-full overflow-y-auto custom-scrollbar px-6 py-8">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-1">Notebook</p>
                      <h1 className="text-xl font-bold text-white/80">{currentCategory?.name}</h1>
                      <p className="text-sm text-white/25 mt-0.5">{sections.length} section{sections.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => handleAddSection('New Section')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-[12px] font-semibold transition-all shadow-lg shadow-violet-600/20">
                      <PlusCircleIcon className="h-3.5 w-3.5" /> New Section
                    </button>
                  </div>

                  {sections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                        <BookmarkIcon className="h-8 w-8 text-white/[0.1]" />
                      </div>
                      <p className="text-[13px] text-white/25">No sections yet. Create your first one.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {sections.map(section => {
                        const badge = badgeCounts.sections[section._id as string];
                        return (
                          <button
                            key={section._id as string}
                            onClick={() => handleSelectSection(section._id as string)}
                            className="group text-left p-5 rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-violet-500/30 transition-all duration-200">
                            <div className="flex items-start justify-between mb-4">
                              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                                <BookmarkIcon className="h-4.5 w-4.5 text-white/25 group-hover:text-violet-400 transition-colors" />
                              </div>
                              {badge?.todo?.count > 0 && (
                                <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
                                  {badge.todo.count}
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] font-semibold text-white/65 group-hover:text-white/90 transition-colors">
                              {section.name}
                            </p>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handleAddSection('New Section')}
                        className="group flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.07] hover:border-violet-500/40 hover:bg-white/[0.04] transition-all min-h-[120px]">
                        <PlusCircleIcon className="h-6 w-6 text-white/20 group-hover:text-violet-400 transition-colors" />
                        <span className="text-[11px] text-white/25 group-hover:text-violet-400 transition-colors font-medium">New Section</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

            /* ── Nothing selected: Workspace dashboard ── */
            ) : (
              <div className="h-full overflow-y-auto custom-scrollbar px-6 py-8">
                <div className="max-w-3xl mx-auto">

                  {/* Greeting */}
                  <div className="mb-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-1">{dateStr}</p>
                    <h1 className="text-2xl font-bold text-white/75">{greeting}{userName ? `, ${userName}` : ''}</h1>
                    <p className="text-[13px] text-white/25 mt-1">Here's your workspace overview.</p>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Notebooks</p>
                      <p className="text-3xl font-bold text-white/60">{categories.length}</p>
                    </div>
                    <button onClick={handleOpenToDoList} className="group text-left p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-500/15 hover:border-rose-500/35 transition-all">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-rose-400/50 mb-2">Active Tasks</p>
                      <p className="text-3xl font-bold text-rose-400">{activeTaskCount}</p>
                    </button>
                    <button onClick={handleOpenKeyTasks} className="group text-left p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15 hover:border-amber-500/35 transition-all">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/50 mb-2">Flagged</p>
                      <p className="text-3xl font-bold text-amber-400">{totalFlagged}</p>
                    </button>
                    <button onClick={handleOpenImportant} className="group text-left p-4 rounded-2xl bg-violet-500/[0.06] border border-violet-500/15 hover:border-violet-500/35 transition-all">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400/50 mb-2">Important</p>
                      <p className="text-3xl font-bold text-violet-400">{totalImportant}</p>
                    </button>
                  </div>

                  {/* Recent pages */}
                  {recentPages.length > 0 && (
                    <div className="mb-8">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-3">Recent</p>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {recentPages.map(rp => (
                          <button
                            key={rp.id}
                            onClick={() => handleJumpToRecentPage(rp)}
                            className="group text-left p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-violet-500/25 transition-all duration-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-md bg-white/[0.07] flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                                <PencilSquareIcon className="h-3 w-3 text-white/25 group-hover:text-violet-400" />
                              </div>
                              <span className="text-[10px] text-white/25 truncate">{rp.categoryName}</span>
                            </div>
                            <p className="text-[12px] font-medium text-white/60 group-hover:text-white/90 transition-colors truncate leading-snug mb-1">
                              {rp.title}
                            </p>
                            <p className="text-[10px] text-white/20">{formatTimeAgo(rp.timestamp)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-3">Quick Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { icon: DocumentPlusIcon, label: 'Quick Note', action: handleQuickNote, color: 'hover:text-emerald-400 hover:border-emerald-500/30' },
                        { icon: MagnifyingGlassIcon, label: 'Search', action: handleOpenSearch, color: 'hover:text-violet-400 hover:border-violet-500/30' },
                        { icon: ChatBubbleLeftRightIcon, label: 'AI Chat', action: handleOpenAIChat, color: 'hover:text-indigo-400 hover:border-indigo-500/30' },
                        { icon: PlusCircleIcon, label: 'New Task', action: () => setIsDirectTaskCreateOpen(true), color: 'hover:text-rose-400 hover:border-rose-500/30' },
                        { icon: CalendarDaysIcon, label: 'Calendar', action: () => setIsCalendarOpen(true), color: 'hover:text-blue-400 hover:border-blue-500/30' },
                        { icon: MicrophoneIcon, label: 'Listen', action: () => setIsAudioRecorderOpen(true), color: 'hover:text-orange-400 hover:border-orange-500/30' },
                        { icon: FlagIcon, label: 'Flagged', action: handleOpenKeyTasks, color: 'hover:text-amber-400 hover:border-amber-500/30' },
                        { icon: SparklesIcon, label: 'AI Tools', action: handleOpenAIChat, color: 'hover:text-fuchsia-400 hover:border-fuchsia-500/30' },
                      ].map(({ icon: Icon, label, action, color }) => (
                        <button
                          key={label}
                          onClick={action}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/40 text-[12px] font-medium transition-all ${color}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notebooks list if any */}
                  {categories.length > 0 && (
                    <div className="mt-8">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-3">Notebooks</p>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {categories.map(cat => {
                          const catBadge = badgeCounts.categories[cat._id as string];
                          return (
                            <button
                              key={cat._id as string}
                              onClick={() => handleSelectCategory(cat._id as string)}
                              className="group text-left p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-violet-500/25 transition-all">
                              <div className="flex items-center justify-between">
                                <p className="text-[12.5px] font-medium text-white/60 group-hover:text-white/90 transition-colors truncate">{cat.name}</p>
                                {catBadge?.todo?.count > 0 && (
                                  <span className="ml-2 flex-shrink-0 text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full">{catBadge.todo.count}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Modals ── */}
        <ToDoListModal
          isOpen={isToDoListOpen}
          onClose={handleCloseToDoList}
          onNavigate={task => (task ? handleJumpToTask(task) : undefined)}
          isDirectCreateOpen={isDirectTaskCreateOpen}
          onCloseDirectCreate={() => setIsDirectTaskCreateOpen(false)}
        />
        <ContactListModal isOpen={isContactListOpen} onClose={handleCloseContactList} />
        <BookmarkListModal isOpen={isBookmarksOpen} onClose={() => setIsBookmarksOpen(false)} />

        <SimpleRewriteModal isOpen={isSimpleRewriteOpen} onClose={handleCloseSimpleRewrite} />
        <SimpleRewriteOpenAIModal isOpen={isSimpleRewriteOpenAIOpen} onClose={handleCloseSimpleRewriteOpenAI} />
        <StandaloneRewriteModal isOpen={isRewriteOpen} onClose={handleCloseRewrite} />
        <ImageExtractionModal isOpen={isImageExtractOpen} onClose={handleCloseImageExtract} />
        <AssessmentModal isOpen={isAssessmentOpen} onClose={handleCloseAssessment} />

        <UnifiedAIChatModal
          isOpen={isAIChatOpen}
          onClose={handleCloseAIChat}
          geminiApiKey={geminiApiKey}
          openaiApiKey={openaiApiKey}
        />

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

        <CommandPalette
          isOpen={isSearchOpen}
          onClose={handleCloseSearch}
          fetchItems={fetchSearchResults}
          onSelectTask={handleJumpToTask}
          onCreatePage={selectedSectionId ? handleCreatePageFromPalette : undefined}
          currentPageContent={selectedPage?.tabs?.[0]?.content || ''}
          currentPageTitle={selectedPage?.title || ''}
        />

        <ExecutiveModal isOpen={isExecutiveModalOpen} onClose={() => setIsExecutiveModalOpen(false)} />
        <GoogleCalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
        <GoogleDriveModal isOpen={isDriveOpen} onClose={() => setIsDriveOpen(false)} />
        <AudioRecorderModal
          isOpen={isAudioRecorderOpen}
          onClose={() => setIsAudioRecorderOpen(false)}
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

        {/* ── Floating Action Buttons ── */}
        <div className="fixed bottom-6 right-6 z-[9998] flex flex-col items-center gap-3">
          {/* Quick Note */}
          <div className="group relative flex items-center justify-center">
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-[#1e2130] border border-white/10 backdrop-blur-sm text-white/70 text-xs font-medium rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap translate-x-1 group-hover:translate-x-0">
              Quick Note
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 border-4 border-transparent border-l-[#1e2130]" />
            </div>
            <button
              onClick={handleQuickNote}
              className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-110 active:scale-95 transition-all duration-200 border border-white/20"
              title="Quick Note">
              <DocumentPlusIcon className="h-5 w-5 drop-shadow-sm" />
            </button>
          </div>

          {/* New Task */}
          <div className="group relative flex items-center justify-center">
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-[#1e2130] border border-white/10 backdrop-blur-sm text-white/70 text-xs font-medium rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap translate-x-1 group-hover:translate-x-0">
              New Task
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 border-4 border-transparent border-l-[#1e2130]" />
            </div>
            {activeTaskCount === 0 && (
              <span className="absolute inset-0 rounded-2xl bg-rose-400 opacity-25 animate-ping" />
            )}
            <button
              onClick={() => setIsDirectTaskCreateOpen(true)}
              className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500 text-white shadow-xl shadow-rose-500/30 hover:shadow-2xl hover:shadow-rose-500/40 hover:scale-110 active:scale-95 transition-all duration-200 border border-white/20"
              style={{ width: '3.25rem', height: '3.25rem' }}
              title="New Task">
              {activeTaskCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-rose-600 ring-2 ring-rose-500 shadow-sm">
                  {activeTaskCount > 9 ? '9+' : activeTaskCount}
                </span>
              )}
              <PlusCircleIcon className="h-6 w-6 drop-shadow-sm" />
            </button>
          </div>
        </div>
      </div>
    </BadgeSettingsProvider>
  );
});

NotesLayout.displayName = 'NotesLayout';

export default NotesLayout;
