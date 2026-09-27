/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {Activity, BookUser, Check, FileText, Gavel, Globe, ListTodo, Mail, NotebookPen, Pin, Siren, Sparkles, X} from 'lucide-react';
import React from 'react';

import {INotePage} from '@/models/NotePage';

import {formatDue, smartCompare, statusOf, Task} from '../../Tasks/types';
import {ActivityRow} from './ActivityView';
import {AttentionSummary, isOpenAttention, isSerious, sortAttention} from './AttentionCard';
import {docHref} from './DecisionsCard';
import InlineNote from './InlineNote';
import {HealthChip, targetLabel} from './ProjectHeader';
import {ActivityItem, daysUntil, formatDate, initials, VendorPatch, VendorProfile} from './vendorApi';
import {noteDateOf} from './VendorNotes';
import styles from './VendorPage.module.css';

export type ProjectTab = 'overview' | 'notes' | 'tasks' | 'decisions' | 'attention' | 'documents' | 'contacts' | 'activity';

export interface SinceVisit {
  at: string;
  parts: string[];
}

interface Props {
  // Vendors get key contacts and agreements instead of project status and decisions
  kind?: 'project' | 'vendor';
  profile: VendorProfile;
  notes: INotePage[];
  tasks: Task[];
  activity: ActivityItem[] | null;
  sinceVisit: SinceVisit | null;
  onDismissSince: () => void;
  onPatch: (patch: VendorPatch) => Promise<void>;
  onGo: (tab: ProjectTab, focusId?: string) => void;
  onOpenNote: (id: string) => void;
  onToggleTask: (task: Task) => void;
  onJumpActivity: (item: ActivityItem) => void;
}

