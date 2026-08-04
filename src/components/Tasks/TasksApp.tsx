/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  Archive as ArchiveIcon,
  Bell,
  BellOff,
  Bookmark as BookmarkIcon,
  CalendarClock,
  CheckCheck,
  CheckSquare,
  Columns3,
  Download,
  Eye,
  EyeOff,
  Flame,
  Grid2x2,
  ListTodo as InsightsIcon,
  Loader2,
  Mail,
  Maximize2,
  Moon,
  MoreHorizontal,
  Plus,
  Rows3,
  Search,
  Sparkles,
  Square,
  Sun,
  Target,
  Timer,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useSession} from 'next-auth/react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import InAppBrowser from '@/components/Anomaly/InAppBrowser';
import ContactListModal from '@/components/Notes/ContactListModal';

import {api} from './api';
import ArchiveView from './ArchiveView';
import BoardView from './BoardView';
import BookmarksModal from './BookmarksModal';
import CalendarView from './CalendarView';
import CommandPalette from './CommandPalette';
import ConfettiBurst from './ConfettiBurst';
import ContextMenu, {ContextMenuItem} from './ContextMenu';
import DetailDrawer from './DetailDrawer';
import EmailDropModal from './EmailDropModal';
import {ExtractedTask} from './emailParse';
import InsightsView from './InsightsView';
import ListView from './ListView';
import MatrixView, {Quadrant} from './MatrixView';
import SavedViewsBar from './SavedViewsBar';
import TaskWindow from './TaskWindow';
import TemplatesModal from './TemplatesModal';
import {
  compareBy,
  daysUntil,
  formatMinutes,
  ImportedTask,
  isPinned,
  NEON_COLORS,
  nextOccurrence,
  parseTasksCsv,
  PRIORITY_META,
  SavedView,
  SORT_MODES,
  SortMode,
  startOfDay,
  Status,
  Task,
  tasksToCsv,
  ViewMode,
} from './types';
import UndoToast from './UndoToast';

const VIEWS: {key: ViewMode; label: string; icon: React.ReactNode}[] = [
  {key: 'list', label: 'List', icon: <Rows3 className="h-3.5 w-3.5" />},
  {key: 'board', label: 'Board', icon: <Columns3 className="h-3.5 w-3.5" />},
  {key: 'matrix', label: 'Matrix', icon: <Grid2x2 className="h-3.5 w-3.5" />},
  {key: 'calendar', label: 'Calendar', icon: <CalendarClock className="h-3.5 w-3.5" />},
  {key: 'insights', label: 'Insights', icon: <InsightsIcon className="h-3.5 w-3.5" />},
];

type QuickFilter = 'myday' | 'week' | 'nodue' | 'overdue' | null;

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface PendingUndo {
  message: string;
  onUndo: () => void;
  onCommit: () => void;
}

