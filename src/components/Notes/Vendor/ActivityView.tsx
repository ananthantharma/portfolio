/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {Activity, FileText, Flag, Gavel, ListTodo, NotebookPen, Siren} from 'lucide-react';
import React, {useEffect, useState} from 'react';

import {ActivityItem, fetchActivity} from './vendorApi';
import styles from './VendorPage.module.css';

export const ACTIVITY_FILTERS = [
  ['all', 'All'],
  ['note', 'Notes'],
  ['task', 'Tasks'],
  ['document', 'Documents'],
  ['decision', 'Decisions'],
  ['attention', 'Attention'],
] as const;

const ICONS: Record<ActivityItem['type'], typeof Activity> = {
  note: NotebookPen,
  task: ListTodo,
  document: FileText,
  decision: Gavel,
  attention: Siren,
  project: Flag,
};

export function ActivityIcon({type}: {type: ActivityItem['type']}) {
  const Icon = ICONS[type] || Activity;
  return (
    <span className={styles.activityIcon} data-type={type}>
      <Icon size={12} />
    </span>
  );
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'});
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});

export function ActivityRow({item, onJump, showDate}: {item: ActivityItem; onJump?: (item: ActivityItem) => void; showDate?: boolean}) {
  const content = (
    <>
      <ActivityIcon type={item.type} />
      <span className={styles.activityText}>
        <span>{item.label}</span>
        {item.title && <strong> — {item.title}</strong>}
      </span>
      <time>{showDate ? `${dayLabel(item.createdAt)}, ${timeOf(item.createdAt)}` : timeOf(item.createdAt)}</time>
    </>
  );
  return onJump && item.refId ? (
    <button className={styles.activityRow} onClick={() => onJump(item)} type="button">
      {content}
    </button>
  ) : (
    <div className={styles.activityRow}>{content}</div>
  );
}

/** Full activity history with type filters, newest first, grouped by day. */
export default function ActivityView({
  sectionId,
  refreshKey,
  onJump,
}: {
  sectionId: string;
  refreshKey: number;
  onJump?: (item: ActivityItem) => void;
}) {
  const [filter, setFilter] = useState<string>('all');
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [limit, setLimit] = useState(60);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    fetchActivity(sectionId, {type: filter, limit})
      .then(list => alive && setItems(list))
      .catch(err => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [sectionId, filter, limit, refreshKey]);

  let lastDay = '';
  return (
    <section aria-label="Activity" className={`${styles.card} ${styles.wide}`} id="project-activity">
      <div className={styles.cardHead}>
        <h2>
          <Activity size={17} />
          Activity
        </h2>
        <div className={styles.seg} role="group" aria-label="Filter activity">
          {ACTIVITY_FILTERS.map(([key, label]) => (
            <button aria-pressed={filter === key} key={key} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : items === null ? (
        <div className={styles.empty}>Loading activity…</div>
      ) : !items.length ? (
        <div className={styles.empty}>
          {filter === 'all'
            ? 'Activity shows up here automatically as notes, tasks, documents, decisions, and attention items change.'
            : 'No activity of this kind yet.'}
        </div>
      ) : (
        <div className={styles.activityList}>
          {items.map(item => {
            const day = dayLabel(item.createdAt);
            const header = day !== lastDay;
            lastDay = day;
            return (
              <React.Fragment key={item._id}>
                {header && <div className={styles.activityDay}>{day}</div>}
                <ActivityRow item={item} onJump={onJump} />
              </React.Fragment>
            );
          })}
          {items.length >= limit && (
            <button className={styles.linkButton} onClick={() => setLimit(l => l + 100)} style={{margin: '10px auto 0'}}>
              Show older activity
            </button>
          )}
        </div>
      )}
    </section>
  );
}
