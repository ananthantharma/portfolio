/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {BookUser, Building2, ExternalLink, FileSignature, Globe, Link as LinkIcon, ListTodo, Network, NotebookPen} from 'lucide-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {INoteCategory, INoteClass} from '@/models/NoteCategory';
import {INotePage} from '@/models/NotePage';
import {INoteSection} from '@/models/NoteSection';

import {useTaskCollection} from '../../Tasks/TaskProvider';
import {statusOf, vendorIdOf} from '../../Tasks/types';
import ContactsCard from './ContactsCard';
import DocumentsCard from './DocumentsCard';
import LinksCard from './LinksCard';
import OrgChartCard from './OrgChartCard';
import {
  daysUntil,
  fetchVendor,
  hostOf,
  initials,
  normalizeUrl,
  saveVendor,
  VENDOR_STATUSES,
  VendorPatch,
  VendorProfile,
  VendorStatus,
} from './vendorApi';
import VendorNotes, {NoteSort} from './VendorNotes';
import styles from './VendorPage.module.css';
import VendorTasksCard from './VendorTasksCard';

export interface VendorPageProps {
  section: INoteSection;
  notebook: INoteCategory;
  pages: INotePage[];
  loadingPages: boolean;
  onOpenPage: (id: string) => void;
  onAddPage: (title: string, extra?: Partial<INotePage>) => void;
  onUpdatePage: (id: string, updates: Partial<INotePage>) => Promise<void>;
  onReorderPages: (newOrder: INotePage[]) => void;
  onUpdateNotebook: (id: string, updates: {noteClasses?: INoteClass[]; noteSort?: string}) => Promise<INoteClass[] | void>;
}

function Logo({domain, name}: {domain: string; name: string}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [domain]);
  return (
    <div className={styles.logo} aria-hidden="true">
      {domain && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" onError={() => setFailed(true)} src={`https://logo.clearbit.com/${domain}`} />
      ) : (
        initials(name)
      )}
    </div>
  );
}

