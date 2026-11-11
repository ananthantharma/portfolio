/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {AlertCircle, Download, ExternalLink, File as FileIcon, FileArchive, FileSpreadsheet, FileText, Film, Image as ImageIcon, Loader2, Music, Paperclip, Presentation, RotateCcw, UploadCloud, X} from 'lucide-react';
import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';

import {api} from './api';
import styles from './TaskWorkspace.module.css';
import {Attachment, Task} from './types';

/** Files attached to tasks live in this folder of the user's Google Drive. */
const DRIVE_FOLDER = 'Portfolio Task Attachments';
const CHUNK = 2 * 1024 * 1024;
const MAX_BYTES = 250 * 1024 * 1024;

export interface DriveUpload {
  fileId: string;
  name: string;
  type: string;
  size: number;
  webViewLink?: string;
}

async function readJson(res: Response) {
  return res.json().catch(() => null);
}

/** Sends one file to Google Drive in pieces and reports how far along it is (0 to 1). */
export async function uploadToDrive(file: File, onProgress?: (fraction: number) => void): Promise<DriveUpload> {
  if (!file.size) throw new Error('That file is empty.');
  if (file.size > MAX_BYTES) throw new Error('That file is over 250 MB. Add it to Google Drive yourself and paste its link in the description.');
  const start = await fetch('/api/drive/files', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action: 'initiate', name: file.name, type: file.type || 'application/octet-stream', folderName: DRIVE_FOLDER, size: file.size}),
  });
  const started = await readJson(start);
  if (start.status === 401) throw new Error('Google Drive is not connected. Sign out, then sign in with Google to attach files.');
  if (start.status === 403) throw new Error('Google Drive refused the upload. Sign out and sign in with Google again to renew access.');
  if (!start.ok || !started?.uploadUrl) throw new Error(started?.error || 'Could not start the upload.');

  let offset = 0;
  while (offset < file.size) {
    const piece = file.slice(offset, offset + CHUNK);
    const form = new FormData();
    form.append('action', 'upload_chunk');
    form.append('chunk', piece, 'chunk');
    form.append('uploadUrl', started.uploadUrl);
    form.append('contentRange', `bytes ${offset}-${offset + piece.size - 1}/${file.size}`);
    const res = await fetch('/api/drive/files', {method: 'POST', body: form});
    const json = await readJson(res);
    if (res.status === 401 || res.status === 403) throw new Error('Google Drive access ran out. Sign out and sign in with Google again, then retry.');
    if (!res.ok) throw new Error(`Google Drive did not take the file (error ${res.status}). Try again.`);
    offset += piece.size;
    onProgress?.(Math.min(1, offset / file.size));
    if (json?.status === 308) continue;
    if (json?.success && json.file?.id) return {fileId: json.file.id, name: json.file.name || file.name, type: file.type || json.file.mimeType || 'application/octet-stream', size: file.size, webViewLink: json.file.webViewLink};
    throw new Error('The upload did not finish. Try again.');
  }
  throw new Error('The upload did not finish. Try again.');
}

