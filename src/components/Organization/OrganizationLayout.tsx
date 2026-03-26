'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  FileText,
  Users,
  CalendarDays,
  Paperclip,
  CheckSquare,
  Bot,
  Sparkles,
} from 'lucide-react';

import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PhotoIcon,
  UsersIcon,
  Cog6ToothIcon,
  SparklesIcon,
  TableCellsIcon,
  DocumentPlusIcon,
  PlusCircleIcon,
  BookmarkIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

import OrgDashboard from './OrgDashboard';
import OrgNotesView from './OrgNotesView';
import OrgContactsView from './OrgContactsView';
import OrgCalendarView from './OrgCalendarView';
import OrgFilesView from './OrgFilesView';
import OrgTasksView from './OrgTasksView';
import OrgAISidebar from './OrgAISidebar';

// Reusing modlas from Notes
import UserProfileMenu from '../UserProfileMenu';
import { BadgeSettingsProvider } from '../Notes/BadgeSettingsContext';
import { BadgeSettingsModal } from '../Notes/BadgeSettingsModal';
import CommandPalette from '../Notes/CommandPalette';
import ContactListModal from '../Notes/ContactListModal';
import BookmarkListModal from '../Notes/BookmarkListModal';
import SourcingEventModal from '../Notes/SourcingEventModal';
import SourcingListModal from '../Notes/SourcingListModal';
import ExecutiveModal from '../Notes/ExecutiveModal';
import SimpleRewriteModal from '../Notes/SimpleRewriteModal';
import SimpleRewriteOpenAIModal from '../Notes/SimpleRewriteOpenAIModal';
import StandaloneRewriteModal from '../StandaloneRewriteModal';
import ImageExtractionModal from '../Notes/ImageExtractionModal';
import AssessmentModal from '../Notes/AssessmentModal';
import UnifiedAIChatModal from '../Notes/UnifiedAIChatModal';
import { TableAppModal } from '../Notes/HighPerformanceTable/TableAppModal';
import FlaggedItemsModal from '../Notes/FlaggedItemsModal';
import ToDoListModal from '../Notes/ToDoListModal'; // Or we can use OrgTasksView instead, but for modal we need this or just use OrgTasksView.

export type ViewType = 'dashboard' | 'notes' | 'contacts' | 'calendar' | 'files' | 'tasks';

export interface Category {
  _id: string;
  name: string;
  color?: string;
  icon?: string;
  userEmail: string;
  importantCount?: number;
  flaggedCount?: number;
  todoCount?: number;
}

export interface Section {
  _id: string;
  name: string;
  color?: string;
  icon?: string;
  categoryId: string;
  order: number;
  userEmail: string;
}

export interface PageTab {
  _id: string;
  title: string;
  content: string;
  order: number;
  isImportant?: boolean;
  isFlagged?: boolean;
}

export interface Page {
  _id: string;
  title: string;
  tabs: PageTab[];
  sectionId: string | { _id: string; name: string; categoryId: string | { _id: string; name: string } };
  isFlagged?: boolean;
  isImportant?: boolean;
  userEmail: string;
  updatedAt?: string;
  createdAt?: string;
  todoCount?: number;
}

const NAV_ITEMS: { id: ViewType; label: string; Icon: React.FC<any> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'notes', label: 'Notes', Icon: FileText },
  { id: 'contacts', label: 'Contacts', Icon: Users },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'files', label: 'Files', Icon: Paperclip },
  { id: 'tasks', label: 'Tasks', Icon: CheckSquare },
];

const VIEW_TITLES: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  notes: 'Notes',
  contacts: 'Contacts',
  calendar: 'Calendar',
  files: 'Files',
  tasks: 'Tasks',
};

