/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {INoteCategory, INoteClass} from '@/models/NoteCategory';
import {INotePage} from '@/models/NotePage';
import {INoteSection} from '@/models/NoteSection';

import {saveTaskChanges} from '../../Tasks/taskActions';
import {useTaskCollection} from '../../Tasks/TaskProvider';
import {statusOf, Task, TaskVendor, vendorIdOf} from '../../Tasks/types';
import ActivityView from './ActivityView';
import AttentionCard, {isOpenAttention, isSerious} from './AttentionCard';
import ContactsCard from './ContactsCard';
import DecisionsCard, {docHref} from './DecisionsCard';
import DocumentsCard from './DocumentsCard';
import LinksCard from './LinksCard';
import NoteRecordModal, {NoteRecordRequest} from './NoteRecordModal';
import ProjectHeader from './ProjectHeader';
import ProjectOverview, {ProjectTab, SinceVisit} from './ProjectOverview';
import ProjectSearchResults, {SearchResult} from './ProjectSearch';
import {ActivityItem, fetchActivity, fetchVendor, PROJECT_DOC_TYPES, recordVisit, saveVendor, VendorPatch, VendorProfile} from './vendorApi';
import VendorNotes, {noteSnippet,NoteSort} from './VendorNotes';
import styles from './VendorPage.module.css';
import VendorTasksCard from './VendorTasksCard';