function Card({
  title,
  icon: Icon,
  count,
  onViewAll,
  children,
}: {
  title: string;
  icon: typeof Activity;
  count?: React.ReactNode;
  onViewAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className={styles.ovCard}>
      <div className={styles.ovHead}>
        <h3>
          <Icon size={14} /> {title}
          {count !== undefined && <small>{count}</small>}
        </h3>
        {onViewAll && (
          <button className={styles.linkButton} onClick={onViewAll} type="button">
            View all
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

const VENDOR_SUMMARY_EXAMPLE =
  'Acme hosts our billing platform under a 3-year MSA (renews Mar 2027). Service has been stable since the Q2 migration; one open issue on support response times. Next QBR is scheduled for October 14.';

const BRIEF_EXAMPLE =
  'SAP EA analysis is underway. Architecture workshops are complete and the team is reviewing implementation options. Three tasks remain open and one schedule risk is being monitored. Next milestone: Steering Committee review on October 9.';

export default function ProjectOverview(props: Props) {
  const {profile, notes, tasks, activity, sinceVisit, onDismissSince, onPatch, onGo, onOpenNote, onToggleTask, onJumpActivity} = props;
  const isVendor = props.kind === 'vendor';
  const openTasks = tasks.filter(t => statusOf(t) !== 'done').sort(smartCompare);
  const attention = profile.attention || [];
  const serious = sortAttention(attention.filter(isSerious));
  const otherOpen = attention.filter(isOpenAttention).length - serious.length;
  const decisions = [...(profile.decisions || [])].sort(
    (a, b) => new Date(b.decisionDate || b.createdAt || 0).getTime() - new Date(a.decisionDate || a.createdAt || 0).getTime(),
  );
  const recentNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);

  type PinnedItem = {key: string; icon: typeof FileText; title: string; sub: string; href?: string; onClick?: () => void; tone?: 'warn' | 'bad'};
  // Vendors: agreements that have expired or expire within 60 days come first
  const expiryNote = (expiry?: string | null) => {
    const days = daysUntil(expiry);
    if (days === null || days > 60) return null;
    return days < 0 ? {text: 'Expired', tone: 'bad' as const} : {text: days === 0 ? 'Expires today' : `Expires in ${days} days`, tone: 'warn' as const};
  };
  const expiring: PinnedItem[] = isVendor
    ? (profile.documents || [])
        .filter(d => expiryNote(d.expiryDate))
        .sort((a, b) => new Date(a.expiryDate || 0).getTime() - new Date(b.expiryDate || 0).getTime())
        .map(d => ({
          key: `x${d._id}`,
          icon: FileText,
          title: d.title,
          sub: `${d.docType} · ${expiryNote(d.expiryDate)!.text}`,
          tone: expiryNote(d.expiryDate)!.tone,
          href: docHref(d),
        }))
    : [];
  const pinned: PinnedItem[] = [
    ...expiring,
    ...(profile.documents || [])
      .filter(d => d.pinned && !(isVendor && expiryNote(d.expiryDate)))
      .map(d => ({key: `d${d._id}`, icon: FileText, title: d.title, sub: d.docType, href: docHref(d)})),
    ...notes
      .filter(n => n.isPinned)
      .map(n => ({key: `n${n._id}`, icon: NotebookPen, title: n.title, sub: 'Note', onClick: () => onOpenNote(String(n._id))})),
    ...(profile.decisions || [])
      .filter(d => d.pinned)
      .map(d => ({key: `c${d._id}`, icon: Gavel, title: d.title, sub: 'Decision', onClick: () => onGo('decisions', `decision-${d._id}`)})),
    ...(profile.links || [])
      .filter(l => l.pinned)
      .map(l => ({key: `l${l._id}`, icon: Globe, title: l.title, sub: 'Link', href: l.url})),
  ];

  return (
    <div className={styles.overview}>
      {sinceVisit && (
        <div className={styles.sinceVisit} role="status">
          <Sparkles size={13} />
          <span>
            <strong>Since your last visit</strong> ({formatDate(sinceVisit.at)}): {sinceVisit.parts.join(' · ')}
          </span>
          <button aria-label="Dismiss" className={styles.iconBtn} onClick={onDismissSince} style={{width: 22, height: 22}} type="button">
            <X size={12} />
          </button>
        </div>
      )}

      <div className={styles.ovGrid}>
        <div className={styles.ovCol}>
          {isVendor ? (
            <Card count={profile.keyContacts.length} icon={BookUser} onViewAll={() => onGo('contacts')} title="Key contacts">
              {!profile.keyContacts.length ? (
                <p className={styles.ovEmpty}>Add the people you work with in the Contacts tab.</p>
              ) : (
                profile.keyContacts.slice(0, 4).map(({contactId: c, role}) => (
                  <div className={styles.ovRow} key={c._id}>
                    <span className={styles.ovAvatar}>{initials(c.name)}</span>
                    <span className={styles.ovRowMain}>
                      <span>{c.name}</span>
                      <small>{role || c.position || c.department || ''}</small>
                    </span>
                    {c.email && (
                      <a aria-label={`Email ${c.name}`} className={styles.iconBtn} href={`mailto:${c.email}`}>
                        <Mail size={13} />
                      </a>
                    )}
                  </div>
                ))
              )}
            </Card>
          ) : (
          <Card icon={Activity} title="Project status">
            <div className={styles.statusGrid}>
              <span>Health</span>
              <HealthChip health={profile.health} />
              <span>Phase</span>
              <strong>{profile.phase || '—'}</strong>
              <span>Target</span>
              <strong>
                {profile.targetDate ? formatDate(profile.targetDate) : '—'}{' '}
                {profile.targetDate && <em className={styles.muted}>{targetLabel(profile.targetDate)}</em>}
              </strong>
              <span>Focus</span>
              <strong className={styles.focusText}>{profile.currentFocus || 'Not set. Add it in the header.'}</strong>
            </div>
          </Card>
          )}

          <Card icon={Sparkles} title={isVendor ? 'Vendor summary' : 'Project brief'}>
            <InlineNote
              addLabel={isVendor ? 'Write a vendor summary' : 'Write the project brief'}
              editLabel={isVendor ? 'Edit summary' : 'Edit brief'}
              clampLines={5}
              maxLength={3000}
              onSave={text => onPatch({brief: {text}})}
              placeholder={isVendor ? VENDOR_SUMMARY_EXAMPLE : BRIEF_EXAMPLE}
              value={profile.brief?.text || ''}
            />
            {profile.brief?.updatedAt && profile.brief.text && (
              <p className={styles.ovFoot}>Updated {formatDate(profile.brief.updatedAt)}</p>
            )}
          </Card>

          <Card count={openTasks.length} icon={ListTodo} onViewAll={() => onGo('tasks')} title="Open tasks">
            {!openTasks.length ? (
              <p className={styles.ovEmpty}>No open tasks.</p>
            ) : (
              openTasks.slice(0, 5).map(t => (
                <div className={styles.ovRow} key={t._id}>
                  <button aria-label={`Complete ${t.title}`} className={styles.taskCheck} onClick={() => onToggleTask(t)} type="button">
                    {statusOf(t) === 'done' && <Check size={11} />}
                  </button>
                  <button className={styles.ovRowMain} onClick={() => onGo('tasks')} type="button">
                    <span>{t.title}</span>
                    <small>
                      {[t.priority !== 'None' && t.priority, t.dueDate && formatDue(t.dueDate)].filter(Boolean).join(' · ')}
                    </small>
                  </button>
                </div>
              ))
            )}
          </Card>

          <Card count={notes.length} icon={NotebookPen} onViewAll={() => onGo('notes')} title="Recent notes">
            {!recentNotes.length ? (
              <p className={styles.ovEmpty}>No notes yet.</p>
            ) : (
              recentNotes.map(n => (
                <button className={styles.ovRow} key={String(n._id)} onClick={() => onOpenNote(String(n._id))} type="button">
                  <NotebookPen className={styles.ovIcon} size={13} />
                  <span className={styles.ovRowMain}>
                    <span>{n.title || 'Untitled'}</span>
                    <small>{formatDate(String(noteDateOf(n)))}</small>
                  </span>
                </button>
              ))
            )}
          </Card>
        </div>

        <div className={styles.ovCol}>
          <Card
            count={attention.filter(isOpenAttention).length ? `${attention.filter(isOpenAttention).length} open` : undefined}
            icon={Siren}
            onViewAll={() => onGo('attention')}
            title="Attention">
            {!serious.length ? (
              <p className={styles.ovEmpty}>
                No high or critical items.{otherOpen > 0 && ` ${otherOpen} lower-severity item${otherOpen === 1 ? ' is' : 's are'} open.`}
              </p>
            ) : (
              <>
                {serious.slice(0, 4).map(a => (
                  <button
                    className={styles.ovRow}
                    data-severity={a.severity}
                    key={a._id}
                    onClick={() => onGo('attention', `attention-${a._id}`)}
                    type="button">
                    <span className={styles.ovRowMain}>
                      <AttentionSummary item={a} />
                    </span>
                  </button>
                ))}
                {otherOpen > 0 && <p className={styles.ovFoot}>+ {otherOpen} more open at lower severity</p>}
              </>
            )}
          </Card>

          <Card
            count={pinned.length || undefined}
            icon={isVendor ? FileText : Pin}
            onViewAll={() => onGo('documents')}
            title={isVendor ? 'Agreements & pinned' : 'Pinned & key documents'}>
            {!pinned.length ? (
              <p className={styles.ovEmpty}>
                {isVendor
                  ? 'Agreements expiring within 60 days and anything you pin show up here.'
                  : 'Pin documents, notes, decisions, or links to keep them here.'}
              </p>
            ) : (
              pinned.slice(0, 6).map(p => {
                const inner = (
                  <>
                    <p.icon className={styles.ovIcon} size={13} />
                    <span className={styles.ovRowMain}>
                      <span>{p.title}</span>
                      <small className={p.tone ? styles[`tone_${p.tone}`] : undefined}>{p.sub}</small>
                    </span>
                  </>
                );
                return p.href ? (
                  <a className={styles.ovRow} href={p.href} key={p.key} rel="noopener noreferrer" target="_blank">
                    {inner}
                  </a>
                ) : (
                  <button className={styles.ovRow} key={p.key} onClick={p.onClick} type="button">
                    {inner}
                  </button>
                );
              })
            )}
          </Card>

          {!isVendor && (
          <Card count={decisions.length} icon={Gavel} onViewAll={() => onGo('decisions')} title="Recent decisions">
            {!decisions.length ? (
              <p className={styles.ovEmpty}>No decisions recorded yet.</p>
            ) : (
              decisions.slice(0, 3).map(d => (
                <button className={styles.ovRow} key={d._id} onClick={() => onGo('decisions', `decision-${d._id}`)} type="button">
                  <Gavel className={styles.ovIcon} size={13} />
                  <span className={styles.ovRowMain}>
                    <span>{d.title}</span>
                    <small>
                      {formatDate(d.decisionDate || d.createdAt)}
                      {d.status !== 'Active' && ` · ${d.status}`}
                    </small>
                  </span>
                </button>
              ))
            )}
          </Card>
          )}

          <Card icon={Activity} onViewAll={() => onGo('activity')} title="Recent activity">
            {activity === null ? (
              <p className={styles.ovEmpty}>Loading…</p>
            ) : !activity.length ? (
              <p className={styles.ovEmpty}>Activity appears here automatically as the project changes.</p>
            ) : (
              <div className={styles.activityList}>
                {activity.slice(0, 5).map(item => (
                  <ActivityRow item={item} key={item._id} onJump={onJumpActivity} showDate />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
