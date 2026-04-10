'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';

interface SigningDoc {
  id: string;
  title: string;
  status: string;
  pdf_url: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  recipient_count: number;
  signed_count: number;
  field_count: number;
}

const STATUS_STYLES: Record<string, {bg: string; text: string; dot: string; label: string}> = {
  DRAFT: {bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Draft'},
  PENDING: {bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Pending'},
  COMPLETED: {bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Completed'},
  EXPIRED: {bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Expired'},
};

export default function SigningDashboard() {
  const router = useRouter();
  const [docs, setDocs] = useState<SigningDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrated, setMigrated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/signing/documents');
      const data = await res.json();
      if (data.success) {
        setDocs(data.data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const runMigration = useCallback(async () => {
    try {
      const res = await fetch('/api/signing/migrate', {method: 'POST'});
      const data = await res.json();
      if (data.success) {
        setMigrated(true);
        fetchDocs();
      } else {
        console.error('Migration failed:', data.error);
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }, [fetchDocs]);

  useEffect(() => {
    // Auto-migrate on first load, then fetch docs
    runMigration();
  }, [runMigration]);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', file.name.replace('.pdf', ''));
      formData.append('file', file);

      const res = await fetch('/api/signing/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/signing/${data.data.id}`);
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await fetch(`/api/signing/documents/${id}`, {method: 'DELETE'});
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const filteredDocs = filterStatus === 'ALL' ? docs : docs.filter(d => d.status === filterStatus);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-black text-lg">S</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SignDocs</h1>
            <p className="text-sm text-gray-500">Upload, sign, and send documents</p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative mb-8 rounded-2xl border-2 border-dashed transition-all duration-300 ${
          dragActive
            ? 'border-indigo-400 bg-indigo-50/50 scale-[1.01]'
            : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/20'
        }`}
        onDragEnter={e => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={e => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}>
        <input
          type="file"
          accept=".pdf"
          className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${
            dragActive ? 'pointer-events-none' : ''
          }`}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <div className="flex flex-col items-center justify-center py-12 pointer-events-none">
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium text-indigo-600">Uploading document...</p>
            </>
          ) : (
            <>
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                  dragActive ? 'bg-indigo-500 scale-110' : 'bg-gray-100'
                }`}>
                <svg
                  className={`w-7 h-7 ${dragActive ? 'text-white' : 'text-gray-400'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {dragActive ? 'Drop your PDF here' : 'Upload a document to get started'}
              </p>
              <p className="text-xs text-gray-400">Drag and drop a PDF file, or click to browse</p>
            </>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100/70 p-1 rounded-xl w-fit">
        {['ALL', 'DRAFT', 'PENDING', 'COMPLETED'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterStatus === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {status === 'ALL' ? 'All' : STATUS_STYLES[status]?.label || status}
            {status === 'ALL' && <span className="ml-1.5 text-gray-400">{docs.length}</span>}
          </button>
        ))}
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500 font-medium">No documents yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload a PDF to start collecting signatures</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredDocs.map(doc => {
            const status = STATUS_STYLES[doc.status] || STATUS_STYLES.DRAFT;
            const progress =
              doc.recipient_count > 0 ? (Number(doc.signed_count) / Number(doc.recipient_count)) * 100 : 0;

            return (
              <div
                key={doc.id}
                onClick={() => router.push(`/signing/${doc.id}`)}
                className="group relative bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 p-5 cursor-pointer transition-all duration-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* PDF icon */}
                    <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                        <path d="M8 12h3v1.5H8zm0 3h5v1.5H8zm0 3h4v1.5H8z" />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${status.bg} ${status.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(doc.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        {doc.recipient_count > 0 && (
                          <span className="text-[11px] text-gray-400">
                            {doc.signed_count}/{doc.recipient_count} signed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Progress ring for pending docs */}
                    {doc.status === 'PENDING' && doc.recipient_count > 0 && (
                      <div className="relative w-9 h-9">
                        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth="3"
                            strokeDasharray={`${progress * 0.94} 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-indigo-600">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    )}

                    {/* Delete */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Migration status (dev only) */}
      {!migrated && !loading && (
        <div className="fixed bottom-4 right-4 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2 rounded-lg shadow-lg">
          Setting up database...
        </div>
      )}
    </div>
  );
}
