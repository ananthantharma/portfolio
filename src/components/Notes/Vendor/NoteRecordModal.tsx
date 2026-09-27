/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {X} from 'lucide-react';
import React, {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

import {api} from '../../Tasks/api';
import {TaskVendor} from '../../Tasks/types';
import {AttentionForm, DecisionForm} from './RecordForms';
import {createRecord, fetchVendor, VendorDocument, VendorProfile} from './vendorApi';
import styles from './VendorPage.module.css';

export type NoteRecordRequest =
  | {kind: 'decision'; text: string; title?: string}
  | {kind: 'attention'; text: string}
  | {kind: 'task'; text: string}
  | {kind: 'review-tasks'; items: string[]}
  | {kind: 'review-decisions'; items: string[]};

interface Props {
  request: NoteRecordRequest;
  project: TaskVendor;
  note: {id: string; title: string};
  onClose: () => void;
  onCreated?: (profile?: VendorProfile) => void;
}

const firstLine = (text: string) => text.split('\n').map(l => l.trim()).find(Boolean) || '';
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/**
 * Turns note content into project records. Everything is prefilled from the note and
 * nothing is created until the user confirms.
 */
export default function NoteRecordModal({request, project, note, onClose, onCreated}: Props) {
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [taskTitle, setTaskTitle] = useState(request.kind === 'task' ? clip(firstLine(request.text), 200) : '');
  const [taskNotes, setTaskNotes] = useState(request.kind === 'task' ? request.text : '');
  const [items, setItems] = useState(
    request.kind === 'review-tasks' || request.kind === 'review-decisions'
      ? request.items.map(text => ({text: clip(text, 200), on: true}))
      : [],
  );

  useEffect(() => {
    if (request.kind !== 'decision') return;
    fetchVendor(project._id)
      .then(p => setDocuments(p.documents || []))
      .catch(() => undefined);
  }, [project._id, request.kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const guard = async (op: () => Promise<VendorProfile | undefined>) => {
    setSaving(true);
    setError('');
    try {
      const profile = await op();
      onCreated?.(profile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create it. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const createTask = (title: string, notes?: string) =>
    api.create({
      title,
      notes: notes || '',
      priority: 'None',
      status: 'todo',
      isCompleted: false,
      vendorSectionId: project._id,
      sourcePageId: note.id,
    });

  let title = '';
  let body: React.ReactNode = null;
  if (request.kind === 'decision') {
    title = 'Create a decision';
    body = (
      <DecisionForm
        documents={documents}
        initial={{
          title: clip(request.title || firstLine(request.text), 200),
          details: request.text,
          noteId: note.id,
        }}
        notes={[{_id: note.id, title: note.title}]}
        onCancel={onClose}
        onSubmit={values => guard(async () => (await createRecord(project._id, 'decisions', values)).profile)}
        saving={saving}
        submitLabel="Create decision"
      />
    );
  } else if (request.kind === 'attention') {
    title = 'Add an attention item';
    body = (
      <AttentionForm
        initial={{title: clip(firstLine(request.text), 200), description: request.text}}
        onCancel={onClose}
        onSubmit={values => guard(async () => (await createRecord(project._id, 'attention', values)).profile)}
        saving={saving}
        submitLabel="Add to attention"
      />
    );
  } else if (request.kind === 'task') {
    title = 'Create a task';
    body = (
      <form
        className={styles.form}
        onSubmit={e => {
          e.preventDefault();
          if (!taskTitle.trim()) return setError('Give the task a title.');
          guard(async () => {
            await createTask(taskTitle.trim(), taskNotes.trim());
            return undefined;
          });
        }}>
        <label className={styles.formFull}>
          Task
          <input autoFocus maxLength={200} onChange={e => setTaskTitle(e.target.value)} value={taskTitle} />
        </label>
        <label className={styles.formFull}>
          Description
          <textarea onChange={e => setTaskNotes(e.target.value)} rows={3} value={taskNotes} />
        </label>
        <p className={`${styles.muted} ${styles.formFull}`}>
          Linked to {project.name} and to this note.
        </p>
        <div className={styles.formActions}>
          <button className={styles.btn} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={`${styles.btn} ${styles.primary}`} disabled={saving} type="submit">
            {saving ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    );
  } else {
    const isTasks = request.kind === 'review-tasks';
    const chosen = items.filter(i => i.on && i.text.trim());
    title = isTasks ? 'Create tasks from action items' : 'Create decisions from this note';
    body = (
      <div className={styles.reviewList}>
        <p className={styles.muted}>
          Untick anything you don’t want, and edit the wording if needed.{' '}
          {isTasks ? `Each task is linked to ${project.name} and this note.` : 'Each decision links back to this note.'}
        </p>
        {items.map((item, i) => (
          <label className={styles.reviewItem} key={i}>
            <input
              checked={item.on}
              onChange={e => setItems(list => list.map((x, j) => (j === i ? {...x, on: e.target.checked} : x)))}
              type="checkbox"
            />
            <input
              aria-label={`${isTasks ? 'Task' : 'Decision'} ${i + 1}`}
              maxLength={200}
              onChange={e => setItems(list => list.map((x, j) => (j === i ? {...x, text: e.target.value} : x)))}
              value={item.text}
            />
          </label>
        ))}
        <div className={styles.formActions}>
          <button className={styles.btn} onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={`${styles.btn} ${styles.primary}`}
            disabled={saving || !chosen.length}
            onClick={() =>
              guard(async () => {
                let profile: VendorProfile | undefined;
                for (const item of chosen) {
                  if (isTasks) await createTask(item.text.trim());
                  else
                    profile = (
                      await createRecord(project._id, 'decisions', {title: item.text.trim(), details: item.text.trim(), noteId: note.id})
                    ).profile;
                }
                return profile;
              })
            }
            type="button">
            {saving ? 'Creating…' : `Create ${chosen.length} ${isTasks ? 'task' : 'decision'}${chosen.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    );
  }

  return createPortal(
    <div className={styles.modalBackdrop} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div aria-label={title} aria-modal="true" className={`${styles.modal} ${styles.scope}`} role="dialog">
        <div className={styles.modalHead}>
          <div>
            <div className={styles.eyebrow}>
              {project.name} · from “{clip(note.title, 60)}”
            </div>
            <h3>{title}</h3>
          </div>
          <button aria-label="Close" className={styles.iconBtn} onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>
        {body}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>,
    document.body,
  );
}
