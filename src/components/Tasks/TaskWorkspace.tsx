/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {Archive, ArrowLeft, Check, CheckCheck, ChevronDown, ChevronRight, ChevronsRight, Copy, FileText, ListTodo, Maximize2, Plus, Search, Trash2, X} from 'lucide-react';
import React, {useContext, useId, useMemo, useState} from 'react';

import {api} from './api';
import {saveTaskChanges} from './taskActions';
import AttachmentGallery from './AttachmentGallery';
import NoteLinkModal from './NoteLinkModal';
import {useTaskCollection} from './TaskProvider';
import {GlowToggles, glowStyle, VendorPill, VendorSelect} from './TaskExtras';
import {daysUntil, formatDue, glowOf, PRIORITY_META, smartCompare, statusOf, Task, vendorIdOf, vendorOf} from './types';
import {OpenWorkspaceNoteContext} from './WorkspaceNavigation';
import styles from './TaskWorkspace.module.css';

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
    <div className={styles.editorHeading}><span>{task ? 'TASK DETAILS' : 'NEW TASK'}</span><button type="button" onClick={onClose} aria-label="Close task details"><X size={16}/></button></div>
    <form onSubmit={save}>
      <fieldset disabled={pending}>
        <label htmlFor={`${prefix}-title`}>Task name</label>
        <textarea id={`${prefix}-title`} className={styles.titleInput} rows={2} placeholder="What needs to happen?" value={value.title || ''} onChange={e => change({title: e.target.value})} required />
        <div className={styles.fieldGrid}>
          <div><label htmlFor={`${prefix}-status`}>Status</label><select id={`${prefix}-status`} value={value.isCompleted ? 'done' : value.status || 'todo'} onChange={e => change({status: e.target.value, isCompleted: e.target.value === 'done'})}><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Complete</option></select></div>
          <div><label htmlFor={`${prefix}-priority`}>Priority</label><select id={`${prefix}-priority`} value={value.priority || 'None'} onChange={e => change({priority: e.target.value as Task['priority']})}>{Object.keys(PRIORITY_META).map(priority => <option key={priority}>{priority}</option>)}</select></div>
          <div><label htmlFor={`${prefix}-due`}>Due date</label><input id={`${prefix}-due`} type="date" value={toDate(value.dueDate)} onChange={e => change({dueDate: e.target.value ? new Date(`${e.target.value}T17:00:00`).toISOString() : ''})}/></div>
          <div><label htmlFor={`${prefix}-category`}>Project</label><input id={`${prefix}-category`} value={value.category || ''} placeholder="Optional" onChange={e => change({category: e.target.value})}/></div>
        </div>
        <label htmlFor={`${prefix}-notes`}>Description</label><textarea id={`${prefix}-notes`} rows={4} placeholder="Add context, a plan, or a useful detail…" value={value.notes || ''} onChange={e => change({notes: e.target.value})}/>
        <label htmlFor={`${prefix}-tags`}>Tags</label><input id={`${prefix}-tags`} value={(value.tags || []).join(', ')} placeholder="Separate tags with commas" onChange={e => change({tags: e.target.value.split(',').map(tag => tag.trimStart())})}/>
        <div className={styles.subtaskHeading}>Checklist <span>{value.subtasks?.filter(item => item.isCompleted).length || 0}/{value.subtasks?.length || 0}</span></div>
        {(value.subtasks || []).map((item, index) => <div className={styles.subtask} key={item._id || index}><input aria-label={`Complete ${item.title}`} type="checkbox" checked={item.isCompleted} onChange={e => change({subtasks: value.subtasks?.map((entry, i) => i === index ? {...entry, isCompleted: e.target.checked} : entry)})}/><input aria-label={`Checklist item ${index+1}`} value={item.title} onChange={e => change({subtasks: value.subtasks?.map((entry, i) => i === index ? {...entry, title: e.target.value} : entry)})}/><button type="button" aria-label={`Remove ${item.title}`} onClick={() => change({subtasks: value.subtasks?.filter((_, i) => i !== index)})}><X size={14}/></button></div>)}
        <div className={styles.addSubtask}><input aria-label="New checklist item" placeholder="Add a step…" value={subtask} onChange={e => setSubtask(e.target.value)} onKeyDown={e => {if (e.key === 'Enter') {e.preventDefault(); if (subtask.trim()) {change({subtasks: [...(value.subtasks || []), {title: subtask.trim(), isCompleted: false}]}); setSubtask('');}}}}/><button type="button" aria-label="Add checklist item" disabled={!subtask.trim()} onClick={() => {change({subtasks: [...(value.subtasks || []), {title: subtask.trim(), isCompleted: false}]}); setSubtask('');}}><Plus size={16}/></button></div>
        <div className={styles.noteLink}>
          <span><FileText size={14}/> Connected note</span>
          {linkedId ? <div><button type="button" onClick={() => openNote ? openNote(linkedId) : window.location.assign(`/notes?pageId=${encodeURIComponent(linkedId)}`)}>{linkedTitle || 'Open note'}</button><button type="button" aria-label="Unlink note" onClick={() => change({sourcePageId: null})}><X size={14}/></button></div> : <div>{note && <button type="button" onClick={() => change({sourcePageId: {_id: note.id, title: note.title}})}>Link current note</button>}<button type="button" onClick={() => setLinking(true)}>Choose a note</button></div>}
        </div>
        <div className={styles.vendorLink}>
          <label htmlFor={`${prefix}-vendor`}>Vendor</label>
          <div><VendorSelect id={`${prefix}-vendor`} value={vendorOf(value) || (vendorIdOf(value) ? {_id: vendorIdOf(value)!, name: 'Linked vendor'} : null)} onChange={vendor => change({vendorSectionId: vendor})}/>{vendorOf(value) && task && <VendorPill task={value as Task}/>}</div>
        </div>
        <details className={styles.more}><summary>More options <ChevronDown size={14}/></summary><label htmlFor={`${prefix}-repeat`}>Repeat</label><select id={`${prefix}-repeat`} value={value.recurrence?.freq || 'none'} onChange={e => change({recurrence: {freq: e.target.value as NonNullable<Task['recurrence']>['freq'], interval: 1}})}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select><p>Repeating tasks need a due date. Completing one creates the next occurrence.</p><label htmlFor={`${prefix}-estimate`}>Estimated minutes</label><input id={`${prefix}-estimate`} type="number" min="0" value={value.estimatedTime ?? ''} onChange={e => change({estimatedTime: e.target.value ? Number(e.target.value) : 0})}/>{task?.attachments?.length ? <AttachmentGallery attachments={task.attachments} taskId={task._id} compact/> : null}</details>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <div className={styles.saveRow}><span role="status">{pending ? 'Saving…' : dirty ? 'Unsaved changes' : saved ? 'All changes saved' : 'Up to date'}</span><button className={styles.primary} type="submit" disabled={pending || (!!task && !dirty)}><Check size={14}/>{task ? 'Save changes' : 'Create task'}</button></div>
      </fieldset>
    </form>
    {task && <div className={styles.taskActions}>
      <button disabled={pending} onClick={() => void action(() => api.update(task._id, {isArchived: !task.isArchived}), true)}><Archive size={14}/>{task.isArchived ? 'Restore' : 'Archive'}</button>
      <button disabled={pending} onClick={() => void action(() => api.create({title: `${task.title} (copy)`, notes: task.notes, priority: task.priority, dueDate: task.dueDate || null, tags: task.tags, category: task.category, sourcePageId: typeof task.sourcePageId === 'object' ? task.sourcePageId?._id : task.sourcePageId, vendorSectionId: vendorIdOf(task), subtasks: task.subtasks?.map(item => ({title: item.title, isCompleted: false}))}))}><Copy size={14}/>Duplicate</button>
      <button disabled={pending} className={styles.danger} onClick={() => {if (window.confirm(`Permanently delete “${task.title}”? You can archive it instead.`)) void action(async () => {await api.remove(task._id); setDraft(key, null);}, true);}}><Trash2 size={14}/>Delete</button>
    </div>}
    {linking && <NoteLinkModal taskTitle={value.title || 'New note'} onClose={() => setLinking(false)} onLinked={page => {change({sourcePageId: page}); setLinking(false);}}/>}
  </div>;
}

