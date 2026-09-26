/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {Download, ExternalLink, FileSignature, FileText, Link as LinkIcon, Pencil, Trash2, Upload} from 'lucide-react';
import React, {useMemo, useRef, useState} from 'react';

import {
  dateInputToIso,
  daysUntil,
  deleteVendorFile,
  formatBytes,
  formatDate,
  isoToDateInput,
  MAX_UPLOAD_BYTES,
  normalizeUrl,
  uploadVendorFile,
  VENDOR_DOC_TYPES,
  VendorDocType,
  VendorDocument,
  vendorFileUrl,
  VendorPatch,
} from './vendorApi';
import styles from './VendorPage.module.css';

interface Props {
  documents: VendorDocument[];
  onPatch: (patch: VendorPatch) => Promise<void>;
}

type Draft = {
  index: number | null;
  source: 'file' | 'link';
  file: File | null;
  url: string;
  title: string;
  docType: VendorDocType;
  signedDate: string;
  expiryDate: string;
};

const EXPIRY_WARNING_DAYS = 60;

function expiryBadge(doc: VendorDocument) {
  const days = daysUntil(doc.expiryDate);
  if (days === null) return null;
  if (days < 0) return <span className={`${styles.pill} ${styles.pillBad}`}>Expired</span>;
  if (days === 0) return <span className={`${styles.pill} ${styles.pillWarn}`}>Expires today</span>;
  if (days <= EXPIRY_WARNING_DAYS)
    return (
      <span className={`${styles.pill} ${styles.pillWarn}`}>
        Expires in {days} day{days === 1 ? '' : 's'}
      </span>
    );
  return <span className={`${styles.pill} ${styles.pillGood}`}>Active</span>;
}

const emptyDraft = (): Draft => ({
  index: null,
  source: 'file',
  file: null,
  url: '',
  title: '',
  docType: 'MSA',
  signedDate: '',
  expiryDate: '',
});

