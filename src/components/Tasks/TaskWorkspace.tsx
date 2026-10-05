/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {Archive, ArrowLeft, Building2, Check, CheckCheck, ChevronDown, ChevronRight, ChevronsRight, Copy, FileText, FolderKanban, Inbox, Layers, ListTodo, Maximize2, Plus, Search, Trash2, X} from 'lucide-react';
import React, {useContext, useEffect, useId, useMemo, useState} from 'react';

import {api} from './api';
import AttachmentGallery from './AttachmentGallery';
import NoteLinkModal from './NoteLinkModal';
import {saveTaskChanges} from './taskActions';
import {glowStyle, GlowToggles, LinkVendorButton, useVendorOptions, VendorPill, VendorSelect} from './TaskExtras';
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
        <details className={styles.more}><summary>More options <ChevronDown size={14}/></summary><label htmlFor={`${prefix}-category`}>Label</label><input id={`${prefix}-category`} onChange={e => change({category: e.target.value})} placeholder="Optional, e.g. Vendor Management" value={value.category || ''}/><label htmlFor={`${prefix}-repeat`}>Repeat</label><select id={`${prefix}-repeat`} onChange={e => change({recurrence: {freq: e.target.value as NonNullable<Task['recurrence']>['freq'], interval: 1}})} value={value.recurrence?.freq || 'none'}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select><p>Repeating tasks need a due date. Completing one creates the next occurrence.</p><label htmlFor={`${prefix}-estimate`}>Estimated minutes</label><input id={`${prefix}-estimate`} min="0" onChange={e => change({estimatedTime: e.target.value ? Number(e.target.value) : 0})} type="number" value={value.estimatedTime ?? ''}/>{task?.attachments?.length ? <AttachmentGallery attachments={task.attachments} compact taskId={task._id}/> : null}</details>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <div className={styles.saveRow}><span role="status">{pending ? 'Saving…' : dirty ? 'Unsaved changes' : saved ? 'All changes saved' : 'Up to date'}</span><button className={styles.primary} disabled={pending || (!!task && !dirty)} type="submit"><Check size={14}/>{task ? 'Save changes' : 'Create task'}</button></div>
      </fieldset>
    </form>
    {task && <div className={styles.taskActions}>
      <button disabled={pending} onClick={() => void action(() => api.update(task._id, {isArchived: !task.isArchived}), true)}><Archive size={14}/>{task.isArchived ? 'Restore' : 'Archive'}</button>
      <button disabled={pending} onClick={() => void action(() => api.create({title: `${task.title} (copy)`, notes: task.notes, priority: task.priority, dueDate: task.dueDate || null, tags: task.tags, category: task.category, sourcePageId: typeof task.sourcePageId === 'object' ? task.sourcePageId?._id : task.sourcePageId, vendorSectionId: vendorIdOf(task), bucket: bucketOf(task), subtasks: task.subtasks?.map(item => ({title: item.title, isCompleted: false}))}))}><Copy size={14}/>Duplicate</button>
      <button className={styles.danger} disabled={pending} onClick={() => {if (window.confirm(`Permanently delete “${task.title}”? You can archive it instead.`)) void action(async () => {await api.remove(task._id); setDraft(key, null);}, true);}}><Trash2 size={14}/>Delete</button>
    </div>}
    {linking && <NoteLinkModal onClose={() => setLinking(false)} onLinked={page => {change({sourcePageId: page}); setLinking(false);}} taskTitle={value.title || 'New note'}/>}
  </div>;
}

const BUCKET_KEY = 'TASKS_BUCKET';
type BucketTab = TaskBucket | 'all';

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

