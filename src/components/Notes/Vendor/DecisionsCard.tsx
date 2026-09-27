/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {ChevronDown, FileText, Gavel, NotebookPen, Pencil, Plus, Trash2} from 'lucide-react';
import React, {useMemo, useState} from 'react';

import PinButton from './PinButton';
import {DecisionForm, NoteOption} from './RecordForms';
import {
  createRecord,
  DECISION_STATUSES,
  DecisionStatus,
  deleteRecord,
  formatDate,
  ProjectDecision,
  updateRecord,
  VendorDocument,
  vendorFileUrl,
  VendorProfile,
} from './vendorApi';
import styles from './VendorPage.module.css';

interface Props {
  sectionId: string;
  decisions: ProjectDecision[];
  notes: NoteOption[];
  documents: VendorDocument[];
  onProfile: (profile: VendorProfile) => void;
  onOpenNote: (id: string) => void;
}

const statusTone: Record<DecisionStatus, string> = {Active: 'good', Superseded: 'muted', Reversed: 'bad'};

export function docHref(doc?: VendorDocument) {
  if (!doc) return undefined;
  return doc.fileId ? vendorFileUrl(doc.fileId) : doc.url || undefined;
}

export default function DecisionsCard({sectionId, decisions, notes, documents, onProfile, onOpenNote}: Props) {
  const [filter, setFilter] = useState<DecisionStatus | 'all'>('all');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const noteTitle = useMemo(() => new Map(notes.map(n => [n._id, n.title])), [notes]);
  const docById = useMemo(() => new Map(documents.map(d => [String(d._id), d])), [documents]);

  // Pinned first, then newest decision date
  const shown = useMemo(
    () =>
      decisions
        .filter(d => filter === 'all' || d.status === filter)
        .sort((a, b) => {
          if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
          const ta = new Date(a.decisionDate || a.createdAt || 0).getTime();
          const tb = new Date(b.decisionDate || b.createdAt || 0).getTime();
          return tb - ta;
        }),
    [decisions, filter],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    decisions.forEach(d => (c[d.status] = (c[d.status] || 0) + 1));
    return c;
  }, [decisions]);

  const run = async (op: () => Promise<VendorProfile | {profile: VendorProfile}>) => {
    setSaving(true);
    setError('');
    try {
      const result = await op();
      onProfile('profile' in result ? result.profile : result);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the decision.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Decisions" className={`${styles.card} ${styles.wide}`} id="project-decisions">
      <div className={styles.cardHead}>
        <h2>
          <Gavel size={17} />
          Decisions
          {decisions.length > 0 && <small>{counts.Active || 0} active</small>}
        </h2>
        <div className={styles.seg} role="group" aria-label="Filter decisions">
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            All {decisions.length}
          </button>
          {DECISION_STATUSES.map(s => (
            <button aria-pressed={filter === s} key={s} onClick={() => setFilter(s)}>
              {s} {counts[s] || 0}
            </button>
          ))}
        </div>
        <button className={`${styles.btn} ${styles.primary}`} onClick={() => setEditing('new')}>
          <Plus size={14} /> New decision
        </button>
      </div>

      {editing === 'new' && (
        <DecisionForm
          documents={documents}
          initial={{}}
          notes={notes}
          onCancel={() => setEditing(null)}
          onSubmit={values => run(() => createRecord(sectionId, 'decisions', values))}
          saving={saving}
          submitLabel="Save decision"
        />
      )}

      {!shown.length && editing !== 'new' ? (
        <div className={styles.empty}>
          {decisions.length
            ? 'No decisions with this status.'
            : 'Record the important calls here so they don’t get buried in meeting notes.'}
        </div>
      ) : (
        <div className={styles.list}>
          {shown.map(d =>
            editing === d._id ? (
              <DecisionForm
                documents={documents}
                initial={d}
                key={d._id}
                notes={notes}
                onCancel={() => setEditing(null)}
                onSubmit={values => run(() => updateRecord(sectionId, 'decisions', d._id, values))}
                saving={saving}
                submitLabel="Save changes"
              />
            ) : (
              <div className={styles.recordRow} data-pinned={!!d.pinned} id={`decision-${d._id}`} key={d._id}>
                <button
                  aria-expanded={expanded === d._id}
                  className={styles.recordMain}
                  onClick={() => setExpanded(expanded === d._id ? null : d._id)}>
                  <div className={styles.rowTitle}>
                    <span>{d.title}</span>
                    <span className={styles.chip} data-tone={statusTone[d.status]}>
                      {d.status}
                    </span>
                  </div>
                  <div className={styles.rowSub}>
                    {d.decisionDate && <span>{formatDate(d.decisionDate)}</span>}
                    {d.details && expanded !== d._id && <span className={styles.clamp1}>{d.details}</span>}
                  </div>
                </button>
                <div className={styles.rowActions} data-keep={!!d.pinned}>
                  <PinButton
                    label={d.title}
                    onToggle={() => run(() => updateRecord(sectionId, 'decisions', d._id, {pinned: !d.pinned}))}
                    pinned={!!d.pinned}
                  />
                  <button aria-label={`Edit ${d.title}`} className={styles.iconBtn} onClick={() => setEditing(d._id)}>
                    <Pencil size={14} />
                  </button>
                  <button
                    aria-label={`Delete ${d.title}`}
                    className={`${styles.iconBtn} ${styles.danger}`}
                    onClick={() => confirm(`Delete the decision “${d.title}”?`) && run(() => deleteRecord(sectionId, 'decisions', d._id))}>
                    <Trash2 size={14} />
                  </button>
                  <ChevronDown className={styles.expandIcon} data-open={expanded === d._id} size={15} />
                </div>
                {expanded === d._id && (
                  <div className={styles.recordDetails}>
                    {d.details && <p className={styles.prewrap}>{d.details}</p>}
                    {d.reason && (
                      <p className={styles.prewrap}>
                        <strong>Reason: </strong>
                        {d.reason}
                      </p>
                    )}
                    <div className={styles.recordLinks}>
                      {d.noteId && (
                        <button className={styles.relChip} onClick={() => onOpenNote(d.noteId!)}>
                          <NotebookPen size={12} /> {noteTitle.get(d.noteId) || 'Related note'}
                        </button>
                      )}
                      {d.documentId && docById.get(d.documentId) && (
                        <a className={styles.relChip} href={docHref(docById.get(d.documentId))} rel="noopener noreferrer" target="_blank">
                          <FileText size={12} /> {docById.get(d.documentId)!.title}
                        </a>
                      )}
                    </div>
                    <p className={styles.muted}>
                      Created {formatDate(d.createdAt)} · Last modified {formatDate(d.updatedAt)}
                    </p>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
