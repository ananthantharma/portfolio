/* eslint-disable simple-import-sort/imports */
'use client';

import axios from 'axios';
import {
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  FlagIcon,
  HomeIcon,
  MagnifyingGlassIcon,
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
  MicrophoneIcon,
  CloudIcon,
  ClipboardIcon,
  DocumentTextIcon,
  ArrowLeftOnRectangleIcon,
  ShieldCheckIcon,
  BeakerIcon,
  DocumentMagnifyingGlassIcon,
  UserIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import {signOut, useSession} from 'next-auth/react';
import React, {useCallback, useEffect, useState, useMemo, useRef} from 'react';

import {INoteCategory} from '@/models/NoteCategory';
import {INotePage} from '@/models/NotePage';
import {INoteSection} from '@/models/NoteSection';

import StandaloneRewriteModal from '../StandaloneRewriteModal';
import CategoryList from './CategoryList';
import ContactListModal from './ContactListModal';
import FlaggedItemsModal from './FlaggedItemsModal';
import AssessmentModal from './AssessmentModal';
import ImageExtractionModal from './ImageExtractionModal';
import NoteEditor from './NoteEditor';
// import SearchModal from './SearchModal'; // Replaced by CommandPalette
import SectionPageList from './SectionPageList';
import SectionDashboard from './SectionDashboard';
import ExecutiveModal from './ExecutiveModal';
import ToDoListModal from './ToDoListModal';
import MovePageModal from './MovePageModal';
import GoogleCalendarModal from './GoogleCalendarModal';
import {BadgeSettingsProvider} from './BadgeSettingsContext';
import {BadgeSettingsModal} from './BadgeSettingsModal';
import CommandPalette from './CommandPalette';
import BookmarkListModal from './BookmarkListModal';
import {ICON_options} from './IconPicker';
import AudioRecorderModal from './AudioRecorderModal';
import GoogleDriveModal from './GoogleDriveModal';

import UnifiedAIChatModal from './UnifiedAIChatModal';
import LogicStyleRefiner from './LogicStyleRefiner';
import ContractRedlineAnalyzer from './ContractRedlineAnalyzer';
import Humanizer from './Humanizer';
import TruthTeller from './TruthTeller';

const NotesLayout: React.FC = React.memo(() => {
  const [categories, setCategories] = useState<INoteCategory[]>([]);
  const [sections, setSections] = useState<INoteSection[]>([]);
  const [pages, setPages] = useState<INotePage[]>([]);
  // Pages that live directly under the selected category (no section)
  const [categoryPages, setCategoryPages] = useState<INotePage[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [targetTabId, setTargetTabId] = useState<string | undefined>(undefined);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingCategoryPages, setLoadingCategoryPages] = useState(false);

  // Sidebar visibility states
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);
  const [isRailExpanded, setIsRailExpanded] = useState(false);

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
    pages: Record<string, {todo: {count: number; minDays: number | null}; important: number; flagged: number}>;
    sections: Record<string, {todo: {count: number; minDays: number | null}; important: number; flagged: number}>;
    categories: Record<string, {todo: {count: number; minDays: number | null}; important: number; flagged: number}>;
  }>({pages: {}, sections: {}, categories: {}});

  // Resizable Sidebar State
  const [categoryWidth, setCategoryWidth] = useState(200);
  const [sectionWidth, setSectionWidth] = useState(260);
  const [resizingCol, setResizingCol] = useState<'category' | 'section' | null>(null);

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

    const savedCategoryCollapsed = localStorage.getItem('NOTES_CATEGORY_COLLAPSED');
    if (savedCategoryCollapsed !== null) setIsCategoryCollapsed(savedCategoryCollapsed === 'true');

    const savedSectionCollapsed = localStorage.getItem('NOTES_SECTION_COLLAPSED');
    if (savedSectionCollapsed !== null) setIsSectionCollapsed(savedSectionCollapsed === 'true');

    const savedFocusMode = localStorage.getItem('NOTES_FOCUS_MODE');
    if (savedFocusMode !== null) setIsFocusMode(savedFocusMode === 'true');

    const savedRailExpanded = localStorage.getItem('NOTES_RAIL_EXPANDED');
    if (savedRailExpanded !== null) setIsRailExpanded(savedRailExpanded === 'true');
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
    localStorage.setItem('NOTES_FOCUS_MODE', isFocusMode.toString());
  }, [isFocusMode]);

  useEffect(() => {
    localStorage.setItem('NOTES_RAIL_EXPANDED', isRailExpanded.toString());
  }, [isRailExpanded]);

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

  const startResizing = useCallback((e: React.MouseEvent, col: 'category' | 'section') => {
    setResizingCol(col);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!resizingCol) return;

    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return; // throttle to one update per frame
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (resizingCol === 'category') {
          setCategoryWidth(Math.max(200, Math.min(600, e.clientX)));
        } else if (resizingCol === 'section') {
          const startX = isCategoryCollapsed ? 56 : categoryWidth;
          setSectionWidth(Math.max(220, Math.min(600, e.clientX - startX)));
        }
      });
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      document.body.style.cursor = 'default';
      // Save widths to localStorage when resizing stops
      localStorage.setItem('NOTES_CATEGORY_WIDTH', categoryWidth.toString());
      localStorage.setItem('NOTES_SECTION_WIDTH', sectionWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [resizingCol, categoryWidth, sectionWidth, isCategoryCollapsed]);

  // Database Stats State
  const [dbSize, setDbSize] = useState<string | null>(null);

  // ── Client-side caches — switching between sections/categories is instant ────
  const sectionsCache = useRef<Record<string, INoteSection[]>>({});
  const pagesCache = useRef<Record<string, INotePage[]>>({});
  const categoryPagesCache = useRef<Record<string, INotePage[]>>({});
  // Tracks which sectionId the current `pages` state actually belongs to.
  // Only used for cache-sync — prevents writing stale data when selectedSectionId
  // changes before the new fetch resolves.
  const pagesBelongToSection = useRef<string | null>(null);
  const sectionsBelongToCategory = useRef<string | null>(null);
  const categoryPagesBelongToCategory = useRef<string | null>(null);

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
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchSections = useCallback(async (categoryId: string) => {
    if (sectionsCache.current[categoryId]) {
      sectionsBelongToCategory.current = categoryId;
      setSections(sectionsCache.current[categoryId]);
      return;
    }
    setLoadingSections(true);
    try {
      const response = await axios.get(`/api/notes/sections?categoryId=${categoryId}`);
      const data = response.data.data;
      sectionsCache.current[categoryId] = data;
      sectionsBelongToCategory.current = categoryId;
      setSections(data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoadingSections(false);
    }
  }, []);

  const fetchPages = useCallback(async (sectionId: string) => {
    if (pagesCache.current[sectionId]) {
      pagesBelongToSection.current = sectionId;
      setPages(pagesCache.current[sectionId]);
      return;
    }
    setLoadingPages(true);
    try {
      const response = await axios.get(`/api/notes/pages?sectionId=${sectionId}`);
      const data = response.data.data;
      pagesCache.current[sectionId] = data;
      pagesBelongToSection.current = sectionId;
      setPages(data);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoadingPages(false);
    }
  }, []);

  // Fetch pages that live directly under a category (no section)
  const fetchCategoryPages = useCallback(async (categoryId: string) => {
    if (categoryPagesCache.current[categoryId]) {
      categoryPagesBelongToCategory.current = categoryId;
      setCategoryPages(categoryPagesCache.current[categoryId]);
      return;
    }
    setLoadingCategoryPages(true);
    try {
      const response = await axios.get(`/api/notes/pages?categoryId=${categoryId}`);
      const data = response.data.data;
      categoryPagesCache.current[categoryId] = data;
      categoryPagesBelongToCategory.current = categoryId;
      setCategoryPages(data);
    } catch (error) {
      console.error('Error fetching category pages:', error);
    } finally {
      setLoadingCategoryPages(false);
    }
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch sections + direct pages when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      fetchSections(selectedCategoryId);
      fetchCategoryPages(selectedCategoryId);
    } else {
      setSections([]);
      setCategoryPages([]);
    }
  }, [selectedCategoryId, fetchSections, fetchCategoryPages]);

  // Keep caches in sync after mutations so re-navigation is instant.
  // Only write when the state's owner ref matches the current selection —
  // this prevents caching stale data when the selection changes before the
  // new fetch resolves.
  useEffect(() => {
    const sid = pagesBelongToSection.current;
    if (sid && sid === selectedSectionId) {
      pagesCache.current[sid] = pages;
    }
  }, [pages, selectedSectionId]);

  useEffect(() => {
    const cid = sectionsBelongToCategory.current;
    if (cid && cid === selectedCategoryId) {
      sectionsCache.current[cid] = sections;
    }
  }, [sections, selectedCategoryId]);

  useEffect(() => {
    const cid = categoryPagesBelongToCategory.current;
    if (cid && cid === selectedCategoryId) {
      categoryPagesCache.current[cid] = categoryPages;
    }
  }, [categoryPages, selectedCategoryId]);

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
  }, [selectedSectionId, fetchPages]);

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
    const interval = setInterval(fetchBadgeStats, 120000); // 120s poll
    return () => clearInterval(interval);
  }, []);


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
        setSelectedSectionId(targetSectionId);
        setSelectedPageId(null);
        setTargetTabId(undefined);
      } else {
        setSelectedSectionId(null);
        setSelectedPageId(null);
        setTargetTabId(undefined);
      }
    } else {
      const sectionObj = task.sectionId as unknown as INoteSection;
      // Category-level page (lives directly under a notebook, no section)
      if (!sectionObj && extendedTask.categoryId) {
        const catId = extendedTask.categoryId._id || extendedTask.categoryId;
        setSelectedCategoryId(catId as string);
        setSelectedSectionId(null);
        setTargetTabId(tabId);
        setSelectedPageId(task._id as string);
        return;
      }
      if (!sectionObj || !sectionObj.categoryId) {
        alert('Cannot locate note: Missing section info.');
        return;
      }
      const targetCategoryId = sectionObj.categoryId as unknown as string;
      const targetSectionId = sectionObj._id as string;
      const targetPageId = task._id as string;

      setSelectedCategoryId(targetCategoryId);
      setSelectedSectionId(targetSectionId);
      setTargetTabId(tabId);
      setSelectedPageId(targetPageId);
    }
  }, []);

  // Category Operations
  const handleAddCategory = useCallback(async (name: string, color?: string, icon?: string, image?: string | null) => {
    try {
      const response = await axios.post('/api/notes/categories', {name, color, icon, image});
      setCategories(prev => [...prev, response.data.data]);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }, []);

  const handleRenameCategory = useCallback(
    async (id: string, name: string, color?: string, icon?: string, image?: string | null) => {
      try {
        const response = await axios.put(`/api/notes/categories/${id}`, {name, color, icon, image});
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
        items: newOrder.map((cat, index) => ({id: cat._id, order: index})),
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
        const response = await axios.put(`/api/notes/sections/${id}`, {name, color, icon, image});
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

  // Create a page directly under the selected category (no section needed)
  const handleAddCategoryPage = useCallback(
    async (title: string, color?: string, icon?: string, image?: string | null) => {
      if (!selectedCategoryId) return;
      try {
        const response = await axios.post('/api/notes/pages', {
          title,
          color,
          icon,
          image,
          categoryId: selectedCategoryId,
        });
        setCategoryPages(prev => [response.data.data, ...prev]);
        setSelectedSectionId(null);
        setSelectedPageId(response.data.data._id as string);
      } catch (error) {
        console.error('Error adding category page:', error);
      }
    },
    [selectedCategoryId],
  );

  const handleQuickNote = useCallback(async () => {
    try {
      // 1. Fetch/Create 'Other Notes' Category
      let category = categories.find(c => c.name === 'Other Notes');
      if (!category) {
        const catRes = await axios.post('/api/notes/categories', {name: 'Other Notes'});
        category = catRes.data.data;
        setCategories(prev => [...prev, category as INoteCategory]);
      }

      // 2. Fetch/Create 'Other' Section
      // Using API directly to make sure we don't rely only on local state which might be empty
      const secRes = await axios.get(`/api/notes/sections?categoryId=${category!._id}`);
      let section = secRes.data.data.find((s: INoteSection) => s.name === 'Other');
      if (!section) {
        const createSecRes = await axios.post('/api/notes/sections', {name: 'Other', categoryId: category!._id});
        section = createSecRes.data.data;
        if (selectedCategoryId === category!._id) {
          setSections(prev => [...prev, section]);
        }
      }

      // 3. Create Page
      const pageRes = await axios.post('/api/notes/pages', {title: 'New Note', sectionId: section._id});
      const newPage = pageRes.data.data;

      // 4. Navigate to new Quick Note — React 18 batches these automatically
      setSelectedCategoryId(category!._id as string);
      setSelectedSectionId(section._id as string);
      setSelectedPageId(newPage._id as string);
    } catch (error) {
      console.error('Error creating quick note:', error);
      alert('Failed to create quick note.');
    }
  }, [categories, selectedCategoryId]);

  // Applies an update to a page wherever it currently lives (section list or category root list)
  const applyPageUpdate = useCallback((updated: INotePage) => {
    setPages(prev => prev.map(page => (page._id === updated._id ? updated : page)));
    setCategoryPages(prev => prev.map(page => (page._id === updated._id ? updated : page)));
  }, []);

  const handleRenamePage = useCallback(
    async (id: string, title: string, color?: string, icon?: string, image?: string | null) => {
      try {
        const response = await axios.put(`/api/notes/pages/${id}`, {title, color, icon, image});
        applyPageUpdate(response.data.data);
      } catch (error) {
        console.error('Error renaming page:', error);
      }
    },
    [applyPageUpdate],
  );

  const handleDeletePage = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/notes/pages/${id}`);
        setPages(prev => prev.filter(page => page._id !== id));
        setCategoryPages(prev => prev.filter(page => page._id !== id));
        if (selectedPageId === id) setSelectedPageId(null);
      } catch (error) {
        console.error('Error deleting page:', error);
      }
    },
    [selectedPageId],
  );

  const [selectedPageToMove, setSelectedPageToMove] = useState<INotePage | null>(null);

  // Recent pages tracking (persisted in localStorage)
  const [recentPages, setRecentPages] = useState<
    Array<{
      id: string;
      title: string;
      categoryId: string;
      categoryName: string;
      sectionId: string;
      sectionName: string;
      timestamp: number;
    }>
  >([]);

  /**
   * Move a page to a new destination — either a section (dest.sectionId set)
   * or directly under a category root (dest.sectionId === null).
   */
  const handleMovePage = useCallback(
    async (pageId: string, dest: {sectionId: string | null; categoryId: string}) => {
      try {
        await axios.put(`/api/notes/pages/${pageId}`, {
          sectionId: dest.sectionId,
          categoryId: dest.sectionId ? null : dest.categoryId,
        });

        const movedToCurrentSection = !!dest.sectionId && dest.sectionId === selectedSectionId;
        const movedToCurrentCategoryRoot = !dest.sectionId && dest.categoryId === selectedCategoryId;

        // Remove from any list it no longer belongs to
        if (!movedToCurrentSection) setPages(prev => prev.filter(p => p._id !== pageId));
        if (!movedToCurrentCategoryRoot) setCategoryPages(prev => prev.filter(p => p._id !== pageId));
        if (!movedToCurrentSection && !movedToCurrentCategoryRoot && selectedPageId === pageId) {
          setSelectedPageId(null);
        }

        // Invalidate destination caches so the page appears when navigating there
        if (dest.sectionId) {
          delete pagesCache.current[dest.sectionId];
          if (movedToCurrentSection) fetchPages(dest.sectionId);
        } else {
          delete categoryPagesCache.current[dest.categoryId];
          if (movedToCurrentCategoryRoot) fetchCategoryPages(dest.categoryId);
        }

        setSelectedPageToMove(null);
      } catch (error) {
        console.error('Error moving page:', error);
        alert('Failed to move page.');
      }
    },
    [selectedSectionId, selectedCategoryId, selectedPageId, fetchPages, fetchCategoryPages],
  );

  const handleTogglePageInactive = useCallback(
    async (id: string, isInactive: boolean) => {
      try {
        const response = await axios.put(`/api/notes/pages/${id}`, {isInactive});
        applyPageUpdate(response.data.data);
      } catch (error) {
        console.error('Error toggling page inactive:', error);
      }
    },
    [applyPageUpdate],
  );

  const handleSetParentPage = useCallback(
    async (pageId: string, parentPageId: string | null) => {
      try {
        const response = await axios.put(`/api/notes/pages/${pageId}`, {parentPageId});
        applyPageUpdate(response.data.data);
      } catch (error) {
        console.error('Error setting parent page:', error);
      }
    },
    [applyPageUpdate],
  );

  const handleUpdatePage = useCallback(
    async (id: string, updates: Partial<INotePage>) => {
      try {
        const response = await axios.put(`/api/notes/pages/${id}`, updates);
        applyPageUpdate(response.data.data);
      } catch (error) {
        console.error('Error updating page:', error);
      }
    },
    [applyPageUpdate],
  );

  const handleOpenPageFromDashboard = useCallback((id: string, tabId?: string) => {
    setSelectedPageId(id);
    setTargetTabId(tabId);
  }, []);

  const handleSavePageContent = useCallback(
    async (id: string, data: any) => {
      // data coming from NoteEditor is now the 'tabs' array
      // Do NOT swallow errors — let them propagate to NoteEditor so isDirty stays true
      const response = await axios.put(`/api/notes/pages/${id}`, {tabs: data});
      applyPageUpdate(response.data.data);
    },
    [applyPageUpdate],
  );

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

  // Reorder pages that live at the category root
  const handleReorderCategoryPages = useCallback(
    async (newOrder: INotePage[]) => {
      setCategoryPages(newOrder);
      try {
        await axios.put('/api/notes/pages/reorder', {
          items: newOrder.map((page, index) => ({id: page._id, order: index})),
        });
      } catch (error) {
        console.error('Error reordering category pages:', error);
        if (selectedCategoryId) {
          delete categoryPagesCache.current[selectedCategoryId];
          fetchCategoryPages(selectedCategoryId);
        }
      }
    },
    [selectedCategoryId, fetchCategoryPages],
  );

  const selectedPage =
    pages.find(p => p._id === selectedPageId) || categoryPages.find(p => p._id === selectedPageId) || null;
  const currentCategory = categories.find(c => c._id === selectedCategoryId);
  const currentSection = sections.find(s => s._id === selectedSectionId);

  // Load recent pages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('NOTES_RECENT_PAGES');
    if (saved) {
      try {
        setRecentPages(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Track page visits for the dashboard (works for section pages and category-root pages)
  useEffect(() => {
    if (!selectedPageId || !selectedCategoryId) return;
    const cat = categories.find(c => c._id === selectedCategoryId);
    if (!cat) return;

    const sectionPage = selectedSectionId ? pages.find(p => p._id === selectedPageId) : undefined;
    const categoryPage = categoryPages.find(p => p._id === selectedPageId);
    const page = sectionPage || categoryPage;
    if (!page) return;

    const sec = sectionPage ? sections.find(s => s._id === selectedSectionId) : undefined;

    setRecentPages(prev => {
      const filtered = prev.filter(p => p.id !== selectedPageId);
      const updated = [
        {
          id: selectedPageId,
          title: page.title || 'Untitled',
          categoryId: selectedCategoryId,
          categoryName: cat.name,
          sectionId: sec ? (selectedSectionId as string) : '',
          sectionName: sec ? sec.name : '',
          timestamp: Date.now(),
        },
        ...filtered,
      ].slice(0, 8);
      localStorage.setItem('NOTES_RECENT_PAGES', JSON.stringify(updated));
      return updated;
    });
  }, [selectedPageId]);

  const handleJumpToRecentPage = useCallback((rp: {id: string; categoryId: string; sectionId: string}) => {
    setSelectedCategoryId(rp.categoryId);
    setTimeout(() => {
      setSelectedSectionId(rp.sectionId || null);
      setTimeout(() => setSelectedPageId(rp.id), 150);
    }, 150);
  }, []);

  const categoryRecentPages = useMemo(
    () =>
      selectedCategoryId
        ? recentPages.filter(rp => rp.categoryId === selectedCategoryId).slice(0, 2)
        : [],
    [recentPages, selectedCategoryId],
  );

  const handleJumpToRecentInSection = useCallback((sectionId: string, pageId: string) => {
    setSelectedSectionId(sectionId || null);
    setTimeout(() => setSelectedPageId(pageId), 150);
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
    return new Date(ts).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const dateStr = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

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

  // Standalone Rewrite Modal
  const [isRewriteOpen, setIsRewriteOpen] = useState(false);
  const handleOpenRewrite = useCallback(() => setIsRewriteOpen(true), []);
  const handleCloseRewrite = useCallback(() => setIsRewriteOpen(false), []);

  // Logic & Style Refiner Modal
  const [isRefinerOpen, setIsRefinerOpen] = useState(false);
  const handleOpenRefiner = useCallback(() => setIsRefinerOpen(true), []);
  const handleCloseRefiner = useCallback(() => setIsRefinerOpen(false), []);

  // Contract Redline Analyzer Modal
  const [isRedlineOpen, setIsRedlineOpen] = useState(false);
  const handleOpenRedline = useCallback(() => setIsRedlineOpen(true), []);
  const handleCloseRedline = useCallback(() => setIsRedlineOpen(false), []);

  // Humanizer Modal
  const [isHumanizerOpen, setIsHumanizerOpen] = useState(false);
  const handleOpenHumanizer = useCallback(() => setIsHumanizerOpen(true), []);
  const handleCloseHumanizer = useCallback(() => setIsHumanizerOpen(false), []);

  // Truth Teller Modal
  const [isTruthTellerOpen, setIsTruthTellerOpen] = useState(false);
  const handleOpenTruthTeller = useCallback(() => setIsTruthTellerOpen(true), []);
  const handleCloseTruthTeller = useCallback(() => setIsTruthTellerOpen(false), []);

  const {data: session} = useSession();

  const userName = useMemo(() => {
    const n = (session?.user as any)?.name || session?.user?.email || '';
    return n.split(' ')[0].split('@')[0];
  }, [session]);

  const userInitial = useMemo(() => {
    const n = (session?.user as any)?.name || session?.user?.email || 'U';
    return n.charAt(0).toUpperCase();
  }, [session]);

  const isAdmin = session?.user?.email === 'lankanprinze@gmail.com';

  // Profile dropdown state (inline, no headlessui needed)
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  // Create Page handler for CommandPalette — works inside a section OR directly in a category
  const handleCreatePageFromPalette = useCallback(() => {
    if (selectedSectionId) {
      handleAddPage('New Page');
    } else if (selectedCategoryId) {
      handleAddCategoryPage('New Page');
    }
  }, [selectedSectionId, selectedCategoryId, handleAddPage, handleAddCategoryPage]);

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
      // Ctrl+N / Cmd+N — New Page (in current section, or directly in current notebook)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && (selectedSectionId || selectedCategoryId)) {
        e.preventDefault();
        if (selectedSectionId) handleAddPage('New Page');
        else handleAddCategoryPage('New Page');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedSectionId, selectedCategoryId, handleAddPage, handleAddCategoryPage]);

  // Calculate total important and flagged counts
  const totalImportant = useMemo(() => {
    return Object.values(badgeCounts.pages).reduce((acc, curr) => acc + (curr.important || 0), 0);
  }, [badgeCounts.pages]);

  const totalFlagged = useMemo(() => {
    return Object.values(badgeCounts.pages).reduce((acc, curr) => acc + (curr.flagged || 0), 0);
  }, [badgeCounts.pages]);

  return (
    <BadgeSettingsProvider>
      <div
        className="relative flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 text-slate-900"
        style={{fontFamily: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
        {/* Background — subtle radial wash */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[15%] -left-[10%] h-[50%] w-[50%] rounded-full bg-indigo-100/30 blur-[120px]" />
          <div className="absolute top-[30%] -right-[8%] h-[40%] w-[40%] rounded-full bg-blue-50/40 blur-[100px]" />
        </div>

        <div className="relative flex h-full w-full flex-col overflow-hidden p-2.5 gap-2">
          {/* ── Top Navigation Bar ── */}
          {!isFocusMode && (
            <div className="flex-shrink-0 flex items-center h-11 rounded-2xl glass-nav z-30 overflow-visible">
              {/* ── Far-left: Portfolio home link ── */}
              <Link
                href="/"
                title="Back to Portfolio"
                className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-l-2xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 transition-all duration-150 group">
                <span className="text-white text-[13px] font-black tracking-tight group-hover:scale-110 transition-transform duration-150">
                  A
                </span>
              </Link>

              <div className="w-px h-5 bg-slate-100 mx-0 flex-shrink-0" />

              {/* ── Workspace switcher + breadcrumb + ⌘K command bar ── */}
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden px-2">
                {/* Workspace switcher */}
                <button
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setSelectedSectionId(null);
                    setSelectedPageId(null);
                  }}
                  className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors group"
                  title="Notes home">
                  <div className="w-5 h-5 rounded-md bg-indigo-500 flex items-center justify-center flex-shrink-0">
                    <HomeIcon className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-semibold text-[13px] text-slate-700 group-hover:text-slate-900">Notes</span>
                  <ChevronDownIcon className="h-3 w-3 text-slate-300 flex-shrink-0" />
                </button>

                {/* Dynamic breadcrumb */}
                {(currentCategory || currentSection || selectedPage) && (
                  <>
                    <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
                    <div className="flex items-center gap-1 overflow-hidden min-w-0 flex-shrink-0 max-w-[320px]">
                      {currentCategory && (
                        <button
                          onClick={() => { setSelectedSectionId(null); setSelectedPageId(null); }}
                          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors truncate max-w-[90px]"
                          title={currentCategory.name}>
                          {currentCategory.name}
                        </button>
                      )}
                      {currentSection && (
                        <>
                          <ChevronRightIcon className="h-3 w-3 flex-shrink-0 text-slate-300" />
                          <button
                            onClick={() => setSelectedPageId(null)}
                            className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors truncate max-w-[90px]"
                            title={currentSection.name}>
                            {currentSection.name}
                          </button>
                        </>
                      )}
                      {selectedPage && (
                        <>
                          <ChevronRightIcon className="h-3 w-3 flex-shrink-0 text-slate-300" />
                          <span className="text-[11px] text-slate-500 font-medium truncate max-w-[110px]" title={selectedPage.title}>
                            {selectedPage.title || 'Untitled'}
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}

                <div className="w-px h-4 bg-slate-200 flex-shrink-0" />

                {/* ⌘K Command bar */}
                <button
                  onClick={handleOpenSearch}
                  title="Search or jump to... (⌘K)"
                  className="flex items-center gap-2 flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/50 transition-all max-w-sm">
                  <MagnifyingGlassIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                  <span className="flex-1 text-left text-[12px] text-slate-400">Jump to page...</span>
                  <kbd className="hidden sm:flex items-center text-[10px] font-mono bg-white/80 border border-slate-200 px-1 py-0.5 rounded text-slate-300 flex-shrink-0">⌘K</kbd>
                </button>
              </div>

              {/* ── Right: tasks, tools, profile ── */}
              <div className="flex items-center gap-0.5 px-2 flex-shrink-0">
                {/* Tasks */}
                <button
                  onClick={handleOpenToDoList}
                  title="Tasks"
                  className="relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-150">
                  <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[12px]">Tasks</span>
                  {activeTaskCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
                      {activeTaskCount}
                    </span>
                  )}
                </button>

                <div className="w-px h-4 bg-slate-200 mx-0.5" />

                {/* Quick Note */}
                <button
                  onClick={handleQuickNote}
                  title="Quick Note"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-150">
                  <DocumentPlusIcon className="h-4 w-4" />
                </button>

                {/* Focus Mode */}
                <button
                  onClick={toggleFocusMode}
                  title="Focus Mode (Ctrl+\)"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150">
                  {isFocusMode ? (
                    <ArrowsPointingInIcon className="h-4 w-4" />
                  ) : (
                    <ArrowsPointingOutIcon className="h-4 w-4" />
                  )}
                </button>

                <div className="w-px h-4 bg-slate-200 mx-0.5" />

                {/* ── Inline profile — uses fixed dropdown to escape overflow:hidden ── */}
                <div ref={profileRef} className="relative flex-shrink-0">
                  <button
                    onClick={() => setIsProfileOpen(v => !v)}
                    className="flex items-center gap-1.5 rounded-xl px-2 py-1 hover:bg-slate-100 transition-all duration-150 group">
                    {session?.user?.image ? (
                      <img
                        src={session.user.image}
                        alt="avatar"
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center ring-1 ring-orange-200">
                        <span className="text-white text-[10px] font-bold">{userInitial}</span>
                      </div>
                    )}
                    <span className="hidden md:inline text-[12px] font-medium text-slate-600 group-hover:text-slate-800 transition-colors max-w-[80px] truncate">
                      {userName}
                    </span>
                  </button>

                  {/* Dropdown — position: fixed so it's never clipped by overflow:hidden */}
                  {isProfileOpen && (
                    <div
                      className="fixed mt-2 w-52 rounded-xl bg-white border border-slate-100 shadow-xl shadow-slate-200/60 z-[200] overflow-hidden"
                      style={{
                        top: (profileRef.current?.getBoundingClientRect().bottom ?? 0) + 6,
                        right: window.innerWidth - (profileRef.current?.getBoundingClientRect().right ?? 0),
                      }}>
                      {/* User info header */}
                      <div className="px-4 py-3 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">
                          {session?.user?.name || 'User'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{session?.user?.email}</p>
                      </div>
                      {/* Actions */}
                      <div className="p-1.5 flex flex-col gap-0.5">
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                            <ShieldCheckIcon className="h-4 w-4 text-indigo-500" />
                            Admin Portal
                          </Link>
                        )}
                        <button
                          onClick={() => { setIsProfileOpen(false); handleOpenSettings(); }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-700 transition-colors w-full text-left">
                          <Cog6ToothIcon className="h-4 w-4" />
                          Badge Settings
                        </button>
                        <button
                          onClick={() => signOut()}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left">
                          <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Main Panel ── */}
          <div className="flex flex-1 overflow-hidden gap-2 min-h-0">
            {/* ── Resource Rail — expandable icon palette, grouped by function ── */}
            {!isFocusMode && (
              <div className={`flex flex-col py-2 rounded-xl glass-panel select-none z-10 flex-shrink-0 overflow-y-auto custom-scrollbar gap-0.5 transition-all duration-200 ${isRailExpanded ? 'w-44 items-stretch px-1.5' : 'w-14 items-center'}`}>

                {/* ── AI tools (Chat → Executive) ── */}
                <button
                  onClick={handleOpenAIChat}
                  title="AI Chat"
                  className={`flex items-center rounded-lg text-sky-600 hover:bg-sky-50 transition-all duration-150 active:scale-[0.98] ${isRailExpanded ? 'gap-2 px-2 py-1.5 w-full' : 'justify-center w-9 h-8'}`}>
                  <ChatBubbleLeftRightIcon className="h-[15px] w-[15px] flex-shrink-0" />
                  {isRailExpanded && <span className="truncate text-left text-[12px]">AI Chat</span>}
                </button>
                {[
                  {icon: SparklesIcon, label: 'Rewrite', action: handleOpenRewrite},
                  {icon: BeakerIcon, label: 'Refiner', action: handleOpenRefiner},
                  {icon: UserIcon, label: 'Humanize', action: handleOpenHumanizer},
                  {icon: DocumentMagnifyingGlassIcon, label: 'Redline', action: handleOpenRedline},
                  {icon: BoltIcon, label: 'Truth Teller', action: handleOpenTruthTeller},
                  {icon: DocumentTextIcon, label: 'Form Fill', action: () => window.open('/pdf-autofill', '_blank')},
                  {icon: PhotoIcon, label: 'OCR', action: handleOpenImageExtract},
                  {icon: ClipboardIcon, label: 'Assessment', action: handleOpenAssessment},
                  {icon: BriefcaseIcon, label: 'Executive', action: () => setIsExecutiveModalOpen(true)},
                ].map(({icon: Icon, label, action}) => (
                  <button key={label} onClick={action} title={label} className={`flex items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 active:scale-[0.98] ${isRailExpanded ? 'gap-2 px-2 py-1.5 w-full' : 'justify-center w-9 h-8'}`}>
                    <Icon className="h-[15px] w-[15px] flex-shrink-0" />
                    {isRailExpanded && <span className="truncate text-left text-[12px]">{label}</span>}
                  </button>
                ))}

                <div className={`h-px bg-slate-200/60 my-1 ${isRailExpanded ? 'mx-1' : 'w-6'}`} />

                {/* ── Data sources (Calendar → Bookmarks) ── */}
                <button
                  onClick={() => setIsCalendarOpen(true)}
                  title="Calendar"
                  className={`flex items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 active:scale-[0.98] ${isRailExpanded ? 'gap-2 px-2 py-1.5 w-full' : 'justify-center w-9 h-8'}`}>
                  <div className="relative flex-shrink-0">
                    <CalendarDaysIcon className="h-[15px] w-[15px]" />
                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </div>
                  {isRailExpanded && <span className="truncate text-left text-[12px]">Calendar</span>}
                </button>
                {[
                  {icon: MicrophoneIcon, label: 'Audio', action: () => setIsAudioRecorderOpen(true)},
                  {icon: CloudIcon, label: 'Drive', action: () => setIsDriveOpen(true)},
                  {icon: UsersIcon, label: 'Contacts', action: handleOpenContactList},
                  {icon: BookmarkIcon, label: 'Bookmarks', action: () => setIsBookmarksOpen(true)},
                ].map(({icon: Icon, label, action}) => (
                  <button key={label} onClick={action} title={label} className={`flex items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 active:scale-[0.98] ${isRailExpanded ? 'gap-2 px-2 py-1.5 w-full' : 'justify-center w-9 h-8'}`}>
                    <Icon className="h-[15px] w-[15px] flex-shrink-0" />
                    {isRailExpanded && <span className="truncate text-left text-[12px]">{label}</span>}
                  </button>
                ))}

                {/* Expand/collapse toggle at the very bottom */}
                <div className="flex-1" />
                <button
                  onClick={() => setIsRailExpanded(v => !v)}
                  title={isRailExpanded ? 'Collapse' : 'Expand'}
                  className={`flex items-center rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-all duration-150 mt-1 ${isRailExpanded ? 'gap-2 px-2 py-1.5 w-full' : 'justify-center w-9 h-8'}`}>
                  <ChevronRightIcon className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${isRailExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}

            {/* ── Sidebar Group: seamless depth layering, no hard borders ── */}
            <div className="relative flex h-full flex-shrink-0 rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
              {/* Notebooks — deepest gray */}
              <aside
                className="relative flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-white/20 glass-sidebar transition-all duration-200"
                style={{width: isCategoryCollapsed ? 48 : categoryWidth, background: 'var(--sidebar-cat)'}}>
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
                  dbSize={dbSize}
                />
                {!isCategoryCollapsed && (
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-400/40 transition-colors z-50"
                    onMouseDown={e => startResizing(e, 'category')}
                  />
                )}
              </aside>

              {/* Sections + Pages — combined */}
              <aside
                className="relative flex h-full flex-shrink-0 flex-col overflow-hidden glass-sidebar transition-all duration-200"
                style={{width: isSectionCollapsed ? 48 : sectionWidth, background: 'var(--sidebar-sec)'}}>
                <SectionPageList
                  sections={sections}
                  selectedSectionId={selectedSectionId}
                  onSelectSection={handleSelectSection}
                  onAddSection={handleAddSection}
                  onRenameSection={handleRenameSection}
                  onDeleteSection={handleDeleteSection}
                  onReorderSections={handleReorderSections}
                  loadingSections={loadingSections}
                  sectionBadgeCounts={badgeCounts.sections}
                  pages={pages}
                  selectedPageId={selectedPageId}
                  onSelectPage={setSelectedPageId}
                  onAddPage={handleAddPage}
                  onRenamePage={handleRenamePage}
                  onDeletePage={handleDeletePage}
                  onMovePage={setSelectedPageToMove}
                  onReorderPages={handleReorderPages}
                  onToggleInactive={handleTogglePageInactive}
                  onSetParentPage={handleSetParentPage}
                  loadingPages={loadingPages}
                  pageBadgeCounts={badgeCounts.pages}
                  isCollapsed={isSectionCollapsed}
                  onToggleCollapse={handleToggleSectionCollapse}
                  categoryName={currentCategory?.name}
                  categoryRecentPages={categoryRecentPages}
                  onJumpToRecentPage={handleJumpToRecentInSection}
                  categoryPages={categoryPages}
                  loadingCategoryPages={loadingCategoryPages}
                  onAddCategoryPage={handleAddCategoryPage}
                  onReorderCategoryPages={handleReorderCategoryPages}
                  onMovePageTo={handleMovePage}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategoryPage={id => {
                    setSelectedSectionId(null);
                    setSelectedPageId(id);
                  }}
                />
                {!isSectionCollapsed && (
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-400/40 transition-colors z-50"
                    onMouseDown={e => startResizing(e, 'section')}
                  />
                )}
              </aside>
            </div>

            {/* Content Area */}
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl glass-content transition-all duration-200">
              {/* Page open: Editor */}
              {selectedPageId ? (
                <div className="h-full overflow-hidden">
                  <NoteEditor
                    key={selectedPageId}
                    page={selectedPage || null}
                    initialTabId={targetTabId}
                    onSave={handleSavePageContent}
                  />
                </div>
              ) : /* Section selected, no page: File-explorer dashboard */
              selectedSectionId ? (
                <SectionDashboard
                  pages={pages}
                  loadingPages={loadingPages}
                  currentSection={currentSection}
                  currentCategory={currentCategory}
                  badgeCounts={badgeCounts.pages}
                  onOpenPage={handleOpenPageFromDashboard}
                  onAddPage={title => handleAddPage(title)}
                  onUpdatePage={handleUpdatePage}
                />
              ) : /* Category selected, no section: Sections overview */
              selectedCategoryId ? (
                <div className="h-full overflow-y-auto custom-scrollbar px-8 py-10">
                  <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8 gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400 mb-1.5">Notebook</p>
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight truncate">{currentCategory?.name}</h1>
                        <p className="text-[12px] text-slate-400 mt-1">
                          {sections.length} section{sections.length !== 1 ? 's' : ''}
                          {' · '}
                          {categoryPages.length} loose page{categoryPages.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAddCategoryPage('New Page')}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98]"
                          title="Create a page directly in this notebook — no section needed">
                          <DocumentPlusIcon className="h-3.5 w-3.5" /> New Page
                        </button>
                        <button
                          onClick={() => handleAddSection('New Section')}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-semibold transition-all border border-slate-200 shadow-sm active:scale-[0.98]">
                          <PlusCircleIcon className="h-3.5 w-3.5 text-slate-400" /> New Section
                        </button>
                      </div>
                    </div>

                    {/* ── Direct pages (live at the notebook root) ── */}
                    {(categoryPages.length > 0 || loadingCategoryPages) && (
                      <div className="mb-10">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">Pages</p>
                        {loadingCategoryPages ? (
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="h-[88px] rounded-2xl bg-slate-100/80 animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {categoryPages.map(page => {
                              const pid = page._id as string;
                              const PageIcon = ICON_options[page.icon as keyof typeof ICON_options] || ICON_options.FileText;
                              const pageColor = page.color && page.color !== '#000000' ? page.color : '#6366F1';
                              const pBadge = badgeCounts.pages[pid];
                              return (
                                <button
                                  key={pid}
                                  onClick={() => {
                                    setSelectedSectionId(null);
                                    setSelectedPageId(pid);
                                  }}
                                  className="group text-left p-4 rounded-2xl bg-white border border-slate-100/80 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/8 transition-all duration-200 active:scale-[0.98]">
                                  <div className="flex items-start justify-between mb-3">
                                    <div
                                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
                                      style={{backgroundColor: `${pageColor}14`, border: `1px solid ${pageColor}28`}}>
                                      <PageIcon className="h-4 w-4" style={{color: pageColor}} />
                                    </div>
                                    {(pBadge?.todo?.count ?? 0) > 0 && (
                                      <span className="text-[9px] bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.5 rounded-full font-bold tabular-nums">
                                        {pBadge.todo.count}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[13px] font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors leading-snug truncate">
                                    {page.title || 'Untitled'}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {page.updatedAt ? formatTimeAgo(new Date(page.updatedAt).getTime()) : 'Open page →'}
                                  </p>
                                </button>
                              );
                            })}
                            <button
                              onClick={() => handleAddCategoryPage('New Page')}
                              className="group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all min-h-[88px] active:scale-[0.98]">
                              <DocumentPlusIcon className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                              <span className="text-[11px] text-slate-400 group-hover:text-indigo-600 transition-colors font-medium">New Page</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Sections ── */}
                    {sections.length === 0 && categoryPages.length === 0 && !loadingCategoryPages ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-3xl bg-slate-50/50 border border-dashed border-slate-200">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                          <BookmarkIcon className="h-7 w-7 text-slate-300" />
                        </div>
                        <p className="text-[13px] text-slate-400 font-medium">This notebook is empty.</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAddCategoryPage('New Page')}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold transition-all shadow-md shadow-indigo-500/20">
                            <DocumentPlusIcon className="h-3.5 w-3.5" /> New Page
                          </button>
                          <button
                            onClick={() => handleAddSection('New Section')}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-semibold transition-all border border-slate-200 shadow-sm">
                            <PlusCircleIcon className="h-3.5 w-3.5 text-slate-400" /> New Section
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-300">Pages can live directly in a notebook — sections are optional.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">Sections</p>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                          {sections.map(section => {
                            const badge = badgeCounts.sections[section._id as string];
                            const SectionIcon = ICON_options[section.icon as keyof typeof ICON_options] || ICON_options.Folder;
                            const iconColor = section.color && section.color !== '#000000' ? section.color : '#6366F1';
                            return (
                              <button
                                key={section._id as string}
                                onClick={() => handleSelectSection(section._id as string)}
                                className="group text-left p-4 rounded-2xl bg-white border border-slate-100/80 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/8 transition-all duration-200 active:scale-[0.98]">
                                <div className="flex items-start justify-between mb-3.5">
                                  <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
                                    style={{
                                      backgroundColor: `${iconColor}18`,
                                      border: `1px solid ${iconColor}30`,
                                    }}>
                                    {section.image ? (
                                      <img alt={section.name} className="h-4 w-4 object-contain" src={`https://logo.clearbit.com/${section.image}`} />
                                    ) : (
                                      <SectionIcon className="h-4 w-4" style={{color: iconColor}} />
                                    )}
                                  </div>
                                  {badge?.todo?.count > 0 && (
                                    <span className="text-[9px] bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.5 rounded-full font-bold tabular-nums">
                                      {badge.todo.count}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[13px] font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors leading-snug">
                                  {section.name}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5 group-hover:text-indigo-400 transition-colors">
                                  Open section →
                                </p>
                              </button>
                            );
                          })}
                          <button
                            onClick={() => handleAddSection('New Section')}
                            className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-transparent border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all min-h-[110px] active:scale-[0.98]">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                              <PlusCircleIcon className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <span className="text-[11px] text-slate-400 group-hover:text-indigo-600 transition-colors font-medium">
                              New Section
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Nothing selected: Workspace dashboard */
                <div className="h-full overflow-y-auto custom-scrollbar px-6 md:px-10 py-8 md:py-12">
                  <div className="max-w-5xl mx-auto">
                    {/* Greeting — fluid typography */}
                    <div className="flex flex-col gap-1 mb-10 pt-4 px-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500/80 mb-1">
                        {dateStr}
                      </p>
                      <h1
                        className="font-bold text-slate-900 tracking-tight leading-none"
                        style={{fontSize: 'clamp(2rem, 4vw, 3rem)'}}>
                        {greeting}
                        <span className="text-slate-300">.</span>
                        {userName && (
                          <span className="block text-slate-400 mt-1 font-medium text-[clamp(1rem, 2vw, 1.5rem)] tracking-normal italic">
                            Good to see you, {userName}
                          </span>
                        )}
                      </h1>
                    </div>

                    {/* Bento Grid — Stats + Recent */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                      <div className="group p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Notebooks</p>
                        <div className="flex items-baseline gap-2">
                          <p
                            className="font-bold text-slate-900 leading-none"
                            style={{fontSize: 'clamp(2rem, 3vw, 2.5rem)'}}>
                            {categories.length}
                          </p>
                          <span className="text-xs font-medium text-slate-300 uppercase tracking-tighter">total</span>
                        </div>
                      </div>

                      <button
                        onClick={handleOpenToDoList}
                        className="group text-left p-6 rounded-3xl bg-rose-50/40 border border-rose-100/50 hover:bg-rose-50 transition-all duration-300 active:scale-[0.98] relative overflow-hidden">
                        {activeTaskCount > 0 && (
                          <span className="absolute top-4 right-6 h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                        )}
                        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500/60 mb-3">
                          Active Tasks
                        </p>
                        <p
                          className="font-bold text-rose-600 leading-none"
                          style={{fontSize: 'clamp(2rem, 3vw, 2.5rem)'}}>
                          {activeTaskCount}
                        </p>
                      </button>

                      <button
                        onClick={handleOpenKeyTasks}
                        className="group text-left p-6 rounded-3xl bg-amber-50/40 border border-amber-100/50 hover:bg-amber-50 transition-all duration-300 active:scale-[0.98]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/60 mb-3">
                          Flagged
                        </p>
                        <p
                          className="font-bold text-amber-600 leading-none"
                          style={{fontSize: 'clamp(2rem, 3vw, 2.5rem)'}}>
                          {totalFlagged}
                        </p>
                      </button>

                      <button
                        onClick={handleOpenImportant}
                        className="group text-left p-6 rounded-3xl bg-indigo-50/40 border border-indigo-100/50 hover:bg-indigo-50 transition-all duration-300 active:scale-[0.98]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/60 mb-3">
                          Important
                        </p>
                        <p
                          className="font-bold text-indigo-600 leading-none"
                          style={{fontSize: 'clamp(2rem, 3vw, 2.5rem)'}}>
                          {totalImportant}
                        </p>
                      </button>
                    </div>

                    {/* Recent pages */}
                    {recentPages.length > 0 && (
                      <div className="mb-12">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-5 px-1">
                          Recent
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {recentPages.map(rp => (
                            <button
                              key={rp.id}
                              onClick={() => handleJumpToRecentPage(rp)}
                              className="group text-left p-3.5 rounded-xl bg-[#F0F0F2] hover:bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 active:scale-[0.98]">
                              <p className="text-[12px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors truncate leading-snug mb-1">
                                {rp.title}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 truncate">{rp.categoryName}</span>
                                <span className="text-[10px] text-slate-300">&middot;</span>
                                <span className="text-[10px] text-slate-400">{formatTimeAgo(rp.timestamp)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick actions — pill buttons */}
                    <div className="mb-8">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-2.5">
                        Quick Actions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          {icon: DocumentPlusIcon, label: 'Quick Note', action: handleQuickNote},
                          {icon: MagnifyingGlassIcon, label: 'Search', action: handleOpenSearch},
                          {icon: ChatBubbleLeftRightIcon, label: 'AI Chat', action: handleOpenAIChat},
                          {icon: PlusCircleIcon, label: 'New Task', action: () => setIsDirectTaskCreateOpen(true)},
                          {icon: CalendarDaysIcon, label: 'Calendar', action: () => setIsCalendarOpen(true)},
                          {icon: MicrophoneIcon, label: 'Record', action: () => setIsAudioRecorderOpen(true)},
                          {
                            icon: DocumentTextIcon,
                            label: 'Form Fill',
                            action: () => window.open('/pdf-autofill', '_blank'),
                          },
                          {icon: FlagIcon, label: 'Flagged', action: handleOpenKeyTasks},
                        ].map(({icon: Icon, label, action}) => (
                          <button
                            key={label}
                            onClick={action}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0F0F2] text-slate-500 text-[11.5px] font-medium hover:bg-slate-200/80 hover:text-slate-700 transition-all duration-150 active:scale-[0.97]">
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notebooks list */}
                    {categories.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-2.5">
                          Notebooks
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                          {categories.map(cat => {
                            const catBadge = badgeCounts.categories[cat._id as string];
                            return (
                              <button
                                key={cat._id as string}
                                onClick={() => handleSelectCategory(cat._id as string)}
                                className="group text-left p-4 rounded-xl bg-[#F0F0F2] hover:bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 active:scale-[0.98]">
                                <div className="flex items-center justify-between">
                                  <p className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                                    {cat.name}
                                  </p>
                                  {catBadge?.todo?.count > 0 && (
                                    <span className="ml-2 flex-shrink-0 text-[9px] bg-rose-100/80 text-rose-500 px-1.5 py-0.5 rounded-full font-semibold">
                                      {catBadge.todo.count}
                                    </span>
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
            </main>
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
          onCreatePage={selectedSectionId || selectedCategoryId ? handleCreatePageFromPalette : undefined}
          currentPageContent={selectedPage?.tabs?.[0]?.content || ''}
          currentPageTitle={selectedPage?.title || ''}
        />
        <ExecutiveModal isOpen={isExecutiveModalOpen} onClose={() => setIsExecutiveModalOpen(false)} />
        <GoogleCalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
        <GoogleDriveModal isOpen={isDriveOpen} onClose={() => setIsDriveOpen(false)} />
        <AudioRecorderModal
          isOpen={isAudioRecorderOpen}
          onClose={() => setIsAudioRecorderOpen(false)}
          onOpen={() => setIsAudioRecorderOpen(true)}
        />
        <BadgeSettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
        {isRefinerOpen && <LogicStyleRefiner onClose={handleCloseRefiner} />}
        {isRedlineOpen && <ContractRedlineAnalyzer onClose={handleCloseRedline} />}
        {isHumanizerOpen && <Humanizer onClose={handleCloseHumanizer} />}
        {isTruthTellerOpen && <TruthTeller onClose={handleCloseTruthTeller} />}

        {selectedPageToMove && (
          <MovePageModal
            isOpen={!!selectedPageToMove}
            onClose={() => setSelectedPageToMove(null)}
            onMove={handleMovePage}
            categories={categories}
            pageId={selectedPageToMove._id as string}
            pageTitle={selectedPageToMove.title}
            currentSectionId={
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((selectedPageToMove.sectionId as any)?._id || selectedPageToMove.sectionId || null) as string | null
            }
            currentCategoryId={
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((selectedPageToMove.categoryId as any)?._id ||
                selectedPageToMove.categoryId ||
                selectedCategoryId) as string | null
            }
          />
        )}

        {/* ── Focus Mode Exit Button ── */}
        {isFocusMode && (
          <div className="fixed top-4 right-4 z-[9999]">
            <div className="group relative flex items-center justify-center">
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
                Exit Focus Mode (Ctrl+\)
                <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 border-4 border-transparent border-l-slate-800" />
              </div>
              <button
                onClick={toggleFocusMode}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-white shadow-sm hover:shadow-md transition-all duration-150"
                title="Exit Focus Mode (Ctrl+\)">
                <ArrowsPointingInIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Floating Tasks Button (left) ── */}
        <div className="fixed bottom-8 left-8 z-[9998]">
          <div className="group relative flex items-center justify-center">
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
              Open Tasks
              <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
            </div>
            {activeTaskCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-rose-600 ring-2 ring-rose-400 shadow-sm z-10">
                {activeTaskCount > 9 ? '9+' : activeTaskCount}
              </span>
            )}
            <button
              onClick={handleOpenToDoList}
              className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 text-white shadow-[0_8px_28px_rgba(244,63,94,0.35)] hover:shadow-[0_12px_36px_rgba(244,63,94,0.45)] hover:scale-110 active:scale-95 transition-all duration-200 border border-white/20"
              title="Open Tasks">
              <ClipboardDocumentListIcon className="h-5 w-5 drop-shadow-sm" />
            </button>
          </div>
        </div>

        {/* ── Floating Action Buttons ── */}
        <div className="fixed bottom-8 right-8 z-[9998] flex flex-col items-center gap-3">
          <div className="group relative flex items-center justify-center">
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
              Quick Note
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 border-4 border-transparent border-l-slate-800" />
            </div>
            <button
              onClick={handleQuickNote}
              className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white shadow-[0_8px_28px_rgba(99,102,241,0.35)] hover:shadow-[0_12px_36px_rgba(99,102,241,0.45)] hover:scale-110 active:scale-95 transition-all duration-200 border border-white/20"
              title="Quick Note">
              <DocumentPlusIcon className="h-5 w-5 drop-shadow-sm" />
            </button>
          </div>

          <div className="group relative flex items-center justify-center">
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
              New Task
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 border-4 border-transparent border-l-slate-800" />
            </div>
            {activeTaskCount === 0 && (
              <span className="absolute inset-0 rounded-2xl bg-rose-400 opacity-25 animate-ping" />
            )}
            <button
              onClick={() => setIsDirectTaskCreateOpen(true)}
              className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500 text-white shadow-[0_8px_28px_rgba(244,63,94,0.35)] hover:shadow-[0_12px_36px_rgba(244,63,94,0.45)] hover:scale-110 active:scale-95 transition-all duration-200 border border-white/20"
              style={{width: '3.25rem', height: '3.25rem'}}
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
