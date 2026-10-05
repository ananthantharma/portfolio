/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {Archive, ArrowLeft, Building2, Check, CheckCheck, ChevronDown, ChevronRight, ChevronsRight, Copy, FileText, FolderKanban, Inbox, Layers, ListTodo, Maximize2, Pencil, Plus, Search, Send, Sparkles, Tag, Trash2, X} from 'lucide-react';
import React, {useContext, useEffect, useId, useMemo, useRef, useState} from 'react';

import AssignWorkWindow from '../Notes/AssignWorkWindow';
import {api} from './api';
import AttachmentGallery from './AttachmentGallery';
import CaptureModal, {CaptureSeed} from './CaptureModal';
import NoteLinkModal from './NoteLinkModal';
import {saveTaskChanges} from './taskActions';
import {AssigneePill, CopySubjectButton, glowStyle, GlowToggles, LinkVendorButton, taskGroupsApi, useStaffList, useTaskGroups, useVendorOptions, VendorPill, VendorSelect} from './TaskExtras';
import {useTaskCollection} from './TaskProvider';
import styles from './TaskWorkspace.module.css';
import {bucketOf, completedTime, daysUntil, glowOf, PRIORITY_META, smartCompare, statusOf, Task, TASK_BUCKETS, TaskBucket, vendorIdOf, vendorOf} from './types';
import {OpenVendorContext, OpenWorkspaceNoteContext} from './WorkspaceNavigation';

export type NoteContext = {id: string; title: string} | null;
type Filter = 'open' | 'today' | 'note' | 'done' | 'archive';

