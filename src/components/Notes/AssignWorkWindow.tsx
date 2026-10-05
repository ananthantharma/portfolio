/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {Check, ClipboardCopy, Loader2, Mail, Maximize2, Minimize2, Plus, Send, Sparkles, Trash2, UserPlus, Users, X} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {api} from '../Tasks/api';
import {AssigneePill, initialsOf, staffApi, StaffMember, taskGroupsApi, useStaffList, useTaskGroups} from '../Tasks/TaskExtras';
import {Task} from '../Tasks/types';

type Draft = {
  email: {subject: string; body: string};
  searchSubject: string;
  task: {title: string; notes: string; priority: Task['priority']; dueDate: string | null; subtasks: string[]};
};

const LAST_STAFF_KEY = 'ASSIGN_WORK_LAST_STAFF';
const FOLLOW_UP_GROUP = 'Follow Up';
const isFollowUpGroup = (name: string) => name.toLowerCase().replace(/[\s_-]/g, '') === 'followup';

/** Follow-up date when the ask has no deadline: three working days from today, 5 pm. */
function defaultFollowUp(): Date {
  const d = new Date();
  let added = 0;
  while (added < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  d.setHours(17, 0, 0, 0);
  return d;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

function StaffManager({staff, onPicked}: {staff: StaffMember[] | null; onPicked: (id: string) => void}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy('add');
    setError(null);
    try {
      const person = await staffApi.add({name: name.trim(), email: email.trim(), role: role.trim()});
      setName('');
      setEmail('');
      setRole('');
      onPicked(person._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that person.');
    } finally {
      setBusy(null);
    }
  };
  const remove = async (person: StaffMember) => {
    if (!window.confirm(`Remove ${person.name} from your staff list? Tasks already assigned to them keep their name.`)) return;
    setBusy(person._id);
    setError(null);
    try {
      await staffApi.remove(person._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that person.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-teal-700">Your staff</p>
      {staff && staff.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-1">
          {staff.map(person => (
            <li className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-[12px] ring-1 ring-teal-100" key={person._id}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white">{initialsOf(person.name)}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold text-slate-700">{person.name}</span>
                {(person.role || person.email) && <span className="ml-1.5 text-slate-400">{[person.role, person.email].filter(Boolean).join(' · ')}</span>}
              </span>
              <button
                aria-label={`Remove ${person.name}`}
                className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                disabled={busy === person._id}
                onClick={() => void remove(person)}
                title="Remove from list"
                type="button">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-[11.5px] text-slate-500">{staff === null ? 'Loading…' : 'No one yet. Add the people you hand work to.'}</p>
      )}
      <form className="grid grid-cols-1 gap-1.5 sm:grid-cols-[1fr_1fr]" onSubmit={add}>
        <input aria-label="Name" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-teal-400" maxLength={120} onChange={e => setName(e.target.value)} placeholder="Name" required value={name} />
        <input aria-label="Email (optional)" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-teal-400" maxLength={200} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)" type="email" value={email} />
        <input aria-label="Role (optional)" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-teal-400" maxLength={120} onChange={e => setRole(e.target.value)} placeholder="Role (optional), e.g. Buyer" value={role} />
        <button className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-teal-500 disabled:opacity-40" disabled={!name.trim() || busy === 'add'} type="submit">
          {busy === 'add' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Add person
        </button>
      </form>
      {error && <p className="mt-2 text-[11.5px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}

/** Floating in-page window: paste an ask, pick a staff member, get a short email and a follow-up task. */
export default function AssignWorkWindow({onClose}: {onClose: () => void}) {
  const staff = useStaffList();
  const taskGroups = useTaskGroups();
  const [staffId, setStaffId] = useState('');
  const [managing, setManaging] = useState(false);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [task, setTask] = useState<Task | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(false);
  const [offset, setOffset] = useState({x: 0, y: 0});
  const dragRef = useRef<{startX: number; startY: number; baseX: number; baseY: number} | null>(null);

  const person = (staff || []).find(p => p._id === staffId) || null;

  // Remember the last person you assigned to
  useEffect(() => {
    if (!staff || staffId) return;
    let last = '';
    try {
      last = localStorage.getItem(LAST_STAFF_KEY) || '';
    } catch {
      // storage unavailable
    }
    if (last && staff.some(p => p._id === last)) setStaffId(last);
    else if (!staff.length) setManaging(true);
  }, [staff, staffId]);
  const pickStaff = (id: string) => {
    setStaffId(id);
    try {
      localStorage.setItem(LAST_STAFF_KEY, id);
    } catch {
      // storage unavailable
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'loading') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, status]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const startDrag = (e: React.PointerEvent) => {
    if (maximized || (e.target as HTMLElement).closest('button')) return;
    dragRef.current = {startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y};
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({x: d.baseX + e.clientX - d.startX, y: d.baseY + e.clientY - d.startY});
  };

  const run = async () => {
    if (!person || !text.trim() || status === 'loading') return;
    setStatus('loading');
    setError(null);
    setTaskError(null);
    try {
      const res = await fetch('/api/gemini/assign-work', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text, note, staff: {name: person.name, role: person.role}}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || `The AI service returned ${res.status}.`);
      const d = json.data as Draft;
      setDraft(d);
      setSubject(d.email.subject);
      setBody(d.email.body);
      setStatus('done');

      // Create (or, when re-drafting, update) the follow-up task
      const due = d.task.dueDate ? new Date(`${d.task.dueDate}T17:00:00`) : defaultFollowUp();
      // File it in your "Follow Up" group (created the first time if it doesn't exist yet)
      let groupId = task?.taskGroupId || (taskGroups || []).find(g => isFollowUpGroup(g.name))?._id || null;
      if (!groupId) {
        try {
          groupId = (await taskGroupsApi.create(FOLLOW_UP_GROUP))._id;
        } catch {
          groupId = null;
        }
      }
      const payload = {
        title: d.task.title,
        notes: d.task.notes,
        priority: d.task.priority || 'None',
        dueDate: due.toISOString(),
        bucket: 'work',
        taskGroupId: groupId,
        emailSubject: d.searchSubject,
        assignedTo: {staffId: person._id, name: person.name, email: person.email || ''},
        subtasks: d.task.subtasks.map(s => ({title: s, isCompleted: false})),
        aiGenerated: true,
      };
      try {
        setTask(task ? await api.update(task._id, payload) : await api.create({...payload, status: 'todo', isCompleted: false}));
      } catch (err) {
        setTaskError(err instanceof Error ? err.message : 'The follow-up task could not be saved.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft the email.');
      setStatus('error');
    }
  };

  const removeTask = async () => {
    if (!task || !window.confirm('Delete the follow-up task that was created?')) return;
    try {
      await api.remove(task._id);
      setTask(null);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Could not delete the task.');
    }
  };

  const doCopy = async (key: string, value: string) => {
    await copy(value);
    setCopied(key);
  };
  const mailto = person?.email ? `mailto:${encodeURIComponent(person.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null;
  const due = task?.dueDate ? new Date(task.dueDate) : null;

  const frame = maximized
    ? 'inset-3'
    : 'left-1/2 top-1/2 h-[min(720px,calc(100vh-32px))] w-[min(1080px,calc(100vw-32px))]';
  const frameStyle = maximized ? undefined : {transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`};

  return createPortal(
    <div aria-label="Assign work" className={`fixed z-[240] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${frame}`} role="dialog" style={frameStyle}>
      {/* Title bar: drag to move */}
      <div
        className={`flex shrink-0 select-none items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 ${maximized ? '' : 'cursor-move'}`}
        onDoubleClick={() => setMaximized(v => !v)}
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={() => (dragRef.current = null)}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white">
          <Send className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13.5px] font-bold text-slate-800">Assign work</h2>
          <p className="truncate text-[10.5px] text-slate-400">Paste an ask, pick who should do it. Gemini drafts a short email and adds a follow-up task.</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button aria-label={maximized ? 'Restore window size' : 'Full screen'} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700" onClick={() => setMaximized(v => !v)} title={maximized ? 'Restore' : 'Full screen'} type="button">
            {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-40" disabled={status === 'loading'} onClick={onClose} title="Close (Esc)" type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(340px,42%)_1fr]">
        {/* Inputs */}
        <div className="flex min-h-0 flex-col border-b border-slate-100 lg:border-b-0 lg:border-r">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="assign-staff">
                Assign to
              </label>
              <div className="flex gap-2">
                <select
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-teal-400"
                  id="assign-staff"
                  onChange={e => pickStaff(e.target.value)}
                  value={staffId}>
                  <option value="">{staff === null ? 'Loading…' : staff.length ? 'Choose a person…' : 'Add someone first →'}</option>
                  {(staff || []).map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                      {p.role ? ` · ${p.role}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  aria-expanded={managing}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold ${managing ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => setManaging(v => !v)}
                  title="Add or remove staff"
                  type="button">
                  <Users className="h-3.5 w-3.5" /> Staff
                </button>
              </div>
            </div>
            {managing && (
              <StaffManager
                onPicked={id => {
                  pickStaff(id);
                  setManaging(false);
                }}
                staff={staff}
              />
            )}
            <div className="flex min-h-[180px] flex-1 flex-col">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="assign-text">
                Email chain or ask
              </label>
              <textarea
                className="min-h-[160px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-[12.5px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 focus:border-teal-400 focus:bg-white"
                id="assign-text"
                onChange={e => setText(e.target.value)}
                placeholder="Paste the email chain, or describe what needs doing…"
                value={text}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="assign-note">
                Anything to add? <span className="font-medium normal-case tracking-normal text-slate-300">(optional)</span>
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300 focus:border-teal-400"
                id="assign-note"
                maxLength={1000}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Needed by Friday, loop in procurement"
                value={note}
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 px-4 py-3">
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!person || !text.trim() || status === 'loading'}
              onClick={() => void run()}
              type="button">
              {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {status === 'loading' ? 'Drafting…' : draft ? 'Re-draft' : person ? `Draft email to ${person.name.split(' ')[0]}` : 'Draft email'}
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="min-h-0 overflow-y-auto bg-slate-50/50 p-4">
          {status === 'idle' && !draft && (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center text-slate-400">
              <Mail className="mb-3 h-9 w-9 text-slate-300" />
              <p className="text-[13.5px] font-semibold text-slate-500">Your email appears here</p>
              <p className="mt-1 max-w-xs text-[12px]">A follow-up task is added to your Follow Up group in Work, and listed under the person in the Follow up tab.</p>
            </div>
          )}
          {status === 'loading' && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-[12.5px] text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-teal-500" /> Reading the ask and drafting a short email…
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-[12.5px] text-rose-700">
              <p className="font-semibold">Could not draft the email</p>
              <p className="mt-0.5">{error}</p>
            </div>
          )}
          {draft && status !== 'loading' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</span>
                  {person && (
                    <span className="text-[12px] text-slate-500">
                      to <span className="font-semibold text-slate-700">{person.name}</span>
                      {person.email && <span className="text-slate-400"> &lt;{person.email}&gt;</span>}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50" onClick={() => void doCopy('email', `Subject: ${subject}\n\n${body}`)} type="button">
                      {copied === 'email' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />} Copy email
                    </button>
                    {mailto && (
                      <a className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-500" href={mailto}>
                        <Mail className="h-3.5 w-3.5" /> Open in email app
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
                  <span className="text-[11px] font-semibold text-slate-400">Subject</span>
                  <input aria-label="Email subject" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] font-semibold text-slate-800 outline-none" onChange={e => setSubject(e.target.value)} value={subject} />
                  <button aria-label="Copy subject" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => void doCopy('subject', subject)} title="Copy subject" type="button">
                    {copied === 'subject' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <textarea aria-label="Email body" className="block min-h-[200px] w-full resize-y border-0 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-700 outline-none" onChange={e => setBody(e.target.value)} value={body} />
                <div className="flex justify-end border-t border-slate-100 px-4 py-2">
                  <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100" onClick={() => void doCopy('body', body)} type="button">
                    {copied === 'body' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />} Copy body only
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-teal-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white">
                    {task ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700">{task ? 'Follow-up task added to your Follow Up group' : 'Follow-up task'}</span>
                  {task && (
                    <button className="ml-auto flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => void removeTask()} title="Delete this task" type="button">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
                {taskError && <p className="mb-2 text-[12px] font-medium text-rose-600">{taskError}</p>}
                <p className="text-[13.5px] font-semibold text-slate-800">{task?.title || draft.task.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-slate-500">
                  <AssigneePill assignee={task?.assignedTo || (person ? {name: person.name, email: person.email} : null)} />
                  {due && <span>Follow up by {due.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}</span>}
                </div>
                {(task?.notes || draft.task.notes) && <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{task?.notes || draft.task.notes}</p>}
                {draft.task.subtasks.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {draft.task.subtasks.map(s => (
                      <li className="flex items-center gap-2 text-[12px] text-slate-600" key={s}>
                        <span className="h-3 w-3 shrink-0 rounded border border-slate-300" /> {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
