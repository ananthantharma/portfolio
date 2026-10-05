/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import React, {useEffect, useState} from 'react';

import {TaskProvider} from './TaskProvider';
import TasksApp from './TasksApp';
import TaskWorkspace from './TaskWorkspace';

const PHONE = '(max-width: 767px)';

/** Phone-sized screens get the touch layout; null until we know (avoids a desktop flash on phones). */
function usePhone() {
  const [phone, setPhone] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia(PHONE);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return phone;
}

const TasksHome = React.memo(function TasksHome() {
  const [advanced, setAdvanced] = useState(false);
  const phone = usePhone();

  if (phone === null) return <div className="h-[100dvh] bg-[#f7f8f2]" />;

  if (phone) {
    return (
      <TaskProvider>
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f7f8f2]">
          <div className="min-h-0 flex-1">
            <TaskWorkspace compact mobile />
          </div>
        </div>
      </TaskProvider>
    );
  }

  return <TaskProvider><div className="flex h-screen flex-col overflow-hidden bg-[#fffefa]">
    <header className="flex items-center justify-between border-b border-[#e3e8dc] px-6 py-4 text-sm text-[#55734c]"><a href="/">← Home</a><span>Personal workspace</span>{advanced && <button onClick={() => setAdvanced(false)}>Back to tasks</button>}</header>
    <div className="min-h-0 flex-1">{advanced ? <TasksApp embedded/> : <TaskWorkspace onAdvanced={() => setAdvanced(true)}/>}</div>
  </div></TaskProvider>;
});
export default TasksHome;
