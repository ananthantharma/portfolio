'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Recipient {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  signed_at: string | null;
}

interface Field {
  id: string;
  document_id: string;
  recipient_id: string;
  type: string;
  page: number;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  value: string | null;
  inserted: boolean;
}

interface DocData {
  id: string;
  title: string;
  status: string;
  pdf_url: string;
  message: string;
  recipients: Recipient[];
  fields: Field[];
}

// Color palettes for recipient fields
const COLOR_PALETTE = [
  'rgba(99,102,241,0.15)', 'rgba(244,63,94,0.15)', 'rgba(34,197,94,0.15)',
  'rgba(251,146,60,0.15)', 'rgba(168,85,247,0.15)', 'rgba(6,182,212,0.15)',
];
const BORDER_PALETTE = [
  '#6366f1', '#f43f5e', '#22c55e', '#fb923c', '#a855f7', '#06b6d4',
];

function getRecipientColor(recipientId: string, recipients: Recipient[]) {
  const idx = recipients.findIndex(r => r.id === recipientId);
  return {
    bg: COLOR_PALETTE[idx % COLOR_PALETTE.length],
    border: BORDER_PALETTE[idx % BORDER_PALETTE.length],
  };
}

export default function DocumentEditor() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [doc, setDoc] = useState<DocData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRecipient, setActiveRecipient] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  // Recipient form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Dragging field
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({x: 0, y: 0});
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfPageRef = useRef<HTMLDivElement>(null);

  const fetchDoc = useCallback(async () => {
    try {
      const res = await fetch(`/api/signing/documents/${docId}`);
      const data = await res.json();
      if (data.success) {
        setDoc(data.data);
        if (data.data.recipients.length > 0 && !activeRecipient) {
          setActiveRecipient(data.data.recipients[0].id);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [docId, activeRecipient]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  // Add recipient
  const handleAddRecipient = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      const res = await fetch('/api/signing/recipients', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({document_id: docId, name: newName, email: newEmail}),
      });
      const data = await res.json();
      if (data.success) {
        setNewName('');
        setNewEmail('');
        fetchDoc();
      }
    } catch (error) {
      console.error('Error adding recipient:', error);
    }
  };

  const handleRemoveRecipient = async (id: string) => {
    try {
      await fetch(`/api/signing/recipients?id=${id}`, {method: 'DELETE'});
      fetchDoc();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Add field to PDF page
  const handleAddField = async (type: string) => {
    if (!activeRecipient) {
      alert('Please add and select a recipient first');
      return;
    }
    try {
      const res = await fetch('/api/signing/fields', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          document_id: docId,
          recipient_id: activeRecipient,
          type,
          page: currentPage,
          pos_x: 100,
          pos_y: 300,
          width: type === 'DATE' ? 150 : type === 'TEXT' ? 180 : 200,
          height: type === 'DATE' ? 30 : type === 'TEXT' ? 30 : 60,
        }),
      });
      const data = await res.json();
      if (data.success) fetchDoc();
    } catch (error) {
      console.error('Error adding field:', error);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      await fetch(`/api/signing/fields?id=${fieldId}`, {method: 'DELETE'});
      fetchDoc();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Drag field handler
  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.target as HTMLElement).closest('[data-field]')?.getBoundingClientRect();
    if (!rect) return;
    setDragging(fieldId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !pdfPageRef.current) return;
    const pageRect = pdfPageRef.current.getBoundingClientRect();
    const newX = e.clientX - pageRect.left - dragOffset.x;
    const newY = e.clientY - pageRect.top - dragOffset.y;

    // Update field position locally for smooth dragging
    setDoc(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(f =>
          f.id === dragging ? {...f, pos_x: Math.max(0, newX), pos_y: Math.max(0, newY)} : f
        ),
      };
    });
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(async () => {
    if (!dragging || !doc) {
      setDragging(null);
      return;
    }
    const draggedField = doc.fields.find(f => f.id === dragging);
    if (draggedField) {
      // Persist position
      await fetch('/api/signing/fields', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: draggedField.id, pos_x: draggedField.pos_x, pos_y: draggedField.pos_y}),
      });
    }
    setDragging(null);
  }, [dragging, doc]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Send document
  const handleSend = async () => {
    if (!doc) return;
    if (doc.recipients.length === 0) {
      alert('Add at least one recipient before sending');
      return;
    }
    if (doc.fields.length === 0) {
      alert('Place at least one signature field before sending');
      return;
    }

    setSending(true);
    try {
      // Save message first
      if (message) {
        await fetch(`/api/signing/documents/${docId}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({message}),
        });
      }

      const res = await fetch('/api/signing/send', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({document_id: docId}),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Document sent to ${data.data.length} recipient(s)!`);
        fetchDoc();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Document not found</p>
      </div>
    );
  }

  const isDraft = doc.status === 'DRAFT';
  const pageFields = doc.fields.filter(f => f.page === currentPage);

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/signing')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-900">{doc.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                doc.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' :
                doc.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                doc.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}>{doc.status}</span>
              <span className="text-[11px] text-gray-400">
                {doc.recipients.length} recipients • {doc.fields.length} fields
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDraft && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-60">
              {sending ? 'Sending...' : 'Send for Signing'}
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — Recipients & Fields */}
        <div className="w-80 bg-white border-r border-gray-100 flex flex-col overflow-y-auto">
          {/* Recipients */}
          <div className="p-4 border-b border-gray-50">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Recipients</h3>
            
            <div className="space-y-2 mb-3">
              {doc.recipients.map((r, i) => {
                const color = BORDER_PALETTE[i % BORDER_PALETTE.length];
                return (
                  <div
                    key={r.id}
                    onClick={() => setActiveRecipient(r.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                      activeRecipient === r.id
                        ? 'bg-indigo-50 ring-1 ring-indigo-200'
                        : 'hover:bg-gray-50'
                    }`}>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{backgroundColor: color}}>
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{r.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{r.email}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        r.status === 'SIGNED' ? 'bg-emerald-50 text-emerald-600' :
                        r.status === 'VIEWED' ? 'bg-blue-50 text-blue-600' :
                        r.status === 'SENT' ? 'bg-amber-50 text-amber-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {r.status === 'NOT_SENT' ? 'DRAFT' : r.status}
                      </span>
                      {isDraft && (
                        <button
                          onClick={e => { e.stopPropagation(); handleRemoveRecipient(r.id); }}
                          className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isDraft && (
              <div className="space-y-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
                <div className="flex gap-2">
                  <input
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="Email"
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddRecipient(); }}
                  />
                  <button
                    onClick={handleAddRecipient}
                    className="px-3 py-2 bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-600 transition-colors">
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Field tools */}
          {isDraft && (
            <div className="p-4 border-b border-gray-50">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Place Fields</h3>
              <p className="text-[10px] text-gray-400 mb-3">
                Select a recipient above, then click to add fields
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {type: 'SIGNATURE', label: 'Signature', icon: '✍️'},
                  {type: 'DATE', label: 'Date', icon: '📅'},
                  {type: 'TEXT', label: 'Text', icon: '📝'},
                  {type: 'INITIALS', label: 'Initials', icon: '🅰️'},
                ].map(({type, label, icon}) => (
                  <button
                    key={type}
                    onClick={() => handleAddField(type)}
                    disabled={!activeRecipient}
                    className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl text-xs font-medium text-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <span className="text-base">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          {isDraft && (
            <div className="p-4">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Message to Recipients</h3>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Optional message to include in the signing email..."
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none h-24"
              />
            </div>
          )}

          {/* Fields list */}
          <div className="p-4 flex-1">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              Placed Fields ({doc.fields.length})
            </h3>
            <div className="space-y-1.5">
              {doc.fields.map(f => {
                const recipient = doc.recipients.find(r => r.id === f.recipient_id);
                const colors = getRecipientColor(f.recipient_id, doc.recipients);
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    style={{borderLeft: `3px solid ${colors.border}`}}>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-gray-700">
                        {f.type} — Page {f.page}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {recipient?.name || 'Unknown'}
                      </p>
                    </div>
                    {isDraft && (
                      <button
                        onClick={() => handleDeleteField(f.id)}
                        className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-100 flex flex-col">
          {/* Page nav */}
          <div className="flex items-center justify-center gap-3 py-2 bg-white border-b border-gray-100">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-xs font-medium text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* PDF Display */}
          <div className="flex-1 overflow-auto p-8 flex justify-center" ref={pdfContainerRef}>
            <div className="relative bg-white shadow-xl rounded-lg" style={{width: 816, minHeight: 1056}} ref={pdfPageRef}>
              {/* PDF rendered as iframe for simplicity (react-pdf can be swapped in) */}
              <iframe
                src={`${doc.pdf_url}#page=${currentPage}`}
                className="w-full h-full absolute inset-0 rounded-lg"
                style={{minHeight: 1056}}
                onLoad={() => {
                  // Try to detect page count (limited in iframe mode)
                  setTotalPages(Math.max(totalPages, currentPage));
                }}
              />

              {/* Overlay fields on top of PDF */}
              {pageFields.map(field => {
                const colors = getRecipientColor(field.recipient_id, doc.recipients);
                const recipient = doc.recipients.find(r => r.id === field.recipient_id);

                return (
                  <div
                    key={field.id}
                    data-field={field.id}
                    className={`absolute flex items-center justify-center rounded-lg border-2 transition-shadow ${
                      dragging === field.id ? 'shadow-lg z-50 opacity-80' : 'shadow-sm hover:shadow-md'
                    } ${isDraft ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                    style={{
                      left: field.pos_x,
                      top: field.pos_y,
                      width: field.width,
                      height: field.height,
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      borderStyle: field.value ? 'solid' : 'dashed',
                    }}
                    onMouseDown={isDraft ? e => handleFieldMouseDown(e, field.id) : undefined}>
                    {field.value ? (
                      <img src={field.value} alt="signature" className="max-w-full max-h-full object-contain p-1" />
                    ) : (
                      <div className="text-center pointer-events-none select-none px-2">
                        <p className="text-[10px] font-bold" style={{color: colors.border}}>
                          {field.type}
                        </p>
                        <p className="text-[8px] text-gray-400 truncate">
                          {recipient?.name}
                        </p>
                      </div>
                    )}

                    {/* Delete button */}
                    {isDraft && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteField(field.id); }}
                        onMouseDown={e => e.stopPropagation()}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shadow-md"
                        style={{fontSize: 10}}>
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
