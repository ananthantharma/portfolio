/* eslint-disable */
'use client';

import React, { useState, useCallback } from 'react';
import {
  HomeIcon,
  Squares2X2Icon,
  CalendarDaysIcon,
  TrophyIcon,
  BoltIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import OrgTaskFormModal from './modals/OrgTaskFormModal';

const TodayView = dynamic(() => import('./views/TodayView'), { ssr: false });
const BoardView = dynamic(() => import('./views/BoardView'), { ssr: false });
const CalendarView = dynamic(() => import('./views/CalendarView'), { ssr: false });
const GoalsView = dynamic(() => import('./views/GoalsView'), { ssr: false });
const HabitsView = dynamic(() => import('./views/HabitsView'), { ssr: false });

type ActiveView = 'today' | 'board' | 'calendar' | 'goals' | 'habits';

const navItems: { id: ActiveView; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', Icon: HomeIcon },
  { id: 'board', label: 'Board', Icon: Squares2X2Icon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDaysIcon },
  { id: 'goals', label: 'Goals', Icon: TrophyIcon },
  { id: 'habits', label: 'Habits', Icon: BoltIcon },
];

export default function OrganizationLayout() {
  const [activeView, setActiveView] = useState<ActiveView>('today');
  const [showNewTask, setShowNewTask] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTaskSaved = useCallback(() => {
    setShowNewTask(false);
    setRefreshKey(k => k + 1);
  }, []);

  const viewTitles: Record<ActiveView, string> = {
    today: "Today's Overview",
    board: 'Task Board',
    calendar: 'Calendar',
    goals: 'Goals',
    habits: 'Habits',
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#080d1a' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col items-center py-4 gap-2 shrink-0 border-r border-white/5"
        style={{ width: 70, background: '#0c1220' }}
      >
        {/* Logo */}
        <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center mb-3">
          <span className="text-indigo-400 font-bold text-sm">O</span>
        </div>

        {/* Nav items */}
        {navItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            title={label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 group relative ${
              activeView === id
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <Icon className="w-5 h-5" />
            {/* Tooltip */}
            <span className="absolute left-full ml-2 px-2 py-1 bg-[#1a2235] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-white/10 transition-opacity">
              {label}
            </span>
          </button>
        ))}

        <div className="flex-1" />

        {/* Quick add */}
        <button
          onClick={() => setShowNewTask(true)}
          title="New Task"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-indigo-600/10 transition-all"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0" style={{ background: '#080d1a' }}>
          <h1 className="text-white font-semibold text-lg">{viewTitles[activeView]}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              New Task
            </button>
          </div>
        </header>

        {/* View content */}
        <main className="flex-1 overflow-auto">
          {activeView === 'today' && <TodayView key={`today-${refreshKey}`} onNewTask={() => setShowNewTask(true)} />}
          {activeView === 'board' && <BoardView key={`board-${refreshKey}`} />}
          {activeView === 'calendar' && <CalendarView key={`calendar-${refreshKey}`} />}
          {activeView === 'goals' && <GoalsView key={`goals-${refreshKey}`} />}
          {activeView === 'habits' && <HabitsView key={`habits-${refreshKey}`} />}
        </main>
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <OrgTaskFormModal
          onClose={() => setShowNewTask(false)}
          onSaved={handleTaskSaved}
        />
      )}
    </div>
  );
}
