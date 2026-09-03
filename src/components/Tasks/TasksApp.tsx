/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  Archive as ArchiveIcon,
  Bell,
  BellOff,
  Bookmark as BookmarkIcon,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ClipboardPaste,
  Download,
  FileText,
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Moon,
  Plus,
  Search,
  Square,
  Sun,
  Target,
  Timer,
  Trash2,
  Upload,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useSession} from 'next-auth/react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import ContactListModal from '@/components/Notes/ContactListModal';
import PromptLibraryModal from '@/components/PromptLibrary/PromptLibraryModal';

import {api} from './api';
import ArchiveView from './ArchiveView';
import BookmarksModal from './BookmarksModal';
import CaptureModal, {CaptureSeed} from './CaptureModal';
import CommandPalette from './CommandPalette';
import ConfettiBurst from './ConfettiBurst';
import ContextMenu, {ContextMenuItem} from './ContextMenu';
import DetailDrawer from './DetailDrawer';
import {ExtractedTask} from './emailParse';
import InAppBrowser from './InAppBrowser';
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
} from './types';
import UndoToast from './UndoToast';

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

function RailButton({
  icon,
  label,
  onClick,
  href,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  badge?: number;
}) {
  const cls =
    'group relative flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-green-400';
  const body = (
    <>
      <span className="relative">
        {icon}
        {badge ? (
          <span className="absolute -right-2.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-slate-700 px-1 text-[8px] font-bold text-slate-200 group-hover:bg-green-500 group-hover:text-slate-900">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </>
  );
  if (href) {
    return (
      <Link className={cls} href={href} target="_blank">
        {body}
      </Link>
    );
  }
  return (
    <button className={cls} onClick={onClick} title={label} type="button">
      {body}
    </button>
  );
}

export default function TasksApp() {
  const {data: session, status: authStatus} = useSession();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
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
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureSeed, setCaptureSeed] = useState<CaptureSeed | null>(null);
  const [emailPrefill, setEmailPrefill] = useState<ExtractedTask | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
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
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Paste anywhere on the page — an image (screenshot) or a chunk of text — and hand it
  // straight to the AI capture modal, which drafts the task for Ananthan. Runs in the
  // capture phase and stops propagation when it claims the paste, so it wins over the
  // detail drawer's own paste-to-attach listener even while a task is selected.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (captureOpen || newTaskOpen || paletteOpen || expandedTaskId) return;
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) {
        return;
      }
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(i => i.kind === 'file' && i.type.startsWith('image/'));
      const text = (e.clipboardData?.getData('text') || '').trim();
      if (!imageItem && text.length < 40) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      if (imageItem) {
        const imgFile = imageItem.getAsFile();
        if (imgFile) {
          setCaptureSeed({file: imgFile});
          setCaptureOpen(true);
          return;
        }
      }
      setCaptureSeed({text});
      setCaptureOpen(true);
    };
    document.addEventListener('paste', onPaste, true);
    return () => document.removeEventListener('paste', onPaste, true);
  }, [captureOpen, newTaskOpen, paletteOpen, expandedTaskId]);

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
      setCaptureSeed({file});
      setCaptureOpen(true);
    }
  };

  // ── Bulk selection ───────────────────────────────────────────────────────────
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

  const applyReorder = useCallback((updates: {id: string; order: number}[]) => {
    setTasks(prev => {
      const rank = new Map(updates.map(u => [u.id, u.order]));
      return prev.map(t => (rank.has(t._id) ? {...t, order: rank.get(t._id)!} : t));
    });
    api.reorder(updates).catch(err => console.error('Reorder failed', err));
  }, []);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeAll = liveTasks.filter(t => !t.isCompleted);
    const overdue = activeAll.filter(t => (daysUntil(t.dueDate) ?? 1) < 0).length;
    const dueToday = activeAll.filter(t => daysUntil(t.dueDate) === 0);
    const focusMin = dueToday.reduce((n, t) => n + (t.estimatedTime || 0), 0);
    const todayStart = startOfDay(new Date()).getTime();
    const doneToday = liveTasks.filter(t => t.isCompleted && new Date(t.updatedAt).getTime() >= todayStart).length;
    const dayTotal = doneToday + dueToday.length;
    const dayProgress = dayTotal > 0 ? doneToday / dayTotal : 1;
    return {open: activeAll.length, overdue, focusMin, doneToday, dayProgress, dayTotal};
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
  const userInitials =
    (session?.user?.name || session?.user?.email || 'AT')
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(s => s[0]?.toUpperCase())
      .join('') || 'AT';

  if (authStatus === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f6f4] dark:bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-green-500" />
      </div>
    );
  }
  if (authStatus === 'unauthenticated') return null;

  return (
    <div className={isDark ? 'dark' : ''}>
      <div
        className="flex h-screen w-full overflow-hidden bg-[#f6f6f4] font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100"
        onDragEnter={onRootDragEnter}
        onDragLeave={onRootDragLeave}
        onDragOver={onRootDragOver}
        onDrop={onRootDrop}>
        {/* ── Left nav rail ── */}
        <nav className="z-20 flex w-[60px] shrink-0 flex-col items-center gap-0.5 border-r border-black/10 bg-slate-900 py-3">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-green-500 text-slate-900 shadow-lg shadow-green-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <RailButton icon={<BookOpen className="h-[17px] w-[17px]" />} label="Prompts" onClick={() => setPromptLibraryOpen(true)} />
          <RailButton icon={<Users className="h-[17px] w-[17px]" />} label="Contacts" onClick={() => setContactsOpen(true)} />
          <RailButton
            icon={<BookmarkIcon className="h-[17px] w-[17px]" />}
            label="Bookmarks"
            onClick={() => setBookmarksOpen(true)}
          />
          <RailButton
            badge={templates.length}
            icon={<LayoutTemplate className="h-[17px] w-[17px]" />}
            label="Templates"
            onClick={() => setTemplatesOpen(true)}
          />
          <RailButton
            badge={archived.length}
            icon={<ArchiveIcon className="h-[17px] w-[17px]" />}
            label="Archive"
            onClick={() => setArchiveOpen(true)}
          />
          <RailButton
            icon={<ClipboardPaste className="h-[17px] w-[17px]" />}
            label="Capture"
            onClick={() => {
              setCaptureSeed(null);
              setCaptureOpen(true);
            }}
          />
          <div className="my-1.5 h-px w-7 bg-slate-700/70" />
          <RailButton href="/notes" icon={<FileText className="h-[17px] w-[17px]" />} label="Notes" />
          <RailButton href="/process-flow" icon={<Workflow className="h-[17px] w-[17px]" />} label="Flow" />
          <div className="mt-auto flex w-full flex-col items-center gap-1.5">
            <RailButton
              icon={isDark ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
              label="Theme"
              onClick={() => setIsDark(v => !v)}
            />
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/90 text-[11px] font-bold text-slate-900"
              title={session?.user?.email || ''}>
              {userInitials}
            </div>
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* ── Header ── */}
          <header className="shrink-0 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-3 px-5 pb-3 pt-3.5">
              <div className="min-w-0 shrink-0">
                <h1 className="text-[18px] font-black tracking-tight text-slate-900 dark:text-white">Command Centre</h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium text-slate-400">
                  <span>{new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}</span>
                  <span className="text-slate-300">·</span>
                  <span>{stats.open} open</span>
                  {stats.overdue > 0 && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-rose-500">{stats.overdue} overdue</span>
                    </>
                  )}
                  {focusMode && (
                    <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700 dark:bg-green-500/15 dark:text-green-300">
                      Focus
                    </span>
                  )}
                </p>
              </div>

              {/* Command / search */}
              <div className="mx-auto flex w-full max-w-[460px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-colors focus-within:border-green-400 dark:border-slate-700 dark:bg-slate-800">
                <Search className="h-4 w-4 shrink-0 text-slate-300" />
                <input
                  className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-slate-400 dark:text-white"
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search or type a command"
                  value={search}
                />
                {search ? (
                  <button className="shrink-0 text-slate-300 hover:text-slate-500" onClick={() => setSearch('')} title="Clear search">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    className="shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                    onClick={() => setPaletteOpen(true)}
                    title="Command palette (Ctrl / ⌘ K)"
                    type="button">
                    ⌘K
                  </button>
                )}
              </div>

              {/* Right cluster */}
              <div className="flex shrink-0 items-center gap-2">
                {stats.dayTotal > 0 && (
                  <div
                    className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800 sm:flex"
                    title={`${stats.doneToday} of ${stats.dayTotal} tasks for today completed`}>
                    <svg className="h-5 w-5 -rotate-90" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" fill="none" r="9" stroke="#e2e8f0" strokeWidth="3.5" />
                      <circle
                        cx="12"
                        cy="12"
                        fill="none"
                        r="9"
                        stroke="#22c55e"
                        strokeDasharray={`${stats.dayProgress * 56.5} 56.5`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-200">
                      {Math.round(stats.dayProgress * 100)}%
                    </span>
                  </div>
                )}
                {stats.focusMin > 0 && (
                  <div className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 lg:flex">
                    <Timer className="h-3.5 w-3.5 text-green-500" /> {formatMinutes(stats.focusMin)}
                  </div>
                )}

                {/* Tools overflow menu */}
                <div className="relative" ref={toolsRef}>
                  <button
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    onClick={() => setToolsOpen(v => !v)}
                    title="More tools">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {toolsOpen && (
                    <div className="absolute right-0 top-full z-40 mt-1 w-52 animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
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

                <button
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-[12.5px] font-bold text-white shadow-sm shadow-green-600/20 transition-colors hover:bg-green-500"
                  onClick={() => openNewTask('todo')}
                  title="New task (N)">
                  <Plus className="h-4 w-4" /> New task
                </button>
              </div>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-2.5 dark:border-slate-800">
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
                  focusMode ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'text-slate-400 hover:text-slate-600'
                }`}
                onClick={() => setFocusMode(v => !v)}
                title="Focus mode — only overdue, due today, and pinned tasks">
                <Target className="h-3.5 w-3.5" /> Focus
              </button>

              <button
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                  bulkMode ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'text-slate-400 hover:text-slate-600'
                }`}
                onClick={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
                title="Select multiple tasks (B)">
                {bulkMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />} Select
              </button>

              {savedViews.length > 0 || canSaveView ? (
                <>
                  <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
                  <SavedViewsBar
                    activeId={activeSavedViewId}
                    canSave={canSaveView}
                    onApply={applySavedView}
                    onDelete={deleteSavedView}
                    onSave={saveCurrentView}
                    views={savedViews}
                  />
                </>
              ) : null}
            </div>
          </header>

          {/* ── Bulk action bar ── */}
          {bulkMode && (
            <div className="flex shrink-0 items-center gap-2 border-b border-green-200 bg-green-50 px-5 py-2 dark:border-green-500/20 dark:bg-green-500/10">
              <span className="text-[12px] font-semibold text-green-700 dark:text-green-300">
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
              <button className="rounded-lg p-1.5 text-green-500 hover:text-green-700" onClick={exitBulkMode}>
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
            ) : (
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

        {captureOpen && (
          <CaptureModal
            onClose={() => {
              setCaptureOpen(false);
              setCaptureSeed(null);
            }}
            onCreated={task => {
              setTasks(prev => [task, ...prev]);
              setSelectedId(task._id);
              setCaptureOpen(false);
              setCaptureSeed(null);
              flash('Task drafted from your paste — review & tweak');
            }}
            seed={captureSeed}
          />
        )}

        {isDraggingFile && !captureOpen && (
          <div className="pointer-events-none fixed inset-0 z-[290] flex items-center justify-center bg-green-900/25 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-green-300 bg-white/90 px-10 py-8 text-center shadow-2xl dark:bg-slate-800/90">
              <ClipboardPaste className="h-8 w-8 text-green-500" />
              <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">Drop to create a task with AI</p>
              <p className="text-[11.5px] text-slate-400">A screenshot, an Outlook message, or a text file — Gemini drafts the task</p>
            </div>
          </div>
        )}

        {paletteOpen && (
          <CommandPalette
            isDark={isDark}
            onClose={() => setPaletteOpen(false)}
            onNewTask={() => openNewTask('todo')}
            onOpenTask={t => setSelectedId(t._id)}
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

        {promptLibraryOpen && <PromptLibraryModal onClose={() => setPromptLibraryOpen(false)} />}

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
