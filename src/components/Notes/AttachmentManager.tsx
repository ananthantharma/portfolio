/* eslint-disable react/jsx-sort-props */
'use client';
import {PaperClipIcon, TrashIcon, ArrowDownTrayIcon, CloudArrowUpIcon, ChevronUpIcon} from '@heroicons/react/24/outline';

import React, {useCallback, useEffect, useState} from 'react';

interface Attachment {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
  id_?: string;
  storageType?: 'local' | 'drive' | 'blob';
  webViewLink?: string;
  fileId?: string;
}

interface AttachmentManagerProps {
  pageId: string;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const AttachmentManager: React.FC<AttachmentManagerProps> = React.memo(({pageId}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageType, setStorageType] = useState<'local' | 'drive' | 'blob'>('local');
  // Folded by default so the editor gets the room: phones always, larger screens until the note has files.
  // null = that automatic behaviour; true/false once you open or close it yourself.
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const hasFiles = attachments.length > 0;
  const bodyClass = userOpen === null ? (hasFiles ? 'hidden sm:block' : 'hidden') : userOpen ? '' : 'hidden';
  const storageClass = userOpen === null ? (hasFiles ? 'hidden sm:flex' : 'hidden') : userOpen ? 'flex' : 'hidden';
  const headGap = userOpen === null ? (hasFiles ? 'sm:mb-3' : '') : userOpen ? 'mb-3' : '';
  const toggleOpen = () =>
    setUserOpen(prev => {
      const shown = prev ?? (hasFiles && typeof window !== 'undefined' && window.innerWidth >= 640);
      return !shown;
    });

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/notes/pages/${pageId}/attachments`);
      const data = await res.json();
      if (data.success) {
        setAttachments(data.data);
      }
    } catch (err) {
      console.error('Failed to load attachments', err);
    }
  }, [pageId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processUpload = useCallback(
    async (file: File) => {
      setError(null);

      // Local limit check
      if (storageType === 'local' && file.size > 15 * 1024 * 1024) {
        setError('File is too large for Local Storage (max 15MB). Use Drive or Blob Storage.');
        return;
      }

      setIsUploading(true);
      // Show the list so the new file is visible once it lands
      setUserOpen(true);

      try {
        if (storageType === 'drive') {
          // --- DRIVE UPLOAD FLOW ---

          // 1. Initiate
          const initRes = await fetch('/api/drive/files', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              action: 'initiate',
              name: file.name,
              type: file.type,
              folderName: 'Portfolio Page Attachments', // Separate folder
              size: file.size,
            }),
          });

          const initData = await initRes.json();
          if (!initRes.ok) throw new Error(initData.error || 'Failed to initiate Drive upload');

          const uploadUrl = initData.uploadUrl;
          if (!uploadUrl) throw new Error('No upload URL received');

          // 2. Chunked Proxy Upload
          const CHUNK_SIZE = 2 * 1024 * 1024;
          let offset = 0;
          let driveFileMetadata = null;

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
              offset += chunk.size;
            } else if (chunkData.success && (chunkData.status === 200 || chunkData.status === 201)) {
              driveFileMetadata = chunkData.file;
              break;
            } else {
              throw new Error('Unexpected upload status');
            }
          }

          if (!driveFileMetadata) throw new Error('Upload completed but no metadata returned');

          // 3. Save Metadata to DB
          const metaFormData = new FormData();
          metaFormData.append('pageId', pageId);
          metaFormData.append('storageType', 'drive');
          metaFormData.append('filename', driveFileMetadata.name);
          metaFormData.append('contentType', driveFileMetadata.mimeType || file.type);
          metaFormData.append('size', file.size.toString());
          metaFormData.append('fileId', driveFileMetadata.id);
          metaFormData.append('webViewLink', driveFileMetadata.webViewLink);

          const saveRes = await fetch('/api/attachments', {
            method: 'POST',
            body: metaFormData,
          });
          const saveData = await saveRes.json();

          if (saveRes.ok) {
            setAttachments(prev => [saveData.data, ...prev]);
          } else {
            setError(saveData.error || 'Failed to save attachment metadata');
          }
        } else if (storageType === 'blob') {
          // --- BLOB UPLOAD FLOW ---
          const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: file,
          });

          if (!response.ok) {
            let errMsg = response.statusText;
            try {
              const errData = await response.json();
              if (errData.error) errMsg = errData.error;
            } catch (e) {
              try {
                const errText = await response.text();
                if (errText) errMsg = errText;
              } catch (e2) {}
            }
            throw new Error(`Upload failed: ${errMsg}`);
          }

          const newBlob = await response.json();

          const metaFormData = new FormData();
          metaFormData.append('pageId', pageId);
          metaFormData.append('storageType', 'blob');
          metaFormData.append('filename', file.name);
          metaFormData.append('contentType', file.type);
          metaFormData.append('size', file.size.toString());
          metaFormData.append('webViewLink', newBlob.url);
          // fileId is optional/not needed for blob

          const saveRes = await fetch('/api/attachments', {
            method: 'POST',
            body: metaFormData,
          });
          const saveData = await saveRes.json();

          if (saveRes.ok) {
            setAttachments(prev => [saveData.data, ...prev]);
          } else {
            setError(saveData.error || 'Failed to save attachment metadata');
          }
        } else {
          // --- LOCAL UPLOAD FLOW ---
          const formData = new FormData();
          formData.append('file', file);
          formData.append('pageId', pageId);

          const res = await fetch('/api/attachments', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();

          if (res.ok) {
            setAttachments(prev => [data.data, ...prev]);
          } else {
            setError(data.error || 'Upload failed');
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message || 'Error uploading file');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    },
    [pageId, storageType],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

      const file = e.dataTransfer.files[0];
      await processUpload(file);
    },
    [processUpload],
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processUpload(e.target.files[0]);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      const res = await fetch(`/api/attachments/${id}`, {method: 'DELETE'});
      if (res.ok) {
        setAttachments(prev => prev.filter(a => a._id !== id));
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div
      className={`border-t px-4 py-2 transition-colors ${
        isDragging ? 'border-[#9fb592] bg-[#eef3e8]' : 'border-[#e7e7df] bg-[#f8f7f3]'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}>
      <div className={`flex items-center justify-between gap-2 ${headGap}`}>
        <button
          aria-expanded={userOpen ?? hasFiles}
          className="-ml-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] font-semibold text-[#50574b] transition-colors hover:bg-black/[0.04]"
          onClick={toggleOpen}
          title={(userOpen ?? hasFiles) ? 'Hide attachments' : 'Show attachments'}
          type="button">
          <PaperClipIcon className="h-4 w-4" />
          Attachments
          {attachments.length > 0 && (
            <span className="rounded-full bg-[#e0e7d9] px-1.5 text-[11px] font-semibold text-[#365238]">{attachments.length}</span>
          )}
          {!hasFiles && <span className="text-[12px] font-normal text-[#8a8e81]">None yet</span>}
          <ChevronUpIcon
            className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
              userOpen === null ? (hasFiles ? 'rotate-180 sm:rotate-0' : 'rotate-180') : userOpen ? '' : 'rotate-180'
            }`}
          />
        </button>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className={`bg-black/[0.06] p-0.5 rounded-lg ${storageClass}`}>
            {(['local', 'drive', 'blob'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setStorageType(type)}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                  storageType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {type === 'local' ? 'Local' : type === 'drive' ? 'Drive' : 'Blob'}
              </button>
            ))}
          </div>

          <label
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-[#cfdacb] bg-white px-3 py-1.5 text-xs font-semibold text-[#405b43] transition-colors hover:border-[#9fb592] hover:bg-[#f1f4eb] focus-within:ring-2 focus-within:ring-[#47735d] ${
              isUploading ? 'opacity-50 pointer-events-none' : ''
            }`}>
            <PaperClipIcon className="h-3.5 w-3.5" />
            {isUploading ? 'Uploading…' : 'Add file'}
            <input type="file" className="sr-only" onChange={handleUpload} disabled={isUploading} />
          </label>
        </div>
      </div>

      {isDragging && (
        <div className="my-2 rounded-lg border-2 border-dashed border-[#9fb592] bg-[#eef3e8] p-4 text-center text-sm text-[#405b43]">
          Drop files here to upload
        </div>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 text-xs text-red-600 bg-red-50 rounded border border-red-100">{error}</div>
      )}

      <div className={`${bodyClass} max-h-[30vh] overflow-y-auto pb-1.5`}>
      {attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#d8decc] py-4 text-center text-xs text-[#8a8e81]">
          No files yet. Drop a file here or choose “Add file”.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map(file => {
            const isDrive = file.storageType === 'drive';
            const link = isDrive || file.storageType === 'blob' ? file.webViewLink : `/api/attachments/${file._id}`;

            return (
              <div
                key={file._id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm group hover:border-[#9fb592] transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded flex items-center justify-center font-bold text-xs uppercase ${
                      isDrive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {isDrive ? <CloudArrowUpIcon className="h-5 w-5" /> : file.filename.split('.').pop() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate" title={file.filename}>
                      {file.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-1.5 rounded transition-colors ${
                      isDrive
                        ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-50'
                        : 'text-gray-400 hover:text-[#405b43] hover:bg-[#eef3e8]'
                    }`}
                    title={isDrive ? 'Open in Drive' : 'Download'}>
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(file._id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
});
