/* eslint-disable simple-import-sort/imports */
/* eslint-disable react/jsx-sort-props */
import { PaperClipIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useState } from 'react';

interface Attachment {
    _id: string;
    filename: string;
    contentType: string;
    size: number;
    createdAt: string;
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

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        if (file.size > 15 * 1024 * 1024) {
            setError('File is too large (max 15MB)');
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('pageId', pageId);

        try {
            const res = await fetch('/api/attachments', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (res.ok) {
                setAttachments((prev) => [data.data, ...prev]);
                // Reset input
                e.target.value = '';
            } else {
                setError(data.error || 'Upload failed');
            }
        } catch (err) {
            setError('Error uploading file');
            console.error(err);
        } finally {
            setIsUploading(false);
        }
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
        <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <PaperClipIcon className="h-4 w-4" />
                    Attachments
                </h3>
                <div>
                    <label className={`cursor-pointer inline-flex items-center px-3 py-1.5 border border-indigo-600 shadow-sm text-xs font-medium rounded text-indigo-600 bg-white hover:bg-indigo-50 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {isUploading ? 'Uploading...' : 'Add File'}
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={isUploading}
                        />
                    </label>
                </div>
            </div>

            {error && (
                <div className="mb-3 px-3 py-2 text-xs text-red-600 bg-red-50 rounded border border-red-100">
                    {error}
                </div>
            )}

            {attachments.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400">
                    No files attached
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((file) => (
                        <div
                            key={file._id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm group hover:border-indigo-300 transition-colors"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="flex-shrink-0 h-8 w-8 bg-gray-100 rounded flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                                    {file.filename.split('.').pop() || '?'}
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
                                    href={`/api/attachments/${file._id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Download"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                </a>
                                <button
                                    onClick={() => handleDelete(file._id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
