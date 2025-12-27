/* eslint-disable simple-import-sort/imports */
/* eslint-disable react/jsx-sort-props */
import { PaperClipIcon, TrashIcon, ArrowDownTrayIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';
import React, { useCallback, useEffect, useState } from 'react';

interface Attachment {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
  storageType?: 'local' | 'drive';
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

export const AttachmentManager: React.FC<AttachmentManagerProps> = React.memo(({ pageId }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useDriveStorage, setUseDriveStorage] = useState(false);

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
      if (!useDriveStorage && file.size > 15 * 1024 * 1024) {
        setError('File is too large for Local Storage (max 15MB). Use Drive Storage.');
        return;
      }

      setIsUploading(true);

      try {
        if (useDriveStorage) {
          // --- DRIVE UPLOAD FLOW ---

          // 1. Initiate
          const initRes = await fetch('/api/drive/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'initiate',
              name: file.name,
              type: file.type,
              folderName: 'Portfolio Page Attachments', // Separate folder
              size: file.size
            })
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
              body: chunkFormData
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
            body: metaFormData
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
    [pageId, useDriveStorage],
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
      const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
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
      className={`border-t border-gray-200 p-4 transition-colors ${isDragging ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'
        }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <PaperClipIcon className="h-4 w-4" />
          Attachments
        </h3>

        <div className="flex items-center gap-4">
          {/* Drive Toggle */}
          <Switch.Group>
            <div className="flex items-center">
              <Switch.Label className={`mr-2 text-xs font-medium ${useDriveStorage ? 'text-indigo-600' : 'text-gray-500'}`}>
                {useDriveStorage ? 'Save to Drive' : 'Local Storage'}
              </Switch.Label>
              <Switch
                checked={useDriveStorage}
                onChange={setUseDriveStorage}
                className={`${useDriveStorage ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              >
                <span
                  className={`${useDriveStorage ? 'translate-x-5' : 'translate-x-1'
                    } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
          </Switch.Group>

          <label
            className={`cursor-pointer inline-flex items-center px-3 py-1.5 border border-indigo-600 shadow-sm text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''
              }`}>
            {isUploading ? 'Uploading...' : 'Add File'}
            <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
          </label>
        </div>
      </div>

      {isDragging && (
        <div className="mb-4 p-4 border-2 border-dashed border-indigo-400 rounded-lg bg-indigo-50 text-center text-indigo-600 animate-pulse">
          Drop files here to upload
        </div>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 text-xs text-red-600 bg-red-50 rounded border border-red-100">{error}</div>
      )}

      {attachments.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400">
          No files attached
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map(file => {
            const isDrive = file.storageType === 'drive';
            const link = isDrive
              ? file.webViewLink
              : `/api/attachments/${file._id}`;

            return (
              <div
                key={file._id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm group hover:border-indigo-300 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`flex-shrink-0 h-8 w-8 rounded flex items-center justify-center font-bold text-xs uppercase ${isDrive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {isDrive ? <CloudArrowUpIcon className="h-5 w-5" /> : (file.filename.split('.').pop() || '?')}
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
                    className={`p-1.5 rounded transition-colors ${isDrive ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                    title={isDrive ? "Open in Drive" : "Download"}>
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
  );
});