export default function VendorPage(props: VendorPageProps) {
  const {section, notebook, pages, loadingPages, onOpenPage, onAddPage, onUpdatePage, onReorderPages, onUpdateNotebook} = props;
  const sectionId = String(section._id);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<'summary' | 'website' | null>(null);
  const [draft, setDraft] = useState('');
  const latestSection = useRef(sectionId);
  const {tasks} = useTaskCollection();
  const openTaskCount = tasks.filter(
    t => vendorIdOf(t) === sectionId && !t.isArchived && !t.isTemplate && statusOf(t) !== 'done',
  ).length;

  useEffect(() => {
    latestSection.current = sectionId;
    setProfile(null);
    setLoadError('');
    fetchVendor(sectionId)
      .then(data => latestSection.current === sectionId && setProfile(data))
      .catch(err => latestSection.current === sectionId && setLoadError(err.message));
  }, [sectionId]);

  // Every card saves through here so the page always shows what the server stored
  const patch = useCallback(
    async (changes: VendorPatch) => {
      const saved = await saveVendor(sectionId, changes);
      if (latestSection.current === sectionId) setProfile(saved);
    },
    [sectionId],
  );

  const commitHeader = async () => {
    const field = editing;
    setEditing(null);
    if (!field || !profile) return;
    if (field === 'summary' && draft.trim() !== profile.summary) await patch({summary: draft.trim()}).catch(() => undefined);
    if (field === 'website') {
      const url = draft.trim() ? normalizeUrl(draft) : '';
      if (url !== null && url !== profile.website) await patch({website: url}).catch(() => undefined);
    }
  };

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({behavior: 'smooth', block: 'start'});

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>This vendor couldn’t be loaded. {loadError}</div>
      </div>
    );
  }

  const domain = profile?.website ? hostOf(profile.website) : section.image || '';
  const expiryDays = (profile?.documents || []).map(d => daysUntil(d.expiryDate)).filter((d): d is number => d !== null);
  const expired = expiryDays.filter(d => d < 0).length;
  const expiring = expiryDays.filter(d => d >= 0 && d <= 60).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo domain={domain} name={section.name} />
        <div className={styles.headerText}>
          <div className={styles.eyebrow}>{notebook.name}</div>
          <h1>{section.name}</h1>
          {editing === 'summary' ? (
            <input
              aria-label="What this vendor provides"
              autoFocus
              className={styles.summaryInput}
              maxLength={200}
              onBlur={commitHeader}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitHeader();
                if (e.key === 'Escape') setEditing(null);
              }}
              placeholder="Cloud hosting · Vendor since 2022"
              value={draft}
            />
          ) : (
            <button
              className={styles.summaryButton}
              disabled={!profile}
              onClick={() => {
                setDraft(profile?.summary || '');
                setEditing('summary');
              }}
              title="Edit description">
              {profile?.summary || 'Add a short description, like what they provide and since when'}
            </button>
          )}
        </div>
        {profile && (
          <div className={styles.headerMeta}>
            {editing === 'website' ? (
              <input
                aria-label="Vendor website"
                autoFocus
                onBlur={commitHeader}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitHeader();
                  if (e.key === 'Escape') setEditing(null);
                }}
                placeholder="vendor.com"
                style={{width: 180}}
                value={draft}
              />
            ) : profile.website ? (
              <span style={{display: 'inline-flex', alignItems: 'center'}}>
                <a className={styles.websiteLink} href={profile.website} rel="noopener noreferrer" target="_blank">
                  <Globe size={13} /> {hostOf(profile.website)} <ExternalLink size={11} />
                </a>
                <button
                  className={styles.roleButton}
                  onClick={() => {
                    setDraft(profile.website);
                    setEditing('website');
                  }}>
                  Edit
                </button>
              </span>
            ) : (
              <button
                className={styles.websiteLink}
                onClick={() => {
                  setDraft('');
                  setEditing('website');
                }}>
                <Globe size={13} /> Add website
              </button>
            )}
            <select
              aria-label="Vendor status"
              className={styles.statusSelect}
              data-status={profile.status}
              onChange={e => patch({status: e.target.value as VendorStatus}).catch(() => undefined)}
              value={profile.status}>
              {VENDOR_STATUSES.map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      {!profile ? (
        <div className={styles.grid}>
          <div className={`${styles.card} ${styles.wide}`}>
            <div className={styles.empty}>Loading vendor…</div>
          </div>
        </div>
      ) : (
        <>
          <nav aria-label="Vendor sections" className={styles.jump}>
            <button onClick={() => jump('vendor-org')}>
              <Network size={13} /> Org chart
            </button>
            <button onClick={() => jump('vendor-contacts')}>
              <BookUser size={13} /> Key contacts <span>{profile.keyContacts.length}</span>
            </button>
            <button onClick={() => jump('vendor-internal-contacts')}>
              <Building2 size={13} /> Internal contacts <span>{(profile.internalContacts || []).length}</span>
            </button>
            <button onClick={() => jump('vendor-tasks')}>
              <ListTodo size={13} /> Tasks <span>{openTaskCount}</span>
            </button>
            <button onClick={() => jump('vendor-links')}>
              <LinkIcon size={13} /> Links <span>{profile.links.length}</span>
            </button>
            <button onClick={() => jump('vendor-docs')}>
              <FileSignature size={13} /> Agreements <span>{profile.documents.length}</span>
              {!!expired && <span className={`${styles.pill} ${styles.pillBad}`}>{expired} expired</span>}
              {!!expiring && <span className={`${styles.pill} ${styles.pillWarn}`}>{expiring} expiring</span>}
            </button>
            <button onClick={() => jump('vendor-notes')}>
              <NotebookPen size={13} /> Notes <span>{pages.length}</span>
            </button>
          </nav>

          <div className={styles.grid}>
            <OrgChartCard onPatch={patch} profile={profile} vendorName={section.name} />
            <ContactsCard contacts={profile.keyContacts} onPatch={patch} variant="vendor" vendorName={section.name} />
            <ContactsCard
              contacts={profile.internalContacts || []}
              onPatch={patch}
              variant="internal"
              vendorName={section.name}
            />
            <VendorTasksCard
              vendor={{_id: sectionId, name: section.name, categoryId: String(section.categoryId)}}
            />
            <LinksCard links={profile.links} onPatch={patch} />
            <DocumentsCard documents={profile.documents} onPatch={patch} />
            <VendorNotes
              classes={notebook.noteClasses || []}
              loading={loadingPages}
              onAddPage={onAddPage}
              onOpenPage={onOpenPage}
              onReorderPages={onReorderPages}
              onUpdateNotebook={updates => onUpdateNotebook(String(notebook._id), updates)}
              onUpdatePage={onUpdatePage}
              pages={pages}
              sort={(notebook.noteSort as NoteSort) || 'custom'}
              vendorName={section.name}
            />
          </div>
        </>
      )}
    </div>
  );
}
