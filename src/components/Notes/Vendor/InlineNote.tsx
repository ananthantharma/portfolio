/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {Check, Pencil, StickyNote, X} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import styles from './VendorPage.module.css';

interface Props {
  value: string;
  onSave: (next: string) => Promise<void>;
  addLabel: string;
  placeholder: string;
  maxLength: number;
  // Long notes are clamped on the page until expanded
  clampLines?: number;
  editLabel?: string;
}

/** A note shown right on the page, editable in place (Ctrl+Enter saves, Esc cancels). */
export default function InlineNote({value, onSave, addLabel, placeholder, maxLength, clampLines = 3, editLabel = 'Edit note'}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Only offer "Show more" when the clamped text is actually cut off
  useEffect(() => {
    const el = textRef.current;
    if (el && !expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [value, expanded, editing]);

  const save = async () => {
    const next = draft.trim();
    if (next === value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the note.');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className={styles.inlineNoteEditor}>
        <textarea
          aria-label={placeholder}
          autoFocus
          disabled={saving}
          maxLength={maxLength}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              save();
            }
            if (e.key === 'Escape') {
              setDraft(value);
              setEditing(false);
            }
          }}
          placeholder={placeholder}
          rows={Math.min(8, Math.max(2, draft.split('\n').length + 1))}
          value={draft}
        />
        <div className={styles.inlineNoteActions}>
          <span className={styles.muted}>Ctrl+Enter to save</span>
          <button
            className={styles.btn}
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            type="button">
            <X size={13} /> Cancel
          </button>
          <button className={`${styles.btn} ${styles.primary}`} disabled={saving} onClick={save} type="button">
            <Check size={13} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    );
  }

  if (!value.trim()) {
    return (
      <button className={styles.inlineNoteAdd} onClick={() => setEditing(true)} type="button">
        <StickyNote size={12} /> {addLabel}
      </button>
    );
  }

  return (
    <div className={styles.inlineNote}>
      <p
        className={styles.inlineNoteText}
        ref={textRef}
        style={expanded ? undefined : {WebkitLineClamp: clampLines}}
        data-clamped={!expanded}>
        {value}
      </p>
      <div className={styles.inlineNoteActions}>
        {(overflows || expanded) && (
          <button className={styles.linkButton} onClick={() => setExpanded(v => !v)} type="button">
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
        <button className={styles.linkButton} onClick={() => setEditing(true)} type="button">
          <Pencil size={11} /> {editLabel}
        </button>
      </div>
    </div>
  );
}