export interface ProjectPageProps {
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

const TAB_KEY = 'PROJECT_PAGE_TAB';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Turn activity since the last visit into short phrases: "2 new notes · 3 tasks completed". */
function summarizeSince(items: ActivityItem[]): string[] {
  const count = (pred: (i: ActivityItem) => boolean) => items.filter(pred).length;
  const parts: [number, string][] = [
    [count(i => i.type === 'note' && (i.action === 'created' || i.action === 'meeting')), 'new note'],
    [count(i => i.type === 'decision' && i.action === 'created'), 'new decision'],
    [count(i => i.type === 'task' && i.action === 'created'), 'new task'],
    [count(i => i.type === 'task' && i.action === 'completed'), 'task completed'],
    [count(i => i.type === 'document' && i.action === 'added'), 'document added'],
    [count(i => i.type === 'attention' && i.action === 'created'), 'attention item added'],
    [count(i => i.type === 'attention' && i.action === 'resolved'), 'attention item resolved'],
  ];
  const out = parts
    .filter(([n]) => n > 0)
    .map(([n, word]) => {
      if (word === 'task completed') return `${plural(n, 'task')} completed`;
      if (word === 'document added') return `${plural(n, 'document')} added`;
      if (word === 'attention item added') return `${plural(n, 'attention item')} added`;
      if (word === 'attention item resolved') return `${plural(n, 'attention item')} resolved`;
      return plural(n, word);
    });
  const other = items.filter(i => i.type === 'project').length;
  if (other) out.push(plural(other, 'project update'));
  return out;
}

export default function ProjectPage(props: ProjectPageProps) {
  const {section, notebook, pages, loadingPages, onOpenPage, onAddPage, onUpdatePage, onReorderPages, onUpdateNotebook} = props;
  const sectionId = String(section._id);
  const project: TaskVendor = useMemo(
    () => ({_id: sectionId, name: section.name, categoryId: String(section.categoryId)}),
    [sectionId, section.name, section.categoryId],
  );
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<ProjectTab>('overview');
  const [query, setQuery] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [recent, setRecent] = useState<ActivityItem[] | null>(null);
  const [activityKey, setActivityKey] = useState(0);
  const [sinceVisit, setSinceVisit] = useState<SinceVisit | null>(null);
  const [recordRequest, setRecordRequest] = useState<{request: NoteRecordRequest; note: {id: string; title: string}} | null>(null);
  const latest = useRef(sectionId);
  const {tasks, run} = useTaskCollection();

  // Remember the last tab per browser; always start on Overview for a different project
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TAB_KEY) || 'null');
      setTab(saved?.sectionId === sectionId ? saved.tab : 'overview');
    } catch {
      setTab('overview');
    }
  }, [sectionId]);
  const go = useCallback(
    (next: ProjectTab, focus?: string) => {
      setQuery('');
      setTab(next);
      setFocusId(focus || null);
      try {
        localStorage.setItem(TAB_KEY, JSON.stringify({sectionId, tab: next}));
      } catch {
        // storage unavailable
      }
    },
    [sectionId],
  );

  // Profile + "since your last visit" (recorded once per opening of the project)
  useEffect(() => {
    latest.current = sectionId;
    setProfile(null);
    setLoadError('');
    setSinceVisit(null);
    fetchVendor(sectionId)
      .then(data => latest.current === sectionId && setProfile(data))
      .catch(err => latest.current === sectionId && setLoadError(err.message));
    recordVisit(sectionId)
      .then(async previous => {
        if (!previous || latest.current !== sectionId) return;
        const items = await fetchActivity(sectionId, {since: previous, limit: 200});
        const parts = summarizeSince(items);
        if (parts.length && latest.current === sectionId) setSinceVisit({at: previous, parts});
      })
      .catch(() => undefined);
  }, [sectionId]);

  const linkedTasks = useMemo(
    () => tasks.filter(t => vendorIdOf(t) === sectionId && !t.isArchived && !t.isTemplate),
    [tasks, sectionId],
  );

  // Refresh recent activity whenever something on the project changes
  const taskSignature = linkedTasks.map(t => `${t._id}:${statusOf(t)}`).join(',');
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
  const patch = useCallback(async (changes: VendorPatch) => applyProfile(await saveVendor(sectionId, changes)), [sectionId, applyProfile]);

  // Scroll to and briefly highlight a record after jumping to it
  useEffect(() => {
    if (!focusId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(focusId);
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'});
        el.classList.add(styles.flash);
        setTimeout(() => el.classList.remove(styles.flash), 1700);
      }
      setFocusId(null);
    }, 120);
    return () => clearTimeout(timer);
  }, [focusId, tab]);

  const toggleTask = (task: Task) =>
    run(task._id, async () => {
      const complete = statusOf(task) !== 'done';
      await saveTaskChanges(task, {isCompleted: complete, status: complete ? 'done' : 'todo'});
    }).catch(() => undefined);

  const noteOptions = useMemo(() => pages.map(p => ({_id: String(p._id), title: p.title})), [pages]);

  const openSearchResult = (r: SearchResult) => {
    if (r.kind === 'note') return onOpenPage(r.id);
    if (r.kind === 'task') return go('tasks');
    if (r.kind === 'decision') return go('decisions', `decision-${r.id}`);
    if (r.kind === 'attention') return go('attention', `attention-${r.id}`);
    if (r.kind === 'document') {
      const doc = profile?.documents.find(d => String(d._id) === r.id);
      const href = docHref(doc);
      if (href) window.open(href, '_blank', 'noopener');
      return go('documents', `doc-${r.id}`);
    }
    if (r.kind === 'link') {
      const link = profile?.links.find(l => String(l._id) === r.id);
      if (link) window.open(link.url, '_blank', 'noopener');
    }
  };

  const jumpToActivity = (item: ActivityItem) => {
    if (!item.refId) return;
    if (item.type === 'note' && pages.some(p => String(p._id) === item.refId)) return onOpenPage(item.refId);
    if (item.type === 'task') return go('tasks');
    if (item.type === 'decision') return go('decisions', `decision-${item.refId}`);
    if (item.type === 'attention') return go('attention', `attention-${item.refId}`);
    if (item.type === 'document') return go('documents', `doc-${item.refId}`);
  };

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>This project couldn’t be loaded. {loadError}</div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>Loading project…</div>
      </div>
    );
  }

  const decisions = profile.decisions || [];
  const attention = profile.attention || [];
  const openTasks = linkedTasks.filter(t => statusOf(t) !== 'done').length;
  const openAttention = attention.filter(isOpenAttention).length;
  const hasSerious = attention.some(isSerious);
  const lastUpdated = [profile.updatedAt, recent?.[0]?.createdAt].filter(Boolean).sort().pop() || null;

  const tabs: {key: ProjectTab; label: string; count?: number; warn?: boolean}[] = [
    {key: 'overview', label: 'Overview'},
    {key: 'notes', label: 'Notes', count: pages.length},
    {key: 'tasks', label: 'Tasks', count: openTasks},
    {key: 'decisions', label: 'Decisions', count: decisions.length},
    {key: 'attention', label: 'Attention', count: openAttention, warn: hasSerious},
    {key: 'documents', label: 'Documents', count: profile.documents.length},
    {key: 'contacts', label: 'Contacts', count: profile.keyContacts.length},
    {key: 'activity', label: 'Activity'},
  ];

  const searching = query.trim().length > 1;

  return (
    <div className={`${styles.page} ${styles.projectPage}`}>
      <ProjectHeader
        lastUpdated={lastUpdated}
        name={section.name}
        notebookName={notebook.name}
        onPatch={patch}
        onQuery={setQuery}
        profile={profile}
        query={query}
      />

      <nav aria-label="Project sections" className={styles.projectTabs} role="tablist">
        {tabs.map(t => (
          <button
            aria-selected={!searching && tab === t.key}
            className={styles.projectTab}
            key={t.key}
            onClick={() => go(t.key)}
            role="tab"
            type="button">
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={styles.tabCount} data-warn={t.warn || undefined} title={t.warn ? 'Includes high or critical items' : undefined}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className={styles.projectBody}>
        {searching ? (
          <ProjectSearchResults
            onOpen={openSearchResult}
            query={query}
            sources={{
              notes: pages,
              tasks: linkedTasks,
              decisions,
              attention,
              documents: profile.documents,
              links: profile.links,
            }}
          />
        ) : tab === 'overview' ? (
          <ProjectOverview
            activity={recent}
            notes={pages}
            onDismissSince={() => setSinceVisit(null)}
            onGo={go}
            onJumpActivity={jumpToActivity}
            onOpenNote={onOpenPage}
            onPatch={patch}
            onToggleTask={toggleTask}
            profile={profile}
            sinceVisit={sinceVisit}
            tasks={linkedTasks}
          />
        ) : (
          <div className={styles.grid}>
            {tab === 'notes' && (
              <VendorNotes
                classes={notebook.noteClasses || []}
                decisions={decisions}
                documents={profile.documents}
                emptyText={`Meeting notes, decisions, and updates for ${section.name} will show up here.`}
                loading={loadingPages}
                meetingPrefix="Project meeting"
                onAddPage={onAddPage}
                onConvertToDecision={page =>
                  setRecordRequest({
                    note: {id: String(page._id), title: page.title},
                    request: {kind: 'decision', title: page.title, text: noteSnippet(page, 6000)},
                  })
                }
                onOpenDecision={id => go('decisions', `decision-${id}`)}
                onOpenPage={onOpenPage}
                onReorderPages={onReorderPages}
                onUpdateNotebook={updates => onUpdateNotebook(String(notebook._id), updates)}
                onUpdatePage={onUpdatePage}
                pages={pages}
                sort={(notebook.noteSort as NoteSort) || 'custom'}
                vendor={project}
                vendorName={section.name}
              />
            )}
            {tab === 'tasks' && <VendorTasksCard vendor={project} />}
            {tab === 'decisions' && (
              <DecisionsCard
                decisions={decisions}
                documents={profile.documents}
                notes={noteOptions}
                onOpenNote={onOpenPage}
                onProfile={applyProfile}
                sectionId={sectionId}
              />
            )}
            {tab === 'attention' && <AttentionCard items={attention} onProfile={applyProfile} sectionId={sectionId} />}
            {tab === 'documents' && (
              <>
                <DocumentsCard documents={profile.documents} onPatch={patch} types={PROJECT_DOC_TYPES} />
                <LinksCard links={profile.links} onPatch={patch} />
              </>
            )}
            {tab === 'contacts' && (
              <ContactsCard contacts={profile.keyContacts} onPatch={patch} variant="project" vendorName={section.name} wide />
            )}
            {tab === 'activity' && <ActivityView onJump={jumpToActivity} refreshKey={activityKey} sectionId={sectionId} />}
          </div>
        )}
      </div>

      {recordRequest && (
        <NoteRecordModal
          note={recordRequest.note}
          onClose={() => setRecordRequest(null)}
          onCreated={next => next && applyProfile(next)}
          project={project}
          request={recordRequest.request}
        />
      )}
    </div>
  );
}