export default function OrganizationLayout() {
  const { data: session } = useSession();
  const [currentView, setCurrentView] = useState<ViewType>('tasks');
  const [showAIChat, setShowAIChat] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [globalSearch] = useState('');
  const [selectedPageContent, setSelectedPageContent] = useState<string>('');

  // ---------------- Modals & Top Bar State ----------------
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDirectTaskCreateOpen, setIsDirectTaskCreateOpen] = useState(false);
  const [isToDoListOpen, setIsToDoListOpen] = useState(false);
  const [isContactListOpen, setIsContactListOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const [isSourcingModalOpen, setIsSourcingModalOpen] = useState(false);
  const [isSourcingListOpen, setIsSourcingListOpen] = useState(false);
  const [isTableAppOpen, setIsTableAppOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const [isRewriteOpen, setIsRewriteOpen] = useState(false);
  const [isSimpleRewriteOpen, setIsSimpleRewriteOpen] = useState(false);
  const [isSimpleRewriteOpenAIOpen, setIsSimpleRewriteOpenAIOpen] = useState(false);
  const [isImageExtractOpen, setIsImageExtractOpen] = useState(false);
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [isKeyTasksOpen, setIsKeyTasksOpen] = useState(false);
  const [isImportantOpen, setIsImportantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [sourcingEventCount, setSourcingEventCount] = useState(0);
  const [dbSize, setDbSize] = useState<string | null>(null);

  const [badgeCounts, setBadgeCounts] = useState<{
    pages: Record<string, { todo: { count: number; minDays: number | null }; important: number; flagged: number }>;
    sections: Record<string, { todo: { count: number; minDays: number | null }; important: number; flagged: number }>;
    categories: Record<string, { todo: { count: number; minDays: number | null }; important: number; flagged: number }>;
  }>({ pages: {}, sections: {}, categories: {} });

  const fetchActiveTaskCount = useCallback(async () => {
    try {
      const response = await axios.get('/api/todos');
      if (response.data.success && Array.isArray(response.data.data)) {
        const incomplete = response.data.data.filter((todo: any) => !todo.isCompleted);
        setActiveTaskCount(incomplete.length);
      }
    } catch (error) {
      console.error('Error fetching active task count:', error);
    }
  }, []);

  const fetchSourcingCount = useCallback(async () => {
    try {
      const response = await axios.get('/api/sourcing/events?count=true');
      if (response.data && typeof response.data.count === 'number') {
        setSourcingEventCount(response.data.count);
      } else if (Array.isArray(response.data)) {
        setSourcingEventCount(response.data.length);
      }
    } catch (error) {
      console.error('Error fetching sourcing count:', error);
    }
  }, []);

  useEffect(() => {
    fetchActiveTaskCount();
    fetchSourcingCount();
    const interval = setInterval(() => {
      fetchActiveTaskCount();
      fetchSourcingCount();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchActiveTaskCount, fetchSourcingCount]);

  useEffect(() => {
    const fetchDbStats = async () => {
      try {
        const response = await axios.get('/api/database-stats');
        if (response.data.success) {
          const formatBytes = (bytes: number, decimals = 2) => {
            if (!+bytes) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
          };
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
    const interval = setInterval(fetchBadgeStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Quick note
  const handleQuickNote = useCallback(async () => {
    try {
      let category = categories.find(c => c.name === 'Other Notes');
      if (!category) {
        const catRes = await axios.post('/api/notes/categories', { name: 'Other Notes' });
        category = catRes.data.data;
        setCategories(prev => [...prev, category as Category]);
      }
      const secRes = await axios.get(`/api/notes/sections?categoryId=${category!._id}`);
      let section = secRes.data.data.find((s: Section) => s.name === 'Other');
      if (!section) {
        const createSecRes = await axios.post('/api/notes/sections', { name: 'Other', categoryId: category!._id });
        section = createSecRes.data.data;
        setSections(prev => [...prev, section]);
      }
      const pageRes = await axios.post('/api/notes/pages', { title: 'New Note', sectionId: section._id });
      const newPage = pageRes.data.data;

      // Navigate to notes view and open the page
      setCurrentView('notes');
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
  }, [categories, setCategories, setSections]);

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

  const fetchFlaggedTasks = useCallback(async () => {
    const response = await axios.get('/api/notes/pages?isFlagged=true');
    return response.data.data;
  }, []);

  const fetchImportantTasks = useCallback(async () => {
    const response = await axios.get('/api/notes/pages?isImportant=true');
    return response.data.data;
  }, []);

  const handleJumpToTask = useCallback(async (task: any, _tabId?: string) => {
    setIsKeyTasksOpen(false);
    setIsImportantOpen(false);
    setIsSearchOpen(false);
    setIsToDoListOpen(false);

    setCurrentView('notes');

    if (task.type === 'section') {
      const targetCategoryId = task.sectionId.categoryId;
      setSelectedCategoryId(targetCategoryId);

      if ((task.title as string).startsWith('[Section]')) {
        const targetSectionId = task._id;
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
      const sectionObj = task.sectionId;
      if (!sectionObj || !sectionObj.categoryId) {
        alert('Cannot locate note: Missing section info.');
        return;
      }
      const targetCategoryId = sectionObj.categoryId as string;
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const totalImportant = Object.values(badgeCounts.pages).reduce((acc, curr) => acc + (curr.important || 0), 0);
  const totalFlagged = Object.values(badgeCounts.pages).reduce((acc, curr) => acc + (curr.flagged || 0), 0);

  const selectedPage = pages.find(p => p._id === selectedPageId) || null;


  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get('/api/notes/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/notes/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, [fetchCategories, fetchStats]);

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
  };

  const accessToken = (session as any)?.accessToken;

  const geminiApiKey = session?.user && (session.user as any).googleApiEnabled ? 'GEMINI_SCOPED' : null;
  const openaiApiKey = session?.user && (session.user as any).openAiApiEnabled ? 'MANAGED' : null;

  return (
    <BadgeSettingsProvider>
      <div className="flex h-full bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-white border-r border-slate-200 flex flex-col z-30">
        {/* Logo area — leave space for the floating A button (36px + 12px top + 12px margin) */}
        <div className="flex items-center gap-2 px-4 pt-14 pb-4 border-b border-slate-100">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-900 font-semibold text-base">Organize</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = currentView === id;
            return (
              <button
                key={id}
                onClick={() => handleNavigate(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Bottom: AI Chat toggle */}
        <div className="px-3 py-3 border-t border-slate-100">
          <button
            onClick={() => setShowAIChat(v => !v)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              showAIChat
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            AI Assistant
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="ml-[220px] flex flex-col h-full w-full min-w-0">
          {/* Top navigation/toolbar matching Notes layout functionality */}
          <header className="sticky top-0 z-20 bg-white/60 backdrop-blur-2xl border-b border-slate-200 h-auto min-h-[56px] flex flex-wrap items-center px-4 py-2 gap-3 md:gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            {/* Left: view title */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <span className="text-slate-900 font-semibold text-sm">{VIEW_TITLES[currentView]}</span>
          </div>

            {/* Right Side Tools */}
            <div className="ml-auto flex flex-wrap items-center gap-2 pb-1 md:pb-0 scrollbar-hide" style={{ overflowX: 'auto', overflowY: 'visible' }}>
              {dbSize && (
                <span className="text-[10px] text-slate-400 font-mono tracking-tight mr-1 bg-white/50 px-1.5 py-0.5 rounded-md ring-1 ring-slate-200/50">
                  {dbSize}
                </span>
              )}

              {/* Core Tools */}
              <div className="flex items-center gap-1 rounded-xl bg-white/50 p-1 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-md">
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-fuchsia-600 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 transition-all duration-300 ease-out"
                  onClick={() => setIsExecutiveModalOpen(true)}
                  title="Executive Assistant">
                  <BriefcaseIcon className="h-3.5 w-3.5 group-hover:text-fuchsia-500 transition-colors duration-200" />
                  <span className="hidden lg:inline">Executive</span>
                </button>
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 transition-all duration-300 ease-out"
                  onClick={handleQuickNote}
                  title="Quick Note">
                  <DocumentPlusIcon className="h-3.5 w-3.5 group-hover:text-emerald-500 transition-colors duration-200" />
                  <span className="hidden lg:inline">Quick</span>
                </button>
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-sky-600 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 transition-all duration-300 ease-out"
                  onClick={() => setIsSearchOpen(true)}
                  title="Command Palette (Ctrl+K)">
                  <MagnifyingGlassIcon className="h-3.5 w-3.5 group-hover:text-sky-500 transition-colors duration-200" />
                  <span className="hidden lg:inline">Search</span>
                  <kbd className="hidden lg:inline ml-0.5 text-[9px] text-slate-400 font-mono bg-slate-100/80 px-1 py-0.5 rounded group-hover:bg-sky-50 group-hover:text-sky-500 transition-colors">
                    ⌘K
                  </kbd>
                </button>
                <button
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 transition-all duration-300 ease-out relative"
                  onClick={() => {
                     if (currentView !== 'tasks') {
                       setCurrentView('tasks');
                     }
                  }}>
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
                  onClick={() => setIsContactListOpen(true)}
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

              {/* Admin Tools */}
              {session?.user?.email === 'lankanprinze@gmail.com' && (
                <>
                  <div className="flex items-center gap-1 rounded-xl bg-violet-50/40 p-1 shadow-sm ring-1 ring-violet-200/50 backdrop-blur-md">
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm ring-1 ring-transparent hover:ring-indigo-200 transition-all duration-300 ease-out"
                      title="Advanced Rewrite"
                      onClick={() => setIsRewriteOpen(true)}>
                      <PencilSquareIcon className="h-3.5 w-3.5 group-hover:text-indigo-500 transition-colors duration-200" />
                      <span className="hidden xl:inline">Advanced</span>
                    </button>
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-purple-600 hover:shadow-sm ring-1 ring-transparent hover:ring-purple-200 transition-all duration-300 ease-out"
                      title="Simple Rewrite"
                      onClick={() => setIsSimpleRewriteOpen(true)}>
                      <PencilSquareIcon className="h-3.5 w-3.5 group-hover:text-purple-500 transition-colors duration-200" />
                      <span className="hidden xl:inline">Simple</span>
                    </button>
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-teal-600 hover:shadow-sm ring-1 ring-transparent hover:ring-teal-200 transition-all duration-300 ease-out"
                      title="GPT Rewrite"
                      onClick={() => setIsSimpleRewriteOpenAIOpen(true)}>
                      <SparklesIcon className="h-3.5 w-3.5 group-hover:text-teal-500 transition-colors duration-200" />
                      <span className="hidden xl:inline">GPT</span>
                    </button>
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-orange-600 hover:shadow-sm ring-1 ring-transparent hover:ring-orange-200 transition-all duration-300 ease-out"
                      onClick={() => setIsImageExtractOpen(true)}
                      title="Extract from Image">
                      <PhotoIcon className="h-3.5 w-3.5 group-hover:text-orange-500 transition-colors duration-200" />
                      <span className="hidden 2xl:inline">Image</span>
                    </button>
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-cyan-600 hover:shadow-sm ring-1 ring-transparent hover:ring-cyan-200 transition-all duration-300 ease-out"
                      onClick={() => setIsAssessmentOpen(true)}
                      title="Document Assessment">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 group-hover:text-cyan-500 transition-colors duration-200">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="hidden 2xl:inline">Assess</span>
                    </button>
                  </div>

                  {/* Sourcing & Apps */}
                  <div className="flex items-center gap-1 rounded-xl bg-blue-50/40 p-1 shadow-sm ring-1 ring-blue-200/50 backdrop-blur-md">
                    <button
                      className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm ring-1 ring-transparent hover:ring-blue-200 transition-all duration-300 ease-out relative"
                      onClick={() => setIsSourcingListOpen(true)}
                      title="View All Sourcing Events">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors duration-200">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
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
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 group-hover:text-emerald-500 transition-colors duration-200">
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

                  {/* Unified AI Chat */}
                  <button
                    className="group flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-[12px] font-medium text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-0.5 ml-1"
                    onClick={() => setIsAIChatOpen(true)}
                    title="Chat Assistant">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-violet-300" />
                    <span className="hidden lg:inline">Chat</span>
                  </button>
                </>
              )}

              {/* Flags & Settings */}
              <div className="flex items-center gap-1 rounded-xl bg-white/50 p-1 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-md ml-auto md:ml-2">
                <button
                  className="group rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-amber-500 hover:shadow-sm transition-all duration-300 ease-out relative ring-1 ring-transparent hover:ring-amber-200"
                  onClick={() => setIsImportantOpen(true)}
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
                  onClick={() => setIsKeyTasksOpen(true)}
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
                  onClick={() => setIsSettingsOpen(true)}
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
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {currentView === 'dashboard' && (
            <OrgDashboard
              categories={categories}
              stats={stats}
              onNavigate={handleNavigate}
            />
          )}
          {currentView === 'notes' && (
            <OrgNotesView
              categories={categories}
              setCategories={setCategories}
              selectedCategoryId={selectedCategoryId}
              setSelectedCategoryId={setSelectedCategoryId}
              selectedSectionId={selectedSectionId}
              setSelectedSectionId={setSelectedSectionId}
              selectedPageId={selectedPageId}
              setSelectedPageId={setSelectedPageId}
              sections={sections}
              setSections={setSections}
              pages={pages}
              setPages={setPages}
              globalSearch={globalSearch}
              onPageContentChange={setSelectedPageContent}
            />
          )}
          {currentView === 'contacts' && (
            <OrgContactsView globalSearch={globalSearch} />
          )}
          {currentView === 'calendar' && (
            <OrgCalendarView accessToken={accessToken} />
          )}
          {currentView === 'files' && (
            <OrgFilesView
              categories={categories}
              sections={sections}
              pages={pages}
              currentPageId={selectedPageId}
            />
          )}
          {currentView === 'tasks' && <OrgTasksView />}
        </main>
      </div>

      {/* Modals from Notes layout */}
      <ToDoListModal
        isOpen={isToDoListOpen}
        onClose={() => setIsToDoListOpen(false)}
        onNavigate={task => (task ? handleJumpToTask(task) : undefined)}
        isDirectCreateOpen={isDirectTaskCreateOpen}
        onCloseDirectCreate={() => setIsDirectTaskCreateOpen(false)}
      />
      <ContactListModal isOpen={isContactListOpen} onClose={() => setIsContactListOpen(false)} />
      <BookmarkListModal isOpen={isBookmarksOpen} onClose={() => setIsBookmarksOpen(false)} />

      <SimpleRewriteModal isOpen={isSimpleRewriteOpen} onClose={() => setIsSimpleRewriteOpen(false)} />
      <SimpleRewriteOpenAIModal isOpen={isSimpleRewriteOpenAIOpen} onClose={() => setIsSimpleRewriteOpenAIOpen(false)} />
      <StandaloneRewriteModal isOpen={isRewriteOpen} onClose={() => setIsRewriteOpen(false)} />
      <ImageExtractionModal isOpen={isImageExtractOpen} onClose={() => setIsImageExtractOpen(false)} />
      <AssessmentModal isOpen={isAssessmentOpen} onClose={() => setIsAssessmentOpen(false)} />

      <UnifiedAIChatModal
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        geminiApiKey={geminiApiKey}
        openaiApiKey={openaiApiKey}
      />

      <FlaggedItemsModal
        isOpen={isKeyTasksOpen}
        onClose={() => setIsKeyTasksOpen(false)}
        title="Key Tasks"
        fetchItems={fetchFlaggedTasks}
        onSelectTask={handleJumpToTask}
        icon="flag"
      />
      <FlaggedItemsModal
        isOpen={isImportantOpen}
        onClose={() => setIsImportantOpen(false)}
        title="Important Items"
        fetchItems={fetchImportantTasks}
        onSelectTask={handleJumpToTask}
        icon="important"
      />

      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        fetchItems={fetchSearchResults}
        onSelectTask={handleJumpToTask}
        currentPageContent={selectedPageContent || ''}
        currentPageTitle={selectedPage?.title || ''}
      />

      <ExecutiveModal
        isOpen={isExecutiveModalOpen}
        onClose={() => setIsExecutiveModalOpen(false)}
      />
      <SourcingEventModal
        isOpen={isSourcingModalOpen}
        onClose={() => setIsSourcingModalOpen(false)}
        sourcePageId={selectedPageId || undefined}
        defaultEventName={selectedPage?.title || ''}
        defaultDescription=""
      />
      <SourcingListModal isOpen={isSourcingListOpen} onClose={() => setIsSourcingListOpen(false)} />

      <TableAppModal isOpen={isTableAppOpen} onClose={() => setIsTableAppOpen(false)} />
      <BadgeSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />


      {/* AI Chat Sidebar */}
      <OrgAISidebar
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        selectedPageContent={selectedPageContent}
      />
    </div>
    </BadgeSettingsProvider>
  );
}
