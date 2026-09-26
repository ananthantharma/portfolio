/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {ExternalLink, Globe, Link as LinkIcon, Pencil, Plus, Trash2} from 'lucide-react';
import React, {useState} from 'react';

import {hostOf, normalizeUrl, VendorLink, VendorPatch} from './vendorApi';
import styles from './VendorPage.module.css';

interface Props {
  links: VendorLink[];
  onPatch: (patch: VendorPatch) => Promise<void>;
}

type Draft = {index: number | null; title: string; url: string};

export default function LinksCard({links, onPatch}: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const url = normalizeUrl(draft.url);
    if (!url) {
      setError('Enter a web address, like support.vendor.com');
      return;
    }
    const entry: VendorLink = {title: draft.title.trim() || hostOf(url), url};
    const next =
      draft.index === null
        ? [...links, entry]
        : links.map((link, i) => (i === draft.index ? {...link, ...entry} : link));
    setSaving(true);
    try {
      await onPatch({links: next});
      setDraft(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the link.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (index: number) => {
    if (!confirm(`Remove "${links[index].title}"?`)) return;
    try {
      await onPatch({links: links.filter((_, i) => i !== index)});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the link.');
    }
  };

  return (
    <section aria-label="Links" className={styles.card} id="vendor-links">
      <div className={styles.cardHead}>
        <h2>
          <LinkIcon size={17} />
          Links
          {links.length > 0 && <small>{links.length}</small>}
        </h2>
        <button className={styles.btn} onClick={() => setDraft({index: null, title: '', url: ''})}>
          <Plus size={14} /> Add link
        </button>
      </div>

      {draft && (
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.formFull}>
            Web address
            <input
              autoFocus
              onChange={e => {
                setDraft({...draft, url: e.target.value});
                setError('');
              }}
              placeholder="support.vendor.com"
              value={draft.url}
            />
          </label>
          <label className={styles.formFull}>
            Name
            <input
              onChange={e => setDraft({...draft, title: e.target.value})}
              placeholder="Support portal"
              value={draft.title}
            />
          </label>
          <div className={styles.formActions}>
            <button className={styles.btn} onClick={() => setDraft(null)} type="button">
              Cancel
            </button>
            <button className={`${styles.btn} ${styles.primary}`} disabled={saving} type="submit">
              {draft.index === null ? 'Save link' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {links.length === 0 && !draft ? (
        <div className={styles.empty}>Save portals, status pages, shared folders, and anything else you open often.</div>
      ) : (
        <div className={styles.list}>
          {links.map((link, index) => (
            <div className={styles.row} key={link._id || link.url + index}>
              <span className={styles.fileIcon}>
                <Globe size={16} />
              </span>
              <a className={styles.rowMain} href={link.url} rel="noopener noreferrer" target="_blank">
                <div className={styles.rowTitle}>
                  <span>{link.title}</span>
                  <ExternalLink size={12} color="#a2a79b" />
                </div>
                <div className={styles.rowSub}>{hostOf(link.url)}</div>
              </a>
              <div className={styles.rowActions}>
                <button
                  aria-label={`Edit ${link.title}`}
                  className={styles.iconBtn}
                  onClick={() => setDraft({index, title: link.title, url: link.url})}>
                  <Pencil size={14} />
                </button>
                <button
                  aria-label={`Remove ${link.title}`}
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={() => remove(index)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
