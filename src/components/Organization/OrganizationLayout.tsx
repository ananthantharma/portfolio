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

import OrgDashboard from './OrgDashboard';
import OrgNotesView from './OrgNotesView';
import OrgContactsView from './OrgContactsView';
import OrgCalendarView from './OrgCalendarView';
import OrgFilesView from './OrgFilesView';
import OrgTasksView from './OrgTasksView';
import OrgAISidebar from './OrgAISidebar';

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
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [showAIChat, setShowAIChat] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedPageContent, setSelectedPageContent] = useState<string>('');

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

  const showSearch = ['notes', 'contacts', 'files'].includes(currentView);

  const accessToken = (session as any)?.accessToken;

  return (
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
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-4">
          {/* Left: breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-900 font-semibold text-sm">{VIEW_TITLES[currentView]}</span>
          </div>

          {/* Center: search */}
          {showSearch && (
            <div className="flex-1 max-w-sm mx-auto">
              <input
                type="text"
                placeholder={`Search ${VIEW_TITLES[currentView].toLowerCase()}...`}
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
              />
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* AI toggle for top bar */}
            <button
              onClick={() => setShowAIChat(v => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                showAIChat
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bot className="w-4 h-4" />
              AI
            </button>
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

      {/* AI Chat Sidebar */}
      <OrgAISidebar
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        selectedPageContent={selectedPageContent}
      />
    </div>
  );
}
