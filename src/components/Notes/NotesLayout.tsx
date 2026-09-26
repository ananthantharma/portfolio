/* eslint-disable simple-import-sort/imports */
'use client';

import axios from 'axios';
import dynamic from 'next/dynamic';
import styles from './Workspace.module.css';
import TaskWorkspace from '../Tasks/TaskWorkspace';
import {TaskProvider, useTaskCollection} from '../Tasks/TaskProvider';
import {OpenWorkspaceNoteContext} from '../Tasks/WorkspaceNavigation';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  SparklesIcon,
  ArrowsPointingOutIcon, // For Focus Mode
  ArrowsPointingInIcon, // For Focus Mode Exit
  DocumentPlusIcon,
  PlusCircleIcon,
  DocumentTextIcon,
  RectangleGroupIcon,
  BookOpenIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  PresentationChartBarIcon,
  CalendarDaysIcon,
  CloudIcon,
  UserGroupIcon,
  BookmarkIcon,
  ChatBubbleBottomCenterTextIcon,
  ExclamationCircleIcon,
  FlagIcon,
  BellAlertIcon,
  MicrophoneIcon,
  PencilSquareIcon,
  PhotoIcon,
  ClipboardDocumentCheckIcon,
  AdjustmentsHorizontalIcon,
  ScaleIcon,
  FaceSmileIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import {signOut, useSession} from 'next-auth/react';
import React, {useCallback, useEffect, useState, useMemo, useRef} from 'react';

import {INoteCategory, INoteClass} from '@/models/NoteCategory';
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
import VendorPage from './Vendor/VendorPage';
import ExecutiveModal from './ExecutiveModal';
import ToDoListModal from './ToDoListModal';
import MovePageModal from './MovePageModal';
import GoogleCalendarModal from './GoogleCalendarModal';
import {BadgeSettingsProvider} from './BadgeSettingsContext';
import {BadgeSettingsModal} from './BadgeSettingsModal';
import CommandPalette from './CommandPalette';
import BookmarkListModal from './BookmarkListModal';
import PromptLibraryModal from '../PromptLibrary/PromptLibraryModal';
import AudioRecorderModal from './AudioRecorderModal';
import GoogleDriveModal from './GoogleDriveModal';
import CameraModal from './CameraModal';

import UnifiedAIChatModal from './UnifiedAIChatModal';
import LogicStyleRefiner from './LogicStyleRefiner';
import ContractRedlineAnalyzer from './ContractRedlineAnalyzer';
import Humanizer from './Humanizer';
import TruthTeller from './TruthTeller';