export default function TasksApp() {
  const {status: authStatus} = useSession();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('board');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<Status>('todo');
  const [sortMode, setSortMode] = useState<SortMode>('smart');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── New-feature state ───────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{task: Task; x: number; y: number} | null>(null);
  const [undoState, setUndoState] = useState<PendingUndo | null>(null);
  const [confetti, setConfetti] = useState<{x: number; y: number} | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [emailDropOpen, setEmailDropOpen] = useState(false);
  const [emailDropFile, setEmailDropFile] = useState<File | null>(null);
  const [emailPrefill, setEmailPrefill] = useState<ExtractedTask | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [browserTarget, setBrowserTarget] = useState<{url: string; title: string} | null>(null);
  const dayCelebratedRef = useRef(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  const flash = useCallback((msg: string) => {
    setFlashMessage(msg);
    setTimeout(() => setFlashMessage(prev => (prev === msg ? null : prev)), 2500);
  }, []);

  // Auth guard
  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/login');
  }, [authStatus, router]);

  // ── Preference persistence ───────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('TASKS_VIEW') as ViewMode | null;
    if (saved && ['list', 'board', 'matrix', 'calendar', 'insights'].includes(saved)) setView(saved);
    setIsDark(localStorage.getItem('TASKS_DARK') === 'true');
    const savedSort = localStorage.getItem('TASKS_SORT') as SortMode | null;
    if (savedSort) setSortMode(savedSort);
    try {
      const views = localStorage.getItem('TASKS_SAVED_VIEWS');
      if (views) setSavedViews(JSON.parse(views));
    } catch {
      /* ignore */
    }
    setNotifyEnabled(typeof Notification !== 'undefined' && Notification.permission === 'granted');
  }, []);
  useEffect(() => {
    localStorage.setItem('TASKS_VIEW', view);
  }, [view]);
  useEffect(() => {
    localStorage.setItem('TASKS_DARK', String(isDark));
  }, [isDark]);
  useEffect(() => {
    localStorage.setItem('TASKS_SORT', sortMode);
  }, [sortMode]);

  useEffect(() => {
    if (!toolsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [toolsOpen]);

  // Load tasks
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    api
      .list()
      .then(setTasks)
      .catch(err => console.error('Failed to load tasks', err))
      .finally(() => setLoading(false));
  }, [authStatus]);

  // Keyboard shortcuts: "n" new task · "b" bulk mode · Ctrl+K palette · 1-5 switch views
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEmailPrefill(null);
        setNewTaskStatus('todo');
        setNewTaskOpen(true);
      } else if (e.key.toLowerCase() === 'b') {
        setBulkMode(v => !v);
      } else if (e.key === '1') setView('list');
      else if (e.key === '2') setView('board');
      else if (e.key === '3') setView('matrix');
      else if (e.key === '4') setView('calendar');
      else if (e.key === '5') setView('insights');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Live (non-archived, non-template) tasks — everything else derives from this
  const liveTasks = useMemo(() => tasks.filter(t => !t.isArchived && !t.isTemplate), [tasks]);
  const templates = useMemo(() => tasks.filter(t => t.isTemplate), [tasks]);
  const archived = useMemo(() => tasks.filter(t => t.isArchived), [tasks]);

  // ── Mutations (optimistic) ──────────────────────────────────────────────────
  const patchTask = useCallback((id: string, patch: Record<string, unknown>) => {
    setTasks(prev => prev.map(t => (t._id === id ? ({...t, ...patch} as Task) : t)));
    api.update(id, patch).then(
      updated => setTasks(prev => prev.map(t => (t._id === id ? {...t, ...updated} : t))),
      err => {
        console.error('Update failed', err);
        api.list().then(setTasks).catch(() => undefined); // resync on failure
      },
    );
  }, []);

  const triggerConfetti = useCallback(() => {
    setConfetti({x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400, y: 180});
  }, []);

  const toggleComplete = useCallback(
    (task: Task) => {
      const completing = !task.isCompleted;
      patchTask(task._id, {isCompleted: completing, status: completing ? 'done' : 'todo'});
      if (completing) {
        triggerConfetti();
        const next = nextOccurrence(task);
        if (next) {
          api
            .create({
              title: task.title,
              priority: task.priority,
              dueDate: next,
              category: task.category,
              notes: task.notes,
              tags: task.tags,
              estimatedTime: task.estimatedTime,
              recurrence: task.recurrence,
              subtasks: (task.subtasks || []).map(s => ({title: s.title, isCompleted: false})),
              status: 'todo',
            })
            .then(created => setTasks(prev => [created, ...prev]))
            .catch(err => console.error('Failed to create recurring task', err));
        }
      }
    },
    [patchTask, triggerConfetti],
  );

  const setStatus = useCallback(
    (task: Task, status: Status) => {
      patchTask(task._id, {status, isCompleted: status === 'done'});
    },
    [patchTask],
  );

  const deleteTask = useCallback((task: Task) => {
    setTasks(prev => prev.filter(t => t._id !== task._id));
    setSelectedId(prev => (prev === task._id ? null : prev));
    setUndoState({
      message: `Deleted "${task.title}"`,
      onUndo: () => setTasks(prev => [task, ...prev]),
      onCommit: () => {
        api.remove(task._id).catch(err => console.error('Delete failed', err));
      },
    });
  }, []);

  const archiveTask = useCallback((task: Task) => {
    setTasks(prev => prev.map(t => (t._id === task._id ? {...t, isArchived: true} : t)));
    setSelectedId(prev => (prev === task._id ? null : prev));
    api.update(task._id, {isArchived: true}).catch(err => console.error('Archive failed', err));
    setUndoState({
      message: `Archived "${task.title}"`,
      onUndo: () => {
        setTasks(prev => prev.map(t => (t._id === task._id ? {...t, isArchived: false} : t)));
        api.update(task._id, {isArchived: false}).catch(() => undefined);
      },
      onCommit: () => undefined,
    });
  }, []);

  const restoreTask = useCallback((task: Task) => {
    setTasks(prev => prev.map(t => (t._id === task._id ? {...t, isArchived: false} : t)));
    api.update(task._id, {isArchived: false}).catch(() => undefined);
  }, []);

  const purgeTask = useCallback(async (task: Task) => {
    if (!window.confirm(`Permanently delete "${task.title}"? This cannot be undone.`)) return;
    setTasks(prev => prev.filter(t => t._id !== task._id));
    await api.remove(task._id).catch(() => undefined);
  }, []);

  const duplicateTask = useCallback(async (task: Task) => {
    try {
      const copy = await api.create({
        title: `${task.title} (copy)`,
        priority: task.priority,
        dueDate: task.dueDate,
        category: task.category,
        notes: task.notes,
        tags: task.tags,
        subtasks: (task.subtasks || []).map(s => ({title: s.title, isCompleted: false})),
        estimatedTime: task.estimatedTime,
        status: 'todo',
      });
      setTasks(prev => [copy, ...prev]);
      setSelectedId(copy._id);
    } catch (err) {
      alert(`Could not duplicate: ${err instanceof Error ? err.message : err}`);
    }
  }, []);

  const saveAsTemplate = useCallback(
    async (task: Task) => {
      try {
        const created = await api.create({
          title: task.title,
          priority: task.priority,
          category: task.category,
          notes: task.notes,
          tags: task.tags,
          subtasks: (task.subtasks || []).map(s => ({title: s.title, isCompleted: false})),
          estimatedTime: task.estimatedTime,
          isTemplate: true,
          status: 'todo',
        });
        setTasks(prev => [created, ...prev]);
        flash(`Saved "${task.title}" as a template`);
      } catch (err) {
        alert(`Could not save template: ${err instanceof Error ? err.message : err}`);
      }
    },
    [flash],
  );

  const useTemplate = useCallback(async (template: Task) => {
    try {
      const created = await api.create({
        title: template.title,
        priority: template.priority,
        category: template.category,
        notes: template.notes,
        tags: template.tags,
        subtasks: (template.subtasks || []).map(s => ({title: s.title, isCompleted: false})),
        estimatedTime: template.estimatedTime,
        status: 'todo',
      });
      setTasks(prev => [created, ...prev]);
      setTemplatesOpen(false);
      setSelectedId(created._id);
    } catch (err) {
      alert(`Could not create task: ${err instanceof Error ? err.message : err}`);
    }
  }, []);

  const deleteTemplate = useCallback(async (template: Task) => {
    setTasks(prev => prev.filter(t => t._id !== template._id));
    await api.remove(template._id).catch(() => undefined);
  }, []);

  /** Inline "+ Add" composer inside a board column. */
  const quickCreateInColumn = useCallback(async (title: string, status: Status) => {
    const created = await api.create({title, status, isCompleted: status === 'done', priority: 'None'});
    setTasks(prev => [created, ...prev]);
  }, []);

  /** Bump an overdue/active task to tomorrow 5pm. */
  const snoozeTask = useCallback(
    (task: Task) => {
      const d = startOfDay(new Date());
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
      patchTask(task._id, {dueDate: d.toISOString()});
    },
    [patchTask],
  );

  const clearCompleted = useCallback(async () => {
    const doomed = liveTasks.filter(t => t.isCompleted);
    if (doomed.length === 0) return;
    if (!window.confirm(`Delete all ${doomed.length} completed task${doomed.length === 1 ? '' : 's'}? This cannot be undone.`))
      return;
    setTasks(prev => prev.filter(t => !doomed.some(d => d._id === t._id)));
    setSelectedId(prev => (prev && doomed.some(t => t._id === prev) ? null : prev));
    await Promise.allSettled(doomed.map(t => api.remove(t._id)));
  }, [liveTasks]);

  const toggleMinimize = useCallback(
    (task: Task) => patchTask(task._id, {isMinimized: !task.isMinimized}),
    [patchTask],
  );

  const openNewTask = useCallback((s: Status, prefillData: ExtractedTask | null = null) => {
    setNewTaskStatus(s);
    setEmailPrefill(prefillData);
    setNewTaskOpen(true);
  }, []);

  /** Matrix drag-and-drop: dropping into a quadrant sets the priority/due-date pair that defines it. */
  const moveToQuadrant = useCallback(
    (task: Task, quadrant: Quadrant) => {
      const urgentDue = () => {
        const d = startOfDay(new Date());
        d.setHours(17, 0, 0, 0);
        return d.toISOString();
      };
      const CANON: Record<Quadrant, {priority: Task['priority']; dueDate: string | null}> = {
        do: {priority: 'High', dueDate: urgentDue()},
        schedule: {priority: 'Medium', dueDate: null},
        delegate: {priority: 'Low', dueDate: urgentDue()},
        someday: {priority: 'None', dueDate: null},
      };
      patchTask(task._id, CANON[quadrant]);
    },
    [patchTask],
  );

  // ── Drag a file (e.g. an Outlook message) anywhere onto the app ────────────
  const onRootDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current++;
    setIsDraggingFile(true);
  };
  const onRootDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) e.preventDefault();
  };
  const onRootDragLeave = () => {
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingFile(false);
  };
  const onRootDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setEmailDropFile(file);
      setEmailDropOpen(true);
    }
  };

  // ── Bulk selection ───────────────────────────────────────────────────────────
  const bulkToggle = useCallback((task: Task) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(task._id)) next.delete(task._id);
      else next.add(task._id);
      return next;
    });
  }, []);

  const exitBulkMode = () => {
    setBulkMode(false);
    setBulkSelected(new Set());
  };

  const bulkComplete = () => {
    bulkSelected.forEach(id => patchTask(id, {isCompleted: true, status: 'done'}));
    exitBulkMode();
  };

  const bulkSetPriority = (p: Task['priority']) => {
    bulkSelected.forEach(id => patchTask(id, {priority: p}));
  };

  const bulkDelete = () => {
    const doomed = liveTasks.filter(t => bulkSelected.has(t._id));
    if (doomed.length === 0) return;
    setTasks(prev => prev.filter(t => !bulkSelected.has(t._id)));
    exitBulkMode();
    setUndoState({
      message: `Deleted ${doomed.length} task${doomed.length === 1 ? '' : 's'}`,
      onUndo: () => setTasks(prev => [...doomed, ...prev]),
      onCommit: () => {
        Promise.allSettled(doomed.map(t => api.remove(t._id)));
      },
    });
  };

  // ── Context menu ─────────────────────────────────────────────────────────────
  const openContextMenu = (task: Task, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({task, x: e.clientX, y: e.clientY});
  };

  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    if (!contextMenu) return [];
    const t = contextMenu.task;
    const highlightItems: ContextMenuItem[] = NEON_COLORS.map((c, i) => ({
      label: `Highlight ${c.label}${isPinned(t) && t.neonColor === c.key ? ' ✓' : ''}`,
      icon: <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />,
      onSelect: () => patchTask(t._id, {hasNeonBorder: true, neonColor: c.key}),
      divider: i === 0,
    }));
    if (isPinned(t)) {
      highlightItems.push({label: 'Remove highlight', onSelect: () => patchTask(t._id, {hasNeonBorder: false})});
    }
    return [
      {label: 'Open', onSelect: () => setSelectedId(t._id)},
      {label: 'Open in full window', onSelect: () => setExpandedTaskId(t._id)},
      {label: t.isCompleted ? 'Mark as not done' : 'Mark as done', onSelect: () => toggleComplete(t)},
      {label: 'Duplicate', onSelect: () => duplicateTask(t)},
      ...highlightItems,
      {label: 'Push to tomorrow', onSelect: () => snoozeTask(t), divider: true},
      {label: 'Archive', onSelect: () => archiveTask(t)},
      {label: 'Delete', onSelect: () => deleteTask(t), danger: true, divider: true},
    ];
  }, [contextMenu, toggleComplete, duplicateTask, patchTask, snoozeTask, archiveTask, deleteTask]);

  // ── Reminders (Notification API) ────────────────────────────────────────────
  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      alert('Notifications are not supported in this browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifyEnabled(perm === 'granted');
  };

  useEffect(() => {
    if (!notifyEnabled) return;
    const notified = new Set<string>();
    const check = () => {
      const now = Date.now();
      liveTasks.forEach(t => {
        if (t.isCompleted || !t.dueDate || notified.has(t._id)) return;
        const due = new Date(t.dueDate).getTime();
        if (due <= now && due > now - 5 * 60000) {
          try {
            new Notification('Task due', {body: t.title});
          } catch {
            /* ignore */
          }
          notified.add(t._id);
        }
      });
    };
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [notifyEnabled, liveTasks]);

  // ── Export / import ──────────────────────────────────────────────────────────
  const exportJson = () => {
    downloadBlob(
      new Blob([JSON.stringify(liveTasks, null, 2)], {type: 'application/json'}),
      `tasks-${new Date().toISOString().slice(0, 10)}.json`,
    );
    setToolsOpen(false);
  };

  const exportCsv = () => {
    downloadBlob(new Blob([tasksToCsv(liveTasks)], {type: 'text/csv'}), `tasks-${new Date().toISOString().slice(0, 10)}.csv`);
    setToolsOpen(false);
  };

  const importFile = async (file: File) => {
    const text = await file.text();
    let items: ImportedTask[] = [];
    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsedJson = JSON.parse(text);
        items = (Array.isArray(parsedJson) ? parsedJson : []).map(
          (t: {
            title?: string;
            status?: string;
            priority?: Task['priority'];
            dueDate?: string;
            category?: string;
            tags?: string[];
            notes?: string;
            estimatedTime?: number;
          }) => ({
            title: t.title || '',
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            category: t.category,
            tags: t.tags,
            notes: t.notes,
            estimatedTime: t.estimatedTime,
          }),
        );
      } else {
        items = parseTasksCsv(text);
      }
    } catch {
      alert('Could not parse that file.');
      return;
    }
    const valid = items.filter(i => i.title?.trim());
    if (valid.length === 0) {
      alert('No valid tasks found in that file.');
      return;
    }
    const created = await Promise.all(
      valid.map(i =>
        api.create({
          title: i.title,
          priority: i.priority || 'None',
          status: i.status || 'todo',
          isCompleted: i.status === 'done',
          ...(i.dueDate ? {dueDate: i.dueDate} : {}),
          ...(i.category ? {category: i.category} : {}),
          tags: i.tags || [],
          ...(i.notes ? {notes: i.notes} : {}),
          ...(i.estimatedTime ? {estimatedTime: i.estimatedTime} : {}),
        }),
      ),
    );
    setTasks(prev => [...created, ...prev]);
    flash(`Imported ${created.length} task${created.length === 1 ? '' : 's'}`);
    setToolsOpen(false);
  };

  // ── Saved smart views ────────────────────────────────────────────────────────
  const persistViews = (views: SavedView[]) => {
    setSavedViews(views);
    localStorage.setItem('TASKS_SAVED_VIEWS', JSON.stringify(views));
  };
  const saveCurrentView = (name: string) => {
    const v: SavedView = {id: genId(), name, search, priority: priorityFilter, tag: tagFilter, category: categoryFilter};
    persistViews([...savedViews, v]);
    setActiveSavedViewId(v.id);
  };
  const applySavedView = (v: SavedView) => {
    setSearch(v.search);
    setPriorityFilter(v.priority);
    setTagFilter(v.tag);
    setCategoryFilter(v.category);
    setActiveSavedViewId(v.id);
  };
  const deleteSavedView = (id: string) => {
    persistViews(savedViews.filter(v => v.id !== id));
    setActiveSavedViewId(prev => (prev === id ? null : prev));
  };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const s = new Set<string>();
    liveTasks.forEach(t => (t.tags || []).forEach(tag => s.add(tag)));
    return [...s].sort();
  }, [liveTasks]);

  const allCategories = useMemo(() => {
    const s = new Set<string>();
    liveTasks.forEach(t => t.category && s.add(t.category));
    return [...s].sort();
  }, [liveTasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return liveTasks.filter(t => {
      if (q && !`${t.title} ${t.notes || ''} ${t.category || ''} ${(t.tags || []).join(' ')}`.toLowerCase().includes(q))
        return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (tagFilter && !(t.tags || []).includes(tagFilter)) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (quickFilter) {
        const dd = daysUntil(t.dueDate);
        if (quickFilter === 'myday' && !(dd !== null && dd <= 0 && !t.isCompleted)) return false;
        if (quickFilter === 'week' && !(dd !== null && dd >= 0 && dd <= 7)) return false;
        if (quickFilter === 'nodue' && t.dueDate) return false;
        if (quickFilter === 'overdue' && !(dd !== null && dd < 0 && !t.isCompleted)) return false;
      }
      return true;
    });
  }, [liveTasks, search, priorityFilter, tagFilter, categoryFilter, quickFilter]);

  const focusFiltered = useMemo(() => {
    if (!focusMode) return filtered;
    return filtered.filter(t => {
      if (t.isCompleted) return true;
      const dd = daysUntil(t.dueDate);
      return isPinned(t) || (dd !== null && dd <= 0);
    });
  }, [filtered, focusMode]);

  const active = useMemo(() => focusFiltered.filter(t => !t.isCompleted).sort(compareBy(sortMode)), [focusFiltered, sortMode]);
  const completed = useMemo(
    () =>
      focusFiltered
        .filter(t => t.isCompleted)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [focusFiltered],
  );

  const applyReorder = useCallback((updates: {id: string; order: number}[]) => {
    setTasks(prev => {
      const rank = new Map(updates.map(u => [u.id, u.order]));
      return prev.map(t => (rank.has(t._id) ? {...t, order: rank.get(t._id)!} : t));
    });
    api.reorder(updates).catch(err => console.error('Reorder failed', err));
  }, []);

  const reorderManual = useCallback(
    (newOrder: Task[]) => applyReorder(newOrder.map((t, i) => ({id: t._id, order: i}))),
    [applyReorder],
  );

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeAll = liveTasks.filter(t => !t.isCompleted);
    const overdue = activeAll.filter(t => (daysUntil(t.dueDate) ?? 1) < 0).length;
    const dueToday = activeAll.filter(t => daysUntil(t.dueDate) === 0);
    const weekAgo = Date.now() - 7 * 86400000;
    const doneThisWeek = liveTasks.filter(t => t.isCompleted && new Date(t.updatedAt).getTime() > weekAgo).length;
    const focusMin = dueToday.reduce((n, t) => n + (t.estimatedTime || 0), 0);
    const todayStart = startOfDay(new Date()).getTime();
    const doneToday = liveTasks.filter(t => t.isCompleted && new Date(t.updatedAt).getTime() >= todayStart).length;
    const dayTotal = doneToday + dueToday.length;
    const dayProgress = dayTotal > 0 ? doneToday / dayTotal : 1;
    return {overdue, today: dueToday.length, doneThisWeek, focusMin, doneToday, dayProgress, dayTotal};
  }, [liveTasks]);

  // Celebrate when the day's list is fully cleared (once per session per completion)
  useEffect(() => {
    if (stats.dayTotal > 0 && stats.dayProgress >= 1) {
      if (!dayCelebratedRef.current) {
        dayCelebratedRef.current = true;
        triggerConfetti();
      }
    } else {
      dayCelebratedRef.current = false;
    }
  }, [stats.dayTotal, stats.dayProgress, triggerConfetti]);

  const selectedTask = selectedId ? tasks.find(t => t._id === selectedId) || null : null;
  const expandedTask = expandedTaskId ? tasks.find(t => t._id === expandedTaskId) || null : null;
  const canSaveView = !!(search || priorityFilter || tagFilter || categoryFilter);

  if (authStatus === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f0] dark:bg-slate-900">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }
  if (authStatus === 'unauthenticated') return null;

  return (
    <div className={isDark ? 'dark' : ''}>
      <div
        className="flex h-screen w-full overflow-hidden bg-[#f4f4f0] font-sans text-slate-800 antialiased dark:bg-slate-900 dark:text-slate-100"
        onDragEnter={onRootDragEnter}
        onDragLeave={onRootDragLeave}
        onDragOver={onRootDragOver}
        onDrop={onRootDrop}
        style={{
          backgroundImage: isDark
            ? undefined
            : 'radial-gradient(circle, rgba(15,23,42,0.055) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* ── Header ── */}
          <header className="shrink-0 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/70">
            <div className="flex items-center gap-4 px-6 pt-4">
              <div>
                <h1 className="flex items-center gap-2 text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md">
                    <Flame className="h-4 w-4" />
                  </span>
                  Ananthan&apos;s Tasks
                  {focusMode && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                      Focus
                    </span>
                  )}
                </h1>
                <p className="ml-9 text-[11px] font-medium text-slate-400">
                  {new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}
                </p>
              </div>

              {/* Stats */}
              <div className="ml-auto hidden items-center gap-2 md:flex">
                {stats.dayTotal > 0 && (
                  <div
                    className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 ring-1 ring-inset ring-slate-200 dark:bg-slate-700 dark:ring-slate-600"
                    title={`${stats.doneToday} of ${stats.dayTotal} tasks for today completed`}>
                    <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" fill="none" r="9" stroke="#e2e8f0" strokeWidth="3.5" />
                      <circle
                        cx="12"
                        cy="12"
                        fill="none"
                        r="9"
                        stroke="url(#ringGrad)"
                        strokeDasharray={`${stats.dayProgress * 56.5} 56.5`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                      <defs>
                        <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="leading-none">
                      <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                        {Math.round(stats.dayProgress * 100)}%
                      </p>
                      <p className="text-[9.5px] text-slate-400">today</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-1.5 ring-1 ring-inset ring-rose-100 dark:bg-rose-500/10 dark:ring-rose-500/20">
                  <CalendarClock className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-[12px] font-bold text-rose-700 dark:text-rose-300">{stats.overdue}</span>
                  <span className="text-[11px] text-rose-400">overdue</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-1.5 ring-1 ring-inset ring-orange-100 dark:bg-orange-500/10 dark:ring-orange-500/20">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-[12px] font-bold text-orange-700 dark:text-orange-300">{stats.today}</span>
                  <span className="text-[11px] text-orange-400">today</span>
                </div>
                {stats.focusMin > 0 && (
                  <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 ring-1 ring-inset ring-indigo-100 dark:bg-indigo-500/10 dark:ring-indigo-500/20">
                    <Timer className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-[12px] font-bold text-indigo-700 dark:text-indigo-300">{formatMinutes(stats.focusMin)}</span>
                    <span className="text-[11px] text-indigo-400">focus</span>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
                  <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300">{stats.doneThisWeek}</span>
                  <span className="text-[11px] text-emerald-400">done this wk</span>
                </div>
                <Link
                  className="ml-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                  href="/anomaly">
                  Notes ↗
                </Link>
                <Link
                  className="text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                  href="/process-flow"
                  target="_blank">
                  Process Flow ↗
                </Link>
              </div>

              {/* Tools overflow menu */}
              <div className="relative" ref={toolsRef}>
                <button
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  onClick={() => setToolsOpen(v => !v)}
                  title="More tools">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {toolsOpen && (
                  <div className="absolute right-0 top-full z-40 mt-1 w-56 animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => {
                        setTemplatesOpen(true);
                        setToolsOpen(false);
                      }}>
                      <BookmarkIcon className="h-4 w-4 text-indigo-500" /> Templates ({templates.length})
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => {
                        setArchiveOpen(true);
                        setToolsOpen(false);
                      }}>
                      <ArchiveIcon className="h-4 w-4 text-amber-500" /> Archive ({archived.length})
                    </button>
                    <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={exportJson}>
                      <Download className="h-4 w-4 text-slate-400" /> Export JSON
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={exportCsv}>
                      <Download className="h-4 w-4 text-slate-400" /> Export CSV
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 text-slate-400" /> Import CSV / JSON
                    </button>
                    <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={enableNotifications}>
                      {notifyEnabled ? <Bell className="h-4 w-4 text-emerald-500" /> : <BellOff className="h-4 w-4 text-slate-400" />}
                      {notifyEnabled ? 'Reminders on' : 'Enable reminders'}
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => setIsDark(v => !v)}>
                      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-400" />}
                      {isDark ? 'Light theme' : 'Dark theme'}
                    </button>
                  </div>
                )}
                <input
                  accept=".csv,.json"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) importFile(file);
                    e.target.value = '';
                  }}
                  ref={fileInputRef}
                  type="file"
                />
              </div>

              {/* Full window — same destination as the Maximize2 button inside the side drawer */}
              {selectedTask && (
                <button
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  onClick={() => setExpandedTaskId(selectedTask._id)}
                  title="Open selected task in full window">
                  <Maximize2 className="h-4 w-4" /> Full window
                </button>
              )}

              {/* Bookmarks */}
              <button
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                onClick={() => setBookmarksOpen(true)}
                title="Bookmarks">
                <BookmarkIcon className="h-4 w-4" /> Bookmarks
              </button>

              {/* Contacts */}
              <button
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                onClick={() => setContactsOpen(true)}
                title="Contacts">
                <Users className="h-4 w-4" /> Contacts
              </button>

              {/* Task from email */}
              <button
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-[12.5px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                onClick={() => setEmailDropOpen(true)}
                title="Drag an Outlook message anywhere onto this window, or click to paste one">
                <Mail className="h-4 w-4" /> Task from email
              </button>

              {/* New task */}
              <button
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-md transition-all hover:-translate-y-px hover:shadow-lg"
                onClick={() => openNewTask('todo')}
                title="New task (N)">
                <Plus className="h-4 w-4" /> New task
              </button>
            </div>

            {/* ── View switcher + filters ── */}
            <div className="flex flex-wrap items-center gap-2 px-6 pb-2">
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
                {VIEWS.map(v => (
                  <button
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                      view === v.key ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    key={v.key}
                    onClick={() => setView(v.key)}>
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-600 dark:bg-slate-700">
                <Search className="h-3.5 w-3.5 text-slate-300" />
                <input
                  className="w-36 bg-transparent text-[12px] outline-none placeholder:text-slate-300 dark:text-white"
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks…"
                  value={search}
                />
                {search && (
                  <button className="text-slate-300 hover:text-slate-500" onClick={() => setSearch('')}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Priority filter pills */}
              <div className="flex gap-1">
                {(['High', 'Medium', 'Low'] as const).map(p => (
                  <button
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 ring-inset transition-all ${
                      priorityFilter === p
                        ? PRIORITY_META[p].chip
                        : 'bg-white text-slate-400 ring-slate-200 hover:ring-slate-300 dark:bg-slate-700'
                    }`}
                    key={p}
                    onClick={() => setPriorityFilter(prev => (prev === p ? null : p))}>
                    {p}
                  </button>
                ))}
              </div>

              {allTags.length > 0 && (
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-500 outline-none dark:border-slate-600 dark:bg-slate-700"
                  onChange={e => setTagFilter(e.target.value || null)}
                  value={tagFilter || ''}>
                  <option value="">All tags</option>
                  {allTags.map(t => (
                    <option key={t} value={t}>
                      #{t}
                    </option>
                  ))}
                </select>
              )}

              {allCategories.length > 0 && (
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-500 outline-none dark:border-slate-600 dark:bg-slate-700"
                  onChange={e => setCategoryFilter(e.target.value || null)}
                  value={categoryFilter || ''}>
                  <option value="">All categories</option>
                  {allCategories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              <select
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-500 outline-none dark:border-slate-600 dark:bg-slate-700"
                onChange={e => setSortMode(e.target.value as SortMode)}
                title="Sort order"
                value={sortMode}>
                {SORT_MODES.map(s => (
                  <option key={s.key} value={s.key}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>

              {(priorityFilter || tagFilter || categoryFilter || search || quickFilter) && (
                <button
                  className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                  onClick={() => {
                    setPriorityFilter(null);
                    setTagFilter(null);
                    setCategoryFilter(null);
                    setSearch('');
                    setQuickFilter(null);
                    setActiveSavedViewId(null);
                  }}>
                  Clear filters
                </button>
              )}

              <button
                className={`ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                  focusMode ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' : 'text-slate-400 hover:text-slate-600'
                }`}
                onClick={() => setFocusMode(v => !v)}
                title="Focus mode — only overdue, due today, and pinned tasks">
                <Target className="h-3.5 w-3.5" /> Focus
              </button>

              <button
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                  bulkMode ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' : 'text-slate-400 hover:text-slate-600'
                }`}
                onClick={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
                title="Select multiple tasks (B)">
                {bulkMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />} Select
              </button>

              {view === 'list' && (
                <div className="flex items-center gap-1">
                  {showCompleted && completed.length > 0 && (
                    <button
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      onClick={clearCompleted}
                      title="Delete all completed tasks">
                      <Trash2 className="h-3.5 w-3.5" /> Clear done
                    </button>
                  )}
                  <button
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                      showCompleted ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    onClick={() => setShowCompleted(v => !v)}>
                    {showCompleted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    Completed
                  </button>
                </div>
              )}
            </div>

            {/* Quick filter chips + saved views */}
            <div className="flex flex-wrap items-center gap-1.5 px-6 pb-3">
              <button
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  quickFilter === null
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
                }`}
                onClick={() => setQuickFilter(null)}>
                All
              </button>
              {(
                [
                  {key: 'myday', label: 'My day'},
                  {key: 'overdue', label: 'Overdue'},
                  {key: 'week', label: 'This week'},
                  {key: 'nodue', label: 'No due date'},
                ] as const
              ).map(qf => (
                <button
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    quickFilter === qf.key
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
                  }`}
                  key={qf.key}
                  onClick={() => setQuickFilter(qf.key)}>
                  {qf.label}
                </button>
              ))}
              <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <SavedViewsBar
                activeId={activeSavedViewId}
                canSave={canSaveView}
                onApply={applySavedView}
                onDelete={deleteSavedView}
                onSave={saveCurrentView}
                views={savedViews}
              />
            </div>
          </header>

          {/* ── Bulk action bar ── */}
          {bulkMode && (
            <div className="flex shrink-0 items-center gap-2 border-b border-orange-200 bg-orange-50 px-6 py-2 dark:border-orange-500/20 dark:bg-orange-500/10">
              <span className="text-[12px] font-semibold text-orange-700 dark:text-orange-300">
                {bulkSelected.size} selected
              </span>
              <button
                className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200"
                onClick={bulkComplete}>
                Mark done
              </button>
              {(['High', 'Medium', 'Low', 'None'] as const).map(p => (
                <button
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${PRIORITY_META[p].chip}`}
                  key={p}
                  onClick={() => bulkSetPriority(p)}>
                  {p}
                </button>
              ))}
              <button
                className="ml-auto flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11.5px] font-semibold text-rose-600 shadow-sm hover:bg-rose-50 dark:bg-slate-700"
                onClick={bulkDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button className="rounded-lg p-1.5 text-orange-400 hover:text-orange-700" onClick={exitBulkMode}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Content ── */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="mx-auto max-w-3xl space-y-2 px-6 pt-6">
                {[...Array(6)].map((_, i) => (
                  <div className="h-[72px] animate-pulse rounded-2xl bg-slate-200/50 dark:bg-slate-700/50" key={i} />
                ))}
              </div>
            ) : view === 'list' ? (
              <ListView
                bulkMode={bulkMode}
                bulkSelected={bulkSelected}
                completed={completed}
                onBulkToggle={bulkToggle}
                onContextMenu={openContextMenu}
                onOpen={t => setSelectedId(t._id)}
                onReorderManual={reorderManual}
                onToggleComplete={toggleComplete}
                onToggleMinimize={toggleMinimize}
                selectedId={selectedId}
                showCompleted={showCompleted}
                sortMode={sortMode}
                tasks={active}
              />
            ) : view === 'board' ? (
              <BoardView
                onAddTask={s => openNewTask(s)}
                onContextMenu={openContextMenu}
                onOpen={t => setSelectedId(t._id)}
                onQuickCreate={quickCreateInColumn}
                onSetStatus={setStatus}
                onToggleComplete={toggleComplete}
                selectedId={selectedId}
                tasks={focusFiltered}
              />
            ) : view === 'matrix' ? (
              <MatrixView
                onContextMenu={openContextMenu}
                onExpand={t => setExpandedTaskId(t._id)}
                onMoveToQuadrant={moveToQuadrant}
                onOpen={t => setSelectedId(t._id)}
                onReorderQuadrant={applyReorder}
                onToggleComplete={toggleComplete}
                selectedId={selectedId}
                tasks={active}
              />
            ) : view === 'calendar' ? (
              <CalendarView onOpen={t => setSelectedId(t._id)} selectedId={selectedId} tasks={liveTasks} />
            ) : (
              <InsightsView tasks={liveTasks} />
            )}
          </div>
        </div>

        {/* ── Detail drawer (sidebar — the default way to view/edit a task) ── */}
        {selectedTask && (
          <DetailDrawer
            onArchive={archiveTask}
            onClose={() => setSelectedId(null)}
            onDelete={deleteTask}
            onDuplicate={duplicateTask}
            onExpand={t => setExpandedTaskId(t._id)}
            onPatch={patchTask}
            onSaveAsTemplate={saveAsTemplate}
            task={selectedTask}
          />
        )}

        {/* ── New task window (large, in-browser) ── */}
        {newTaskOpen && (
          <TaskWindow
            defaultStatus={newTaskStatus}
            onClose={() => {
              setNewTaskOpen(false);
              setEmailPrefill(null);
            }}
            onCreated={task => {
              setTasks(prev => [task, ...prev]);
              setSelectedId(task._id);
              setEmailPrefill(null);
            }}
            prefill={emailPrefill}
          />
        )}

        {/* ── Existing task opened in the large window (optional, via the drawer's expand button) ── */}
        {expandedTask && (
          <TaskWindow
            onArchive={archiveTask}
            onClose={() => setExpandedTaskId(null)}
            onDelete={deleteTask}
            onDuplicate={duplicateTask}
            onPatch={patchTask}
            onSaveAsTemplate={saveAsTemplate}
            task={expandedTask}
          />
        )}

        {emailDropOpen && (
          <EmailDropModal
            initialFile={emailDropFile}
            onClose={() => {
              setEmailDropOpen(false);
              setEmailDropFile(null);
            }}
            onExtracted={data => {
              setEmailDropFile(null);
              openNewTask('todo', data);
            }}
          />
        )}

        {isDraggingFile && !emailDropOpen && (
          <div className="pointer-events-none fixed inset-0 z-[290] flex items-center justify-center bg-indigo-900/30 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-indigo-300 bg-white/90 px-10 py-8 text-center shadow-2xl dark:bg-slate-800/90">
              <Mail className="h-8 w-8 text-indigo-500" />
              <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">Drop to create a task from this email</p>
              <p className="text-[11.5px] text-slate-400">Gemini will pull out the title, priority, and due date</p>
            </div>
          </div>
        )}

        {paletteOpen && (
          <CommandPalette
            isDark={isDark}
            onClose={() => setPaletteOpen(false)}
            onNewTask={() => openNewTask('todo')}
            onOpenTask={t => setSelectedId(t._id)}
            onSetView={setView}
            onToggleDark={() => setIsDark(v => !v)}
            onToggleFocus={() => setFocusMode(v => !v)}
            tasks={liveTasks}
          />
        )}

        {templatesOpen && (
          <TemplatesModal
            onClose={() => setTemplatesOpen(false)}
            onDeleteTemplate={deleteTemplate}
            onUseTemplate={useTemplate}
            templates={templates}
          />
        )}

        {archiveOpen && (
          <ArchiveView onClose={() => setArchiveOpen(false)} onPurge={purgeTask} onRestore={restoreTask} tasks={archived} />
        )}

        {bookmarksOpen && (
          <BookmarksModal
            onClose={() => setBookmarksOpen(false)}
            onOpenUrl={(url, title) => setBrowserTarget({url, title})}
          />
        )}

        {browserTarget && (
          <InAppBrowser onClose={() => setBrowserTarget(null)} title={browserTarget.title} url={browserTarget.url} />
        )}

        <ContactListModal isOpen={contactsOpen} onClose={() => setContactsOpen(false)} />

        {contextMenu && (
          <ContextMenu items={contextMenuItems} onClose={() => setContextMenu(null)} x={contextMenu.x} y={contextMenu.y} />
        )}

        {undoState && (
          <UndoToast
            message={undoState.message}
            onDismiss={() => {
              undoState.onCommit();
              setUndoState(null);
            }}
            onUndo={() => {
              undoState.onUndo();
              setUndoState(null);
            }}
          />
        )}

        {confetti && <ConfettiBurst onDone={() => setConfetti(null)} originX={confetti.x} originY={confetti.y} />}

        {flashMessage && (
          <div className="fixed left-1/2 top-5 z-[280] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-[12.5px] font-medium text-white shadow-xl">
            {flashMessage}
          </div>
        )}
      </div>
    </div>
  );
}
