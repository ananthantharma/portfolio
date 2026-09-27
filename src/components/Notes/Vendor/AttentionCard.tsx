/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {AlertTriangle, Ban, CheckCircle2, ChevronDown, CircleAlert, Link2, Pencil, Plus, Siren, Trash2} from 'lucide-react';
import React, {useMemo, useState} from 'react';

import {AttentionForm} from './RecordForms';
import {
  AttentionItem,
  AttentionSeverity,
  AttentionType,
  createRecord,
  daysUntil,
  deleteRecord,
  formatDate,
  updateRecord,
  VendorProfile,
} from './vendorApi';
import styles from './VendorPage.module.css';

export const ATTENTION_ICONS: Record<AttentionType, typeof AlertTriangle> = {
  Risk: AlertTriangle,
  Issue: CircleAlert,
  Blocker: Ban,
  Dependency: Link2,
};

const SEVERITY_RANK: Record<AttentionSeverity, number> = {Critical: 0, High: 1, Medium: 2, Low: 3};

export const isOpenAttention = (a: AttentionItem) => a.status !== 'Resolved';
export const isSerious = (a: AttentionItem) => isOpenAttention(a) && (a.severity === 'High' || a.severity === 'Critical');

/** Open first, then most severe, then soonest due. */
export function sortAttention(list: AttentionItem[]) {
  return [...list].sort((a, b) => {
    if (isOpenAttention(a) !== isOpenAttention(b)) return isOpenAttention(a) ? -1 : 1;
    if (SEVERITY_RANK[a.severity] !== SEVERITY_RANK[b.severity]) return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return da - db;
  });
}

export function AttentionSummary({item}: {item: AttentionItem}) {
  const Icon = ATTENTION_ICONS[item.type];
  const due = daysUntil(item.dueDate);
  return (
    <>
      <div className={styles.rowTitle}>
        <span className={styles.attnIcon} data-severity={item.severity}>
          <Icon size={13} />
        </span>
        <span>{item.title}</span>
      </div>
      <div className={styles.rowSub}>
        <span className={styles.chip} data-severity={item.severity}>
          {item.severity}
        </span>
        <span>{item.type}</span>
        {item.status !== 'Open' && (
          <span className={styles.chip} data-tone={item.status === 'Resolved' ? 'good' : 'muted'}>
            {item.status}
          </span>
        )}
        {item.dueDate && isOpenAttention(item) && (
          <span className={due !== null && due < 0 ? styles.overdue : undefined}>
            Due {formatDate(item.dueDate)}
          </span>
        )}
      </div>
    </>
  );
}

interface Props {
  sectionId: string;
  items: AttentionItem[];
  onProfile: (profile: VendorProfile) => void;
}

export default function AttentionCard({sectionId, items, onProfile}: Props) {
  const [view, setView] = useState<'open' | 'resolved' | 'all'>('open');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openCount = items.filter(isOpenAttention).length;
  const shown = useMemo(
    () =>
      sortAttention(
        items.filter(a => (view === 'open' ? isOpenAttention(a) : view === 'resolved' ? !isOpenAttention(a) : true)),
      ),
    [items, view],
  );

  const run = async (op: () => Promise<VendorProfile | {profile: VendorProfile}>) => {
    setSaving(true);
    setError('');
    try {
      const result = await op();
      onProfile('profile' in result ? result.profile : result);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Attention" className={`${styles.card} ${styles.wide}`} id="project-attention">
      <div className={styles.cardHead}>
        <h2>
          <Siren size={17} />
          Attention
          <small>{openCount} open</small>
        </h2>
        <div className={styles.seg} role="group" aria-label="Filter attention items">
          <button aria-pressed={view === 'open'} onClick={() => setView('open')}>
            Open {openCount}
          </button>
          <button aria-pressed={view === 'resolved'} onClick={() => setView('resolved')}>
            Resolved {items.length - openCount}
          </button>
          <button aria-pressed={view === 'all'} onClick={() => setView('all')}>
            All
          </button>
        </div>
        <button className={`${styles.btn} ${styles.primary}`} onClick={() => setEditing('new')}>
          <Plus size={14} /> Add item
        </button>
      </div>

      {editing === 'new' && (
        <AttentionForm
          initial={{}}
          onCancel={() => setEditing(null)}
          onSubmit={values => run(() => createRecord(sectionId, 'attention', values))}
          saving={saving}
          submitLabel="Add to attention"
        />
      )}

      {!shown.length && editing !== 'new' ? (
        <div className={styles.empty}>
          {view === 'open'
            ? 'Nothing needs attention. Add risks, issues, blockers, or dependencies as they come up.'
            : 'Nothing here yet.'}
        </div>
      ) : (
        <div className={styles.list}>
          {shown.map(a =>
            editing === a._id ? (
              <AttentionForm
                initial={a}
                key={a._id}
                onCancel={() => setEditing(null)}
                onSubmit={values => run(() => updateRecord(sectionId, 'attention', a._id, values))}
                saving={saving}
                submitLabel="Save changes"
              />
            ) : (
              <div className={styles.recordRow} data-severity={isOpenAttention(a) ? a.severity : undefined} id={`attention-${a._id}`} key={a._id}>
                <button
                  aria-expanded={expanded === a._id}
                  className={styles.recordMain}
                  onClick={() => setExpanded(expanded === a._id ? null : a._id)}>
                  <AttentionSummary item={a} />
                </button>
                <div className={styles.rowActions}>
                  {isOpenAttention(a) && (
                    <button
                      aria-label={`Resolve ${a.title}`}
                      className={styles.iconBtn}
                      onClick={() => run(() => updateRecord(sectionId, 'attention', a._id, {status: 'Resolved'}))}
                      title="Mark resolved">
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                  <button aria-label={`Edit ${a.title}`} className={styles.iconBtn} onClick={() => setEditing(a._id)}>
                    <Pencil size={14} />
                  </button>
                  <button
                    aria-label={`Delete ${a.title}`}
                    className={`${styles.iconBtn} ${styles.danger}`}
                    onClick={() => confirm(`Delete “${a.title}”?`) && run(() => deleteRecord(sectionId, 'attention', a._id))}>
                    <Trash2 size={14} />
                  </button>
                  <ChevronDown className={styles.expandIcon} data-open={expanded === a._id} size={15} />
                </div>
                {expanded === a._id && (
                  <div className={styles.recordDetails}>
                    {a.description && <p className={styles.prewrap}>{a.description}</p>}
                    {a.resolution && (
                      <p className={styles.prewrap}>
                        <strong>{a.status === 'Resolved' ? 'Resolution: ' : 'Mitigation: '}</strong>
                        {a.resolution}
                      </p>
                    )}
                    <p className={styles.muted}>
                      Created {formatDate(a.createdAt)}
                      {a.resolvedAt && ` · Resolved ${formatDate(a.resolvedAt)}`}
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