const LegacyTasksApp = dynamic(() => import('../Tasks/TasksApp'), {
  ssr: false,
  loading: () => <div className="p-8 text-sm text-slate-500">Loading your tasks…</div>,
});

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

  const {tasks: workspaceTasks} = useTaskCollection();
  const activeTaskCount = workspaceTasks.filter(task => !task.isCompleted && task.status !== 'done' && !task.isArchived && !task.isTemplate).length;
  const [isNotebookSidebarCollapsed, setIsNotebookSidebarCollapsed] = useState(false);
  const [isTaskSidebarCollapsed, setIsTaskSidebarCollapsed] = useState(false);
  const [advancedTasks, setAdvancedTasks] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<'notes' | 'tasks'>('notes');
  const [tasksVisited, setTasksVisited] = useState(false);
  const [mobileNavigation, setMobileNavigation] = useState(false);
  const changeView = useCallback((view: 'notes' | 'tasks') => {
    setWorkspaceView(view);
    if (view === 'tasks') setTasksVisited(true);
    const url = new URL(window.location.href);
    if (view === 'tasks') url.searchParams.set('view', 'tasks');
    else url.searchParams.delete('view');
    window.history.replaceState(null, '', url);
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'tasks') {
      setWorkspaceView('tasks');
      setTasksVisited(true);
    }
  }, []);

  // Sidebar visibility states
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);

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
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [badgeCounts, setBadgeCounts] = useState<{
    pages: Record<string, {todo: {count: number; minDays: number | null}; important: number; flagged: number}>;
    sections: Record<string, {todo: {count: number; minDays: number | null}; important: number; flagged: number}>;
    categories: Record<string, {todo: {count: number; minDays: number | null}; important: number; flagged: number}>;
  }>({pages: {}, sections: {}, categories: {}});

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    const savedCategory = localStorage.getItem('NOTES_SELECTED_CATEGORY');
    if (savedCategory) setSelectedCategoryId(savedCategory);

    const savedSection = localStorage.getItem('NOTES_SELECTED_SECTION');
    if (savedSection) setSelectedSectionId(savedSection);

    const savedPage = localStorage.getItem('NOTES_SELECTED_PAGE');
    if (savedPage) setSelectedPageId(savedPage);

    const savedSectionCollapsed = localStorage.getItem('NOTES_SECTION_COLLAPSED');
    if (savedSectionCollapsed !== null) setIsSectionCollapsed(savedSectionCollapsed === 'true');

    const savedFocusMode = localStorage.getItem('NOTES_FOCUS_MODE');
    if (savedFocusMode !== null) setIsFocusMode(savedFocusMode === 'true');

    setIsNotebookSidebarCollapsed(localStorage.getItem('NOTES_NOTEBOOK_SIDEBAR_COLLAPSED') === 'true');
    setIsTaskSidebarCollapsed(localStorage.getItem('NOTES_TASK_SIDEBAR_COLLAPSED') === 'true');
    setIsToolbarExpanded(localStorage.getItem('NOTES_TOOLBAR_EXPANDED') === 'true');
  }, []);

  // Tools sidebar (far left) — icon-only by default, expandable to icons + labels
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const toggleToolbar = useCallback(() => {
    setIsToolbarExpanded(prev => {
      localStorage.setItem('NOTES_TOOLBAR_EXPANDED', String(!prev));
      return !prev;
    });
  }, []);

  const toggleNotebookSidebar = useCallback(() => {
    setIsNotebookSidebarCollapsed(prev => {
      localStorage.setItem('NOTES_NOTEBOOK_SIDEBAR_COLLAPSED', String(!prev));
      return !prev;
    });
  }, []);

  const toggleTaskSidebar = useCallback(() => {
    setIsTaskSidebarCollapsed(prev => {
      localStorage.setItem('NOTES_TASK_SIDEBAR_COLLAPSED', String(!prev));
      return !prev;
    });
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
    localStorage.setItem('NOTES_SECTION_COLLAPSED', isSectionCollapsed.toString());
  }, [isSectionCollapsed]);

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
    setWorkspaceView('notes');
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

  const openWorkspaceNote = useCallback(
    async (pageId: string) => {
      try {
        const response = await axios.get('/api/notes/pages/' + encodeURIComponent(pageId));
        if (!response.data?.success || !response.data.data) throw new Error('Note unavailable');
        await handleJumpToTask(response.data.data);
        changeView('notes');
        setMobileNavigation(false);
      } catch {
        alert('This note could not be opened. Please try again.');
      }
    },
    [handleJumpToTask, changeView],
  );

  // Deep link support: /notes?pageId=<id> (e.g. from a task's "Open note page" link) jumps
  // straight to that page, resolving its section/category context first.
  useEffect(() => {
    const pageId = new URLSearchParams(window.location.search).get('pageId');
    if (!pageId) return;
    (async () => {
      try {
        const response = await axios.get(`/api/notes/pages/${pageId}`);
        if (response.data?.success && response.data.data) {
          await handleJumpToTask(response.data.data);
        }
      } catch (error) {
        console.error('Error opening linked note page:', error);
      } finally {
        window.history.replaceState(null, '', '/notes');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Category Operations
  const handleAddCategory = useCallback(
    async (name: string, color?: string, icon?: string, image?: string | null, kind?: 'standard' | 'vendor') => {
    try {
      const response = await axios.post('/api/notes/categories', {name, color, icon, image, kind});
      setCategories(prev => [...prev, response.data.data]);
    } catch (error) {
      console.error('Error adding category:', error);
    }
    },
    [],
  );

  // Notebook-level settings (vendor note classifications and sort order)
  const handleUpdateCategory = useCallback(
    async (id: string, updates: {noteClasses?: INoteClass[]; noteSort?: string; kind?: 'standard' | 'vendor'}) => {
      // Sort changes feel instant; classifications wait for the server so new ones get ids
      if (updates.noteSort) {
        setCategories(prev => prev.map(cat => (cat._id === id ? ({...cat, noteSort: updates.noteSort} as INoteCategory) : cat)));
      }
      const response = await axios.put(`/api/notes/categories/${id}`, updates);
      const saved = response.data.data as INoteCategory;
      setCategories(prev =>
        prev.map(cat =>
          cat._id === id
            ? ({...cat, kind: saved.kind, noteClasses: saved.noteClasses, noteSort: saved.noteSort} as INoteCategory)
            : cat,
        ),
      );
    },
    [],
  );

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

  // Notes created from a vendor page can start with a classification; they open straight in the editor
  const handleAddVendorNote = useCallback(
    async (title: string, extra?: Partial<INotePage>) => {
      if (!selectedSectionId) return;
      try {
        const response = await axios.post('/api/notes/pages', {...extra, title, sectionId: selectedSectionId});
        setPages(prev => [...prev, response.data.data]);
        setSelectedPageId(response.data.data._id as string);
      } catch (error) {
        console.error('Error adding vendor note:', error);
        alert('Could not create the note. Try again.');
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
  const isVendorNotebook = currentCategory?.kind === 'vendor';

  const handleAddVendor = useCallback(() => {
    const name = window.prompt('Vendor name');
    if (name?.trim()) handleAddSection(name.trim().slice(0, 60));
  }, [handleAddSection]);

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
    () => (selectedCategoryId ? recentPages.filter(rp => rp.categoryId === selectedCategoryId).slice(0, 2) : []),
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
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);

  const handleToggleCategoryCollapse = useCallback(() => setMobileNavigation(v => !v), []);
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

  const toolItems = useMemo<Array<{label: string; Icon: typeof SparklesIcon; action: () => void}>>(
    () => [
      {label: 'Executive overview', Icon: PresentationChartBarIcon, action: () => setIsExecutiveModalOpen(true)},
      {label: 'AI assistant', Icon: SparklesIcon, action: handleOpenAIChat},
      {label: 'Calendar', Icon: CalendarDaysIcon, action: () => setIsCalendarOpen(true)},
      {label: 'Google Drive', Icon: CloudIcon, action: () => setIsDriveOpen(true)},
      {label: 'Contacts', Icon: UserGroupIcon, action: handleOpenContactList},
      {label: 'Bookmarks', Icon: BookmarkIcon, action: () => setIsBookmarksOpen(true)},
      {label: 'Prompt library', Icon: ChatBubbleBottomCenterTextIcon, action: () => setIsPromptLibraryOpen(true)},
      {label: 'Important notes', Icon: ExclamationCircleIcon, action: handleOpenImportant},
      {label: 'Flagged notes', Icon: FlagIcon, action: handleOpenKeyTasks},
      {label: 'Note reminders', Icon: BellAlertIcon, action: handleOpenToDoList},
      {label: 'Record audio', Icon: MicrophoneIcon, action: () => setIsAudioRecorderOpen(true)},
      {label: 'Rewrite', Icon: PencilSquareIcon, action: handleOpenRewrite},
      {label: 'Image extraction', Icon: PhotoIcon, action: handleOpenImageExtract},
      {label: 'Assessment', Icon: ClipboardDocumentCheckIcon, action: handleOpenAssessment},
      {label: 'Style refiner', Icon: AdjustmentsHorizontalIcon, action: handleOpenRefiner},
      {label: 'Contract review', Icon: ScaleIcon, action: handleOpenRedline},
      {label: 'Humanizer', Icon: FaceSmileIcon, action: handleOpenHumanizer},
      {label: 'Truth teller', Icon: ShieldCheckIcon, action: handleOpenTruthTeller},
      ...(isAdmin ? [{label: 'Camera', Icon: VideoCameraIcon, action: () => setIsCameraOpen(true)}] : []),
    ],
    [
      handleOpenAIChat,
      handleOpenContactList,
      handleOpenImportant,
      handleOpenKeyTasks,
      handleOpenToDoList,
      handleOpenRewrite,
      handleOpenImageExtract,
      handleOpenAssessment,
      handleOpenRefiner,
      handleOpenRedline,
      handleOpenHumanizer,
      handleOpenTruthTeller,
      isAdmin,
    ],
  );

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
      if (workspaceView !== 'notes') return;
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
  }, [workspaceView, selectedSectionId, selectedCategoryId, handleAddPage, handleAddCategoryPage]);

  return (
    <OpenWorkspaceNoteContext.Provider value={openWorkspaceNote}>
    <BadgeSettingsProvider>
      <div className={styles.workspace}>
        <nav aria-label="Tools" className={styles.toolbar} data-expanded={isToolbarExpanded}>
          <button
            aria-expanded={isToolbarExpanded}
            aria-label={isToolbarExpanded ? 'Collapse tools' : 'Expand tools'}
            className={styles.toolbarToggle}
            onClick={toggleToolbar}
            title={isToolbarExpanded ? 'Collapse tools' : 'Expand tools'}>
            <WrenchScrewdriverIcon />
            <span>Tools</span>
            {isToolbarExpanded ? <ChevronDoubleLeftIcon /> : null}
          </button>
          <div className={styles.toolbarItems}>
            {toolItems.map(({label, Icon, action}) => (
              <button aria-label={label} key={label} onClick={action} title={isToolbarExpanded ? undefined : label}>
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </nav>
        {!isFocusMode && workspaceView === 'notes' && isNotebookSidebarCollapsed && (
          <aside aria-label="Notebook sidebar (minimized)" className={styles.sidebarRail}>
            <button aria-label="Expand notebook sidebar" onClick={toggleNotebookSidebar} title="Expand sidebar">
              <ChevronDoubleRightIcon />
            </button>
            <Link aria-label="Home" href="/" title="Home">
              <BookOpenIcon />
            </Link>
            <button aria-label="Notebooks" onClick={toggleNotebookSidebar} title="Notebooks">
              <DocumentTextIcon />
            </button>
            <button aria-label="Search notes" onClick={handleOpenSearch} title="Search notes (⌘ K)">
              <MagnifyingGlassIcon />
            </button>
            <button aria-label="Workspace settings" className={styles.railBottom} onClick={handleOpenSettings} title="Workspace settings">
              <Cog6ToothIcon />
            </button>
          </aside>
        )}
        {!isFocusMode && workspaceView === 'notes' && !isNotebookSidebarCollapsed && (
          <aside className={styles.sidebar}>
            <div className={styles.brandRow}>
              <Link className={styles.brand} href="/">
                <BookOpenIcon />{' '}
                <span>
                  notebook<span className={styles.brandDot}>.</span>
                </span>
              </Link>
              <button aria-label="Minimize notebook sidebar" className={styles.collapseButton} onClick={toggleNotebookSidebar} title="Minimize">
                <ChevronDoubleLeftIcon />
              </button>
            </div>
            <div className={styles.workspaceLabel}>PERSONAL WORKSPACE</div>
            <nav aria-label="Workspace" className={styles.navigation}>
              <button aria-current="page" onClick={() => changeView('notes')}>
                <DocumentTextIcon />
                Notes<span>{categories.length}</span>
              </button>
              <button
                aria-pressed={!isTaskSidebarCollapsed}
                onClick={toggleTaskSidebar}
                title={isTaskSidebarCollapsed ? 'Show task sidebar' : 'Hide task sidebar'}>
                <ClipboardDocumentListIcon />
                Tasks{activeTaskCount > 0 && <span>{activeTaskCount}</span>}
              </button>
              <button onClick={handleOpenSearch}>
                <MagnifyingGlassIcon />
                Search notes<kbd>⌘ K</kbd>
              </button>
            </nav>
            <div className={styles.notebooks}>
              <CategoryList
                badgeCounts={badgeCounts.categories}
                categories={categories}
                dbSize={dbSize}
                embedded
                isCollapsed={false}
                loading={false}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onRenameCategory={handleRenameCategory}
                onReorderCategories={handleReorderCategories}
                onSelectCategory={id => {
                  handleSelectCategory(id);
                  changeView('notes');
                }}
                onToggleCollapse={() => setMobileNavigation(v => !v)}
                selectedCategoryId={selectedCategoryId}
              />
            </div>
            <div className={styles.sidebarFooter}>
              <button onClick={handleOpenSettings}>
                <Cog6ToothIcon />
                Workspace settings
              </button>
              <button onClick={() => signOut()}>
                <span className={styles.avatar}>{userInitial}</span>
                <span>
                  {userName || 'My workspace'}
                  <small>Personal account · Sign out</small>
                </span>
              </button>
            </div>
          </aside>
        )}
        <div className={styles.body}>
          <header className={styles.header}>
            <div className={styles.breadcrumb}>
              <button
                aria-expanded={mobileNavigation}
                aria-label="Toggle notebooks and pages"
                className={styles.mobileToggle}
                onClick={() => setMobileNavigation(v => !v)}>
                <RectangleGroupIcon />
              </button>
              <button
                aria-label="Notes home"
                onClick={() => {
                  changeView('notes');
                  handleSelectCategory(null);
                }}>
                Workspace
              </button>
              <ChevronRightIcon />
              <strong>{workspaceView === 'tasks' ? 'Tasks' : currentCategory?.name || 'My notes'}</strong>
              {currentSection && workspaceView === 'notes' && (
                <>
                  <ChevronRightIcon />
                  {selectedPage ? (
                    <button onClick={() => setSelectedPageId(null)} title={isVendorNotebook ? 'Back to vendor page' : 'Back to section'}>
                      {currentSection.name}
                    </button>
                  ) : (
                    <span>{currentSection.name}</span>
                  )}
                </>
              )}
              {selectedPage && workspaceView === 'notes' && (
                <>
                  <ChevronRightIcon />
                  <span>{selectedPage.title}</span>
                </>
              )}
            </div>
            <div className={styles.headerActions}>
              {/* Phones have no room for the tools sidebar, so they keep this dropdown */}
              <details className={styles.tools}>
                <summary>
                  <SparklesIcon />
                  Tools
                  <ChevronDownIcon />
                </summary>
                <div>
                  {toolItems.map(({label, action}) => (
                    <button
                      key={label}
                      onClick={e => {
                        action();
                        e.currentTarget.closest('details')?.removeAttribute('open');
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </details>
              <button
                aria-label={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
                className={styles.iconButton}
                onClick={toggleFocusMode}>
                {isFocusMode ? <ArrowsPointingInIcon /> : <ArrowsPointingOutIcon />}
              </button>
              <button
                className={styles.primaryButton}
                onClick={() => {
                  changeView('notes');
                  if (selectedCategoryId) handleCreatePageFromPalette();
                  else handleQuickNote();
                }}>
                <DocumentPlusIcon />
                New note
              </button>
            </div>
          </header>
          <div
            aria-label="Workspace view"
            className={styles.viewTabs}
            role="tablist"
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const view =
                event.key === 'Home'
                  ? 'notes'
                  : event.key === 'End'
                  ? 'tasks'
                  : workspaceView === 'notes'
                  ? 'tasks'
                  : 'notes';
              changeView(view);
              document.getElementById(view + '-tab')?.focus();
            }}>
            <button
              tabIndex={workspaceView === 'notes' ? 0 : -1}
              aria-controls="notes-panel"
              aria-selected={workspaceView === 'notes'}
              id="notes-tab"
              onClick={() => changeView('notes')}
              role="tab">
              <DocumentTextIcon />
              Notes
            </button>
            <button
              tabIndex={workspaceView === 'tasks' ? 0 : -1}
              aria-controls="tasks-panel"
              aria-selected={workspaceView === 'tasks'}
              id="tasks-tab"
              onClick={() => changeView('tasks')}
              role="tab">
              <ClipboardDocumentListIcon />
              Tasks
            </button>
            <button
              className={styles.showTaskSidebar}
              onClick={() => {
                const isVisible = !isTaskSidebarCollapsed && workspaceView === 'notes' && !isFocusMode;
                changeView('notes');
                setIsFocusMode(false);
                if (isVisible || isTaskSidebarCollapsed) toggleTaskSidebar();
              }}>
              {!isTaskSidebarCollapsed && workspaceView === 'notes' && !isFocusMode ? 'Hide task sidebar' : 'Show task sidebar'}
            </button>
            <span>Room to think. Space to do.</span>
          </div>
          <div
            aria-labelledby="tasks-tab"
            className={styles.taskPanel}
            hidden={workspaceView !== 'tasks'}
            id="tasks-panel"
            role="tabpanel">
            {tasksVisited && (
              <OpenWorkspaceNoteContext.Provider value={openWorkspaceNote}>
                <>
                  {advancedTasks ? <div className={styles.advancedTasks}><button className={styles.backToTasks} onClick={() => setAdvancedTasks(false)}>← Back to tasks</button><LegacyTasksApp embedded isActive={workspaceView === 'tasks'} onOpenNotes={() => changeView('notes')} /></div> : <TaskWorkspace note={selectedPageId ? {id: selectedPageId, title: selectedPage?.title || 'Current note'} : null} onAdvanced={() => setAdvancedTasks(true)} />}
                </>
              </OpenWorkspaceNoteContext.Provider>
            )}
          </div>
          <div
            aria-labelledby="notes-tab"
            className={styles.notesPanel}
            data-mobile-navigation={mobileNavigation}
            hidden={workspaceView !== 'notes'}
            id="notes-panel"
            role="tabpanel">
            {!isFocusMode && (selectedCategoryId || mobileNavigation) && (
              <aside className={styles.pageSidebar} data-collapsed={isSectionCollapsed}>
                <div className={styles.mobileNotebooks}>
                  {' '}
                  <CategoryList
                    badgeCounts={badgeCounts.categories}
                    categories={categories}
                    dbSize={dbSize}
                    embedded
                    isCollapsed={false}
                    loading={false}
                    onAddCategory={handleAddCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onRenameCategory={handleRenameCategory}
                    onReorderCategories={handleReorderCategories}
                    onSelectCategory={handleSelectCategory}
                    onToggleCollapse={handleToggleCategoryCollapse}
                    selectedCategoryId={selectedCategoryId}
                  />
                </div>
                <SectionPageList
                  categoryName={currentCategory?.name}
                  categoryPages={categoryPages}
                  categoryRecentPages={categoryRecentPages}
                  isCollapsed={isSectionCollapsed}
                  loadingCategoryPages={loadingCategoryPages}
                  loadingPages={loadingPages}
                  loadingSections={loadingSections}
                  onAddCategoryPage={handleAddCategoryPage}
                  onAddPage={handleAddPage}
                  onAddSection={handleAddSection}
                  onDeletePage={handleDeletePage}
                  onDeleteSection={handleDeleteSection}
                  onJumpToRecentPage={handleJumpToRecentInSection}
                  onMovePage={setSelectedPageToMove}
                  onMovePageTo={handleMovePage}
                  onRenamePage={handleRenamePage}
                  onRenameSection={handleRenameSection}
                  onReorderCategoryPages={handleReorderCategoryPages}
                  onReorderPages={handleReorderPages}
                  onReorderSections={handleReorderSections}
                  onSelectCategoryPage={id => {
                    setSelectedSectionId(null);
                    setSelectedPageId(id);
                  }}
                  onSelectPage={id => {
                    setSelectedPageId(id);
                    setMobileNavigation(false);
                  }}
                  onSelectSection={handleSelectSection}
                  onSetParentPage={handleSetParentPage}
                  onToggleCollapse={handleToggleSectionCollapse}
                  onToggleInactive={handleTogglePageInactive}
                  pageBadgeCounts={badgeCounts.pages}
                  pages={pages}
                  sectionBadgeCounts={badgeCounts.sections}
                  sections={sections}
                  selectedCategoryId={selectedCategoryId}
                  selectedPageId={selectedPageId}
                  selectedSectionId={selectedSectionId}
                />
              </aside>
            )}
            <main className={styles.editor}>
              {/* Page open: Editor */}
              {selectedPageId ? (
                <div className="h-full overflow-hidden">
                  <NoteEditor
                    initialTabId={targetTabId}
                    key={selectedPageId}
                    onSave={handleSavePageContent}
                    page={selectedPage || null}
                  />
                </div>
              ) : /* Section selected, no page: File-explorer dashboard */
              selectedSectionId && isVendorNotebook && currentSection && currentCategory ? (
                <VendorPage
                  loadingPages={loadingPages}
                  notebook={currentCategory}
                  onAddPage={handleAddVendorNote}
                  onOpenPage={handleOpenPageFromDashboard}
                  onReorderPages={handleReorderPages}
                  onUpdateNotebook={handleUpdateCategory}
                  onUpdatePage={handleUpdatePage}
                  pages={pages}
                  section={currentSection}
                />
              ) : selectedSectionId ? (
                <SectionDashboard
                  badgeCounts={badgeCounts.pages}
                  currentCategory={currentCategory}
                  currentSection={currentSection}
                  loadingPages={loadingPages}
                  onAddPage={title => handleAddPage(title)}
                  onOpenPage={handleOpenPageFromDashboard}
                  onUpdatePage={handleUpdatePage}
                  pages={pages}
                />
              ) : /* Category selected, no section: Sections overview */
              selectedCategoryId ? (
                <div className={styles.home}>
                  <div className={styles.eyebrow}>{isVendorNotebook ? 'Vendor notebook' : 'Notebook'}</div>
                  <h1>{currentCategory?.name}</h1>
                  <p className={styles.intro}>
                    {isVendorNotebook
                      ? `${sections.length} vendor${sections.length === 1 ? '' : 's'} · ${categoryPages.length} pages`
                      : `${sections.length} sections · ${categoryPages.length} pages`}
                  </p>
                  <button
                    className={styles.notebookKindToggle}
                    onClick={() => {
                      if (!currentCategory) return;
                      const toVendor = !isVendorNotebook;
                      const message = toVendor
                        ? `Make "${currentCategory.name}" a vendor notebook? Each section becomes a vendor page with an org chart, key contacts, links, agreements, and classified notes. Your existing pages stay as they are.`
                        : `Make "${currentCategory.name}" a regular notebook? Vendor details are kept and come back if you switch again.`;
                      if (!confirm(message)) return;
                      handleUpdateCategory(currentCategory._id as string, {
                        kind: toVendor ? 'vendor' : 'standard',
                        ...(toVendor && !currentCategory.noteClasses?.length
                          ? {
                              noteClasses: [
                                {name: 'Meeting', color: '#46674d'},
                                {name: 'QBR', color: '#3f6f9f'},
                                {name: 'Issue', color: '#b4532a'},
                                {name: 'Commercial', color: '#8a6a14'},
                                {name: 'Decision', color: '#6a4fa3'},
                              ],
                            }
                          : {}),
                      }).catch(() => alert('Could not change the notebook type. Try again.'));
                    }}>
                    {isVendorNotebook ? 'Switch to a regular notebook' : 'Use as a vendor notebook'}
                  </button>
                  <div className={styles.quickActions}>
                    <button onClick={() => handleAddCategoryPage('New Page')}>
                      <span className={styles.actionIcon}>
                        <DocumentPlusIcon />
                      </span>
                      <strong>New page</strong>
                      <span>Give your next idea a place.</span>
                    </button>
                    <button onClick={isVendorNotebook ? handleAddVendor : () => handleAddSection('New Section')}>
                      <span className={styles.actionIcon}>
                        <PlusCircleIcon />
                      </span>
                      <strong>{isVendorNotebook ? 'New vendor' : 'New section'}</strong>
                      <span>
                        {isVendorNotebook
                          ? 'Org chart, contacts, links, agreements, and notes in one place.'
                          : 'Keep related pages together.'}
                      </span>
                    </button>
                  </div>
                  <div className={styles.sectionHeading}>
                    <h2>Pages</h2>
                  </div>
                  {loadingCategoryPages ? (
                    <p className={styles.intro}>Loading pages…</p>
                  ) : categoryPages.length ? (
                    <div className={styles.recentList}>
                      {categoryPages.map(page => (
                        <button key={page._id as string} onClick={() => setSelectedPageId(page._id as string)}>
                          <DocumentTextIcon />
                          <span>
                            <strong>{page.title}</strong>
                          </span>
                          <ChevronRightIcon />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.intro}>No pages yet. Create one above or explore a section below.</p>
                  )}
                  <div className={styles.sectionHeading} style={{marginTop: 30}}>
                    <h2>{isVendorNotebook ? 'Vendors' : 'Sections'}</h2>
                  </div>
                  {loadingSections ? (
                    <p className={styles.intro}>Loading sections…</p>
                  ) : (
                    <div className={styles.notebookGrid}>
                      {sections.map(section => (
                        <button key={section._id as string} onClick={() => handleSelectSection(section._id as string)}>
                          <BookOpenIcon />
                          <strong>{section.name}</strong>
                          <span>
                            {isVendorNotebook ? 'Open vendor' : 'Open section'} <ChevronRightIcon />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.home}>
                  <div className={styles.eyebrow}>{dateStr}</div>
                  <h1>
                    {greeting}
                    {userName ? ', ' + userName : ''}
                    <span>.</span>
                  </h1>
                  <p className={styles.intro}>A little clarity for everything on your mind.</p>
                  <div className={styles.quickActions}>
                    <button onClick={handleQuickNote}>
                      <span className={styles.actionIcon}>
                        <DocumentPlusIcon />
                      </span>
                      <strong>Start a fresh note</strong>
                      <span>Capture a thought, make it yours.</span>
                      <ChevronRightIcon />
                    </button>
                    <button onClick={() => changeView('tasks')}>
                      <span className={styles.actionIcon}>
                        <ClipboardDocumentListIcon />
                      </span>
                      <strong>Make room for progress</strong>
                      <span>Your tasks, right here with your notes.</span>
                      <ChevronRightIcon />
                    </button>
                  </div>
                  <div className={styles.sectionHeading}>
                    <h2>Pick up where you left off</h2>
                    <span>Recently opened</span>
                  </div>
                  {recentPages.length ? (
                    <div className={styles.recentList}>
                      {recentPages.slice(0, 5).map(rp => (
                        <button key={rp.id} onClick={() => handleJumpToRecentPage(rp)}>
                          <DocumentTextIcon />
                          <span>
                            <strong>{rp.title}</strong>
                            <small>
                              {rp.categoryName}
                              {rp.sectionName ? ' / ' + rp.sectionName : ''}
                            </small>
                          </span>
                          <time>{formatTimeAgo(rp.timestamp)}</time>
                          <ChevronRightIcon />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.empty}>
                      <BookOpenIcon />
                      <h3>Your next idea starts here</h3>
                      <p>Create your first note. Your recent pages will appear here for easy access.</p>
                      <button className={styles.primaryButton} onClick={handleQuickNote}>
                        Create a note
                      </button>
                    </div>
                  )}
                  <div className={styles.sectionHeading}>
                    <h2>Your notebooks</h2>
                    <span>{categories.length} collections</span>
                  </div>
                  <div className={styles.notebookGrid}>
                    {categories.map(cat => (
                      <button key={cat._id as string} onClick={() => handleSelectCategory(cat._id as string)}>
                        <BookOpenIcon />
                        <strong>{cat.name}</strong>
                        <span>
                          Open notebook <ChevronRightIcon />
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className={styles.homeFooter}>A home for your ideas, plans, and everything in between.</div>
                </div>
              )}
            </main>
          </div>
        </div>

        {!isFocusMode && workspaceView === 'notes' &&
          (isTaskSidebarCollapsed ? (
            <aside aria-label="Task sidebar (minimized)" className={`${styles.sidebarRail} ${styles.taskRail}`}>
              <button aria-label="Expand task sidebar" onClick={toggleTaskSidebar} title="Expand tasks">
                <ChevronDoubleLeftIcon />
              </button>
              <button aria-label={`Tasks, ${activeTaskCount} open`} onClick={toggleTaskSidebar} title="Tasks">
                <ClipboardDocumentListIcon />
                {activeTaskCount > 0 && <span className={styles.railBadge}>{activeTaskCount}</span>}
              </button>
            </aside>
          ) : (
            <aside className={styles.taskSidebar}>
              <TaskWorkspace
                compact
                note={selectedPageId ? {id: selectedPageId, title: selectedPage?.title || 'Current note'} : null}
                onCollapse={toggleTaskSidebar}
                onExpand={() => changeView('tasks')}
              />
            </aside>
          ))}

        {/* ── Modals ── */}
        <ToDoListModal
          isDirectCreateOpen={isDirectTaskCreateOpen}
          isOpen={isToDoListOpen}
          onClose={handleCloseToDoList}
          onCloseDirectCreate={() => setIsDirectTaskCreateOpen(false)}
          onNavigate={task => (task ? handleJumpToTask(task) : undefined)}
        />
        <ContactListModal isOpen={isContactListOpen} onClose={handleCloseContactList} />
        <BookmarkListModal isOpen={isBookmarksOpen} onClose={() => setIsBookmarksOpen(false)} />
        {isAdmin && isCameraOpen && <CameraModal onClose={() => setIsCameraOpen(false)} />}
        {isPromptLibraryOpen && <PromptLibraryModal onClose={() => setIsPromptLibraryOpen(false)} />}
        <StandaloneRewriteModal isOpen={isRewriteOpen} onClose={handleCloseRewrite} />
        <ImageExtractionModal isOpen={isImageExtractOpen} onClose={handleCloseImageExtract} />
        <AssessmentModal isOpen={isAssessmentOpen} onClose={handleCloseAssessment} />
        <UnifiedAIChatModal
          geminiApiKey={geminiApiKey}
          isOpen={isAIChatOpen}
          onClose={handleCloseAIChat}
          openaiApiKey={openaiApiKey}
        />
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
          title="Important Items"
        />
        <CommandPalette
          currentPageContent={selectedPage?.tabs?.[0]?.content || ''}
          currentPageTitle={selectedPage?.title || ''}
          fetchItems={fetchSearchResults}
          isOpen={isSearchOpen}
          onClose={handleCloseSearch}
          onCreatePage={selectedSectionId || selectedCategoryId ? handleCreatePageFromPalette : undefined}
          onSelectTask={handleJumpToTask}
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
            categories={categories}
            currentCategoryId={
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((selectedPageToMove.categoryId as any)?._id || selectedPageToMove.categoryId || selectedCategoryId) as
                | string
                | null
            }
            currentSectionId={
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((selectedPageToMove.sectionId as any)?._id || selectedPageToMove.sectionId || null) as string | null
            }
            isOpen={!!selectedPageToMove}
            onClose={() => setSelectedPageToMove(null)}
            onMove={handleMovePage}
            pageId={selectedPageToMove._id as string}
            pageTitle={selectedPageToMove.title}
          />
        )}
      </div>
    </BadgeSettingsProvider>
    </OpenWorkspaceNoteContext.Provider>
  );
});

NotesLayout.displayName = 'NotesLayout';
const NotesWorkspace = React.memo(function NotesWorkspace() {return <TaskProvider><NotesLayout /></TaskProvider>;});
export default NotesWorkspace;
