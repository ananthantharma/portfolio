/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {Check, ChevronDown, Link2, ListTodo, Plus, Search, Unlink} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import {api} from '../../Tasks/api';
import {saveTaskChanges} from '../../Tasks/taskActions';
import {AssigneePill, CopySubjectButton, glowStyle, GlowToggles, isAssignedTo, VendorPill} from '../../Tasks/TaskExtras';
import {useTaskCollection} from '../../Tasks/TaskProvider';
import {TaskEditor} from '../../Tasks/TaskWorkspace';
import {daysUntil, formatDue, glowOf, smartCompare, statusOf, Task, TaskAssignee, TaskVendor, vendorIdOf} from '../../Tasks/types';
import styles from './VendorPage.module.css';

interface Props {
  vendor: TaskVendor;
  /**
   * People pages: list the tasks assigned to this person instead of the ones linked to the page.
   * "Assign a task" then assigns an existing task to them, and unlinking clears "Assigned to".
   */
  assignee?: TaskAssignee & {staffId: string};
  title?: string;
}

/** Tasks linked to this vendor: add new ones here, link existing ones, and edit them in place. */
export default function VendorTasksCard({vendor, assignee, title = 'Tasks'}: Props) {
  const COLLAPSED_KEY = assignee ? 'VENDOR_CARD_COLLAPSED_assigned' : 'VENDOR_CARD_COLLAPSED_tasks';
  const cardId = assignee ? 'person-assigned-tasks' : 'vendor-tasks';
  const first = assignee ? assignee.name.trim().split(/\s+/)[0] : vendor.name;
  const belongs = (t: Task) => (assignee ? isAssignedTo(t, {_id: assignee.staffId, name: assignee.name}) : vendorIdOf(t) === vendor._id);
  const assignedTo = assignee ? {staffId: assignee.staffId, name: assignee.name, email: assignee.email || ''} : null;
  const tie = assignedTo ? {assignedTo} : {vendorSectionId: vendor._id};
  const {tasks, loading, busy, run} = useTaskCollection();
  const [showDone, setShowDone] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [openId, setOpenId] = useState<string | null>(null); // task id, or 'new'
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === 'true');
    } catch {
      // storage unavailable: the toggle still works for this visit
    }
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next));
    } catch {
      // ignore unavailable storage
    }
  };

  const live = useMemo(() => tasks.filter(t => !t.isTemplate && !t.isArchived), [tasks]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const linked = useMemo(() => live.filter(belongs), [live, vendor._id, assignee?.staffId, assignee?.name]);
  const openTasks = useMemo(() => linked.filter(t => statusOf(t) !== 'done').sort(smartCompare), [linked]);
  const doneTasks = useMemo(() => linked.filter(t => statusOf(t) === 'done').sort(smartCompare), [linked]);
  const shown = showDone ? doneTasks : openTasks;

  const linkable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return live
      .filter(t => !belongs(t) && statusOf(t) !== 'done')
      .filter(t => !q || `${t.title} ${t.category || ''} ${(t.tags || []).join(' ')}`.toLowerCase().includes(q))
      .sort(smartCompare)
      .slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, query, vendor._id, assignee?.staffId]);

  const execute = async (key: string, action: () => Promise<unknown>) => {
    setError('');
    try {
      await run(key, action);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    }
  };

  const quickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title || busy.includes(`vendor-quick-${vendor._id}`)) return;
    void execute(`vendor-quick-${vendor._id}`, async () => {
      await api.create({title, priority: 'None', status: 'todo', isCompleted: false, ...tie});
      setQuickTitle('');
      setShowDone(false);
    });
  };

  const toggleDone = (task: Task) =>
    void execute(task._id, async () => {
      const complete = statusOf(task) !== 'done';
      const result = await saveTaskChanges(task, {isCompleted: complete, status: complete ? 'done' : 'todo'});
      if (result.warning) setError(result.warning);
    });

  const link = (task: Task) => {
    setPickerOpen(false);
    setQuery('');
    void execute(task._id, () => api.update(task._id, tie));
  };

  const unlink = (task: Task) => {
    if (openId === task._id) setOpenId(null);
    void execute(task._id, () => api.update(task._id, assignee ? {assignedTo: null} : {vendorSectionId: null}));
  };

  const editingTask = openId && openId !== 'new' ? linked.find(t => t._id === openId) : undefined;

  return (
    <section aria-label={title} className={`${styles.card} ${styles.wide}`} data-collapsed={collapsed} id={cardId}>
      <div className={styles.cardHead} style={collapsed ? {marginBottom: 0} : undefined}>
        <h2>
          <button
            aria-controls={`${cardId}-body`}
            aria-expanded={!collapsed}
            className={styles.collapseToggle}
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand tasks' : 'Minimize tasks'}>
            <ChevronDown size={15} className={styles.collapseChevron} />
            <ListTodo size={17} />
            {title}
            {openTasks.length > 0 && <small>{openTasks.length} open</small>}
          </button>
        </h2>
        {!collapsed && (
          <>
            <div className={styles.seg} role="group" aria-label="Show open or completed tasks">
              <button aria-pressed={!showDone} onClick={() => setShowDone(false)}>
                Open
              </button>
              <button aria-pressed={showDone} onClick={() => setShowDone(true)}>
                Done {doneTasks.length > 0 && doneTasks.length}
              </button>
            </div>
            <div className={styles.menu} ref={pickerRef}>
              <button aria-expanded={pickerOpen} className={styles.btn} onClick={() => setPickerOpen(v => !v)}>
                <Link2 size={14} /> {assignee ? 'Assign a task' : 'Link a task'}
              </button>
              {pickerOpen && (
                <div className={styles.picker}>
                  <input
                    aria-label="Search your tasks"
                    autoFocus
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search your open tasks"
                    value={query}
                  />
                  <div className={styles.pickerList}>
                    {linkable.length ? (
                      linkable.map(t => (
                        <button className={styles.pickerItem} key={t._id} onClick={() => link(t)}>
                          <ListTodo size={15} color="#7d8576" />
                          <span style={{minWidth: 0}}>
                            {t.title}
                            <small>
                              {[
                                t.dueDate && formatDue(t.dueDate),
                                assignee
                                  ? t.assignedTo?.name && `Now with ${t.assignedTo.name}`
                                  : typeof t.vendorSectionId === 'object' && t.vendorSectionId?.name && `Now at ${t.vendorSectionId.name}`,
                              ]
                                .filter(Boolean)
                                .join(' · ') || 'No due date'}
                            </small>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className={styles.muted} style={{padding: 8}}>
                        {query
                          ? 'No open tasks match that search.'
                          : assignee
                          ? `Every open task is already assigned to ${first}.`
                          : 'Every open task is already linked here.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className={`${styles.btn} ${styles.primary}`} onClick={() => setOpenId('new')}>
              <Plus size={14} /> New task
            </button>
          </>
        )}
      </div>

      {!collapsed && (
        <div id={`${cardId}-body`}>
          {openId === 'new' && (
            <div className={styles.taskEditorWrap}>
              <TaskEditor
                defaults={assignedTo ? {assignedTo} : {vendorSectionId: vendor}}
                draftKey={`${assignee ? 'assigned' : 'vendor'}-new-${vendor._id}`}
                onClose={() => setOpenId(null)}
              />
            </div>
          )}

          <form className={styles.taskQuickAdd} onSubmit={quickAdd}>
            <Plus size={15} />
            <input
              aria-label={assignee ? `Quick add a task assigned to ${assignee.name}` : `Quick add a task for ${vendor.name}`}
              onChange={e => setQuickTitle(e.target.value)}
              placeholder={assignee ? `Give ${first} a task, press Enter` : `Add a task for ${vendor.name}, press Enter`}
              value={quickTitle}
            />
          </form>

          {loading && !tasks.length ? (
            <div className={styles.empty}>Loading tasks…</div>
          ) : !shown.length ? (
            <div className={styles.empty}>
              {assignee
                ? showDone
                  ? `Work ${first} has finished will show up here.`
                  : `Nothing assigned to ${first} right now. Add a task above, or assign one you already have.`
                : showDone
                ? `Completed ${vendor.name} tasks will show up here.`
                : `No open tasks for ${vendor.name}. Add one above, or link one you already have.`}
            </div>
          ) : (
            <div className={styles.list}>
              {shown.map(task => {
                const done = statusOf(task) === 'done';
                const due = daysUntil(task.dueDate);
                return (
                  <React.Fragment key={task._id}>
                    <div className={styles.taskItem} data-glow={glowOf(task) || undefined} style={glowStyle(task)}>
                      <button
                        aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`}
                        aria-pressed={done}
                        className={styles.taskCheck}
                        disabled={busy.includes(task._id)}
                        onClick={() => toggleDone(task)}>
                        {done && <Check size={12} />}
                      </button>
                      <button className={styles.taskOpen} onClick={() => setOpenId(openId === task._id ? null : task._id)}>
                        <strong data-done={done}>{task.title}</strong>
                        <span>
                          {task.priority !== 'None' && <i data-priority={task.priority}>{task.priority}</i>}
                          {task.dueDate && <time data-overdue={!done && due !== null && due < 0}>{formatDue(task.dueDate)}</time>}
                          {task.subtasks?.length ? (
                            <span>
                              {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length} steps
                            </span>
                          ) : null}
                        </span>
                      </button>
                      {assignee ? <VendorPill task={task} /> : <AssigneePill assignee={task.assignedTo} />}
                      <CopySubjectButton subject={task.emailSubject} />
                      <GlowToggles task={task} />
                      <button
                        aria-label={assignee ? `Unassign ${task.title} from ${assignee.name}` : `Unlink ${task.title} from ${vendor.name}`}
                        className={styles.iconBtn}
                        onClick={() => unlink(task)}
                        title={assignee ? `No longer assigned to ${first} (keeps the task)` : `Unlink from ${vendor.name} (keeps the task)`}>
                        <Unlink size={14} />
                      </button>
                    </div>
                    {editingTask?._id === task._id && (
                      <div className={styles.taskEditorWrap}>
                        <TaskEditor onClose={() => setOpenId(null)} task={editingTask} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
          {!showDone && linked.length === 0 && live.some(t => statusOf(t) !== 'done') && (
            <p className={styles.hint}>
              <Search size={13} /> Tip: use {assignee ? 'Assign a task' : 'Link a task'} to bring in a task you’ve already created.
            </p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </section>
  );
}