export default function TaskWorkspace({compact = false, note, onExpand, onAdvanced, onCollapse}: {compact?: boolean; note?: NoteContext; onExpand?: () => void; onAdvanced?: () => void; onCollapse?: () => void}) {
  const {tasks, loading, error, refresh, busy, run, drafts} = useTaskCollection();
  const [filter, setFilter] = useState<Filter>('open');
  const [bucket, setBucket] = useState<BucketTab>('work');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  // Group the list by the project or vendor each task is linked to (remembered in this browser)
  const [grouped, setGrouped] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const vendorOptions = useVendorOptions();
  const openVendor = useContext(OpenVendorContext);

  useEffect(() => {
    try {
      setGrouped(localStorage.getItem('TASKS_GROUPED') !== 'false');
      setCollapsedGroups(JSON.parse(localStorage.getItem('TASKS_COLLAPSED_GROUPS') || '[]'));
      const savedBucket = localStorage.getItem(BUCKET_KEY) as BucketTab | null;
      if (savedBucket && (savedBucket === 'all' || TASK_BUCKETS.some(b => b.key === savedBucket))) setBucket(savedBucket);
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
  const chooseBucket = (next: BucketTab) => {
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
  const newBucket: TaskBucket = bucket === 'all' ? 'work' : bucket;
  const bucketLabel = TASK_BUCKETS.find(b => b.key === newBucket)!.label;

  const live = useMemo(() => tasks.filter(task => !task.isTemplate), [tasks]);
  const openCounts = useMemo(() => {
    const counts: Record<string, number> = {all: 0};
    live.forEach(task => {
      if (task.isArchived || statusOf(task) === 'done') return;
      counts.all += 1;
      counts[bucketOf(task)] = (counts[bucketOf(task)] || 0) + 1;
    });
    return counts;
  }, [live]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = live.filter(task => {
      if (bucket !== 'all' && bucketOf(task) !== bucket) return false;
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
  // Projects first, then vendors, each A–Z; tasks keep the list's order inside a group; unlinked last
  const groups = useMemo(() => {
    const map = new Map<string, {key: string; name: string; notebookId?: string; tasks: Task[]}>();
    visible.forEach(task => {
      const id = vendorIdOf(task) || 'none';
      const known = vendorOf(task);
      if (!map.has(id)) map.set(id, {key: id, name: id === 'none' ? 'Not linked' : known?.name || 'Linked', notebookId: known?.categoryId, tasks: []});
      map.get(id)!.tasks.push(task);
    });
    const rank = (g: {key: string}) => (g.key === 'none' ? 2 : kindOf(g.key) === 'project' ? 0 : 1);
    return [...map.values()].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, vendorOptions]);
  // Done and Archive read best as one recency-ordered list
  const showGroups = grouped && filter !== 'done' && filter !== 'archive';

  // A row is just the checkbox and title; glow icons and linking appear on hover
  const renderRow = (task: Task, inGroup: boolean) => {
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
          <GlowToggles size={12} task={task} />
        </div>
      </article>
    );
  };

  const renderGroups = () =>
    groups.map(group => {
      const collapsed = collapsedGroups.includes(group.key);
      const isProject = group.key !== 'none' && kindOf(group.key) === 'project';
      const Icon = group.key === 'none' ? Inbox : isProject ? FolderKanban : Building2;
      return (
        <div className={styles.group} data-kind={group.key === 'none' ? 'none' : isProject ? 'project' : 'vendor'} key={group.key}>
          <div className={styles.groupHead}>
            <button aria-expanded={!collapsed} className={styles.groupToggle} onClick={() => toggleGroup(group.key)}>
              <ChevronDown className={styles.groupChevron} data-collapsed={collapsed} size={13} />
              <Icon size={13} />
              <span>{group.name}</span>
              <small>{group.tasks.length}</small>
            </button>
            {group.key !== 'none' && openVendor && (
              <button className={styles.groupOpen} onClick={() => openVendor(group.key, group.notebookId)} title={`Open the ${group.name} page`}>
                Open
              </button>
            )}
          </div>
          {!collapsed && group.tasks.map(task => renderRow(task, true))}
        </div>
      );
    });

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
        defaults={{bucket: newBucket}}
        draftKey={`new-${newBucket}`}
        key={selected === 'new' ? `new-${newBucket}` : selected}
        note={note}
        onClose={() => {
          if (selected === 'new') {
            setFilter('open');
            setQuery('');
          }
          setSelected(null);
        }}
        task={selectedTask}
      />
    ) : null;

  const emptyTitle = query ? 'No matches' : filter === 'done' ? 'Nothing completed here yet' : filter === 'archive' ? 'Nothing archived' : 'A little breathing room';
  const emptyText = query
    ? 'Try another title, label, or tag.'
    : filter === 'note'
    ? 'Add a task linked to this note.'
    : filter === 'done'
    ? 'Tasks you complete show up here, newest first.'
    : `Add a task to ${bucket === 'all' ? 'any category' : bucketLabel} above.`;

  return (
    <section aria-label={compact ? 'Task sidebar' : 'Tasks workspace'} className={`${styles.workspace} ${compact ? styles.compact : ''}`}>
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
            <button aria-label={`New ${bucketLabel} task`} className={styles.addButton} onClick={() => setSelected('new')} title={`New task in ${bucketLabel}`}>
              <Plus size={18} />
            </button>
            {onCollapse && (
              <button aria-label="Minimize task sidebar" onClick={onCollapse} title="Minimize">
                <ChevronsRight size={16} />
              </button>
            )}
          </div>
        </header>

        <nav aria-label="Task categories" className={styles.bucketTabs} role="tablist">
          {[...TASK_BUCKETS.map(b => ({key: b.key as BucketTab, label: b.short, title: b.label})), {key: 'all' as BucketTab, label: 'All', title: 'All categories'}].map(tab => (
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

        {filter !== 'done' && filter !== 'archive' && (
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
              placeholder={`Add to ${bucketLabel}, press Enter`}
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
                <ArrowLeft size={14} />
                Back to list
              </button>
              {editor}
            </div>
          )}
          {(!compact || !editor) &&
            (loading && !tasks.length ? (
              <div className={styles.empty} role="status">
                Loading your tasks…
              </div>
            ) : !visible.length ? (
              <div className={styles.empty}>
                <CheckCheck size={28} />
                <strong>{emptyTitle}</strong>
                <p>{emptyText}</p>
              </div>
            ) : showGroups ? (
              renderGroups()
            ) : (
              visible.map(task => renderRow(task, false))
            ))}
        </div>

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
