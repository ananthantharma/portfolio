/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {Globe, Search, X} from 'lucide-react';
import React, {useEffect, useState} from 'react';

import {InlineField} from './ProjectHeader';
import {formatDate, hostOf, initials, normalizeUrl, VENDOR_STATUSES, VendorPatch, VendorProfile, VendorStatus} from './vendorApi';
import styles from './VendorPage.module.css';

function Logo({domain, name}: {domain: string; name: string}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [domain]);
  return (
    <div className={`${styles.logo} ${styles.logoSmall}`} aria-hidden="true">
      {domain && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" onError={() => setFailed(true)} src={`https://logo.clearbit.com/${domain}`} />
      ) : (
        initials(name)
      )}
    </div>
  );
}

interface Props {
  notebookName: string;
  name: string;
  image?: string | null;
  profile: VendorProfile;
  lastUpdated?: string | null;
  query: string;
  onQuery: (q: string) => void;
  onPatch: (patch: VendorPatch) => Promise<void>;
}

/** Compact vendor header: logo, name, status, website, description, and project-style search. */
export default function VendorHeader({notebookName, name, image, profile, lastUpdated, query, onQuery, onPatch}: Props) {
  const save = (patch: VendorPatch) => onPatch(patch).catch(() => undefined);
  const domain = profile.website ? hostOf(profile.website) : image || '';
  return (
    <header className={styles.projectHeader}>
      <div className={styles.projectHeaderTop}>
        <div className={styles.eyebrow}>{notebookName}</div>
        <label className={styles.projectSearch}>
          <Search size={14} />
          <input
            aria-label="Search this vendor"
            onChange={e => onQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onQuery('')}
            placeholder="Search notes, tasks, documents, contacts…"
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
        <Logo domain={domain} name={name} />
        <h1>{name}</h1>
        <select
          aria-label="Vendor status"
          className={styles.statusSelect}
          data-status={profile.status}
          onChange={e => save({status: e.target.value as VendorStatus})}
          value={profile.status}>
          {VENDOR_STATUSES.map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className={styles.projectMeta}>
        <span>
          <Globe size={12} />
          <InlineField
            display={hostOf(profile.website)}
            label="Vendor website"
            maxLength={300}
            onSave={v => {
              const url = v ? normalizeUrl(v) : '';
              if (url !== null) save({website: url});
            }}
            placeholder="add website"
            value={profile.website || ''}
          />
          {profile.website && (
            <a className={styles.linkButton} href={profile.website} rel="noopener noreferrer" target="_blank">
              Open
            </a>
          )}
        </span>
        {lastUpdated && <span>Updated {formatDate(lastUpdated)}</span>}
      </div>

      <InlineField
        className={styles.projectDescription}
        label="Vendor description"
        maxLength={400}
        onSave={v => save({summary: v})}
        placeholder="Add a short description, like what they provide and since when"
        value={profile.summary || ''}
      />
    </header>
  );
}
