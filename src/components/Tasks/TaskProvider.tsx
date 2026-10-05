'use client';

import {useSession} from 'next-auth/react';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';

import {api, subscribeTasks, TaskChange} from './api';
import {Task} from './types';

type Collection = {
  tasks: Task[]; loading: boolean; error: string | null; refresh: () => Promise<void>;
  drafts: Record<string, Partial<Task>>;
  setDraft: (key: string, draft: Partial<Task> | null) => void;
  busy: string[];
  run: (key: string, action: () => Promise<unknown>) => Promise<void>;
  /** Completed tasks older than doneWindowDays are skipped until loadOlderDone() is called. */
  olderDone: {hidden: number; loaded: boolean; windowDays: number};
  loadOlderDone: () => Promise<void>;
};
const TaskContext = createContext<Collection | null>(null);

export const TaskProvider = React.memo(function TaskProvider({children}: {children: React.ReactNode}) {
  const {data: session, status} = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const revision = useRef(0);
  const changes = useRef(new Map<string, {revision: number; change: Exclude<TaskChange, {type: 'reload'}>}>());
  const [drafts, setDrafts] = useState<Record<string, Partial<Task>>>({});
  const [busy, setBusy] = useState<string[]>([]);
  // Older completed tasks stay out of every refresh until asked for once this visit
  const includeOlderDone = useRef(false);
  const [olderDone, setOlderDone] = useState({hidden: 0, loaded: false, windowDays: 30});
  const inFlight = useRef(new Set<string>());
  const setDraft = useCallback((key: string, draft: Partial<Task> | null) => setDrafts(previous => {
    const next = {...previous};
    if (draft) next[key] = draft; else delete next[key];
    return next;
  }), []);
  const run = useCallback(async (key: string, action: () => Promise<unknown>) => {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setBusy(Array.from(inFlight.current));
    try {await action();} finally {inFlight.current.delete(key); setBusy(Array.from(inFlight.current));}
  }, []);
  const email = session?.user?.email;
  const refresh = useCallback(async () => {
    if (status !== 'authenticated' || !email) return;
    const request = ++generation.current;
    const startedAt = revision.current;
    setLoading(true);
    try {
      const page = await api.listWithMeta(includeOlderDone.current);
      const result = page.tasks;
      if (request !== generation.current) return;
      setOlderDone({hidden: page.olderDoneCount, loaded: includeOlderDone.current, windowDays: page.doneWindowDays});
      // Merge writes that landed during the request, including deletions, over the snapshot.
      const merged = new Map(result.map(task => [task._id, task]));
      changes.current.forEach(entry => {
        if (entry.revision <= startedAt) return;
        if (entry.change.type === 'remove') merged.delete(entry.change.id);
        else merged.set(entry.change.task._id, entry.change.task);
      });
      setTasks(Array.from(merged.values()));
      setError(null);
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Could not load tasks.');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [email, status]);

  useEffect(() => {
    setTasks([]);
    setDrafts({});
    changes.current.clear();
    setError(null);
    void refresh();
    return () => {generation.current++;};
  }, [refresh]);
  useEffect(() => subscribeTasks(change => {
    revision.current++;
    if (change.type === 'reload') {void refresh(); return;}
    changes.current.set(change.type === 'remove' ? change.id : change.task._id, {revision: revision.current, change});
    setTasks(previous => change.type === 'remove' ? previous.filter(task => task._id !== change.id) :
      previous.some(task => task._id === change.task._id) ? previous.map(task => task._id === change.task._id ? change.task : task) : [change.task, ...previous]);
  }), [refresh]);
  useEffect(() => {
    const onFocus = () => {void refresh();};
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);
  const loadOlderDone = useCallback(async () => {
    includeOlderDone.current = true;
    await refresh();
  }, [refresh]);
  const value = useMemo(() => ({tasks, loading, error, refresh, drafts, setDraft, busy, run, olderDone, loadOlderDone}), [tasks, loading, error, refresh, drafts, setDraft, busy, run, olderDone, loadOlderDone]);
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
});

export function useTaskCollection() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('TaskProvider is required');
  return context;
}

/** Same as useTaskCollection, but returns null outside a TaskProvider instead of throwing. */
export function useOptionalTaskCollection() {
  return useContext(TaskContext);
}
