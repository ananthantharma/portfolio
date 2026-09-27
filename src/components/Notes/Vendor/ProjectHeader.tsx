/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {Search, X} from 'lucide-react';
import React, {useEffect, useState} from 'react';

import {
  dateInputToIso,
  daysUntil,
  formatDate,
  isoToDateInput,
  PROJECT_HEALTH,
  PROJECT_PHASES,
  PROJECT_STATUSES,
  ProjectHealth,
  VendorPatch,
  VendorProfile,
  VendorStatus,
} from './vendorApi';
import styles from './VendorPage.module.css';

/** Click-to-edit text or date. Enter or leaving the field saves; Esc cancels. */
export function InlineField({
  value,
  placeholder,
  label,
  type = 'text',
  maxLength,
  display,
  className,
  onSave,
}: {
  value: string;
  placeholder: string;
  label: string;
  type?: 'text' | 'date';
  maxLength?: number;
  display?: React.ReactNode;
  className?: string;
  onSave: (next: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onSave(draft.trim());
  };

  if (editing) {
    return (
      <input
        aria-label={label}
        autoFocus
        className={`${styles.inlineInput} ${className || ''}`}
        maxLength={maxLength}
        onBlur={commit}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        type={type}
        value={draft}
      />
    );
  }
  return (
    <button
      aria-label={`Edit ${label.toLowerCase()}`}
      className={`${styles.inlineValue} ${className || ''}`}
      data-empty={!value}
      onClick={() => setEditing(true)}
      title={`Edit ${label.toLowerCase()}`}
      type="button">
      {value ? display || value : placeholder}
    </button>
  );
}

export function HealthChip({health}: {health?: ProjectHealth}) {
  return (
    <span className={styles.healthChip} data-health={health || 'On Track'}>
      <span className={styles.healthDot} />
      {health || 'On Track'}
    </span>
  );
}

export function targetLabel(targetDate?: string | null) {
  if (!targetDate) return '';
  const days = daysUntil(targetDate);
  if (days === null) return '';
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} past target`;
  if (days === 0) return 'due today';
  if (days < 45) return `in ${days} day${days === 1 ? '' : 's'}`;
  return `in ${Math.round(days / 30)} months`;
}

interface Props {
  notebookName: string;
  name: string;
  profile: VendorProfile;
  lastUpdated?: string | null;
  query: string;
  onQuery: (q: string) => void;
  onPatch: (patch: VendorPatch) => Promise<void>;
}

/** Compact project header: name, status, health, phase, dates, owner, description, current focus. */
export default function ProjectHeader({notebookName, name, profile, lastUpdated, query, onQuery, onPatch}: Props) {
  const save = (patch: VendorPatch) => onPatch(patch).catch(() => undefined);
  return (
    <header className={styles.projectHeader}>
      <div className={styles.projectHeaderTop}>
        <div className={styles.eyebrow}>{notebookName}</div>
        <label className={styles.projectSearch}>
          <Search size={14} />
          <input
            aria-label="Search this project"
            onChange={e => onQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onQuery('')}
            placeholder="Search notes, tasks, decisions, documents…"
            value={query}
          />
          {query && (
            <button aria-label="Clear search" className={styles.iconBtn} onClick={() => onQuery('')} style={{width: 22, height: 22}} type="button">
              <X size={13} />
            </button>
          )}
        </label>
      </div>

      <div className={styles.projectTitleRow}>
        <h1>{name}</h1>
        <select
          aria-label="Project status"
          className={styles.statusSelect}
          data-status={profile.status}
          onChange={e => save({status: e.target.value as VendorStatus})}
          value={profile.status}>
          {PROJECT_STATUSES.map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className={styles.pillSelect} data-health={profile.health || 'On Track'} title="Overall project health">
          <span className={styles.healthDot} />
          <select aria-label="Project health" onChange={e => save({health: e.target.value as ProjectHealth})} value={profile.health || 'On Track'}>
            {PROJECT_HEALTH.map(h => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </label>
        <label className={styles.pillSelect} title="Project phase">
          <select aria-label="Project phase" onChange={e => save({phase: e.target.value})} value={profile.phase || ''}>
            <option value="">Set phase</option>
            {PROJECT_PHASES.map(p => (
              <option key={p}>{p}</option>
            ))}
            {profile.phase && !PROJECT_PHASES.includes(profile.phase as never) && <option>{profile.phase}</option>}
          </select>
        </label>
      </div>

      <div className={styles.projectMeta}>
        <span>
          Start{' '}
          <InlineField
            display={formatDate(profile.startDate)}
            label="Start date"
            onSave={v => save({startDate: dateInputToIso(v)})}
            placeholder="add"
            type="date"
            value={isoToDateInput(profile.startDate)}
          />
        </span>
        <span>
          Target{' '}
          <InlineField
            display={
              <>
                {formatDate(profile.targetDate)} <em className={styles.muted}>{targetLabel(profile.targetDate)}</em>
              </>
            }
            label="Target completion date"
            onSave={v => save({targetDate: dateInputToIso(v)})}
            placeholder="add"
            type="date"
            value={isoToDateInput(profile.targetDate)}
          />
        </span>
        <span>
          Owner <InlineField label="Project owner" maxLength={80} onSave={v => save({owner: v})} placeholder="add" value={profile.owner || ''} />
        </span>
        {lastUpdated && <span>Updated {formatDate(lastUpdated)}</span>}
      </div>

      <InlineField
        className={styles.projectDescription}
        label="Project description"
        maxLength={400}
        onSave={v => save({summary: v})}
        placeholder="Add a short description of the project"
        value={profile.summary || ''}
      />
      <div className={styles.focusLine}>
        <strong>Current focus</strong>
        <InlineField
          label="Current focus"
          maxLength={240}
          onSave={v => save({currentFocus: v})}
          placeholder="What is happening on this project right now?"
          value={profile.currentFocus || ''}
        />
      </div>
    </header>
  );
}