export function TaskEditor({task, note, onClose, draftKey, defaults}: {task?: Task; note?: NoteContext; onClose: () => void; draftKey?: string; defaults?: Partial<Task>}) {
  const {drafts, setDraft, busy, run} = useTaskCollection();
  // New tasks started from a vendor page keep their own draft so they don't mix with the sidebar's
  const key = task?._id || draftKey || 'new';
  const draft = drafts[key] || {};
  const value = {...(task ? {} : defaults), ...task, ...draft};
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [subtask, setSubtask] = useState('');
  const [linking, setLinking] = useState(false);
  const openNote = useContext(OpenWorkspaceNoteContext);
  const prefix = useId();
  const pending = busy.includes(key);
  const dirty = Object.keys(draft).length > 0;
  const change = (patch: Partial<Task>) => {setDraft(key, {...draft, ...patch}); setSaved(false);};
  const linkedId = typeof value.sourcePageId === 'string' ? value.sourcePageId : value.sourcePageId?._id;
  const linkedTitle = typeof value.sourcePageId === 'object' ? value.sourcePageId?.title : 'Linked note';
  const taskGroups = useTaskGroups();
  const staff = useStaffList();
  // Keep a removed staff member selectable on tasks already assigned to them
  const assigneeKnown = !value.assignedTo || (staff || []).some(p => p._id === value.assignedTo?.staffId);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const title = value.title?.trim();
    if (!title) {setError('Give this task a title first.'); return;}
    if (value.recurrence?.freq && value.recurrence.freq !== 'none' && !value.dueDate) {setError('Choose a due date for a repeating task.'); return;}
    if (value.subtasks?.some(item => !item.title.trim())) {setError('Give every checklist item a name or remove empty items.'); return;}
    setError(null);
    try {
      await run(key, async () => {
        const payload = {...(task ? {} : defaults), ...draft, ...(draft.tags ? {tags: draft.tags.map(tag => tag.trim()).filter(Boolean)} : {}), title, ...(draft.sourcePageId !== undefined ? {sourcePageId: linkedId || null} : {}), ...(draft.vendorSectionId !== undefined || (!task && defaults?.vendorSectionId) ? {vendorSectionId: vendorIdOf(value)} : {})};
        if (task) {const result = await saveTaskChanges(task, payload); if (result.warning) setError(result.warning);}
        else await api.create({priority: 'None', status: 'todo', isCompleted: false, ...payload});
        setDraft(key, null);
        setSaved(true);
        if (!task) onClose();
      });
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Could not save. Your changes are still here.');}
  };
  const action = async (operation: () => Promise<unknown>, close = false) => {
    setError(null);
    try {await run(key, operation); if (close) onClose();}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Could not update the task.');}
  };
  const toDate = (date?: string) => {
    if (!date) return '';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '';
    return `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`;
  };
  return <div className={styles.editor}>
    <div className={styles.editorHeading}><span>{task ? 'TASK DETAILS' : 'NEW TASK'}</span><button aria-label="Close task details" onClick={onClose} type="button"><X size={16}/></button></div>
    <form onSubmit={save}>
      <fieldset disabled={pending}>
        <label htmlFor={`${prefix}-title`}>Task name</label>
        <textarea className={styles.titleInput} id={`${prefix}-title`} onChange={e => change({title: e.target.value})} placeholder="What needs to happen?" required rows={2} value={value.title || ''} />
        <div className={styles.fieldGrid}>
          <div><label htmlFor={`${prefix}-status`}>Status</label><select id={`${prefix}-status`} onChange={e => change({status: e.target.value, isCompleted: e.target.value === 'done'})} value={value.isCompleted ? 'done' : value.status || 'todo'}><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Complete</option></select></div>
          <div><label htmlFor={`${prefix}-priority`}>Priority</label><select id={`${prefix}-priority`} onChange={e => change({priority: e.target.value as Task['priority']})} value={value.priority || 'None'}>{Object.keys(PRIORITY_META).map(priority => <option key={priority}>{priority}</option>)}</select></div>
          <div><label htmlFor={`${prefix}-due`}>Due date</label><input id={`${prefix}-due`} onChange={e => change({dueDate: e.target.value ? new Date(`${e.target.value}T17:00:00`).toISOString() : ''})} type="date" value={toDate(value.dueDate)}/></div>
          <div><label htmlFor={`${prefix}-bucket`}>Category</label><select id={`${prefix}-bucket`} onChange={e => change({bucket: e.target.value as TaskBucket})} value={bucketOf(value)}>{TASK_BUCKETS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}</select></div>
        </div>
        <div className={styles.vendorLink}>
          <label htmlFor={`${prefix}-assignee`}>Assigned to</label>
          <div>
            <select
              id={`${prefix}-assignee`}
              onChange={e => {
                const person = (staff || []).find(p => p._id === e.target.value);
                if (e.target.value === 'current') return;
                change({assignedTo: person ? {staffId: person._id, name: person.name, email: person.email || ''} : null});
              }}
              value={value.assignedTo ? (assigneeKnown ? value.assignedTo.staffId || '' : 'current') : ''}>
              <option value="">{staff === null ? 'Loading…' : 'Not assigned'}</option>
              {!assigneeKnown && value.assignedTo && <option value="current">{value.assignedTo.name}</option>}
              {(staff || []).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <AssigneePill assignee={value.assignedTo} />
          </div>
        </div>
        <label htmlFor={`${prefix}-subject`}>Email subject</label>
        <div className={styles.subjectField}>
          <input id={`${prefix}-subject`} onChange={e => change({emailSubject: e.target.value})} placeholder="Paste the email chain's subject to find it in Outlook" value={value.emailSubject || ''}/>
          <CopySubjectButton subject={value.emailSubject}/>
        </div>
        <label htmlFor={`${prefix}-notes`}>Description</label><textarea id={`${prefix}-notes`} onChange={e => change({notes: e.target.value})} placeholder="Add context, a plan, or a useful detail…" rows={4} value={value.notes || ''}/>
        <label htmlFor={`${prefix}-tags`}>Tags</label><input id={`${prefix}-tags`} onChange={e => change({tags: e.target.value.split(',').map(tag => tag.trimStart())})} placeholder="Separate tags with commas" value={(value.tags || []).join(', ')}/>
        <div className={styles.subtaskHeading}>Checklist <span>{value.subtasks?.filter(item => item.isCompleted).length || 0}/{value.subtasks?.length || 0}</span></div>
        {(value.subtasks || []).map((item, index) => <div className={styles.subtask} key={item._id || index}><input aria-label={`Complete ${item.title}`} checked={item.isCompleted} onChange={e => change({subtasks: value.subtasks?.map((entry, i) => i === index ? {...entry, isCompleted: e.target.checked} : entry)})} type="checkbox"/><input aria-label={`Checklist item ${index+1}`} onChange={e => change({subtasks: value.subtasks?.map((entry, i) => i === index ? {...entry, title: e.target.value} : entry)})} value={item.title}/><button aria-label={`Remove ${item.title}`} onClick={() => change({subtasks: value.subtasks?.filter((_, i) => i !== index)})} type="button"><X size={14}/></button></div>)}
        <div className={styles.addSubtask}><input aria-label="New checklist item" onChange={e => setSubtask(e.target.value)} onKeyDown={e => {if (e.key === 'Enter') {e.preventDefault(); if (subtask.trim()) {change({subtasks: [...(value.subtasks || []), {title: subtask.trim(), isCompleted: false}]}); setSubtask('');}}}} placeholder="Add a step…" value={subtask}/><button aria-label="Add checklist item" disabled={!subtask.trim()} onClick={() => {change({subtasks: [...(value.subtasks || []), {title: subtask.trim(), isCompleted: false}]}); setSubtask('');}} type="button"><Plus size={16}/></button></div>
        <div className={styles.noteLink}>
          <span><FileText size={14}/> Connected note</span>
          {linkedId ? <div><button onClick={() => openNote ? openNote(linkedId) : window.location.assign(`/notes?pageId=${encodeURIComponent(linkedId)}`)} type="button">{linkedTitle || 'Open note'}</button><button aria-label="Unlink note" onClick={() => change({sourcePageId: null})} type="button"><X size={14}/></button></div> : <div>{note && <button onClick={() => change({sourcePageId: {_id: note.id, title: note.title}})} type="button">Link current note</button>}<button onClick={() => setLinking(true)} type="button">Choose a note</button></div>}
        </div>
        <div className={styles.vendorLink}>
          <label htmlFor={`${prefix}-vendor`}>Vendor or project</label>
          <div><VendorSelect id={`${prefix}-vendor`} onChange={vendor => change({vendorSectionId: vendor})} value={vendorOf(value) || (vendorIdOf(value) ? {_id: vendorIdOf(value)!, name: 'Linked vendor'} : null)}/>{vendorOf(value) && task && <VendorPill task={value as Task}/>}</div>
        </div>
        {!vendorIdOf(value) && (
          <div className={styles.vendorLink}>
            <label htmlFor={`${prefix}-group`}>My group</label>
            <div>
              <select id={`${prefix}-group`} onChange={e => change({taskGroupId: e.target.value || null})} value={value.taskGroupId || ''}>
                <option value="">{taskGroups?.length ? 'No group' : 'No groups yet (create one from the task list)'}</option>
                {(taskGroups || []).map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <details className={styles.more}><summary>More options <ChevronDown size={14}/></summary><label htmlFor={`${prefix}-category`}>Label</label><input id={`${prefix}-category`} onChange={e => change({category: e.target.value})} placeholder="Optional, e.g. Vendor Management" value={value.category || ''}/><label htmlFor={`${prefix}-repeat`}>Repeat</label><select id={`${prefix}-repeat`} onChange={e => change({recurrence: {freq: e.target.value as NonNullable<Task['recurrence']>['freq'], interval: 1}})} value={value.recurrence?.freq || 'none'}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select><p>Repeating tasks need a due date. Completing one creates the next occurrence.</p><label htmlFor={`${prefix}-estimate`}>Estimated minutes</label><input id={`${prefix}-estimate`} min="0" onChange={e => change({estimatedTime: e.target.value ? Number(e.target.value) : 0})} type="number" value={value.estimatedTime ?? ''}/>{task?.attachments?.length ? <AttachmentGallery attachments={task.attachments} compact taskId={task._id}/> : null}</details>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <div className={styles.saveRow}><span role="status">{pending ? 'Saving…' : dirty ? 'Unsaved changes' : saved ? 'All changes saved' : 'Up to date'}</span><button className={styles.primary} disabled={pending || (!!task && !dirty)} type="submit"><Check size={14}/>{task ? 'Save changes' : 'Create task'}</button></div>
      </fieldset>
    </form>
    {task && <div className={styles.taskActions}>
      <button disabled={pending} onClick={() => void action(() => api.update(task._id, {isArchived: !task.isArchived}), true)}><Archive size={14}/>{task.isArchived ? 'Restore' : 'Archive'}</button>
      <button disabled={pending} onClick={() => void action(() => api.create({title: `${task.title} (copy)`, notes: task.notes, priority: task.priority, dueDate: task.dueDate || null, tags: task.tags, category: task.category, sourcePageId: typeof task.sourcePageId === 'object' ? task.sourcePageId?._id : task.sourcePageId, vendorSectionId: vendorIdOf(task), bucket: bucketOf(task), taskGroupId: task.taskGroupId || null, emailSubject: task.emailSubject || '', assignedTo: task.assignedTo || null, subtasks: task.subtasks?.map(item => ({title: item.title, isCompleted: false}))}))}><Copy size={14}/>Duplicate</button>
      <button className={styles.danger} disabled={pending} onClick={() => {if (window.confirm(`Permanently delete “${task.title}”? You can archive it instead.`)) void action(async () => {await api.remove(task._id); setDraft(key, null);}, true);}}><Trash2 size={14}/>Delete</button>
    </div>}
    {linking && <NoteLinkModal onClose={() => setLinking(false)} onLinked={page => {change({sourcePageId: page}); setLinking(false);}} taskTitle={value.title || 'New note'}/>}
  </div>;
}

const BUCKET_KEY = 'TASKS_BUCKET';
// 'people' is the Follow up tab: tasks you assigned to someone, grouped by person
type BucketTab = TaskBucket | 'all' | 'people';

/** "Just now", "3h", "Yesterday", "Oct 3" — shown on Done rows only. */
function completedAgo(task: Task) {
  const ms = Date.now() - completedTime(task);
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  return new Date(completedTime(task)).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

/** `mobile` (used by the /tasks page on phones) builds on the compact sidebar layout with touch-sized controls. */
export default function TaskWorkspace({compact = false, mobile = false, note, onExpand, onAdvanced, onCollapse}: {compact?: boolean; mobile?: boolean; note?: NoteContext; onExpand?: () => void; onAdvanced?: () => void; onCollapse?: () => void}) {
  const {tasks, loading, error, refresh, busy, run, drafts, olderDone, loadOlderDone} = useTaskCollection();
  const [filter, setFilter] = useState<Filter>('open');
  const [bucket, setBucket] = useState<BucketTab>('work');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  // AI capture: null = closed; an object (possibly empty) = open, seeded with what was pasted
  const [capture, setCapture] = useState<CaptureSeed | null>(null);
  const [assigning, setAssigning] = useState(false);
  // Group the list by the project or vendor each task is linked to (remembered in this browser)
  const [grouped, setGrouped] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const vendorOptions = useVendorOptions();
  const taskGroups = useTaskGroups();
  const openVendor = useContext(OpenVendorContext);
  // A new task started from a group header lands in that group
  const [newDefaults, setNewDefaults] = useState<{key: string; fields: Partial<Task>}>({key: '', fields: {}});
  // Creating / renaming your own groups inline: null = idle, '' = creating, an id = renaming
  const [groupForm, setGroupForm] = useState<{id: string; name: string} | null>(null);
  const groupFormCancelled = useRef(false);

  useEffect(() => {
    try {
      setGrouped(localStorage.getItem('TASKS_GROUPED') !== 'false');
      setCollapsedGroups(JSON.parse(localStorage.getItem('TASKS_COLLAPSED_GROUPS') || '[]'));
      const savedBucket = localStorage.getItem(BUCKET_KEY) as BucketTab | null;
      if (savedBucket && (savedBucket === 'all' || savedBucket === 'people' || TASK_BUCKETS.some(b => b.key === savedBucket))) setBucket(savedBucket);
    } catch {
      // storage unavailable
    }
  }, []);
  const remember = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage unavailable
    }
  };
  // Keep the chosen category chip visible when the strip scrolls sideways (phones)
  const bucketNavRef = useRef<HTMLElement>(null);
  const tappedBucket = useRef(false);
  useEffect(() => {
    const active = bucketNavRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const nav = bucketNavRef.current;
    if (!active || !nav || nav.scrollWidth <= nav.clientWidth) return;
    // Smooth when you tap a chip; instant when restoring the last tab (a smooth scroll gets cut off while tasks load)
    nav.scrollTo({left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2, behavior: tappedBucket.current ? 'smooth' : 'auto'});
    tappedBucket.current = false;
  }, [bucket, loading]);
  const chooseBucket = (next: BucketTab) => {
    tappedBucket.current = true;
    setBucket(next);
    remember(BUCKET_KEY, next);
  };
  const toggleGrouped = () => {
    setGrouped(v => {
      remember('TASKS_GROUPED', String(!v));
      return !v;
    });
  };
  const toggleGroup = (key: string) => {
    setCollapsedGroups(list => {
      const next = list.includes(key) ? list.filter(k => k !== key) : [...list, key];
      remember('TASKS_COLLAPSED_GROUPS', JSON.stringify(next));
      return next;
    });
  };

  // New tasks go into the open category tab ("All" files them under Work)
  const newBucket: TaskBucket = bucket === 'all' || bucket === 'people' ? 'work' : bucket;
  const bucketLabel = TASK_BUCKETS.find(b => b.key === newBucket)!.label;

  const live = useMemo(() => tasks.filter(task => !task.isTemplate), [tasks]);
  const openCounts = useMemo(() => {
    const counts: Record<string, number> = {all: 0};
    live.forEach(task => {
      if (task.isArchived || statusOf(task) === 'done') return;
      counts.all += 1;
      counts[bucketOf(task)] = (counts[bucketOf(task)] || 0) + 1;
      if (task.assignedTo?.name) counts.people = (counts.people || 0) + 1;
    });
    return counts;
  }, [live]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = live.filter(task => {
      if (bucket === 'people' ? !task.assignedTo?.name : bucket !== 'all' && bucketOf(task) !== bucket) return false;
      if (filter === 'archive') {
        if (!task.isArchived) return false;
      } else if (task.isArchived) return false;
      else if (filter === 'done' ? statusOf(task) !== 'done' : statusOf(task) === 'done') return false;
      if (filter === 'today' && (daysUntil(task.dueDate) === null || daysUntil(task.dueDate)! > 0)) return false;
      if (filter === 'note' && (!note || (typeof task.sourcePageId === 'object' ? task.sourcePageId?._id : task.sourcePageId) !== note.id)) return false;
      return !q || `${task.title} ${task.category || ''} ${(task.tags || []).join(' ')}`.toLowerCase().includes(q);
    });
    // Done: most recently completed first. Archive: most recently touched first.
    if (filter === 'done') return list.sort((a, b) => completedTime(b) - completedTime(a));
    if (filter === 'archive') return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list.sort(smartCompare);
  }, [live, bucket, filter, note, query]);

  const selectedTask = tasks.find(task => task._id === selected);
  const execute = async (key: string, action: () => Promise<unknown>) => {
    setActionError(null);
    setNotice('');
    try {
      await run(key, action);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    }
  };
  const toggle = (task: Task) =>
    void execute(task._id, async () => {
      const complete = statusOf(task) !== 'done';
      const result = await saveTaskChanges(task, {isCompleted: complete, status: complete ? 'done' : 'todo'});
      if (result.warning) setActionError(result.warning);
      setNotice(complete ? 'Task completed' : 'Task reopened');
    });

  const kindOf = (id: string) => vendorOptions?.find(v => v._id === id)?.kind || 'vendor';
  // Projects, then vendors, then your own groups, each A–Z; tasks keep the list's order inside a group; the rest last
  type GroupKind = 'project' | 'vendor' | 'mine' | 'none' | 'person';
  type TaskGroupView = {key: string; id: string; kind: GroupKind; name: string; notebookId?: string; assignee?: Task['assignedTo']; tasks: Task[]};
  const groups = useMemo(() => {
    const map = new Map<string, TaskGroupView>();
    // Follow up tab: one heading per person you assigned work to, A–Z
    if (bucket === 'people') {
      visible.forEach(task => {
        const a = task.assignedTo!;
        const key = `p:${a.staffId || a.name.trim().toLowerCase()}`;
        if (!map.has(key)) map.set(key, {key, id: a.staffId || '', kind: 'person', name: a.name, assignee: a, tasks: []});
        map.get(key)!.tasks.push(task);
      });
      return [...map.values()].sort((x, y) => x.name.localeCompare(y.name));
    }
    const mine = new Map((taskGroups || []).map(g => [g._id, g.name]));
    // Your groups show even when empty in Open, so a new group is somewhere to add tasks
    if (filter === 'open' && !query.trim()) mine.forEach((name, id) => map.set(`g:${id}`, {key: `g:${id}`, id, kind: 'mine', name, tasks: []}));
    visible.forEach(task => {
      const vendorId = vendorIdOf(task);
      const groupId = !vendorId && task.taskGroupId && mine.has(task.taskGroupId) ? task.taskGroupId : null;
      const key = vendorId || (groupId ? `g:${groupId}` : 'none');
      if (!map.has(key)) {
        const known = vendorOf(task);
        map.set(
          key,
          vendorId
            ? {key, id: vendorId, kind: kindOf(vendorId) === 'project' ? 'project' : 'vendor', name: known?.name || 'Linked', notebookId: known?.categoryId, tasks: []}
            : groupId
              ? {key, id: groupId, kind: 'mine', name: mine.get(groupId)!, tasks: []}
              : {key, id: '', kind: 'none', name: 'No group', tasks: []},
        );
      }
      map.get(key)!.tasks.push(task);
    });
    const rank: Record<GroupKind, number> = {person: 0, project: 0, vendor: 1, mine: 2, none: 3};
    return [...map.values()].sort((a, b) => rank[a.kind] - rank[b.kind] || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, vendorOptions, taskGroups, filter, query, bucket]);
  // Done and Archive read best as one recency-ordered list
  const showGroups = grouped && filter !== 'done' && filter !== 'archive';

  // A row is just the checkbox and title; glow icons and linking appear on hover
  const renderRow = (task: Task, inGroup: boolean, underPerson = false) => {
    const done = statusOf(task) === 'done';
    return (
      <article
        className={styles.row}
        data-done={done}
        data-glow={glowOf(task) || undefined}
        data-selected={selected === task._id}
        key={task._id}
        style={glowStyle(task)}>
        <button
          aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`}
          aria-pressed={done}
          className={styles.checkbox}
          disabled={busy.includes(task._id)}
          onClick={() => toggle(task)}>
          {done && <Check size={12} />}
        </button>
        <button className={styles.rowTitle} onClick={() => setSelected(task._id)} title={task.title}>
          {task.title}
          {drafts[task._id] && <em className={styles.draftDot} title="Unsaved edits" />}
        </button>
        {filter === 'done' && <time className={styles.rowTime}>{completedAgo(task)}</time>}
        <div className={styles.rowTools}>
          {vendorIdOf(task) ? !inGroup && <VendorPill task={task} /> : <span className={styles.hoverOnly}><LinkVendorButton task={task} /></span>}
          {!underPerson && <AssigneePill assignee={task.assignedTo} />}
          <CopySubjectButton size={12} subject={task.emailSubject} />
          <GlowToggles size={12} task={task} />
        </div>
      </article>
    );
  };

  const startTaskIn = (group: TaskGroupView) => {
    const fields: Partial<Task> =
      group.kind === 'mine'
        ? {taskGroupId: group.id}
        : group.kind === 'person'
          ? {assignedTo: group.assignee || null}
          : group.kind === 'none'
            ? {}
            : {vendorSectionId: group.id};
    setNewDefaults({key: group.key, fields});
    setSelected('new');
  };
  const saveGroupForm = async () => {
    if (!groupForm || groupFormCancelled.current) return;
    const name = groupForm.name.trim();
    if (!name) {
      setGroupForm(null);
      return;
    }
    await execute('group-form', async () => {
      if (groupForm.id) await taskGroupsApi.rename(groupForm.id, name);
      else await taskGroupsApi.create(name);
      setGroupForm(null);
      setNotice(groupForm.id ? 'Group renamed' : `Group “${name}” created`);
    });
  };
  const deleteGroup = (group: TaskGroupView) => {
    const count = group.tasks.length;
    if (!window.confirm(`Delete the group “${group.name}”?${count ? ` Its ${count} task${count === 1 ? '' : 's'} will stay, just without a group.` : ''}`)) return;
    void execute(`group-${group.id}`, async () => {
      await taskGroupsApi.remove(group.id);
      setNotice('Group deleted');
    });
  };
  const groupInput = (placeholder: string) =>
    groupForm && (
      <form
        className={styles.groupForm}
        onSubmit={e => {
          e.preventDefault();
          void saveGroupForm();
        }}>
        <Tag size={13} />
        <input
          aria-label={placeholder}
          autoFocus
          maxLength={80}
          onBlur={() => void saveGroupForm()}
          onChange={e => setGroupForm({...groupForm, name: e.target.value})}
          onKeyDown={e => {
            if (e.key !== 'Escape') return;
            groupFormCancelled.current = true;
            setGroupForm(null);
          }}
          placeholder={placeholder}
          value={groupForm.name}
        />
      </form>
    );

  const KIND_LABEL: Record<GroupKind, string> = {project: 'Project', vendor: 'Vendor', mine: 'My group', none: '', person: 'Assigned to'};
  const renderGroups = () => (
    <>
      {groups.map(group => {
        const collapsed = collapsedGroups.includes(group.key);
        const Icon = group.kind === 'none' ? Inbox : group.kind === 'project' ? FolderKanban : group.kind === 'vendor' ? Building2 : Tag;
        const initials = group.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map(part => part[0]!.toUpperCase())
          .join('');
        const renaming = groupForm?.id && groupForm.id === group.id && group.kind === 'mine';
        return (
          <div className={styles.group} data-kind={group.kind} key={group.key}>
            <div className={styles.groupHead}>
              {renaming ? (
                groupInput('Group name')
              ) : (
                <button aria-expanded={!collapsed} className={styles.groupToggle} onClick={() => toggleGroup(group.key)}>
                  <ChevronDown className={styles.groupChevron} data-collapsed={collapsed} size={13} />
                  <span className={styles.groupIcon}>{group.kind === 'person' ? initials : <Icon size={13} />}</span>
                  <span className={styles.groupText}>
                    {KIND_LABEL[group.kind] && <small className={styles.groupKind}>{KIND_LABEL[group.kind]}</small>}
                    <strong className={styles.groupName}>{group.name}</strong>
                  </span>
                  <span className={styles.groupCount}>{group.tasks.length}</span>
                </button>
              )}
              {!renaming && (
                <span className={styles.groupTools}>
                  <button aria-label={`Add a task to ${group.name}`} onClick={() => startTaskIn(group)} title={`New task in ${group.name}`}>
                    <Plus size={14} />
                  </button>
                  {group.kind === 'mine' && (
                    <>
                      <button aria-label={`Rename ${group.name}`} onClick={() => {
                          groupFormCancelled.current = false;
                          setGroupForm({id: group.id, name: group.name});
                        }} title="Rename group">
                        <Pencil size={13} />
                      </button>
                      <button aria-label={`Delete ${group.name}`} disabled={busy.includes(`group-${group.id}`)} onClick={() => deleteGroup(group)} title="Delete group (tasks are kept)">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  {(group.kind === 'project' || group.kind === 'vendor') && openVendor && (
                    <button className={styles.groupOpen} onClick={() => openVendor(group.id, group.notebookId)} title={`Open the ${group.name} page`}>
                      Open
                    </button>
                  )}
                </span>
              )}
            </div>
            {!collapsed && group.tasks.map(task => renderRow(task, group.kind === 'project' || group.kind === 'vendor', group.kind === 'person'))}
            {!collapsed && !group.tasks.length && <p className={styles.groupEmpty}>No open tasks. Use + or “+ Group” on any task.</p>}
          </div>
        );
      })}
      {bucket === 'people' ? null : groupForm && !groupForm.id ? (
        <div className={styles.newGroupRow}>{groupInput('New group name, press Enter')}</div>
      ) : (
        <button className={styles.newGroup} onClick={() => {
          groupFormCancelled.current = false;
          setGroupForm({id: '', name: ''});
        }}>
          <Plus size={13} /> New group
        </button>
      )}
    </>
  );

  const statusTabs: [Filter, string][] = [
    ['open', 'Open'],
    ['today', 'Today'],
    ...(note ? [['note', 'This note'] as [Filter, string]] : []),
    ['done', 'Done'],
    ['archive', 'Archive'],
  ];

  const editor =
    selected === 'new' || selectedTask ? (
      <TaskEditor
        defaults={{bucket: newBucket, ...newDefaults.fields}}
        draftKey={`new-${newBucket}${newDefaults.key ? `-${newDefaults.key}` : ''}`}
        key={selected === 'new' ? `new-${newBucket}-${newDefaults.key}` : selected}
        note={note}
        onClose={() => {
          if (selected === 'new') {
            setFilter('open');
            setQuery('');
            setNewDefaults({key: '', fields: {}});
          }
          setSelected(null);
        }}
        task={selectedTask}
      />
    ) : null;

  const emptyTitle = query ? 'No matches' : filter === 'done' ? 'Nothing completed here yet' : filter === 'archive' ? 'Nothing archived' : 'A little breathing room';
  const emptyText =
    bucket === 'people' && !query
      ? 'Tasks you hand to someone with Assign work (or assign in a task) show here, grouped by person.'
      : query
    ? 'Try another title, label, or tag.'
    : filter === 'note'
    ? 'Add a task linked to this note.'
    : filter === 'done'
    ? 'Tasks you complete show up here, newest first.'
    : `Add a task to ${bucket === 'all' ? 'any category' : bucketLabel} above.`;

  return (
    <section
      aria-label={compact && !mobile ? 'Task sidebar' : 'Tasks workspace'}
      className={`${styles.workspace} ${compact ? styles.compact : ''} ${mobile ? styles.mobile : ''}`}
      data-editing={!!(compact && editor)}>
      {assigning && <AssignWorkWindow onClose={() => setAssigning(false)} />}
      {capture && (
        <CaptureModal
          defaults={{bucket: newBucket, ...(filter === 'note' && note ? {sourcePageId: note.id} : {})}}
          onClose={() => setCapture(null)}
          onCreated={task => {
            setCapture(null);
            if (filter === 'done' || filter === 'archive') setFilter('open');
            setQuery('');
            setSelected(task._id);
            setNotice(`AI task added to ${bucketLabel}`);
          }}
          seed={capture}
        />
      )}
      <div className={styles.listPane}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>A LITTLE PROGRESS, EVERY DAY</span>
            <h2>
              Tasks<span>{openCounts.all}</span>
            </h2>
          </div>
          <div>
            {onExpand && (
              <button aria-label="Expand tasks workspace" onClick={onExpand}>
                <Maximize2 size={16} />
              </button>
            )}
            <button aria-label="Create task from pasted email or notes with AI" className={styles.aiButton} onClick={() => setCapture({})} title={`Paste an email or notes, Gemini writes the task (${bucketLabel})`}>
              <Sparkles size={16} />
            </button>
            <button aria-label="Assign work to someone" className={styles.assignButton} onClick={() => setAssigning(true)} title="Assign work: draft an email to a staff member and add a follow-up task">
              <Send size={15} />
            </button>
            <button aria-label={`New ${bucketLabel} task`} className={styles.addButton} onClick={() => {
                setNewDefaults({key: '', fields: {}});
                setSelected('new');
              }}
              title={`New task in ${bucketLabel}`}>
              <Plus size={18} />
            </button>
            {onCollapse && (
              <button aria-label="Minimize task sidebar" onClick={onCollapse} title="Minimize">
                <ChevronsRight size={16} />
              </button>
            )}
          </div>
        </header>

        <nav aria-label="Task categories" className={styles.bucketTabs} ref={bucketNavRef} role="tablist">
          {[
            ...TASK_BUCKETS.map(b => ({key: b.key as BucketTab, label: b.short, title: b.label})),
            {key: 'people' as BucketTab, label: 'Follow up', title: 'Everything you assigned to someone, grouped by person'},
            {key: 'all' as BucketTab, label: 'All', title: 'All categories'},
          ].map(tab => (
            <button aria-selected={bucket === tab.key} className={styles.bucketTab} key={tab.key} onClick={() => chooseBucket(tab.key)} role="tab" title={tab.title}>
              {tab.label}
              {(openCounts[tab.key] || 0) > 0 && <span>{openCounts[tab.key]}</span>}
            </button>
          ))}
        </nav>

        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Search size={14} />
            <input aria-label="Search tasks" onChange={e => setQuery(e.target.value)} placeholder="Find a task…" value={query} />
            {query && (
              <button aria-label="Clear task search" onClick={() => setQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <button
            aria-label={showGroups ? 'Show one list' : 'Group by project or vendor'}
            aria-pressed={grouped}
            className={styles.groupSwitch}
            onClick={toggleGrouped}
            title={grouped ? 'Grouped by project or vendor. Click for one list.' : 'Group by project or vendor'}>
            <Layers size={14} />
          </button>
        </div>

        <div aria-label="Filter tasks" className={styles.statusTabs}>
          {statusTabs.map(([key, label]) => (
            <button aria-pressed={filter === key} key={key} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>

        {filter !== 'done' && filter !== 'archive' && bucket !== 'people' && (
          <form
            className={styles.quickAdd}
            onSubmit={e => {
              e.preventDefault();
              if (!quickTitle.trim() || busy.includes('quick')) return;
              const title = quickTitle.trim();
              void execute('quick', async () => {
                await api.create({
                  title,
                  priority: 'None',
                  status: 'todo',
                  bucket: newBucket,
                  ...(filter === 'today' ? {dueDate: new Date(new Date().setHours(17, 0, 0, 0)).toISOString()} : {}),
                  ...(filter === 'note' && note ? {sourcePageId: note.id} : {}),
                });
                setQuickTitle('');
                setNotice(`Added to ${bucketLabel}`);
              });
            }}>
            <Plus size={15} />
            <input
              aria-label="Quick add task"
              disabled={busy.includes('quick')}
              onChange={e => setQuickTitle(e.target.value)}
              onPaste={e => {
                // An email chain, long notes or a screenshot goes to the AI instead of becoming a title
                const image = Array.from(e.clipboardData.files).find(f => f.type.startsWith('image/'));
                const pasted = e.clipboardData.getData('text');
                if (image || /\n/.test(pasted.trim()) || pasted.trim().length > 120) {
                  e.preventDefault();
                  setCapture(image ? {file: image} : {text: pasted});
                }
              }}
              placeholder={`Add to ${bucketLabel}, or paste an email for AI`}
              value={quickTitle}
            />
            <button aria-label="Add task" disabled={!quickTitle.trim() || busy.includes('quick')} type="submit">
              <ChevronRight size={16} />
            </button>
          </form>
        )}

        {(error || actionError) && (
          <div className={styles.error} role="alert">
            {error || actionError}
            {error && <button onClick={() => void refresh()}>Try again</button>}
          </div>
        )}

        <div className={styles.list}>
          {compact && editor && (
            <div className={styles.inlineEditor}>
              <button className={styles.back} onClick={() => setSelected(null)}>
                <ArrowLeft size={mobile ? 18 : 14} />
                {mobile ? 'Tasks' : 'Back to list'}
              </button>
              {editor}
            </div>
          )}
          {(!compact || !editor) &&
            (loading && !tasks.length ? (
              <div className={styles.empty} role="status">
                Loading your tasks…
              </div>
            ) : !visible.length && !(showGroups && groups.length) ? (
              <div className={styles.empty}>
                <CheckCheck size={28} />
                <strong>{emptyTitle}</strong>
                <p>{emptyText}</p>
                {showGroups && filter === 'open' && renderGroups()}
              </div>
            ) : showGroups ? (
              renderGroups()
            ) : (
              visible.map(task => renderRow(task, false))
            ))}
          {(!compact || !editor) && (filter === 'done' || filter === 'archive') && !loading && (
            <div className={styles.olderDone}>
              {olderDone.loaded ? (
                <span>Showing every completed task.</span>
              ) : (
                <>
                  <span>Completed tasks from the last {olderDone.windowDays} days.</span>
                  {olderDone.hidden > 0 && (
                    <button disabled={busy.includes('older-done')} onClick={() => void execute('older-done', loadOlderDone)}>
                      {busy.includes('older-done') ? 'Loading…' : `Load ${olderDone.hidden} older`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {mobile && !editor && (
          <button
            aria-label={`New ${bucketLabel} task`}
            className={styles.fab}
            onClick={() => {
              setNewDefaults({key: '', fields: {}});
              setSelected('new');
            }}>
            <Plus size={24} />
          </button>
        )}
        <footer className={styles.footer}>
          <span role="status">{notice || `${visible.length} ${visible.length === 1 ? 'task' : 'tasks'} in this view`}</span>
          {onAdvanced && <button onClick={onAdvanced}>Board & tools</button>}
        </footer>
      </div>
      {!compact && (
        <div className={styles.detailPane}>
          {editor || (
            <div className={styles.detailEmpty}>
              <ListTodo size={40} />
              <h2>One thing at a time.</h2>
              <p>Select a task to make a plan, add a checklist, or connect it to a note.</p>
              <button className={styles.primary} onClick={() => setSelected('new')}>
                <Plus size={16} />
                Create a {bucketLabel.toLowerCase()} task
              </button>
              {Object.keys(drafts).length > 0 && <small>Your unfinished task edits are kept when switching views.</small>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
