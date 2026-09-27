/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import React, {useState} from 'react';

import {
  ATTENTION_SEVERITIES,
  ATTENTION_STATUSES,
  ATTENTION_TYPES,
  AttentionItem,
  dateInputToIso,
  DECISION_STATUSES,
  isoToDateInput,
  ProjectDecision,
  VendorDocument,
} from './vendorApi';
import styles from './VendorPage.module.css';

export interface NoteOption {
  _id: string;
  title: string;
}

const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── Decision ────────────────────────────────────────────────────────────────

export type DecisionDraft = Partial<ProjectDecision>;

export function DecisionForm({
  initial,
  notes,
  documents,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: DecisionDraft;
  notes: NoteOption[];
  documents: VendorDocument[];
  saving: boolean;
  submitLabel: string;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title || '');
  const [details, setDetails] = useState(initial.details || '');
  const [date, setDate] = useState(initial.decisionDate ? isoToDateInput(initial.decisionDate) : todayInput());
  const [reason, setReason] = useState(initial.reason || '');
  const [status, setStatus] = useState(initial.status || 'Active');
  const [noteId, setNoteId] = useState(initial.noteId || '');
  const [documentId, setDocumentId] = useState(initial.documentId || '');
  const [pinned, setPinned] = useState(!!initial.pinned);
  const [error, setError] = useState('');

  return (
    <form
      className={styles.form}
      onSubmit={e => {
        e.preventDefault();
        if (!title.trim()) return setError('Give the decision a title.');
        onSubmit({
          title: title.trim(),
          details: details.trim(),
          decisionDate: dateInputToIso(date),
          reason: reason.trim(),
          status,
          noteId: noteId || null,
          documentId: documentId || null,
          pinned,
        });
      }}>
      <label className={styles.formFull}>
        Decision
        <input autoFocus maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="Proceed with Option B architecture" value={title} />
      </label>
      <label className={styles.formFull}>
        Details
        <textarea maxLength={6000} onChange={e => setDetails(e.target.value)} placeholder="What was decided, exactly" rows={3} value={details} />
      </label>
      <label className={styles.formFull}>
        Reason / context
        <textarea maxLength={4000} onChange={e => setReason(e.target.value)} placeholder="Why, what options were considered, who agreed" rows={2} value={reason} />
      </label>
      <label>
        Date
        <input onChange={e => setDate(e.target.value)} type="date" value={date} />
      </label>
      <label>
        Status
        <select onChange={e => setStatus(e.target.value as ProjectDecision['status'])} value={status}>
          {DECISION_STATUSES.map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Related note
        <select onChange={e => setNoteId(e.target.value)} value={noteId}>
          <option value="">None</option>
          {!notes.some(n => n._id === noteId) && noteId && <option value={noteId}>Linked note</option>}
          {notes.map(n => (
            <option key={n._id} value={n._id}>
              {n.title || 'Untitled'}
            </option>
          ))}
        </select>
      </label>
      <label>
        Related document
        <select onChange={e => setDocumentId(e.target.value)} value={documentId}>
          <option value="">None</option>
          {documents.map(d => (
            <option key={d._id} value={d._id}>
              {d.title}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.checkLabel}>
        <input checked={pinned} onChange={e => setPinned(e.target.checked)} type="checkbox" /> Pin to the overview
      </label>
      {error && <p className={`${styles.error} ${styles.formFull}`}>{error}</p>}
      <div className={styles.formActions}>
        <button className={styles.btn} onClick={onCancel} type="button">
          Cancel
        </button>
        <button className={`${styles.btn} ${styles.primary}`} disabled={saving} type="submit">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ── Attention ───────────────────────────────────────────────────────────────

export type AttentionDraft = Partial<AttentionItem>;

export function AttentionForm({
  initial,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: AttentionDraft;
  saving: boolean;
  submitLabel: string;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title || '');
  const [type, setType] = useState(initial.type || 'Risk');
  const [severity, setSeverity] = useState(initial.severity || 'Medium');
  const [status, setStatus] = useState(initial.status || 'Open');
  const [due, setDue] = useState(isoToDateInput(initial.dueDate));
  const [description, setDescription] = useState(initial.description || '');
  const [resolution, setResolution] = useState(initial.resolution || '');
  const [error, setError] = useState('');

  return (
    <form
      className={styles.form}
      onSubmit={e => {
        e.preventDefault();
        if (!title.trim()) return setError('Give it a short title.');
        onSubmit({
          title: title.trim(),
          type,
          severity,
          status,
          dueDate: dateInputToIso(due),
          description: description.trim(),
          resolution: resolution.trim(),
        });
      }}>
      <label className={styles.formFull}>
        Title
        <input autoFocus maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="Data migration resource constraint" value={title} />
      </label>
      <label>
        Type
        <select onChange={e => setType(e.target.value as AttentionItem['type'])} value={type}>
          {ATTENTION_TYPES.map(t => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Severity
        <select onChange={e => setSeverity(e.target.value as AttentionItem['severity'])} value={severity}>
          {ATTENTION_SEVERITIES.map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select onChange={e => setStatus(e.target.value as AttentionItem['status'])} value={status}>
          {ATTENTION_STATUSES.map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Due date
        <input onChange={e => setDue(e.target.value)} type="date" value={due} />
      </label>
      <label className={styles.formFull}>
        Description
        <textarea maxLength={4000} onChange={e => setDescription(e.target.value)} placeholder="What could happen or is happening, and the impact" rows={3} value={description} />
      </label>
      <label className={styles.formFull}>
        Resolution / mitigation
        <textarea maxLength={4000} onChange={e => setResolution(e.target.value)} placeholder="What you're doing about it" rows={2} value={resolution} />
      </label>
      {error && <p className={`${styles.error} ${styles.formFull}`}>{error}</p>}
      <div className={styles.formActions}>
        <button className={styles.btn} onClick={onCancel} type="button">
          Cancel
        </button>
        <button className={`${styles.btn} ${styles.primary}`} disabled={saving} type="submit">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
