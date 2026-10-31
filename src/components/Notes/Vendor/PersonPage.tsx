/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {
  Activity,
  Cake,
  Camera,
  Check,
  HeartHandshake,
  ListChecks,
  ListTodo,
  Mail,
  MessagesSquare,
  NotebookPen,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {INoteCategory, INoteClass} from '@/models/NoteCategory';
import {INotePage} from '@/models/NotePage';
import {INoteSection} from '@/models/NoteSection';

import {saveTaskChanges} from '../../Tasks/taskActions';
import {isAssignedTo, reloadStaffList, useStaffList} from '../../Tasks/TaskExtras';
import {useTaskCollection} from '../../Tasks/TaskProvider';
import {formatDue, smartCompare, statusOf, Task, TaskVendor, vendorIdOf} from '../../Tasks/types';
import {toHeadshot} from '../ContactFormModal';
import ActivityView, {ActivityRow} from './ActivityView';
import DocumentsCard from './DocumentsCard';
import InlineNote from './InlineNote';
import LinksCard from './LinksCard';
import p from './PersonPage.module.css';
import {InlineField} from './ProjectHeader';
import {Card} from './ProjectOverview';
import ProjectSearchResults, {SearchResult} from './ProjectSearch';
import {
  ActivityItem,
  CHECK_IN_OPTIONS,
  dateInputToIso,
  daysUntil,
  fetchActivity,
  fetchVendor,
  formatDate,
  initials,
  isoToDateInput,
  normalizeUrl,
  PEOPLE_DOC_TYPES,
  PersonInfo,
  RELATIONSHIPS,
  saveVendor,
  TalkingPoint,
  VendorPatch,
  VendorProfile,
} from './vendorApi';
import VendorNotes, {noteDateOf, NoteSort} from './VendorNotes';
import styles from './VendorPage.module.css';
import VendorTasksCard from './VendorTasksCard';

export interface PersonPageProps {
  section: INoteSection;
  notebook: INoteCategory;
  pages: INotePage[];
  loadingPages: boolean;
  onOpenPage: (id: string) => void;
  onAddPage: (title: string, extra?: Partial<INotePage>) => void;
  onUpdatePage: (id: string, updates: Partial<INotePage>) => Promise<void>;
  onReorderPages: (newOrder: INotePage[]) => void;
  onUpdateNotebook: (id: string, updates: {noteClasses?: INoteClass[]; noteSort?: string}) => Promise<INoteClass[] | void>;
}

type PersonTab = 'overview' | 'notes' | 'tasks' | 'documents' | 'activity';
const TAB_KEY = 'PERSON_PAGE_TAB';

const EMPTY_PERSON: PersonInfo = {
  title: '',
  company: '',
  relationship: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  manager: '',
  birthday: null,
  photo: '',
  remember: '',
  checkInDays: 0,
  lastContactedAt: null,
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** Days until the next birthday (0 = today). Birthdays are stored as a date; only month and day matter. */
export function daysToBirthday(value?: string | null) {
  if (!value) return null;
  const born = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), born.getUTCMonth(), born.getUTCDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}
const birthdayLabel = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-US', {month: 'long', day: 'numeric', timeZone: 'UTC'}) : '';

/** Where you stand on keeping in touch: last conversation and when the next one is due. */
function checkInStatus(person: PersonInfo) {
  const since = person.lastContactedAt ? -(daysUntil(person.lastContactedAt) ?? 0) : null;
  const every = person.checkInDays || 0;
  const dueIn = every ? (since === null ? 0 : every - since) : null;
  return {since, every, dueIn, due: dueIn !== null && dueIn <= 0};
}
const agoLabel = (days: number) => (days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`);

/** A person in a People notebook: who they are, what they're working on for you, and your conversations. */
export default function PersonPage(props: PersonPageProps) {
  const {section, notebook, pages, loadingPages, onOpenPage, onAddPage, onUpdatePage, onReorderPages, onUpdateNotebook} = props;
  const sectionId = String(section._id);
  const name = section.name;
  const first = name.trim().split(/\s+/)[0] || name;
  const page: TaskVendor = useMemo(
    () => ({_id: sectionId, name, categoryId: String(section.categoryId)}),
    [sectionId, name, section.categoryId],
  );
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<PersonTab>('overview');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<ActivityItem[] | null>(null);
  const [activityKey, setActivityKey] = useState(0);
  const [error, setError] = useState('');
  const latest = useRef(sectionId);
  const {tasks, run} = useTaskCollection();
  const staff = useStaffList();
  // Their entry in "Assigned to" (made by the server the first time the list loads after they're added)
  const me = staff?.find(s => s.sectionId === sectionId) || null;

  useEffect(() => {
    void reloadStaffList();
  }, [sectionId, name]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TAB_KEY) || 'null');
      setTab(saved?.sectionId === sectionId ? saved.tab : 'overview');
    } catch {
      setTab('overview');
    }
  }, [sectionId]);
  const go = useCallback(
    (next: PersonTab) => {
      setQuery('');
      setTab(next);
      try {
        localStorage.setItem(TAB_KEY, JSON.stringify({sectionId, tab: next}));
      } catch {
        // storage unavailable
      }
    },
    [sectionId],
  );

  useEffect(() => {
    latest.current = sectionId;
    setProfile(null);
    setLoadError('');
    fetchVendor(sectionId)
      .then(data => latest.current === sectionId && setProfile(data))
      .catch(err => latest.current === sectionId && setLoadError(err.message));
  }, [sectionId]);

  const live = useMemo(() => tasks.filter(t => !t.isArchived && !t.isTemplate), [tasks]);
  const assigned = useMemo(() => (me ? live.filter(t => isAssignedTo(t, me)) : []), [live, me]);
  const about = useMemo(() => live.filter(t => vendorIdOf(t) === sectionId), [live, sectionId]);
  const allTasks = useMemo(() => [...assigned, ...about.filter(t => !assigned.includes(t))], [assigned, about]);
  const openTasks = useMemo(() => allTasks.filter(t => statusOf(t) !== 'done').sort(smartCompare), [allTasks]);

  const taskSignature = about.map(t => `${t._id}:${statusOf(t)}`).join(',');
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      fetchActivity(sectionId, {limit: 5})
        .then(list => alive && setRecent(list))
        .catch(() => alive && setRecent([]));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [sectionId, activityKey, taskSignature, pages.length, profile?.updatedAt]);

  const applyProfile = useCallback(
    (next: VendorProfile) => {
      if (latest.current !== sectionId) return;
      setProfile(next);
      setActivityKey(k => k + 1);
    },
    [sectionId],
  );
  const patch = useCallback(
    async (changes: VendorPatch) => {
      setError('');
      try {
        applyProfile(await saveVendor(sectionId, changes));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
        throw cause;
      }
    },
    [sectionId, applyProfile],
  );
  const savePerson = (fields: Partial<PersonInfo>) =>
    patch({person: fields})
      // Their email and role are copied into "Assigned to"; refresh the list so new tasks pick them up
      .then(() => {
        if ('email' in fields || 'title' in fields) void reloadStaffList();
      })
      .catch(() => undefined);

  const toggleTask = (task: Task) =>
    run(task._id, async () => {
      const complete = statusOf(task) !== 'done';
      await saveTaskChanges(task, {isCompleted: complete, status: complete ? 'done' : 'todo'});
    }).catch(() => undefined);

  // Headshot: click the avatar to pick a picture, or paste one anywhere on the page (outside text boxes)
  const fileRef = useRef<HTMLInputElement>(null);
  const applyPhoto = useCallback(
    async (file: Blob) => {
      try {
        await patch({person: {photo: await toHeadshot(file)}});
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not use that picture.');
      }
    },
    [patch],
  );
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || tab !== 'overview') return;
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      void applyPhoto(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [applyPhoto, tab]);

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>This person couldn’t be loaded. {loadError}</div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>Loading {name}…</div>
      </div>
    );
  }

  const person: PersonInfo = {...EMPTY_PERSON, ...(profile.person || {})};
  const points = profile.talkingPoints || [];
  const checkIn = checkInStatus(person);
  const toBirthday = daysToBirthday(person.birthday);
  const openPoints = points.filter(pt => !pt.done);

  // Talking points save the whole list; the page updates first so ticking feels instant
  const savePoints = (next: TalkingPoint[]) => {
    setProfile(prev => (prev ? {...prev, talkingPoints: next} : prev));
    patch({talkingPoints: next}).catch(() => setProfile(prev => (prev ? {...prev, talkingPoints: points} : prev)));
  };

  // A dated conversation note with the open talking points as its agenda; also marks today as your last chat
  const logConversation = (withNote: boolean) => {
    const now = new Date();
    void savePerson({lastContactedAt: now.toISOString()});
    if (!withNote) return;
    const date = now.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
    const title = `1:1 with ${first} – ${date}`;
    const agenda = openPoints.length ? openPoints.map(pt => `<li>${escapeHtml(pt.text)}</li>`).join('') : '<li>Agenda item</li>';
    const html = [
      `<h1>${escapeHtml(title)}</h1>`,
      `<p><strong>Date:</strong> ${escapeHtml(date)}</p>`,
      `<h2>Purpose / Agenda</h2><ul>${agenda}</ul>`,
      `<h2>Discussion Notes</h2><p>Key points discussed…</p>`,
      `<h2>Action Items</h2><ul><li>Action – owner – due date</li></ul>`,
      `<h2>Follow-Ups</h2><ul><li>Follow-up</li></ul>`,
    ].join('');
    const cls = (notebook.noteClasses || []).find(c => /1:1|meeting/i.test(c.name));
    onAddPage(title, {
      ...(cls ? {noteClass: String(cls._id), noteClasses: [String(cls._id)]} : {}),
      noteDate: now,
      tabs: [{title: 'Conversation', content: html, order: 0}] as INotePage['tabs'],
    });
  };

  const tabs: {key: PersonTab; label: string; count?: number}[] = [
    {key: 'overview', label: 'Overview'},
    {key: 'notes', label: 'Notes', count: pages.length},
    {key: 'tasks', label: 'Tasks', count: openTasks.length},
    {key: 'documents', label: 'Documents', count: profile.documents.length + profile.links.length},
    {key: 'activity', label: 'Activity'},
  ];
  const searching = query.trim().length > 1;
  const openSearchResult = (r: SearchResult) => {
    if (r.kind === 'note') return onOpenPage(r.id);
    if (r.kind === 'task') return go('tasks');
    if (r.kind === 'document') return go('documents');
    if (r.kind === 'link') {
      const link = profile.links.find(l => String(l._id) === r.id);
      if (link) window.open(link.url, '_blank', 'noopener');
    }
  };
  const jumpToActivity = (item: ActivityItem) => {
    if (!item.refId) return;
    if (item.type === 'note' && pages.some(pg => String(pg._id) === item.refId)) return onOpenPage(item.refId);
    if (item.type === 'task') return go('tasks');
    if (item.type === 'document') return go('documents');
  };
  const recentNotes = [...pages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);

  return (
    <div className={`${styles.page} ${styles.projectPage}`}>
      <header className={styles.projectHeader}>
        <div className={styles.projectHeaderTop}>
          <div className={styles.eyebrow}>{notebook.name}</div>
          <label className={styles.projectSearch}>
            <Search size={14} />
            <input
              aria-label={`Search everything about ${name}`}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setQuery('')}
              placeholder="Search notes, tasks, documents…"
              value={query}
            />
            {query && (
              <button aria-label="Clear search" className={styles.iconBtn} onClick={() => setQuery('')} style={{width: 22, height: 22}} type="button">
                <X size={13} />
              </button>
            )}
          </label>
        </div>

        <div className={p.personTop}>
          <div className={p.avatarWrap}>
            <button
              aria-label={person.photo ? `Change ${name}’s photo` : `Add a photo of ${name}`}
              className={p.avatar}
              onClick={() => fileRef.current?.click()}
              title="Click to choose a photo, or paste one on this page"
              type="button">
              {person.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" src={person.photo} />
              ) : (
                initials(name)
              )}
              <span className={p.avatarHint}>
                <Camera size={16} />
              </span>
            </button>
            {person.photo && (
              <button aria-label="Remove photo" className={p.avatarRemove} onClick={() => void savePerson({photo: ''})} title="Remove photo" type="button">
                <X size={11} />
              </button>
            )}
            <input
              accept="image/*"
              hidden
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) void applyPhoto(file);
                e.target.value = '';
              }}
              ref={fileRef}
              type="file"
            />
          </div>
          <div className={p.identity}>
            <div className={styles.projectTitleRow}>
              <h1>{name}</h1>
              <label className={styles.pillSelect}>
                <HeartHandshake size={13} />
                <select aria-label="Relationship" onChange={e => void savePerson({relationship: e.target.value})} value={person.relationship}>
                  <option value="">Relationship</option>
                  {RELATIONSHIPS.map(r => (
                    <option key={r}>{r}</option>
                  ))}
                  {person.relationship && !(RELATIONSHIPS as readonly string[]).includes(person.relationship) && (
                    <option>{person.relationship}</option>
                  )}
                </select>
              </label>
            </div>
            <div className={p.personLine}>
              <InlineField label="Role" maxLength={120} onSave={v => savePerson({title: v})} placeholder="add role" value={person.title} />
              <span aria-hidden>·</span>
              <InlineField label="Company or team" maxLength={120} onSave={v => savePerson({company: v})} placeholder="add company or team" value={person.company} />
            </div>
            <div className={p.quickLinks}>
              {person.email && (
                <a className={p.quickLink} href={`mailto:${person.email}`}>
                  <Mail size={13} /> Email
                </a>
              )}
              {person.phone && (
                <a className={p.quickLink} href={`tel:${person.phone.replace(/[^\d+]/g, '')}`}>
                  <Phone size={13} /> Call
                </a>
              )}
              {person.linkedin && (
                <a className={p.quickLink} href={person.linkedin} rel="noopener noreferrer" target="_blank">
                  <UserRound size={13} /> LinkedIn
                </a>
              )}
              {checkIn.due && (
                <button className={`${p.quickLink} ${p.flag}`} onClick={() => go('overview')} type="button">
                  <MessagesSquare size={13} /> Time to check in
                </button>
              )}
              {toBirthday !== null && toBirthday <= 14 && (
                <span className={`${p.quickLink} ${p.flag}`}>
                  <Cake size={13} /> {toBirthday === 0 ? 'Birthday today' : `Birthday in ${toBirthday} day${toBirthday === 1 ? '' : 's'}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Person sections" className={styles.projectTabs} role="tablist">
        {tabs.map(t => (
          <button aria-selected={!searching && tab === t.key} className={styles.projectTab} key={t.key} onClick={() => go(t.key)} role="tab" type="button">
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className={styles.tabCount}>{t.count}</span>}
          </button>
        ))}
      </nav>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.projectBody}>
        {searching ? (
          <ProjectSearchResults
            onOpen={openSearchResult}
            query={query}
            sources={{notes: pages, tasks: allTasks, decisions: [], attention: [], documents: profile.documents, links: profile.links}}
          />
        ) : tab === 'overview' ? (
          <div className={styles.overview}>
            <div className={styles.ovGrid}>
              <div className={styles.ovCol}>
                <Card icon={UserRound} title="Details">
                  <div className={p.details}>
                    <span>Email</span>
                    <InlineField
                      label="Email"
                      maxLength={200}
                      onSave={v => {
                        if (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) void savePerson({email: v});
                        else setError('That email address does not look right.');
                      }}
                      placeholder="add email"
                      value={person.email}
                    />
                    <span>Phone</span>
                    <InlineField label="Phone" maxLength={60} onSave={v => savePerson({phone: v})} placeholder="add phone" value={person.phone} />
                    <span>Location</span>
                    <InlineField label="Location" maxLength={120} onSave={v => savePerson({location: v})} placeholder="city, office or time zone" value={person.location} />
                    <span>Reports to</span>
                    <InlineField label="Reports to" maxLength={120} onSave={v => savePerson({manager: v})} placeholder="add manager" value={person.manager} />
                    <span>LinkedIn</span>
                    <InlineField
                      display={person.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      label="LinkedIn profile"
                      maxLength={300}
                      onSave={v => {
                        const url = v ? normalizeUrl(v) : '';
                        if (url !== null) void savePerson({linkedin: url});
                      }}
                      placeholder="add profile link"
                      value={person.linkedin}
                    />
                    <span>Birthday</span>
                    <InlineField
                      display={
                        <>
                          {birthdayLabel(person.birthday)}
                          {toBirthday !== null && toBirthday <= 30 && <em className={styles.muted}> · {toBirthday === 0 ? 'today' : `in ${toBirthday} days`}</em>}
                        </>
                      }
                      label="Birthday"
                      onSave={v => savePerson({birthday: dateInputToIso(v)})}
                      placeholder="add birthday"
                      type="date"
                      value={isoToDateInput(person.birthday)}
                    />
                    <span>Known since</span>
                    <InlineField
                      display={formatDate(profile.startDate)}
                      label="Known since"
                      onSave={v => patch({startDate: dateInputToIso(v)}).catch(() => undefined)}
                      placeholder="when you started working together"
                      type="date"
                      value={isoToDateInput(profile.startDate)}
                    />
                  </div>
                </Card>

                <Card icon={Sparkles} title="About">
                  <InlineNote
                    addLabel={`Write a few lines about ${first}`}
                    clampLines={5}
                    editLabel="Edit"
                    maxLength={3000}
                    onSave={text => patch({brief: {text}})}
                    placeholder={`What ${first} does, what they're great at, what they're working toward, and how they like to work.`}
                    value={profile.brief?.text || ''}
                  />
                </Card>

                <Card count={openTasks.length} icon={ListTodo} onViewAll={() => go('tasks')} title="Open tasks">
                  {!openTasks.length ? (
                    <p className={styles.ovEmpty}>Nothing open. Assign {first} a task from the Tasks tab, or pick them under “Assigned to” on any task.</p>
                  ) : (
                    openTasks.slice(0, 6).map(t => (
                      <div className={styles.ovRow} key={t._id}>
                        <button aria-label={`Complete ${t.title}`} className={styles.taskCheck} onClick={() => toggleTask(t)} type="button">
                          {statusOf(t) === 'done' && <Check size={11} />}
                        </button>
                        <button className={styles.ovRowMain} onClick={() => go('tasks')} type="button">
                          <span>{t.title}</span>
                          <small>
                            {[assigned.includes(t) ? `Assigned to ${first}` : `About ${first}`, t.dueDate && formatDue(t.dueDate)].filter(Boolean).join(' · ')}
                          </small>
                        </button>
                      </div>
                    ))
                  )}
                </Card>

                <Card count={pages.length} icon={NotebookPen} onViewAll={() => go('notes')} title="Recent notes">
                  {!recentNotes.length ? (
                    <p className={styles.ovEmpty}>No notes yet. Log a conversation to start one.</p>
                  ) : (
                    recentNotes.map(n => (
                      <button className={styles.ovRow} key={String(n._id)} onClick={() => onOpenPage(String(n._id))} type="button">
                        <NotebookPen className={styles.ovIcon} size={13} />
                        <span className={styles.ovRowMain}>
                          <span>{n.title || 'Untitled'}</span>
                          <small>{formatDate(String(noteDateOf(n)))}</small>
                        </span>
                      </button>
                    ))
                  )}
                </Card>
              </div>

              <div className={styles.ovCol}>
                <TalkingPoints first={first} onChange={savePoints} points={points} />

                <Card icon={MessagesSquare} title="Keep in touch">
                  <p className={p.touchStatus} data-due={checkIn.due || undefined}>
                    {checkIn.since === null ? 'No conversation logged yet.' : `Last talked ${agoLabel(checkIn.since)} (${formatDate(person.lastContactedAt)}).`}{' '}
                    {checkIn.every > 0 &&
                      (checkIn.due
                        ? 'Time to check in.'
                        : `Next check-in in ${checkIn.dueIn} day${checkIn.dueIn === 1 ? '' : 's'}.`)}
                  </p>
                  <div className={p.touchActions}>
                    <button className={`${styles.btn} ${styles.primary}`} onClick={() => logConversation(true)} type="button">
                      <NotebookPen size={14} /> Log a conversation
                    </button>
                    <button className={styles.btn} onClick={() => logConversation(false)} title="Mark today as your last conversation, without a note" type="button">
                      <Check size={14} /> Talked today
                    </button>
                  </div>
                  <label className={p.cadence}>
                    Remind me
                    <select onChange={e => void savePerson({checkInDays: Number(e.target.value)})} value={checkIn.every}>
                      {CHECK_IN_OPTIONS.map(([days, label]) => (
                        <option key={days} value={days}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {openPoints.length > 0 && (
                    <p className={styles.ovFoot}>Log a conversation starts a note with your {openPoints.length} open talking point{openPoints.length === 1 ? '' : 's'} as the agenda.</p>
                  )}
                </Card>

                <Card icon={HeartHandshake} title="Things to remember">
                  <InlineNote
                    addLabel="Add something to remember"
                    clampLines={6}
                    editLabel="Edit"
                    maxLength={3000}
                    onSave={text => patch({person: {remember: text}})}
                    placeholder="Family, interests, how they take their coffee, what they're proud of, topics to avoid…"
                    value={person.remember}
                  />
                </Card>

                <Card icon={Activity} onViewAll={() => go('activity')} title="Recent activity">
                  {recent === null ? (
                    <p className={styles.ovEmpty}>Loading…</p>
                  ) : !recent.length ? (
                    <p className={styles.ovEmpty}>Notes, documents, linked tasks and logged conversations appear here.</p>
                  ) : (
                    <div className={styles.activityList}>
                      {recent.slice(0, 5).map(item => (
                        <ActivityRow item={item} key={item._id} onJump={jumpToActivity} showDate />
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            {tab === 'notes' && (
              <VendorNotes
                classes={notebook.noteClasses || []}
                documents={profile.documents}
                emptyText={`1:1s, feedback, and anything else about ${first} will show up here.`}
                loading={loadingPages}
                meetingPrefix={`1:1 with ${first}`}
                onAddPage={onAddPage}
                onOpenPage={onOpenPage}
                onReorderPages={onReorderPages}
                onUpdateNotebook={updates => onUpdateNotebook(String(notebook._id), updates)}
                onUpdatePage={onUpdatePage}
                pages={pages}
                sort={(notebook.noteSort as NoteSort) || 'custom'}
                vendor={page}
                vendorName={name}
              />
            )}
            {tab === 'tasks' && (
              <>
                {me ? (
                  <VendorTasksCard assignee={{staffId: me._id, name: me.name, email: me.email || ''}} title={`Assigned to ${first}`} vendor={page} />
                ) : (
                  <p className={styles.empty}>Getting {first} ready for “Assigned to”…</p>
                )}
                <VendorTasksCard title={`About ${first}`} vendor={page} />
              </>
            )}
            {tab === 'documents' && (
              <>
                <DocumentsCard documents={profile.documents} onPatch={patch} types={PEOPLE_DOC_TYPES} />
                <LinksCard links={profile.links} onPatch={patch} />
              </>
            )}
            {tab === 'activity' && <ActivityView onJump={jumpToActivity} refreshKey={activityKey} sectionId={sectionId} />}
          </div>
        )}
      </div>
    </div>
  );
}

/** Things to bring up next time you talk: add, tick off as discussed, clear. */
function TalkingPoints({points, first, onChange}: {points: TalkingPoint[]; first: string; onChange: (next: TalkingPoint[]) => void}) {
  const [draft, setDraft] = useState('');
  const open = points.filter(pt => !pt.done);
  const done = points.filter(pt => pt.done);
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim().slice(0, 300);
    if (!text) return;
    onChange([...points, {text, done: false, createdAt: new Date().toISOString()}]);
    setDraft('');
  };
  const update = (index: number, changes: Partial<TalkingPoint>) => onChange(points.map((pt, i) => (i === index ? {...pt, ...changes} : pt)));
  return (
    <Card count={open.length || undefined} icon={ListChecks} title="Next conversation">
      <form className={p.pointAdd} onSubmit={add}>
        <Plus size={14} />
        <input
          aria-label={`Add something to discuss with ${first}`}
          maxLength={300}
          onChange={e => setDraft(e.target.value)}
          placeholder={`Something to bring up with ${first}, press Enter`}
          value={draft}
        />
      </form>
      {!points.length ? (
        <p className={styles.ovEmpty}>Jot down topics as they come up, so you’re ready for your next 1:1.</p>
      ) : (
        <ul className={p.points}>
          {points.map((pt, i) => (
            <li className={p.point} data-done={pt.done || undefined} key={pt._id || `${i}-${pt.text}`}>
              <button
                aria-label={`${pt.done ? 'Not discussed yet' : 'Discussed'}: ${pt.text}`}
                aria-pressed={pt.done}
                className={styles.taskCheck}
                onClick={() => update(i, {done: !pt.done})}
                type="button">
                {pt.done && <Check size={11} />}
              </button>
              <span>{pt.text}</span>
              <button aria-label={`Remove ${pt.text}`} className={p.pointRemove} onClick={() => onChange(points.filter((_, j) => j !== i))} type="button">
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <button className={styles.linkButton} onClick={() => onChange(open)} type="button">
          Clear {done.length} discussed
        </button>
      )}
    </Card>
  );
}
