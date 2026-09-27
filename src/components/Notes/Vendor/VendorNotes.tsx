/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {
  CalendarPlus,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Gavel,
  GripVertical,
  NotebookPen,
  Plus,
  Search,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import {INoteClass} from '@/models/NoteCategory';
import {INotePage} from '@/models/NotePage';

import LinkTasksButton from '../../Tasks/LinkTasksButton';
import {TaskVendor} from '../../Tasks/types';
import {meetingNoteHtml} from './meetingNotes';
import PinButton from './PinButton';
import {dateInputToIso, formatDate, isoToDateInput, ProjectDecision, VendorDocument} from './vendorApi';
import styles from './VendorPage.module.css';

export type NoteSort = 'custom' | 'updated' | 'newest' | 'oldest' | 'title' | 'class';

const SORT_LABELS: Record<NoteSort, string> = {
  custom: 'My order (drag to arrange)',
  updated: 'Last edited',
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title A–Z',
  class: 'Grouped by classification',
};

const CLASS_COLORS = ['#46674d', '#3f6f9f', '#b4532a', '#8a6a14', '#6a4fa3', '#9a3e5c', '#2f7d7a', '#5f5e5a'];
const UNCLASSIFIED = '__none__';

interface Props {
  vendorName: string;
  // When set, shows a "Meeting note" button that creates a structured "<prefix> – <today>" note
  meetingPrefix?: string;
  // The vendor/project these notes belong to; tasks linked to a note from here also join it
  vendor?: TaskVendor;
  emptyText?: string;
  pages: INotePage[];
  loading: boolean;
  classes: INoteClass[];
  sort: NoteSort;
  // Project extras: related documents and decisions, and "Convert to decision"
  documents?: VendorDocument[];
  decisions?: ProjectDecision[];
  onConvertToDecision?: (page: INotePage) => void;
  onOpenDecision?: (id: string) => void;
  onOpenPage: (id: string) => void;
  onAddPage: (title: string, extra?: Partial<INotePage>) => void;
  onUpdatePage: (id: string, updates: Partial<INotePage>) => Promise<void>;
  onReorderPages: (newOrder: INotePage[]) => void;
  onUpdateNotebook: (updates: {noteClasses?: INoteClass[]; noteSort?: string}) => Promise<INoteClass[] | void>;
}

export function noteSnippet(page: INotePage, max = 160) {
  const tabs = [...(page.tabs || [])].sort((a, b) => a.order - b.order);
  const html = tabs.map(t => t.content || '').join(' ') || page.content || '';
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    // Block-level tags separate words; inline tags (<b>, <span>) must not add spaces
    .replace(/<\/?(p|div|br|li|ul|ol|h\d|tr|td|th|table|blockquote)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** A note's classifications (several allowed; older notes stored a single one). */
export function classesOf(page: Pick<INotePage, 'noteClasses' | 'noteClass'>): string[] {
  if (page.noteClasses?.length) return page.noteClasses.map(String);
  return page.noteClass ? [String(page.noteClass)] : [];
}

/** The date a note is about: its own date if set, otherwise when it was created. */
export const noteDateOf = (page: INotePage) => page.noteDate || page.createdAt;

function timeAgo(value: Date | string) {
  const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

export default function VendorNotes(props: Props) {
  const {vendorName, pages, loading, classes, sort, onOpenPage, onAddPage, onUpdatePage, onReorderPages, onUpdateNotebook} = props;
  const {meetingPrefix, emptyText, vendor, documents, decisions, onConvertToDecision, onOpenDecision} = props;
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [editingClasses, setEditingClasses] = useState(false);
  const [addingClass, setAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [classError, setClassError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const classById = useMemo(() => new Map(classes.map(c => [String(c._id), c])), [classes]);
  const knownClasses = (page: INotePage) => classesOf(page).filter(id => classById.has(id));

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    pages.forEach(p => {
      const own = classesOf(p).filter(id => classById.has(id));
      if (!own.length) map[UNCLASSIFIED] = (map[UNCLASSIFIED] || 0) + 1;
      own.forEach(id => (map[id] = (map[id] || 0) + 1));
    });
    return map;
  }, [pages, classById]);

  const decisionsByNote = useMemo(() => {
    const map = new Map<string, ProjectDecision[]>();
    (decisions || []).forEach(d => d.noteId && map.set(d.noteId, [...(map.get(d.noteId) || []), d]));
    return map;
  }, [decisions]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = pages.filter(p => {
      const own = knownClasses(p);
      if (classFilter === UNCLASSIFIED && own.length) return false;
      if (classFilter !== 'all' && classFilter !== UNCLASSIFIED && !own.includes(classFilter)) return false;
      return !q || p.title.toLowerCase().includes(q) || noteSnippet(p, 4000).toLowerCase().includes(q);
    });
    const time = (v: Date | string) => new Date(v).getTime();
    const classRank = (p: INotePage) => {
      const own = knownClasses(p);
      const ranks = own.map(id => classes.findIndex(c => String(c._id) === id)).filter(i => i >= 0);
      return ranks.length ? Math.min(...ranks) : classes.length;
    };
    let sorted: INotePage[];
    switch (sort) {
      case 'updated':
        sorted = [...list].sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
        break;
      case 'newest':
        sorted = [...list].sort((a, b) => time(noteDateOf(b)) - time(noteDateOf(a)));
        break;
      case 'oldest':
        sorted = [...list].sort((a, b) => time(noteDateOf(a)) - time(noteDateOf(b)));
        break;
      case 'title':
        sorted = [...list].sort((a, b) => a.title.localeCompare(b.title, undefined, {numeric: true}));
        break;
      case 'class':
        sorted = [...list].sort((a, b) => classRank(a) - classRank(b) || time(b.updatedAt) - time(a.updatedAt));
        break;
      default:
        sorted = list; // pages arrive in the user's saved order
    }
    // Pinned notes always sit at the top (except while grouping by classification)
    return sort === 'class' ? sorted : [...sorted.filter(p => p.isPinned), ...sorted.filter(p => !p.isPinned)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, query, classFilter, sort, classes, classById]);

  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 4}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
  );
  const canDrag = sort === 'custom' && !query.trim();

  const handleDragEnd = ({active, over}: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = visible.map(p => String(p._id));
    const moved = arrayMove(visible, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    // Put the reordered visible notes back into the slots they occupy in the full list,
    // so filtered-out notes keep their positions
    const visibleIds = new Set(ids);
    let next = 0;
    onReorderPages(pages.map(p => (visibleIds.has(String(p._id)) ? moved[next++] : p)));
  };

  // A structured meeting note titled "Project meeting – Sep 26, 2026", filed under Meetings if that exists
  const addMeetingNote = () => {
    const date = new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
    const title = `${meetingPrefix} – ${date}`;
    const meetings = classes.find(c => /meeting/i.test(c.name));
    onAddPage(title, {
      ...(meetings ? {noteClass: String(meetings._id), noteClasses: [String(meetings._id)]} : {}),
      noteDate: new Date(),
      tabs: [{title: 'Meeting', content: meetingNoteHtml(title, date), order: 0}],
    });
  };

  const addNote = () => {
    const cls = classFilter !== 'all' && classFilter !== UNCLASSIFIED ? classFilter : null;
    const label = cls ? classById.get(cls)?.name : '';
    onAddPage(
      label ? `${label} – ${new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}` : 'New note',
      cls ? {noteClass: cls, noteClasses: [cls]} : undefined,
    );
  };

  // Adds a classification and returns its id (null if the name was empty, taken, or saving failed)
  const createClass = async (rawName: string): Promise<string | null> => {
    const name = rawName.trim().slice(0, 40);
    if (!name) return null;
    const existing = classes.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setClassError(`"${existing.name}" already exists.`);
      return String(existing._id);
    }
    try {
      const color = CLASS_COLORS[classes.length % CLASS_COLORS.length];
      const saved = await onUpdateNotebook({noteClasses: [...classes, {name, color}]});
      const created = (saved || []).find(c => c.name.toLowerCase() === name.toLowerCase());
      setClassError('');
      return created ? String(created._id) : null;
    } catch {
      setClassError('Could not add the classification. Try again.');
      return null;
    }
  };

  const submitNewClass = async () => {
    if (!newClassName.trim()) {
      setAddingClass(false);
      return;
    }
    await createClass(newClassName);
    setNewClassName('');
    setAddingClass(false);
  };

  const removeClass = async (c: INoteClass) => {
    const id = String(c._id);
    const used = counts[id] || 0;
    const message = used
      ? `Remove "${c.name}"? It comes off ${used} note${used === 1 ? '' : 's'}. The notes themselves are kept.`
      : `Remove "${c.name}"?`;
    if (!confirm(message)) return;
    try {
      await onUpdateNotebook({noteClasses: classes.filter(x => String(x._id) !== id)});
      if (classFilter === id) setClassFilter('all');
      setClassError('');
    } catch {
      setClassError('Could not remove the classification. Try again.');
    }
  };

  const saveClasses = (page: INotePage, ids: string[]) =>
    onUpdatePage(String(page._id), {noteClasses: ids, noteClass: ids[0] || null});

  let lastGroup: string | null = null;

  return (
    <section aria-label="Notes" className={`${styles.card} ${styles.wide}`} id="vendor-notes">
      <div className={styles.cardHead}>
        <h2>
          <NotebookPen size={17} />
          Notes
          {pages.length > 0 && <small>{pages.length}</small>}
        </h2>
        <button aria-expanded={editingClasses} className={styles.btn} onClick={() => setEditingClasses(v => !v)}>
          <Tags size={14} /> Classifications
        </button>
        {meetingPrefix && (
          <button className={styles.btn} onClick={addMeetingNote} title="Create a structured meeting note for today and open it">
            <CalendarPlus size={14} /> Meeting note
          </button>
        )}
        <button className={`${styles.btn} ${styles.primary}`} onClick={addNote}>
          <Plus size={14} /> New note
        </button>
      </div>

      {editingClasses && (
        <ClassEditor
          classes={classes}
          onClose={() => setEditingClasses(false)}
          onSave={async noteClasses => {
            await onUpdateNotebook({noteClasses});
          }}
        />
      )}

      <div className={styles.notesBar}>
        <div className={styles.search}>
          <Search size={14} />
          <input aria-label="Search notes" onChange={e => setQuery(e.target.value)} placeholder={`Search ${vendorName} notes`} value={query} />
          {query && (
            <button aria-label="Clear search" className={styles.iconBtn} onClick={() => setQuery('')} style={{width: 22, height: 22}}>
              <X size={13} />
            </button>
          )}
        </div>
        <select aria-label="Sort notes" onChange={e => onUpdateNotebook({noteSort: e.target.value})} value={sort}>
          {(Object.keys(SORT_LABELS) as NoteSort[]).map(key => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.chips} role="group" aria-label="Filter by classification">
        <button aria-pressed={classFilter === 'all'} className={styles.chip} onClick={() => setClassFilter('all')}>
          All <small>{pages.length}</small>
        </button>
        {classes.map(c => (
          <span className={styles.chipGroup} key={String(c._id)}>
            <button
              aria-pressed={classFilter === String(c._id)}
              className={styles.chip}
              onClick={() => setClassFilter(classFilter === String(c._id) ? 'all' : String(c._id))}>
              <span className={styles.dot} style={{background: c.color}} />
              {c.name} <small>{counts[String(c._id)] || 0}</small>
            </button>
            <button
              aria-label={`Remove the ${c.name} classification`}
              className={styles.chipRemove}
              onClick={() => removeClass(c)}
              title={`Remove ${c.name}`}>
              <X size={10} />
            </button>
          </span>
        ))}
        {(counts[UNCLASSIFIED] || 0) > 0 && (
          <button
            aria-pressed={classFilter === UNCLASSIFIED}
            className={styles.chip}
            onClick={() => setClassFilter(classFilter === UNCLASSIFIED ? 'all' : UNCLASSIFIED)}>
            <span className={styles.dot} style={{background: '#c2c6bb'}} />
            Unclassified <small>{counts[UNCLASSIFIED]}</small>
          </button>
        )}
        {addingClass ? (
          <input
            aria-label="New classification name"
            autoFocus
            className={styles.chipInput}
            maxLength={40}
            onBlur={submitNewClass}
            onChange={e => {
              setNewClassName(e.target.value);
              setClassError('');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') submitNewClass();
              if (e.key === 'Escape') {
                setNewClassName('');
                setAddingClass(false);
              }
            }}
            placeholder="New classification"
            value={newClassName}
          />
        ) : (
          <button className={`${styles.chip} ${styles.chipAdd}`} onClick={() => setAddingClass(true)}>
            <Plus size={12} /> Add
          </button>
        )}
      </div>
      {classError && (
        <p className={styles.error} style={{marginTop: -4, marginBottom: 8}}>
          {classError}
        </p>
      )}

      {loading && !pages.length ? (
        <div className={styles.empty}>Loading notes…</div>
      ) : !visible.length ? (
        <div className={styles.empty}>
          {pages.length
            ? 'No notes match. Try another search or classification.'
            : emptyText || `Meeting notes, QBR prep, and decisions about ${vendorName} will show up here.`}
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
          <SortableContext items={visible.map(p => String(p._id))} strategy={verticalListSortingStrategy}>
            {visible.map(page => {
              const own = knownClasses(page);
              const key = own[0] || UNCLASSIFIED;
              const showGroup = sort === 'class' && key !== lastGroup;
              lastGroup = key;
              const primary = classById.get(key);
              const id = String(page._id);
              return (
                <React.Fragment key={id}>
                  {showGroup && (
                    <div className={styles.noteGroup}>
                      <span className={styles.dot} style={{background: primary?.color || '#c2c6bb'}} />
                      {primary?.name || 'Unclassified'}
                    </div>
                  )}
                  <NoteRow
                    canDrag={canDrag}
                    classById={classById}
                    classes={classes}
                    decisions={decisionsByNote.get(id) || []}
                    documents={documents}
                    expanded={expanded === id}
                    onConvertToDecision={onConvertToDecision}
                    onCreateClass={createClass}
                    onOpen={() => onOpenPage(id)}
                    onOpenDecision={onOpenDecision}
                    onSetClasses={ids => saveClasses(page, ids)}
                    onToggleExpanded={() => setExpanded(expanded === id ? null : id)}
                    onUpdate={updates => onUpdatePage(id, updates)}
                    own={own}
                    page={page}
                    vendor={vendor}
                  />
                </React.Fragment>
              );
            })}
          </SortableContext>
        </DndContext>
      )}
      {sort === 'custom' && query.trim() && visible.length > 1 && (
        <p className={styles.hint}>Clear the search to drag notes into your own order.</p>
      )}
    </section>
  );
}

/** Chips for a note's classifications plus a picker to tick several. */
function ClassPicker({
  own,
  classes,
  classById,
  onChange,
  onCreate,
}: {
  own: string[];
  classes: INoteClass[];
  classById: Map<string, INoteClass>;
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = (id: string) => onChange(own.includes(id) ? own.filter(x => x !== id) : [...own, id]);

  return (
    <div className={styles.classPicker} ref={ref}>
      <button
        aria-expanded={open}
        aria-label="Classifications for this note"
        className={styles.classChips}
        onClick={() => setOpen(v => !v)}
        type="button">
        {own.length ? (
          own.slice(0, 2).map(id => {
            const c = classById.get(id)!;
            return (
              <span className={styles.classChip} key={id} style={{background: `${c.color}1f`, color: c.color}}>
                {c.name}
              </span>
            );
          })
        ) : (
          <span className={styles.classChip} data-empty="true">
            Classify
          </span>
        )}
        {own.length > 2 && <span className={styles.classChip}>+{own.length - 2}</span>}
      </button>
      {open && (
        <div className={styles.classMenu} role="group" aria-label="Choose classifications">
          {classes.map(c => {
            const id = String(c._id);
            const on = own.includes(id);
            return (
              <button aria-pressed={on} className={styles.classOption} key={id} onClick={() => toggle(id)} type="button">
                <span className={styles.classCheck} data-on={on} style={on ? {background: c.color, borderColor: c.color} : undefined}>
                  {on && <Check size={10} />}
                </span>
                <span className={styles.dot} style={{background: c.color}} />
                {c.name}
              </button>
            );
          })}
          <form
            className={styles.classNew}
            onSubmit={async e => {
              e.preventDefault();
              if (!name.trim()) return;
              const id = await onCreate(name);
              if (id && !own.includes(id)) onChange([...own, id]);
              setName('');
            }}>
            <Plus size={12} />
            <input aria-label="New classification" maxLength={40} onChange={e => setName(e.target.value)} placeholder="New classification" value={name} />
          </form>
        </div>
      )}
    </div>
  );
}

function NoteRow({
  page,
  own,
  canDrag,
  classes,
  classById,
  documents,
  decisions,
  expanded,
  vendor,
  onOpen,
  onSetClasses,
  onCreateClass,
  onUpdate,
  onToggleExpanded,
  onConvertToDecision,
  onOpenDecision,
}: {
  page: INotePage;
  own: string[];
  canDrag: boolean;
  classes: INoteClass[];
  classById: Map<string, INoteClass>;
  documents?: VendorDocument[];
  decisions: ProjectDecision[];
  expanded: boolean;
  vendor?: TaskVendor;
  onOpen: () => void;
  onSetClasses: (ids: string[]) => void;
  onCreateClass: (name: string) => Promise<string | null>;
  onUpdate: (updates: Partial<INotePage>) => Promise<void>;
  onToggleExpanded: () => void;
  onConvertToDecision?: (page: INotePage) => void;
  onOpenDecision?: (id: string) => void;
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: String(page._id),
    disabled: !canDrag,
  });
  const text = noteSnippet(page);
  const primary = own[0] ? classById.get(own[0]) : undefined;
  const relatedDoc = page.relatedDocumentId ? documents?.find(d => String(d._id) === page.relatedDocumentId) : undefined;
  const showDetails = !!documents || !!onConvertToDecision;

  return (
    <div
      className={styles.noteRowWrap}
      data-pinned={!!page.isPinned}
      id={`note-${page._id}`}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: 'relative',
        zIndex: isDragging ? 5 : 'auto',
      }}>
      <div className={styles.noteRow} style={{borderLeft: `3px solid ${primary?.color || 'transparent'}`}}>
        {canDrag && (
          <span aria-label={`Drag ${page.title}`} className={styles.handle} {...attributes} {...listeners}>
            <GripVertical size={15} />
          </span>
        )}
        <button className={styles.noteOpen} onClick={onOpen}>
          <strong>{page.title || 'Untitled'}</strong>
          <span>{text || 'Empty note'}</span>
        </button>
        {decisions.length > 0 && (
          <span className={styles.miniBadge} title={`${decisions.length} related decision${decisions.length === 1 ? '' : 's'}`}>
            <Gavel size={11} /> {decisions.length}
          </span>
        )}
        {relatedDoc && (
          <span className={styles.miniBadge} title={`Related document: ${relatedDoc.title}`}>
            <FileText size={11} />
          </span>
        )}
        <LinkTasksButton pageId={String(page._id)} pageTitle={page.title || 'Untitled'} vendor={vendor} />
        <ClassPicker classById={classById} classes={classes} onChange={onSetClasses} onCreate={onCreateClass} own={own} />
        <PinButton label={page.title || 'note'} onToggle={() => onUpdate({isPinned: !page.isPinned})} pinned={!!page.isPinned} />
        <div className={styles.noteMeta}>
          <div>{formatDate(String(page.noteDate || page.createdAt))}</div>
          <div>Edited {timeAgo(page.updatedAt)}</div>
        </div>
        {showDetails && (
          <button
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Hide' : 'Show'} details for ${page.title}`}
            className={styles.iconBtn}
            onClick={onToggleExpanded}
            type="button">
            <ChevronDown className={styles.expandIcon} data-open={expanded} size={15} />
          </button>
        )}
      </div>
      {expanded && showDetails && (
        <div className={styles.noteDetails}>
          <label>
            Date
            <input
              onChange={e => onUpdate({noteDate: (dateInputToIso(e.target.value) as unknown as Date) || null})}
              type="date"
              value={isoToDateInput(page.noteDate ? String(page.noteDate) : String(page.createdAt))}
            />
          </label>
          {documents && (
            <label>
              Related document
              <select onChange={e => onUpdate({relatedDocumentId: e.target.value || null})} value={page.relatedDocumentId || ''}>
                <option value="">None</option>
                {documents.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className={styles.noteDetailsWide}>
            {decisions.map(d => (
              <button className={styles.relChip} key={d._id} onClick={() => onOpenDecision?.(d._id)} type="button">
                <Gavel size={12} /> {d.title}
              </button>
            ))}
            {relatedDoc && (relatedDoc.fileId || relatedDoc.url) && (
              <a
                className={styles.relChip}
                href={relatedDoc.fileId ? `/api/vendors/files/${relatedDoc.fileId}` : relatedDoc.url}
                rel="noopener noreferrer"
                target="_blank">
                <ExternalLink size={12} /> {relatedDoc.title}
              </a>
            )}
          </div>
          <div className={styles.noteDetailsActions}>
            <span className={styles.muted}>
              Created {formatDate(String(page.createdAt))} · Last modified {formatDate(String(page.updatedAt))}
            </span>
            {onConvertToDecision && (
              <button className={styles.btn} onClick={() => onConvertToDecision(page)} type="button">
                <Gavel size={13} /> Convert to decision
              </button>
            )}
            <button className={styles.btn} onClick={onOpen} type="button">
              <NotebookPen size={13} /> Open note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassEditor({
  classes,
  onSave,
  onClose,
}: {
  classes: INoteClass[];
  onSave: (classes: INoteClass[]) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<INoteClass[]>(() => classes.map(c => ({...c, _id: c._id ? String(c._id) : undefined})));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (i: number, patch: Partial<INoteClass>) => setDraft(d => d.map((c, j) => (j === i ? {...c, ...patch} : c)));
  const move = (i: number, dir: -1 | 1) =>
    setDraft(d => (i + dir < 0 || i + dir >= d.length ? d : arrayMove(d, i, i + dir)));

  const save = async () => {
    const cleaned = draft.map(c => ({...c, name: c.name.trim()})).filter(c => c.name);
    const names = cleaned.map(c => c.name.toLowerCase());
    if (new Set(names).size !== names.length) return setError('Each classification needs a different name.');
    setSaving(true);
    try {
      await onSave(cleaned);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save classifications.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.classEditor}>
      <p className={styles.muted} style={{margin: '0 0 10px'}}>
        Classifications are shared by every page in this notebook. Removing one takes it off its notes; the notes are kept.
      </p>
      {draft.map((c, i) => (
        <div className={styles.classEditorRow} key={c._id || `new-${i}`}>
          <input aria-label={`Colour for ${c.name || 'classification'}`} onChange={e => update(i, {color: e.target.value})} type="color" value={c.color} />
          <input aria-label="Classification name" maxLength={40} onChange={e => update(i, {name: e.target.value})} placeholder="Name" type="text" value={c.name} />
          <button aria-label="Move up" className={styles.iconBtn} disabled={i === 0} onClick={() => move(i, -1)}>
            ↑
          </button>
          <button aria-label="Move down" className={styles.iconBtn} disabled={i === draft.length - 1} onClick={() => move(i, 1)}>
            ↓
          </button>
          <button aria-label={`Remove ${c.name}`} className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setDraft(d => d.filter((_, j) => j !== i))}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div className={styles.formActions} style={{marginTop: 10}}>
        <button
          className={styles.btn}
          onClick={() => setDraft(d => [...d, {name: '', color: CLASS_COLORS[d.length % CLASS_COLORS.length]}])}
          style={{marginRight: 'auto'}}>
          <Plus size={14} /> Add classification
        </button>
        <button className={styles.btn} onClick={onClose}>
          Cancel
        </button>
        <button className={`${styles.btn} ${styles.primary}`} disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
