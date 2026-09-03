/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {ClipboardPaste, ImageIcon, Loader2, Paperclip, Sparkles, X} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {api} from './api';
import {fileToEmailText, isSupportedEmailFile} from './emailParse';
import {attachmentFromPaste} from './pasteImage';
import {Task} from './types';

/** What the modal is seeded with when it opens (a drop, a page-level paste, or nothing). */
export interface CaptureSeed {
  /** An image, a .msg/.eml/.txt, or any file — the modal routes it by type. */
  file?: File | null;
  text?: string;
}

type PastedImage = {dataUrl: string; mimeType: string; name: string};

function base64Body(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

interface CaptureModalProps {
  seed?: CaptureSeed | null;
  onClose: () => void;
  onCreated: (task: Task) => void;
}

const IMAGE_RE = /^image\//;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function CaptureModal({seed, onClose, onCreated}: CaptureModalProps) {
  const seededEmailFile = seed?.file && !IMAGE_RE.test(seed.file.type) ? seed.file : null;
  const [text, setText] = useState(seed?.text || '');
  const [image, setImage] = useState<PastedImage | null>(null);
  const [file, setFile] = useState<File | null>(seededEmailFile);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoRanRef = useRef(false);

  const acceptFile = async (picked: File) => {
    setError(null);
    if (IMAGE_RE.test(picked.type)) {
      try {
        const dataUrl = await readFileAsDataUrl(picked);
        setImage({dataUrl, mimeType: picked.type, name: picked.name});
        setFile(null);
      } catch {
        setError('Could not read that image.');
      }
      return;
    }
    if (isSupportedEmailFile(picked)) {
      setFile(picked);
      setImage(null);
      return;
    }
    setError('Unsupported file — paste an image or drop a .msg / .eml / .txt.');
  };

  const run = async (src?: {text?: string; image?: PastedImage | null; file?: File | null}) => {
    const useFile = src ? src.file || null : file;
    const useImage = src ? src.image || null : image;
    const useText = (src ? src.text : text) || '';
    setBusy(true);
    setError(null);
    try {
      let payload: {text?: string; image?: {data: string; mimeType: string}};
      if (useFile) {
        const emailText = await fileToEmailText(useFile);
        if (!emailText.trim()) throw new Error('That file looks empty.');
        payload = {text: emailText};
      } else if (useImage) {
        payload = {
          image: {data: base64Body(useImage.dataUrl), mimeType: useImage.mimeType || 'image/png'},
          ...(useText.trim() ? {text: useText.trim()} : {}),
        };
      } else if (useText.trim()) {
        payload = {text: useText.trim()};
      } else {
        throw new Error('Paste an email, a screenshot, or some text first.');
      }

      const res = await fetch('/api/gemini/task-capture', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) throw new Error(body?.error || `Request failed (${res.status})`);

      const d = body.data as {
        title: string;
        notes: string;
        priority: Task['priority'];
        dueDate: string | null;
        category: string;
        subtasks: string[];
      };

      const created = await api.create({
        title: d.title,
        notes: d.notes || undefined,
        priority: d.priority || 'None',
        status: 'todo',
        aiGenerated: true,
        ...(d.category ? {category: d.category} : {}),
        ...(d.dueDate ? {dueDate: new Date(`${d.dueDate}T17:00:00`).toISOString()} : {}),
        subtasks: (d.subtasks || []).slice(0, 5).map(s => ({title: s, isCompleted: false})),
      });

      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the task.');
      setBusy(false);
    }
  };

  // Auto-run once when the modal is seeded (a drop or a page-level paste).
  useEffect(() => {
    if (autoRanRef.current) return;
    autoRanRef.current = true;
    const f = seed?.file || null;
    const t = seed?.text || '';
    if (f && IMAGE_RE.test(f.type || '')) {
      readFileAsDataUrl(f)
        .then(dataUrl => {
          const img: PastedImage = {dataUrl, mimeType: f.type || 'image/png', name: f.name || 'pasted.png'};
          setImage(img);
          run({image: img});
        })
        .catch(() => setError('Could not read that image.'));
    } else if (f) {
      run({file: f});
    } else if (t.trim()) {
      run({text: t});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const onPaste = async (e: React.ClipboardEvent) => {
    try {
      const att = await attachmentFromPaste(e);
      if (att) {
        e.preventDefault();
        setImage({dataUrl: att.data, mimeType: att.type, name: att.name});
        setFile(null);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image.');
    }
  };

  const canRun = !!(text.trim() || image || file);

  return (
    <div
      className="fixed inset-0 z-[235] flex items-start justify-center bg-slate-900/40 px-4 pt-[10vh] backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}
      onPaste={onPaste}>
      <div className="w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5 dark:border-slate-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/15 text-green-600 dark:text-green-300">
            <ClipboardPaste className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-white">Create task with AI</h2>
            <p className="text-[10.5px] text-slate-400">Paste an email chain, a screenshot, or notes — I&apos;ll write the task for Ananthan.</p>
          </div>
          <button
            className="ml-auto rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            disabled={busy}
            onClick={onClose}
            title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {busy ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-green-500" />
              <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
                Reading {file?.name || (image ? 'your screenshot' : 'what you pasted')} and drafting the task…
              </p>
            </div>
          ) : (
            <>
              {image ? (
                <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="Pasted" className="max-h-52 w-full object-contain bg-slate-50 dark:bg-slate-900" src={image.dataUrl} />
                  <button
                    className="absolute right-1.5 top-1.5 rounded-md bg-slate-900/60 p-1 text-white hover:bg-slate-900"
                    onClick={() => setImage(null)}
                    title="Remove image">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  className={`mb-3 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                    dragOver ? 'border-green-400 bg-green-50 dark:bg-green-500/10' : 'border-slate-200 dark:border-slate-600'
                  }`}
                  onDragLeave={() => setDragOver(false)}
                  onDragOver={e => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) acceptFile(dropped);
                  }}>
                  {file ? (
                    <>
                      <Paperclip className="h-4 w-4 text-slate-300" />
                      <p className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 text-slate-300" />
                      <p className="text-[11.5px] text-slate-400">
                        Paste a screenshot (Ctrl/⌘ V), or drop a .msg / .eml file
                      </p>
                    </>
                  )}
                  <button
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                    onClick={() => fileInputRef.current?.click()}>
                    Browse…
                  </button>
                  <input
                    accept=".msg,.eml,.txt,image/*"
                    className="hidden"
                    onChange={e => {
                      const picked = e.target.files?.[0];
                      if (picked) acceptFile(picked);
                      e.target.value = '';
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                </div>
              )}

              <textarea
                autoFocus
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-[12.5px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 focus:border-green-400 focus:bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                onChange={e => setText(e.target.value)}
                placeholder={image ? 'Add any extra context (optional)…' : 'Paste an email chain or notes here…'}
                rows={image ? 2 : 5}
                value={text}
              />

              {error && <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="rounded-xl px-4 py-2 text-[12.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-[12.5px] font-bold text-white shadow-sm shadow-green-600/20 transition-colors hover:bg-green-500 disabled:opacity-40"
                  disabled={!canRun}
                  onClick={() => run()}>
                  <Sparkles className="h-3.5 w-3.5" /> Create task
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