// ── Files chosen for a task that doesn't exist yet (kept until it is created or discarded) ──
const pending = new Map<string, File[]>();
const listeners = new Set<() => void>();
const EMPTY: File[] = [];
const notify = () => listeners.forEach(fn => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const pendingFiles = (key: string) => pending.get(key) || EMPTY;
export function clearPendingFiles(key: string) {
  if (pending.delete(key)) notify();
}
function setPending(key: string, files: File[]) {
  if (files.length) pending.set(key, files);
  else pending.delete(key);
  notify();
}

/**
 * Uploads the files waiting on a new task and attaches them to it.
 * Returns the names of any that failed (those stay queued under the task's id for another try).
 */
export async function attachPendingFiles(key: string, taskId: string, onStep?: (done: number, total: number) => void): Promise<string[]> {
  const files = pendingFiles(key);
  if (!files.length) return [];
  const failed: File[] = [];
  for (let i = 0; i < files.length; i++) {
    onStep?.(i, files.length);
    try {
      const uploaded = await uploadToDrive(files[i]);
      await api.addAttachment(taskId, uploaded);
    } catch {
      failed.push(files[i]);
    }
  }
  clearPendingFiles(key);
  return failed.map(f => f.name);
}

// ── Looks ────────────────────────────────────────────────────────────────────
export function formatBytes(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

type Kind = {label: string; Icon: typeof FileIcon; tone: string};
export function fileKind(name: string, type = ''): Kind {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (type.startsWith('image/') || /^(png|jpe?g|gif|webp|svg|heic|bmp)$/.test(ext)) return {label: 'Image', Icon: ImageIcon, tone: 'image'};
  if (type === 'application/pdf' || ext === 'pdf') return {label: 'PDF', Icon: FileText, tone: 'pdf'};
  if (/sheet|excel|csv/.test(type) || /^(xlsx?|xlsm|csv)$/.test(ext)) return {label: 'Spreadsheet', Icon: FileSpreadsheet, tone: 'sheet'};
  if (/presentation|powerpoint/.test(type) || /^(pptx?|key)$/.test(ext)) return {label: 'Slides', Icon: Presentation, tone: 'slides'};
  if (/word|document|rtf/.test(type) || /^(docx?|rtf|odt)$/.test(ext)) return {label: 'Document', Icon: FileText, tone: 'doc'};
  if (type.startsWith('video/') || /^(mp4|mov|avi|mkv|webm)$/.test(ext)) return {label: 'Video', Icon: Film, tone: 'media'};
  if (type.startsWith('audio/') || /^(mp3|wav|m4a|ogg)$/.test(ext)) return {label: 'Audio', Icon: Music, tone: 'media'};
  if (/zip|compressed|tar/.test(type) || /^(zip|rar|7z|gz|tar)$/.test(ext)) return {label: 'Archive', Icon: FileArchive, tone: 'zip'};
  if (/^(msg|eml)$/.test(ext)) return {label: 'Email', Icon: FileText, tone: 'doc'};
  if (type.startsWith('text/') || /^(txt|md|json|xml)$/.test(ext)) return {label: 'Text', Icon: FileText, tone: 'other'};
  return {label: ext ? ext.toUpperCase() : 'File', Icon: FileIcon, tone: 'other'};
}

/** Where a click on the file goes: the Drive viewer for Drive files, the file itself for older embedded ones. */
export function openUrl(att: Attachment, index: number, taskId: string) {
  if (att.webViewLink) return att.webViewLink;
  if (att.fileId) return `https://drive.google.com/file/d/${att.fileId}/view`;
  if (att._id) return `/api/todos/${taskId}/attachments?attachmentId=${att._id}&inline=1`;
  return `/api/todos/attachment?todoId=${taskId}&index=${index}`;
}
/** A direct download of the file, fetched from Drive by the server (no trip to the Drive site). */
export function downloadUrl(att: Attachment, index: number, taskId: string) {
  if (att._id) return `/api/todos/${taskId}/attachments?attachmentId=${att._id}`;
  return att.webViewLink || `/api/todos/attachment?todoId=${taskId}&index=${index}`;
}

function FileTile({name, type}: {name: string; type?: string}) {
  const kind = fileKind(name, type);
  return (
    <span className={styles.fileTile} data-tone={kind.tone}>
      <kind.Icon size={16} />
    </span>
  );
}

type Upload = {id: string; file: File; progress: number; error?: string};

/**
 * The Files section of a task. For a saved task, files upload to Google Drive straight away.
 * For a new task (`pendingKey`), they wait in a list and upload when the task is created.
 */
export default function TaskAttachments({task, pendingKey}: {task?: Task; pendingKey?: string}) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const queued = useSyncExternalStore(
    subscribe,
    () => (pendingKey ? pendingFiles(pendingKey) : EMPTY),
    () => EMPTY,
  );
  const attachments = task?.attachments || [];
  const taskId = task?._id;

  const send = async (upload: Upload) => {
    if (!taskId) return;
    setUploads(list => list.map(u => (u.id === upload.id ? {...u, error: undefined, progress: 0} : u)));
    try {
      const uploaded = await uploadToDrive(upload.file, fraction => setUploads(list => list.map(u => (u.id === upload.id ? {...u, progress: fraction} : u))));
      await api.addAttachment(taskId, uploaded);
      setUploads(list => list.filter(u => u.id !== upload.id));
    } catch (cause) {
      setUploads(list => list.map(u => (u.id === upload.id ? {...u, error: cause instanceof Error ? cause.message : 'Upload failed'} : u)));
    }
  };

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list).filter(f => f.size > 0);
    if (!files.length) return;
    setError(null);
    if (!taskId) {
      if (pendingKey) setPending(pendingKey, [...pendingFiles(pendingKey), ...files].slice(0, 20));
      return;
    }
    const fresh = files.map(file => ({id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, file, progress: 0}));
    setUploads(current => [...current, ...fresh]);
    // One at a time, so a slow connection isn't split between files
    void fresh.reduce((chain, upload) => chain.then(() => send(upload)), Promise.resolve());
  };
  const addRef = useRef(addFiles);
  addRef.current = addFiles;

  // Pasting a file or screenshot anywhere in the task form attaches it
  useEffect(() => {
    const form = root.current?.closest('[data-task-editor]');
    if (!form) return;
    const onPaste = (event: Event) => {
      const files = (event as ClipboardEvent).clipboardData?.files;
      if (!files?.length) return;
      event.preventDefault();
      addRef.current(files);
    };
    form.addEventListener('paste', onPaste);
    return () => form.removeEventListener('paste', onPaste);
  }, []);

  const remove = async (att: Attachment) => {
    if (!taskId || !att._id) return;
    const drive = att.storageType === 'drive';
    if (!window.confirm(drive ? `Remove “${att.name}” from this task? It also moves to your Google Drive trash, where you can restore it for 30 days.` : `Remove “${att.name}” from this task?`)) return;
    setRemoving(att._id);
    setError(null);
    try {
      await api.removeAttachment(taskId, att._id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the file.');
    } finally {
      setRemoving(null);
    }
  };

  const count = attachments.length + queued.length;
  return (
    <div
      className={styles.files}
      data-dragging={dragging}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDragOver={e => {
        if (!Array.from(e.dataTransfer.types).includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDrop={e => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
      ref={root}>
      <div className={styles.filesHead}>
        <span>
          <Paperclip size={14} /> Files {count > 0 && <em>{count}</em>}
        </span>
        <button onClick={() => input.current?.click()} type="button">
          <UploadCloud size={14} /> Add files
        </button>
        <input hidden multiple onChange={e => (e.target.files && addFiles(e.target.files), (e.target.value = ''))} ref={input} type="file" />
      </div>

      {attachments.map((att, index) => (
        <div className={styles.fileRow} data-busy={removing === att._id} key={att._id || `${att.name}-${index}`}>
          <FileTile name={att.name} type={att.type} />
          <a className={styles.fileName} href={openUrl(att, index, taskId!)} rel="noreferrer" target="_blank" title={att.storageType === 'drive' ? `Open ${att.name} in Google Drive` : `Open ${att.name}`}>
            <b>{att.name}</b>
            <small>
              {[fileKind(att.name, att.type).label, formatBytes(att.size), att.storageType === 'drive' ? 'Google Drive' : ''].filter(Boolean).join(' · ')}
            </small>
          </a>
          <a aria-label={`Download ${att.name}`} className={styles.fileBtn} download={att.name} href={downloadUrl(att, index, taskId!)} title="Download">
            <Download size={15} />
          </a>
          <a aria-label={`Open ${att.name} in a new tab`} className={styles.fileBtn} href={openUrl(att, index, taskId!)} rel="noreferrer" target="_blank" title={att.storageType === 'drive' ? 'Open in Google Drive' : 'Open'}>
            <ExternalLink size={15} />
          </a>
          {att._id && (
            <button aria-label={`Remove ${att.name}`} className={styles.fileBtn} data-danger disabled={removing === att._id} onClick={() => void remove(att)} title="Remove" type="button">
              {removing === att._id ? <Loader2 className="animate-spin" size={15} /> : <X size={15} />}
            </button>
          )}
        </div>
      ))}

      {uploads.map(upload => (
        <div className={styles.fileRow} data-state={upload.error ? 'error' : 'uploading'} key={upload.id}>
          <FileTile name={upload.file.name} type={upload.file.type} />
          <span className={styles.fileName}>
            <b>{upload.file.name}</b>
            {upload.error ? (
              <small data-error>
                <AlertCircle size={12} /> {upload.error}
              </small>
            ) : (
              <span className={styles.fileBar} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(upload.progress * 100)}>
                <i style={{width: `${Math.max(4, upload.progress * 100)}%`}} />
              </span>
            )}
          </span>
          {upload.error ? (
            <>
              <button aria-label={`Try ${upload.file.name} again`} className={styles.fileBtn} onClick={() => void send(upload)} title="Try again" type="button">
                <RotateCcw size={15} />
              </button>
              <button aria-label="Dismiss" className={styles.fileBtn} onClick={() => setUploads(list => list.filter(u => u.id !== upload.id))} title="Dismiss" type="button">
                <X size={15} />
              </button>
            </>
          ) : (
            <span className={styles.filePct}>{Math.round(upload.progress * 100)}%</span>
          )}
        </div>
      ))}

      {queued.map((file, index) => (
        <div className={styles.fileRow} key={`${file.name}-${index}`}>
          <FileTile name={file.name} type={file.type} />
          <span className={styles.fileName}>
            <b>{file.name}</b>
            <small>{[fileKind(file.name, file.type).label, formatBytes(file.size), 'Uploads when you create the task'].filter(Boolean).join(' · ')}</small>
          </span>
          <button aria-label={`Remove ${file.name}`} className={styles.fileBtn} data-danger onClick={() => pendingKey && setPending(pendingKey, queued.filter((_, i) => i !== index))} title="Remove" type="button">
            <X size={15} />
          </button>
        </div>
      ))}

      {count === 0 && uploads.length === 0 && (
        <button className={styles.fileDrop} onClick={() => input.current?.click()} type="button">
          <UploadCloud size={18} />
          <span>
            <b>Drop files here</b>, paste a screenshot, or click to choose
          </span>
          <small>Stored in your Google Drive, opened from this task</small>
        </button>
      )}
      {dragging && <div className={styles.fileOver}>Drop to attach</div>}
      {error && (
        <p className={styles.fileError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The paperclip on a task card or row. Click it for the files, each opening straight from the list.
 * Renders nothing when the task has no files.
 */
export function AttachmentChip({task, size = 13, className = ''}: {task: Task; size?: number; className?: string}) {
  const [at, setAt] = useState<{left: number; top: number} | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const files = task.attachments || [];

  useEffect(() => {
    if (!at) return;
    const close = (event: Event) => {
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return;
      // Clicks and scrolling inside the list itself keep it open
      if ((event.type === 'pointerdown' || event.type === 'scroll') && (event.target as HTMLElement).closest?.('[data-file-pop]')) return;
      setAt(null);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [at]);

  if (!files.length) return null;
  const toggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (at) return setAt(null);
    const rect = button.current!.getBoundingClientRect();
    const width = 300;
    const height = Math.min(files.length, 6) * 46 + 46;
    setAt({left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 6) : rect.bottom + 6});
  };
  return (
    <>
      <button
        aria-expanded={!!at}
        aria-label={`${files.length} file${files.length === 1 ? '' : 's'} attached`}
        className={`${styles.fileChip} ${className}`}
        data-file-pop
        onClick={toggle}
        onPointerDown={e => e.stopPropagation()}
        ref={button}
        title={`${files.length} file${files.length === 1 ? '' : 's'}. Click to open`}
        type="button">
        <Paperclip size={size} />
        {files.length}
      </button>
      {at &&
        createPortal(
          <div className={styles.filePop} data-file-pop onClick={e => e.stopPropagation()} role="dialog" style={{left: at.left, top: at.top}}>
            <header>
              <Paperclip size={13} /> {files.length} file{files.length === 1 ? '' : 's'}
            </header>
            <div>
              {files.map((att, index) => (
                <div className={styles.fileRow} key={att._id || `${att.name}-${index}`}>
                  <FileTile name={att.name} type={att.type} />
                  <a className={styles.fileName} href={openUrl(att, index, task._id)} rel="noreferrer" target="_blank" title={`Open ${att.name}`}>
                    <b>{att.name}</b>
                    <small>{[fileKind(att.name, att.type).label, formatBytes(att.size)].filter(Boolean).join(' · ')}</small>
                  </a>
                  <a aria-label={`Download ${att.name}`} className={styles.fileBtn} download={att.name} href={downloadUrl(att, index, task._id)} title="Download">
                    <Download size={15} />
                  </a>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
