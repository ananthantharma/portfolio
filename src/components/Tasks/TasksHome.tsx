/* eslint-disable react-memo/require-usememo */
'use client';

import React, {useState} from 'react';

import {TaskProvider} from './TaskProvider';
import TasksApp from './TasksApp';
import TaskWorkspace from './TaskWorkspace';

const TasksHome = React.memo(function TasksHome() {
  const [advanced, setAdvanced] = useState(false);
  return <TaskProvider><div className="flex h-screen flex-col overflow-hidden bg-[#fffefa]">
    <header className="flex items-center justify-between border-b border-[#e3e8dc] px-6 py-4 text-sm text-[#55734c]"><a href="/">← Home</a><span>Personal workspace</span>{advanced && <button onClick={() => setAdvanced(false)}>Back to tasks</button>}</header>
    <div className="min-h-0 flex-1">{advanced ? <TasksApp embedded/> : <TaskWorkspace onAdvanced={() => setAdvanced(true)}/>}</div>
  </div></TaskProvider>;
});
export default TasksHome;