export default function DocumentsCard({documents, onPatch}: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [typeFilter, setTypeFilter] = useState<VendorDocType | 'all'>('all');
  const fileInput = useRef<HTMLInputElement>(null);

  // Soonest expiry first, then newest; documents without an expiry go last
  const sorted = useMemo(
    () =>
      documents
        .map((doc, index) => ({doc, index}))
        .filter(({doc}) => typeFilter === 'all' || doc.docType === typeFilter)
        .sort((a, b) => {
          const ea = a.doc.expiryDate ? new Date(a.doc.expiryDate).getTime() : Infinity;
          const eb = b.doc.expiryDate ? new Date(b.doc.expiryDate).getTime() : Infinity;
          if (ea !== eb) return ea - eb;
          return new Date(b.doc.createdAt || 0).getTime() - new Date(a.doc.createdAt || 0).getTime();
        }),
    [documents, typeFilter],
  );
  const typesInUse = useMemo(() => VENDOR_DOC_TYPES.filter(t => documents.some(d => d.docType === t)), [documents]);

  const pickFile = (file: File | undefined) => {
    if (!file || !draft) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Files must be 4 MB or smaller. Save larger files as a link instead.');
      return;
    }
    setError('');
    setDraft({...draft, file, title: draft.title || file.name.replace(/\.[^.]+$/, '')});
  };

  const startEdit = (index: number) => {
    const doc = documents[index];
    setError('');
    setDraft({
      index,
      source: doc.fileId ? 'file' : 'link',
      file: null,
      url: doc.url || '',
      title: doc.title,
      docType: doc.docType,
      signedDate: isoToDateInput(doc.signedDate),
      expiryDate: isoToDateInput(doc.expiryDate),
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const existing = draft.index !== null ? documents[draft.index] : null;
    const title = draft.title.trim();
    if (!title) return setError('Give the document a name.');
    if (draft.source === 'file' && !draft.file && !existing?.fileId) return setError('Choose a file to upload.');
    const url = draft.source === 'link' ? normalizeUrl(draft.url) : '';
    if (draft.source === 'link' && !url) return setError('Enter the document’s web address.');

    setSaving(true);
    setError('');
    let uploadedId: string | null = null;
    try {
      let fileFields: Partial<VendorDocument> = {};
      if (draft.source === 'file' && draft.file) {
        const uploaded = await uploadVendorFile(draft.file, draft.file.name);
        uploadedId = uploaded._id;
        fileFields = {fileId: uploaded._id, fileName: uploaded.filename, contentType: uploaded.contentType, size: uploaded.size, url: ''};
      } else if (draft.source === 'link') {
        fileFields = {fileId: null, fileName: '', contentType: '', size: 0, url: url || ''};
      }
      const entry: VendorDocument = {
        ...(existing || {}),
        ...fileFields,
        title,
        docType: draft.docType,
        signedDate: dateInputToIso(draft.signedDate),
        expiryDate: dateInputToIso(draft.expiryDate),
      };
      const next = existing ? documents.map((d, i) => (i === draft.index ? entry : d)) : [...documents, entry];
      await onPatch({documents: next});
      setDraft(null);
    } catch (err) {
      if (uploadedId) deleteVendorFile(uploadedId);
      setError(err instanceof Error ? err.message : 'Could not save the document.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (index: number) => {
    if (!confirm(`Delete "${documents[index].title}"? Uploaded files are removed permanently.`)) return;
    try {
      await onPatch({documents: documents.filter((_, i) => i !== index)});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the document.');
    }
  };

  const existingFileName = draft?.index !== null && draft ? documents[draft.index]?.fileName : '';

  return (
    <section aria-label="Agreements and documents" className={`${styles.card} ${styles.wide}`} id="vendor-docs">
      <div className={styles.cardHead}>
        <h2>
          <FileSignature size={17} />
          Agreements and documents
          {documents.length > 0 && <small>{documents.length}</small>}
        </h2>
        {typesInUse.length > 1 && (
          <select
            aria-label="Filter by document type"
            onChange={e => setTypeFilter(e.target.value as VendorDocType | 'all')}
            value={typeFilter}>
            <option value="all">All types</option>
            {typesInUse.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <button
          className={styles.btn}
          onClick={() => {
            setError('');
            setDraft(emptyDraft());
          }}>
          <Upload size={14} /> Add document
        </button>
      </div>

      {draft && (
        <form className={styles.form} onSubmit={submit}>
          <div className={`${styles.seg} ${styles.formFull}`} role="group" aria-label="Document source" style={{width: 'fit-content'}}>
            <button aria-pressed={draft.source === 'file'} onClick={() => setDraft({...draft, source: 'file'})} type="button">
              Upload a file
            </button>
            <button aria-pressed={draft.source === 'link'} onClick={() => setDraft({...draft, source: 'link'})} type="button">
              Link to a file
            </button>
          </div>
          {draft.source === 'file' ? (
            <div
              className={styles.dropZone}
              data-drop={dropping}
              onClick={() => fileInput.current?.click()}
              onDragLeave={() => setDropping(false)}
              onDragOver={e => {
                e.preventDefault();
                setDropping(true);
              }}
              onDrop={e => {
                e.preventDefault();
                setDropping(false);
                pickFile(e.dataTransfer.files[0]);
              }}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
              role="button"
              tabIndex={0}>
              <Upload size={18} />
              {draft.file ? (
                <span>
                  <strong>{draft.file.name}</strong> · {formatBytes(draft.file.size)}
                </span>
              ) : existingFileName ? (
                <span>
                  <strong>{existingFileName}</strong> · choose a file to replace it
                </span>
              ) : (
                <span>
                  <strong>Choose a file</strong> or drop it here. PDF, Word, Excel, or images up to 4 MB.
                </span>
              )}
              <input hidden onChange={e => pickFile(e.target.files?.[0])} ref={fileInput} type="file" />
            </div>
          ) : (
            <label className={styles.formFull}>
              Web address
              <input
                onChange={e => setDraft({...draft, url: e.target.value})}
                placeholder="SharePoint, Drive, or DocuSign link"
                value={draft.url}
              />
            </label>
          )}
          <label>
            Name
            <input onChange={e => setDraft({...draft, title: e.target.value})} placeholder="Master services agreement" value={draft.title} />
          </label>
          <label>
            Type
            <select onChange={e => setDraft({...draft, docType: e.target.value as VendorDocType})} value={draft.docType}>
              {VENDOR_DOC_TYPES.map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Signed
            <input onChange={e => setDraft({...draft, signedDate: e.target.value})} type="date" value={draft.signedDate} />
          </label>
          <label>
            Expires
            <input onChange={e => setDraft({...draft, expiryDate: e.target.value})} type="date" value={draft.expiryDate} />
          </label>
          <div className={styles.formActions}>
            <button className={styles.btn} onClick={() => setDraft(null)} type="button">
              Cancel
            </button>
            <button className={`${styles.btn} ${styles.primary}`} disabled={saving} type="submit">
              {saving ? 'Saving…' : draft.index === null ? 'Save document' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {documents.length === 0 && !draft ? (
        <div className={styles.empty}>
          Keep MSAs, DPAs, SOWs, and NDAs here with their signed and expiry dates. You’ll see a warning 60 days before one expires.
        </div>
      ) : (
        <div className={styles.list}>
          {sorted.map(({doc, index}) => {
            const href = doc.fileId ? vendorFileUrl(doc.fileId) : doc.url;
            const meta = [
              doc.signedDate && `Signed ${formatDate(doc.signedDate)}`,
              doc.expiryDate && `Expires ${formatDate(doc.expiryDate)}`,
              doc.fileId ? formatBytes(doc.size) : doc.url ? 'Link' : '',
            ].filter(Boolean);
            return (
              <div className={styles.row} key={doc._id || doc.title + index}>
                <span className={styles.fileIcon}>{doc.fileId ? <FileText size={16} /> : <LinkIcon size={16} />}</span>
                <a className={styles.rowMain} href={href || undefined} rel="noopener noreferrer" target="_blank">
                  <div className={styles.rowTitle}>
                    <span>{doc.title}</span>
                    <span className={styles.pill}>{doc.docType}</span>
                  </div>
                  <div className={styles.rowSub}>{meta.join(' · ') || 'No dates yet'}</div>
                </a>
                {expiryBadge(doc)}
                <div className={styles.rowActions}>
                  {doc.fileId ? (
                    <a aria-label={`Download ${doc.title}`} className={styles.iconBtn} href={vendorFileUrl(doc.fileId, true)}>
                      <Download size={14} />
                    </a>
                  ) : (
                    doc.url && (
                      <a aria-label={`Open ${doc.title}`} className={styles.iconBtn} href={doc.url} rel="noopener noreferrer" target="_blank">
                        <ExternalLink size={14} />
                      </a>
                    )
                  )}
                  <button aria-label={`Edit ${doc.title}`} className={styles.iconBtn} onClick={() => startEdit(index)}>
                    <Pencil size={14} />
                  </button>
                  <button aria-label={`Delete ${doc.title}`} className={`${styles.iconBtn} ${styles.danger}`} onClick={() => remove(index)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
