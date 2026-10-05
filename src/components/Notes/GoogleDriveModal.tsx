/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  HardDrive,
  Link2,
  Loader2,
  Presentation,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import {useSession} from 'next-auth/react';
import React, {useEffect, useMemo, useRef, useState} from 'react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  exportLinks?: Record<string, string>;
}

type Crumb = {id: string; name: string};
type SortKey = 'name' | 'modified' | 'size';

// The browser opens here every time (a folder called "Temp" at the top of My Drive)
const START_FOLDER = 'Temp';
const FOLDER = 'application/vnd.google-apps.folder';

// Google Docs/Sheets/Slides have no file of their own; download them as the Office equivalent
const EXPORT_AS: Record<string, {mime: string; ext: string}> = {
  'application/vnd.google-apps.document': {mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx'},
  'application/vnd.google-apps.spreadsheet': {mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx'},
  'application/vnd.google-apps.presentation': {mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: 'pptx'},
  'application/vnd.google-apps.drawing': {mime: 'image/png', ext: 'png'},
};

/** Where to download a file from, straight from Google (null for folders, forms, shortcuts). */
function downloadOf(file: DriveFile): {url: string; ext?: string} | null {
  if (file.webContentLink) return {url: file.webContentLink};
  const target = EXPORT_AS[file.mimeType];
  if (target && file.exportLinks?.[target.mime]) return {url: file.exportLinks[target.mime], ext: target.ext};
  const pdf = file.exportLinks?.['application/pdf'];
  return pdf ? {url: pdf, ext: 'pdf'} : null;
}

/** A small icon + tint + label for each kind of file. */
function kindOf(mime: string): {Icon: typeof File; tint: string; label: string} {
  if (mime === FOLDER) return {Icon: Folder, tint: 'text-amber-500 bg-amber-50', label: 'Folder'};
  if (mime === 'application/vnd.google-apps.document' || mime.includes('wordprocessingml') || mime === 'application/msword')
    return {Icon: FileText, tint: 'text-blue-600 bg-blue-50', label: mime.includes('google-apps') ? 'Google Doc' : 'Word'};
  if (mime === 'application/vnd.google-apps.spreadsheet' || mime.includes('spreadsheetml') || mime.includes('ms-excel') || mime === 'text/csv')
    return {Icon: FileSpreadsheet, tint: 'text-emerald-600 bg-emerald-50', label: mime.includes('google-apps') ? 'Google Sheet' : mime === 'text/csv' ? 'CSV' : 'Excel'};
  if (mime === 'application/vnd.google-apps.presentation' || mime.includes('presentationml') || mime.includes('ms-powerpoint'))
    return {Icon: Presentation, tint: 'text-orange-500 bg-orange-50', label: mime.includes('google-apps') ? 'Google Slides' : 'PowerPoint'};
  if (mime === 'application/pdf') return {Icon: FileText, tint: 'text-rose-600 bg-rose-50', label: 'PDF'};
  if (mime === 'application/vnd.google-apps.form') return {Icon: ClipboardList, tint: 'text-violet-600 bg-violet-50', label: 'Google Form'};
  if (mime === 'application/vnd.google-apps.shortcut') return {Icon: Link2, tint: 'text-slate-500 bg-slate-100', label: 'Shortcut'};
  if (mime.startsWith('image/') || mime === 'application/vnd.google-apps.drawing') return {Icon: FileImage, tint: 'text-fuchsia-600 bg-fuchsia-50', label: 'Image'};
  if (mime.startsWith('video/')) return {Icon: FileVideo, tint: 'text-pink-600 bg-pink-50', label: 'Video'};
  if (mime.startsWith('audio/')) return {Icon: FileAudio, tint: 'text-teal-600 bg-teal-50', label: 'Audio'};
  if (/zip|compressed|x-tar|x-7z|x-rar|gzip/.test(mime)) return {Icon: FileArchive, tint: 'text-stone-600 bg-stone-100', label: 'Archive'};
  if (/json|javascript|typescript|xml|html|x-python|x-sh|css/.test(mime)) return {Icon: FileCode, tint: 'text-cyan-700 bg-cyan-50', label: 'Code'};
  if (mime.startsWith('text/')) return {Icon: FileText, tint: 'text-slate-600 bg-slate-100', label: 'Text'};
  return {Icon: File, tint: 'text-slate-500 bg-slate-100', label: 'File'};
}

function formatSize(size?: string) {
  const bytes = Number(size);
  if (!size || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

function formatModified(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return `Today, ${d.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'})}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, d.getFullYear() === now.getFullYear() ? {month: 'short', day: 'numeric'} : {month: 'short', day: 'numeric', year: 'numeric'});
}

const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({isOpen, onClose}) => {
  const {data: session} = useSession() as {data: {accessToken?: string} | null};
  const [crumbs, setCrumbs] = useState<Crumb[]>([{id: 'root', name: 'My Drive'}]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{key: SortKey; dir: 1 | -1}>({key: 'name', dir: 1});
  const fileInput = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const folder = crumbs[crumbs.length - 1];

  const load = async (target: {folderId?: string; start?: string}, append?: string) => {
    const id = ++requestId.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (target.start) params.set('start', target.start);
      else params.set('folderId', target.folderId || 'root');
      if (append) params.set('pageToken', append);
      const res = await fetch(`/api/drive?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load this folder');
      if (id !== requestId.current) return;
      setFiles(prev => (append ? [...prev, ...(data.files || [])] : data.files || []));
      setNextPage(data.nextPageToken || null);
      if (target.start) {
        setCrumbs(data.folder ? [{id: 'root', name: 'My Drive'}, data.folder] : [{id: 'root', name: 'My Drive'}]);
        setNotice(data.startMissing ? `No "${target.start}" folder at the top of My Drive, so showing My Drive.` : null);
      }
    } catch (err) {
      if (id === requestId.current) setError(err instanceof Error ? err.message : 'Could not load this folder');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Every time the window opens, start in My Drive / Temp
  useEffect(() => {
    if (!isOpen || !session?.accessToken) return;
    setQuery('');
    setNotice(null);
    void load({start: START_FOLDER});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, session?.accessToken]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const openFolder = (next: Crumb[]) => {
    setCrumbs(next);
    setQuery('');
    setNotice(null);
    void load({folderId: next[next.length - 1].id});
  };

  const upload = async (list: FileList | File[]) => {
    const picked = Array.from(list);
    if (!picked.length) return;
    setError(null);
    try {
      for (const file of picked) {
        setUploading(file.name);
        const form = new FormData();
        form.append('file', file);
        form.append('parentId', folder.id);
        const res = await fetch('/api/drive', {method: 'POST', body: form});
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Could not upload ${file.name}`);
        }
      }
      await load({folderId: folder.id});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const remove = async (file: DriveFile) => {
    if (!window.confirm(`Delete "${file.name}" from Google Drive?`)) return;
    try {
      const res = await fetch(`/api/drive?fileId=${encodeURIComponent(file.id)}`, {method: 'DELETE'});
      if (!res.ok) throw new Error('Delete failed');
      setFiles(list => list.filter(f => f.id !== file.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? files.filter(f => f.name.toLowerCase().includes(q)) : [...files];
    const value = (f: DriveFile) => (sort.key === 'name' ? f.name.toLowerCase() : sort.key === 'size' ? Number(f.size) || 0 : new Date(f.modifiedTime || 0).getTime());
    return list.sort((a, b) => {
      // Folders always first
      const folderFirst = Number(b.mimeType === FOLDER) - Number(a.mimeType === FOLDER);
      if (folderFirst) return folderFirst;
      const va = value(a);
      const vb = value(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [files, query, sort]);

  const toggleSort = (key: SortKey) => setSort(s => (s.key === key ? {key, dir: s.dir === 1 ? -1 : 1} : {key, dir: key === 'name' ? 1 : -1}));
  const SortIcon = ({k}: {k: SortKey}) => (sort.key === k ? sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null);
  const folderUrl = folder.id === 'root' ? 'https://drive.google.com/drive/my-drive' : `https://drive.google.com/drive/folders/${folder.id}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div
        className="relative flex h-[min(760px,88vh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDragOver={e => {
          if (!e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <HardDrive className="h-4 w-4" />
          </span>
          <h2 className="text-[15px] font-semibold text-slate-800">Google Drive</h2>
          <div className="ml-auto flex items-center gap-1.5">
            <a className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700" href={folderUrl} rel="noreferrer" target="_blank" title="Open this folder in Google Drive">
              <ExternalLink className="h-3.5 w-3.5" /> Open in Drive
            </a>
            <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50" disabled={!!uploading} onClick={() => fileInput.current?.click()} type="button">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Upload
            </button>
            <input className="hidden" multiple onChange={e => {
              if (e.target.files) void upload(e.target.files);
              e.target.value = '';
            }} ref={fileInput} type="file" />
            <button aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose} title="Close (Esc)" type="button">
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* Toolbar: back, breadcrumb, search, refresh */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-2">
          <button
            aria-label="Up one folder"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            disabled={crumbs.length < 2 || loading}
            onClick={() => openFolder(crumbs.slice(0, -1))}
            title="Up one folder"
            type="button">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <nav aria-label="Folder path" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-[13px]">
            {crumbs.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
                <button
                  className={`shrink-0 truncate rounded-md px-1.5 py-0.5 ${i === crumbs.length - 1 ? 'font-semibold text-slate-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                  disabled={i === crumbs.length - 1}
                  onClick={() => openFolder(crumbs.slice(0, i + 1))}
                  type="button">
                  {c.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-emerald-400 focus-within:bg-white">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input aria-label="Filter this folder" className="w-40 border-0 bg-transparent p-0 text-[12.5px] outline-none placeholder:text-slate-400" onChange={e => setQuery(e.target.value)} placeholder="Filter this folder" value={query} />
          </div>
          <button aria-label="Refresh" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => void load({folderId: folder.id})} title="Refresh" type="button">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {(error || notice || uploading) && (
          <div className="px-5 pt-2.5">
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">{error}</p>}
            {!error && uploading && <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading {uploading}…</p>}
            {!error && !uploading && notice && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{notice}</p>}
          </div>
        )}

        {/* List */}
        <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
          {!session?.accessToken ? (
            <p className="p-10 text-center text-[13px] text-slate-500">Sign in with Google to browse your Drive.</p>
          ) : (
            <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="text-left text-[11px] font-semibold text-slate-400">
                  <th className="border-b border-slate-100 px-2 py-2">
                    <button className="flex items-center gap-1 hover:text-slate-600" onClick={() => toggleSort('name')} type="button">Name <SortIcon k="name" /></button>
                  </th>
                  <th className="hidden w-36 border-b border-slate-100 px-2 py-2 sm:table-cell">
                    <button className="flex items-center gap-1 hover:text-slate-600" onClick={() => toggleSort('modified')} type="button">Modified <SortIcon k="modified" /></button>
                  </th>
                  <th className="hidden w-20 border-b border-slate-100 px-2 py-2 text-right md:table-cell">
                    <button className="ml-auto flex items-center gap-1 hover:text-slate-600" onClick={() => toggleSort('size')} type="button">Size <SortIcon k="size" /></button>
                  </th>
                  <th className="w-28 border-b border-slate-100 px-2 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({length: 8}).map((_, i) => (
                      <tr key={i}>
                        <td className="px-2 py-2.5" colSpan={4}>
                          <div className="flex animate-pulse items-center gap-3">
                            <div className="h-7 w-7 rounded-md bg-slate-100" />
                            <div className="h-3 rounded bg-slate-100" style={{width: `${30 + ((i * 17) % 40)}%`}} />
                          </div>
                        </td>
                      </tr>
                    ))
                  : shown.map(file => {
                      const {Icon, tint, label} = kindOf(file.mimeType);
                      const isFolder = file.mimeType === FOLDER;
                      const open = () => (isFolder ? openFolder([...crumbs, {id: file.id, name: file.name}]) : file.webViewLink && window.open(file.webViewLink, '_blank', 'noopener'));
                      return (
                        <tr className="group cursor-pointer" key={file.id} onClick={open}>
                          <td className="rounded-l-lg px-2 py-1.5 group-hover:bg-slate-50">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tint}`} title={label}>
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="truncate font-medium text-slate-700 group-hover:text-slate-900" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                          </td>
                          <td className="hidden whitespace-nowrap px-2 py-1.5 text-[12px] text-slate-500 group-hover:bg-slate-50 sm:table-cell">{formatModified(file.modifiedTime)}</td>
                          <td className="hidden whitespace-nowrap px-2 py-1.5 text-right text-[12px] text-slate-500 group-hover:bg-slate-50 md:table-cell">{isFolder ? '—' : formatSize(file.size)}</td>
                          <td className="rounded-r-lg px-2 py-1.5 group-hover:bg-slate-50">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              {(() => {
                                const dl = downloadOf(file);
                                return dl ? (
                                  <a
                                    aria-label={`Download ${file.name}`}
                                    className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-emerald-600"
                                    href={dl.url}
                                    onClick={e => e.stopPropagation()}
                                    rel="noreferrer"
                                    target="_blank"
                                    title={dl.ext ? `Download as .${dl.ext}` : 'Download'}>
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                ) : null;
                              })()}
                              {file.webViewLink && (
                                <a aria-label={`Open ${file.name} in a new tab`} className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700" href={file.webViewLink} onClick={e => e.stopPropagation()} rel="noreferrer" target="_blank" title="Open in new tab">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                              <button
                                aria-label={`Delete ${file.name}`}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-rose-600"
                                onClick={e => {
                                  e.stopPropagation();
                                  void remove(file);
                                }}
                                title="Delete"
                                type="button">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
          {!loading && session?.accessToken && !shown.length && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-400">
              <Folder className="h-8 w-8 text-slate-300" />
              <p className="text-[13px] font-medium">{query ? 'Nothing here matches that filter.' : 'This folder is empty. Drop files here to upload.'}</p>
            </div>
          )}
          {!loading && nextPage && !query && (
            <div className="flex justify-center py-3">
              <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50" disabled={loadingMore} onClick={() => void load({folderId: folder.id}, nextPage)} type="button">
                {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Load more
              </button>
            </div>
          )}
          {dragOver && (
            <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/80 text-[13px] font-semibold text-emerald-700">
              <UploadCloud className="mr-2 h-5 w-5" /> Drop to upload to {folder.name}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2 text-[11px] text-slate-400">
          <span>
            {loading ? 'Loading…' : `${shown.filter(f => f.mimeType === FOLDER).length} folders · ${shown.filter(f => f.mimeType !== FOLDER).length} files${nextPage ? ' (more available)' : ''}`}
          </span>
          <span>Drag files onto the list to upload</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleDriveModal;