export default function TaskWorkspace({compact = false, note, onExpand, onAdvanced, onCollapse}: {compact?: boolean; note?: NoteContext; onExpand?: () => void; onAdvanced?: () => void; onCollapse?: () => void}) {
  const {tasks, loading, error, refresh, busy, run, drafts} = useTaskCollection();
  const [filter, setFilter] = useState<Filter>('open');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const visible = useMemo(() => tasks.filter(task => {
    if (task.isTemplate) return false;
    if (filter === 'archive') {if (!task.isArchived) return false;}
    else if (task.isArchived) return false;
    else if (filter === 'done' ? statusOf(task) !== 'done' : statusOf(task) === 'done') return false;
    if (filter === 'today' && (daysUntil(task.dueDate) === null || daysUntil(task.dueDate)! > 0)) return false;
    if (filter === 'note' && (!note || (typeof task.sourcePageId === 'object' ? task.sourcePageId?._id : task.sourcePageId) !== note.id)) return false;
    return `${task.title} ${task.category || ''} ${(task.tags || []).join(' ')}`.toLowerCase().includes(query.toLowerCase());
  }).sort(smartCompare), [tasks, filter, note, query]);
  const open = tasks.filter(task => !task.isArchived && !task.isTemplate && statusOf(task) !== 'done');
  const selectedTask = tasks.find(task => task._id === selected);
  const execute = async (key: string, action: () => Promise<unknown>) => {
    setActionError(null); setNotice('');
    try {await run(key, action);} catch (cause) {setActionError(cause instanceof Error ? cause.message : 'Could not save. Try again.');}
  };
  const toggle = (task: Task) => void execute(task._id, async () => {
    const complete = statusOf(task) !== 'done';
    const result = await saveTaskChanges(task, {isCompleted: complete, status: complete ? 'done' : 'todo'});
    if (result.warning) setActionError(result.warning);
    setNotice(complete ? 'Task completed' : 'Task reopened');
  });
  const editor = selected === 'new' || selectedTask ? <TaskEditor key={selected} task={selectedTask} note={note} onClose={() => {if (selected === 'new') {setFilter('open'); setQuery('');} setSelected(null);}}/> : null;
  return <section className={`${styles.workspace} ${compact ? styles.compact : ''}`} aria-label={compact ? 'Task sidebar' : 'Tasks workspace'}>
    <div className={styles.listPane}>
      <header className={styles.header}><div><span className={styles.eyebrow}>A LITTLE PROGRESS, EVERY DAY</span><h2>Tasks<span>{open.length}</span></h2></div><div>{onExpand && <button onClick={onExpand} aria-label="Expand tasks workspace"><Maximize2 size={16}/></button>}<button className={styles.addButton} onClick={() => setSelected('new')} aria-label="New task"><Plus size={18}/></button>{onCollapse && <button onClick={onCollapse} aria-label="Minimize task sidebar" title="Minimize"><ChevronsRight size={16}/></button>}</div></header>
      <div className={styles.search}><Search size={15}/><input aria-label="Search tasks" placeholder="Find a task…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Clear task search" onClick={() => setQuery('')}><X size={14}/></button>}</div>
      <div className={styles.filters} aria-label="Filter tasks">{([['open','Open'],['today','Today'],['note','This note'],['done','Done'],['archive','Archive']] as [Filter,string][]).map(([key,label]) => <button key={key} aria-pressed={filter === key} disabled={key === 'note' && !note} onClick={() => setFilter(key)}>{label}</button>)}</div>
      <form className={styles.quickAdd} onSubmit={e => {e.preventDefault(); if (!quickTitle.trim() || busy.includes('quick')) return; const title = quickTitle.trim(); void execute('quick', async () => {await api.create({title, priority: 'None', status: 'todo', ...(filter === 'today' ? {dueDate: new Date(new Date().setHours(17,0,0,0)).toISOString()} : {}), ...(filter === 'note' && note ? {sourcePageId: note.id} : {})}); setQuickTitle(''); setFilter(filter === 'done' || filter === 'archive' ? 'open' : filter); setNotice('Task added');});}}><Plus size={16}/><input aria-label="Quick add task" placeholder="Add a task, press Enter" value={quickTitle} disabled={busy.includes('quick')} onChange={e => setQuickTitle(e.target.value)}/><button type="submit" disabled={!quickTitle.trim() || busy.includes('quick')} aria-label="Add task"><ChevronRight size={17}/></button></form>
      {(error || actionError) && <div className={styles.error} role="alert">{error || actionError}{error && <button onClick={() => void refresh()}>Try again</button>}</div>}
      <div className={styles.list}>
        {compact && editor && <div className={styles.inlineEditor}><button className={styles.back} onClick={() => setSelected(null)}><ArrowLeft size={14}/>Back to list</button>{editor}</div>}
        {(!compact || !editor) && <>{loading && !tasks.length ? <div className={styles.empty} role="status">Loading your tasks…</div> : !visible.length ? <div className={styles.empty}><CheckCheck size={30}/><strong>{query ? 'No matches' : filter === 'done' ? 'Progress will live here' : filter === 'archive' ? 'Nothing archived' : 'A little breathing room'}</strong><p>{query ? 'Try another title, project, or tag.' : filter === 'note' ? 'Add a task linked to this note.' : 'Add a task above, or explore another view.'}</p></div> : visible.map(task => <article className={styles.taskRow} data-glow={glowOf(task) || undefined} data-selected={selected === task._id} key={task._id} style={glowStyle(task)}><button className={styles.checkbox} aria-label={`${statusOf(task) === 'done' ? 'Reopen' : 'Complete'} ${task.title}`} aria-pressed={statusOf(task) === 'done'} disabled={busy.includes(task._id)} onClick={() => toggle(task)}>{statusOf(task) === 'done' && <Check size={12}/>}</button><div className={styles.rowBody}><button className={styles.taskSummary} onClick={() => setSelected(task._id)}><strong data-done={statusOf(task) === 'done'}>{task.title}</strong><span>{task.priority !== 'None' && <i data-priority={task.priority}>{task.priority}</i>}{task.dueDate && <time data-overdue={statusOf(task) !== 'done' && (daysUntil(task.dueDate) || 0) < 0}>{formatDue(task.dueDate)}</time>}{task.category && <span>{task.category}</span>}{task.subtasks?.length ? <span>{task.subtasks.filter(item => item.isCompleted).length}/{task.subtasks.length} steps</span> : null}{drafts[task._id] && <span>Draft</span>}{task.sourcePageId && <FileText size={12}/>}</span></button><div className={styles.rowExtras}><VendorPill task={task}/><GlowToggles task={task}/></div></div><ChevronRight size={13}/></article>)}</>}
      </div>
      <footer className={styles.footer}><span role="status">{notice || `${visible.length} ${visible.length === 1 ? 'task' : 'tasks'} in this view`}</span>{onAdvanced && <button onClick={onAdvanced}>Board & tools</button>}</footer>
    </div>
    {!compact && <div className={styles.detailPane}>{editor || <div className={styles.detailEmpty}><ListTodo size={40}/><h2>One thing at a time.</h2><p>Select a task to make a plan, add a checklist, or connect it to a note.</p><button className={styles.primary} onClick={() => setSelected('new')}><Plus size={16}/>Create a task</button>{Object.keys(drafts).length > 0 && <small>Your unfinished task edits are kept when switching views.</small>}</div>}</div>}
  </section>;
}
