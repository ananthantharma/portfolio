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
import {GripVertical, NotebookPen, Plus, Search, Tags, Trash2, X} from 'lucide-react';
import React, {useMemo, useState} from 'react';

import {INoteClass} from '@/models/NoteCategory';
import {INotePage} from '@/models/NotePage';

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
  pages: INotePage[];
  loading: boolean;
  classes: INoteClass[];
  sort: NoteSort;
  onOpenPage: (id: string) => void;
  onAddPage: (title: string, extra?: Partial<INotePage>) => void;
  onUpdatePage: (id: string, updates: Partial<INotePage>) => Promise<void>;
  onReorderPages: (newOrder: INotePage[]) => void;
  onUpdateNotebook: (updates: {noteClasses?: INoteClass[]; noteSort?: string}) => Promise<void>;
}

function snippet(page: INotePage) {
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
    .slice(0, 160);
}

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
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [editingClasses, setEditingClasses] = useState(false);

  const classById = useMemo(() => new Map(classes.map(c => [String(c._id), c])), [classes]);
  const classOf = (page: INotePage) => (page.noteClass && classById.has(page.noteClass) ? page.noteClass : UNCLASSIFIED);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    pages.forEach(p => {
      const key = p.noteClass && classById.has(p.noteClass) ? p.noteClass : UNCLASSIFIED;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [pages, classById]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = pages.filter(p => {
      if (classFilter !== 'all' && classOf(p) !== classFilter) return false;
      return !q || p.title.toLowerCase().includes(q) || snippet(p).toLowerCase().includes(q);
    });
    const time = (v: Date | string) => new Date(v).getTime();
    const classRank = (p: INotePage) => {
      const i = classes.findIndex(c => String(c._id) === p.noteClass);
      return i === -1 ? classes.length : i;
    };
    switch (sort) {
      case 'updated':
        return [...list].sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
      case 'newest':
        return [...list].sort((a, b) => time(b.createdAt) - time(a.createdAt));
      case 'oldest':
        return [...list].sort((a, b) => time(a.createdAt) - time(b.createdAt));
      case 'title':
        return [...list].sort((a, b) => a.title.localeCompare(b.title, undefined, {numeric: true}));
      case 'class':
        return [...list].sort((a, b) => classRank(a) - classRank(b) || time(b.updatedAt) - time(a.updatedAt));
      default:
        return list; // pages arrive in the user's saved order
    }
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

  const addNote = () => {
    const extra = classFilter !== 'all' && classFilter !== UNCLASSIFIED ? {noteClass: classFilter} : undefined;
    const label = extra ? classById.get(classFilter)?.name : '';
    onAddPage(label ? `${label} – ${new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}` : 'New note', extra);
  };

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
        <button className={`${styles.btn} ${styles.primary}`} onClick={addNote}>
          <Plus size={14} /> New note
        </button>
      </div>

      {editingClasses && (
        <ClassEditor classes={classes} onClose={() => setEditingClasses(false)} onSave={noteClasses => onUpdateNotebook({noteClasses})} />
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
          <button
            aria-pressed={classFilter === String(c._id)}
            className={styles.chip}
            key={String(c._id)}
            onClick={() => setClassFilter(classFilter === String(c._id) ? 'all' : String(c._id))}>
            <span className={styles.dot} style={{background: c.color}} />
            {c.name} <small>{counts[String(c._id)] || 0}</small>
          </button>
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
      </div>

      {loading && !pages.length ? (
        <div className={styles.empty}>Loading notes…</div>
      ) : !visible.length ? (
        <div className={styles.empty}>
          {pages.length
            ? 'No notes match. Try another search or classification.'
            : `Meeting notes, QBR prep, and decisions about ${vendorName} will show up here.`}
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
          <SortableContext items={visible.map(p => String(p._id))} strategy={verticalListSortingStrategy}>
            {visible.map(page => {
              const key = classOf(page);
              const showGroup = sort === 'class' && key !== lastGroup;
              lastGroup = key;
              const cls = classById.get(key);
              return (
                <React.Fragment key={String(page._id)}>
                  {showGroup && (
                    <div className={styles.noteGroup}>
                      <span className={styles.dot} style={{background: cls?.color || '#c2c6bb'}} />
                      {cls?.name || 'Unclassified'}
                    </div>
                  )}
                  <NoteRow
                    canDrag={canDrag}
                    classes={classes}
                    currentClass={cls}
                    onOpen={() => onOpenPage(String(page._id))}
                    onSetClass={noteClass => onUpdatePage(String(page._id), {noteClass})}
                    page={page}
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

function NoteRow({
  page,
  canDrag,
  classes,
  currentClass,
  onOpen,
  onSetClass,
}: {
  page: INotePage;
  canDrag: boolean;
  classes: INoteClass[];
  currentClass?: INoteClass;
  onOpen: () => void;
  onSetClass: (noteClass: string | null) => void;
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: String(page._id),
    disabled: !canDrag,
  });
  const text = snippet(page);
  return (
    <div
      className={styles.noteRow}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: 'relative',
        zIndex: isDragging ? 5 : 'auto',
        borderLeft: `3px solid ${currentClass?.color || 'transparent'}`,
      }}>
      {canDrag && (
        <span aria-label={`Drag ${page.title}`} className={styles.handle} {...attributes} {...listeners}>
          <GripVertical size={15} />
        </span>
      )}
      <button className={styles.noteOpen} onClick={onOpen}>
        <strong>{page.title || 'Untitled'}</strong>
        <span>{text || 'Empty note'}</span>
      </button>
      <select
        aria-label={`Classification for ${page.title}`}
        className={styles.classSelect}
        onChange={e => onSetClass(e.target.value || null)}
        style={
          currentClass
            ? {background: `${currentClass.color}1f`, color: currentClass.color, borderColor: 'transparent'}
            : {color: '#7d8576'}
        }
        value={currentClass ? String(currentClass._id) : ''}>
        <option value="">Unclassified</option>
        {classes.map(c => (
          <option key={String(c._id)} value={String(c._id)}>
            {c.name}
          </option>
        ))}
      </select>
      <div className={styles.noteMeta}>
        <div>Edited {timeAgo(page.updatedAt)}</div>
        <div>Created {new Date(page.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</div>
      </div>
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
        Classifications are shared by every vendor in this notebook. Removing one leaves its notes unclassified.
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
