'use client';
/* eslint-disable simple-import-sort/imports */
import {AlertCircle, Download, Eye, FileText, Folder, Image as ImageIcon, Loader2, Upload, Trash2} from 'lucide-react';
import {useSession} from 'next-auth/react';
import React, {useEffect, useRef, useState} from 'react';

import Header from '@/components/Sections/Header';

/* eslint-disable react-memo/require-usememo */

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink: string;
  iconLink: string;
  thumbnailLink?: string;
  createdTime: string;
  size?: string;
}

interface Breadcrumb {
  id: string;
  name: string;
}

export default function DrivePage() {
  const {status} = useSession();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{id: 'root', name: 'My Drive'}]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-memo/require-usememo */
  const fetchFiles = React.useCallback(async (folderId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/drive/files?folderId=${folderId}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError('Access Denied. Please Sign Out and Sign In again to grant Drive permissions.');
        } else {
          setError(data.error || 'Failed to fetch files');
        }
        return;
      }

      setFiles(data.files || []);
      setError('');
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchFiles(currentFolder);
    }
  }, [status, fetchFiles, currentFolder]);

  const handleFolderClick = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId);
    setBreadcrumbs(prev => [...prev, {id: folderId, name: folderName}]);
  };

  const handleBreadcrumbClick = (folderId: string, index: number) => {
    setCurrentFolder(folderId);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/drive/files?fileId=${fileId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      // Remove from state immediately
      setFiles(prev => prev.filter(f => f.id !== fileId));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // 1. Initiate Resumable Upload
      const initiateRes = await fetch('/api/drive/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'initiate',
          name: file.name,
          type: file.type,
          size: file.size,
          parentId: currentFolder !== 'root' ? currentFolder : undefined,
        }),
      });

      const initData = await initiateRes.json();

      if (!initiateRes.ok) {
        throw new Error(initData.error || 'Failed to initiate upload');
      }

      const uploadUrl = initData.uploadUrl;
      if (!uploadUrl) throw new Error('Failed to get upload URL');

      // 2. Upload Chunks
      const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
      let offset = 0;

      while (offset < file.size) {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const contentRange = `bytes ${offset}-${offset + chunk.size - 1}/${file.size}`;

        const chunkFormData = new FormData();
        chunkFormData.append('action', 'upload_chunk');
        chunkFormData.append('chunk', chunk, 'chunk');
        chunkFormData.append('uploadUrl', uploadUrl);
        chunkFormData.append('contentRange', contentRange);

        const chunkRes = await fetch('/api/drive/files', {
          method: 'POST',
          body: chunkFormData,
        });

        if (!chunkRes.ok) {
          const errText = await chunkRes.text();
          throw new Error(`Chunk upload failed: ${chunkRes.status} ${errText}`);
        }

        const chunkData = await chunkRes.json();

        if (chunkData.status === 308) {
          // Resume Incomplete, continue
          offset += chunk.size;
        } else if (chunkData.success && (chunkData.status === 200 || chunkData.status === 201)) {
          // Upload Complete
          break;
        } else {
          throw new Error('Unexpected upload status from proxy');
        }
      }

      await fetchFiles(currentFolder); // Refresh list
    } catch (err) {
      console.error(err);
      alert('Failed to upload file. Check console for details.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return '-';
    const num = parseInt(bytes, 10);
    if (num < 1024) return num + ' B';
    if (num < 1024 * 1024) return (num / 1024).toFixed(1) + ' KB';
    return (num / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') return <Folder className="text-yellow-500" />;
    if (mimeType.includes('image')) return <ImageIcon className="text-purple-400" />;
    return <FileText className="text-blue-400" />;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-neutral-950 p-6 flex items-center justify-center text-slate-400">
        Please sign in to access Drive.
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 p-6 font-sans text-slate-200">
      <Header />
      <div className="max-w-7xl mx-auto space-y-8 pt-20">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-3xl font-extrabold text-transparent">
                My Drive Explorer
              </h1>
              <p className="mt-2 text-slate-400">Access your Google Drive files directly.</p>
            </div>

            <div className="flex gap-2">
              <input className="hidden" onChange={handleUpload} ref={fileInputRef} type="file" />
              <button
                className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload File
              </button>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-800">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                <button
                  className={`text-sm hover:text-white transition-colors ${
                    index === breadcrumbs.length - 1 ? 'text-white font-bold' : 'text-slate-400'
                  }`}
                  onClick={() => handleBreadcrumbClick(crumb.id, index)}>
                  {crumb.name}
                </button>
                {index < breadcrumbs.length - 1 && <span className="text-slate-600">/</span>}
              </React.Fragment>
            ))}
          </div>
        </header>

        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Authentication Error</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map(file => {
              const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
              return (
                <div
                  className={`bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-indigo-500/50 transition-all group relative ${
                    isFolder ? 'cursor-pointer hover:bg-neutral-800' : ''
                  }`}
                  key={file.id}
                  onClick={() => isFolder && handleFolderClick(file.id, file.name)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-neutral-800 rounded-lg group-hover:bg-neutral-700 transition-colors">
                      {getIcon(file.mimeType)}
                    </div>
                    {!isFolder && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          className="p-1.5 hover:bg-neutral-700 rounded-md text-slate-400 hover:text-white"
                          href={file.webViewLink}
                          onClick={e => e.stopPropagation()}
                          rel="noopener noreferrer"
                          target="_blank"
                          title="View in Drive">
                          <Eye className="w-4 h-4" />
                        </a>
                        {file.webContentLink && (
                          <a
                            className="p-1.5 hover:bg-neutral-700 rounded-md text-slate-400 hover:text-white"
                            href={file.webContentLink}
                            onClick={e => e.stopPropagation()}
                            title="Download">
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          className="p-1.5 hover:bg-red-900/50 rounded-md text-slate-400 hover:text-red-400"
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(file.id);
                          }}
                          title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 className="text-slate-200 font-medium truncate mb-1" title={file.name}>
                    {file.name}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{formatSize(file.size)}</span>
                    <span>{new Date(file.createdTime).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
            {files.length === 0 && !error && (
              <div className="col-span-full py-20 text-center text-slate-500">
                <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No files found in this folder.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
