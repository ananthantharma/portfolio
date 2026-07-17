/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {Loader2, Mail, Paperclip, Sparkles, X} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {ExtractedTask, fileToEmailText, isSupportedEmailFile} from './emailParse';

interface EmailDropModalProps {
  initialFile?: File | null;
  onClose: () => void;
  onExtracted: (data: ExtractedTask) => void;
}

export default function EmailDropModal({initialFile, onClose, onExtracted}: EmailDropModalProps) {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [pastedText, setPastedText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoRunRef = useRef(false);

  const analyze = async (source: {file: File} | {text: string}) => {
    setBusy(true);
    setError(null);
    try {
      const emailText = 'file' in source ? await fileToEmailText(source.file) : source.text;
      if (!emailText.trim()) throw new Error('Nothing to analyze — that file/text looks empty.');
      const res = await fetch('/api/gemini/email-parser', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({emailText}),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) throw new Error(body?.error || `Request failed (${res.status})`);
      onExtracted(body.data as ExtractedTask);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze this email.');
    } finally {
      setBusy(false);
    }
  };

  // Auto-run once for a file dropped on the app before this modal opened.
  useEffect(() => {
    if (initialFile && !autoRunRef.current) {
      autoRunRef.current = true;
      analyze({file: initialFile});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    setFile(dropped);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-[235] flex items-start justify-center bg-slate-900/40 px-4 pt-[10vh] backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}>
      <div className="w-full max-w-lg animate-scale-in overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-sky-50 px-5 py-3.5 dark:border-slate-700 dark:from-indigo-500/10 dark:to-sky-500/10">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-sm">
            <Mail className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">Task from email</h2>
          <button
            className="ml-auto rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700"
            disabled={busy}
            onClick={onClose}
            title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {busy ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
                Reading {file?.name || 'the email'} and asking Gemini to pull out the task…
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-[12.5px] text-slate-500 dark:text-slate-400">
                Drag a message out of Outlook desktop and drop it here, or paste the email text below. Gemini
                (gemini-flash-latest) will turn it into a title, notes, priority, due date, and category.
              </p>

              <div
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                  dragOver ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-600'
                }`}
                onDragLeave={() => setDragOver(false)}
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDrop={handleDrop}>
                <Paperclip className="h-5 w-5 text-slate-300" />
                {file ? (
                  <p className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
                ) : (
                  <p className="text-[12px] text-slate-400">Drop a .msg or .eml file here</p>
                )}
                <button
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                  onClick={() => fileInputRef.current?.click()}>
                  Browse file…
                </button>
                <input
                  accept=".msg,.eml,.txt"
                  className="hidden"
                  onChange={e => {
                    const picked = e.target.files?.[0];
                    if (picked) {
                      if (!isSupportedEmailFile(picked)) {
                        setError('Unsupported file type — use .msg, .eml, or .txt.');
                        return;
                      }
                      setFile(picked);
                      setError(null);
                    }
                    e.target.value = '';
                  }}
                  ref={fileInputRef}
                  type="file"
                />
              </div>

              <div className="my-3 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-300">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" /> or paste text{' '}
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
              </div>

              <textarea
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-[12.5px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                onChange={e => setPastedText(e.target.value)}
                placeholder="Paste an email chain here…"
                rows={4}
                value={pastedText}
              />

              {error && <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="rounded-xl px-4 py-2 text-[12.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-2 text-[12.5px] font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-40"
                  disabled={!file && !pastedText.trim()}
                  onClick={() => (file ? analyze({file}) : analyze({text: pastedText}))}>
                  <Sparkles className="h-3.5 w-3.5" /> Analyze with AI
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
