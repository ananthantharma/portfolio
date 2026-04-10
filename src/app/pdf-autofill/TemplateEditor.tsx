/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'date' | 'amount' | 'checkbox' | 'signature' | 'other';
  description: string;
  required: boolean;
  defaultValue: string; // used when AI can't find a match
  defaultValueMode?: 'text' | 'date'; // how to interpret defaultValue
  defaultValueDateOffset?: number; // days from today (0 = today), used when mode='date'
  defaultValueDatePart?: 'full' | 'D' | 'DD' | 'M' | 'MM' | 'MMM' | 'MMMM' | 'YY' | 'YYYY'; // which part of the date to output
  alwaysUseDefault?: boolean; // override AI value and always use default
  page: number;
  x: number; // 0–1 fraction of page width
  y: number; // 0–1 fraction of page height, from top
}

interface TemplateEditorProps {
  pdf: File;
  onClose: () => void;
  onSaved: (templateId: string, templateName: string, fields: TemplateField[]) => void;
}

const FIELD_COLORS: Record<string, string> = {
  text: 'bg-blue-500',
  date: 'bg-purple-500',
  amount: 'bg-emerald-500',
  checkbox: 'bg-amber-500',
  signature: 'bg-red-500',
  other: 'bg-gray-500',
};

const FIELD_TYPES = ['text', 'date', 'amount', 'checkbox', 'signature', 'other'] as const;

let _pdfjsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.min.js';
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';
      resolve(lib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return _pdfjsPromise;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TemplateEditor({pdf, onClose, onSaved}: TemplateEditorProps) {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [rendering, setRendering] = useState(true);

  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingPage = useRef<number>(-1);

  const [templateName, setTemplateName] = useState(pdf.name.replace('.pdf', ''));
  const [templateDesc, setTemplateDesc] = useState('');
  const [assessing, setAssessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const selectedField = fields.find(f => f.id === selectedId) ?? null;

  // ── Render PDF pages ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRendering(true);
      try {
        const lib = await loadPdfJs();
        const arrayBuffer = await pdf.arrayBuffer();
        const doc = await lib.getDocument({data: new Uint8Array(arrayBuffer)}).promise;
        if (cancelled) return;

        const images: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({scale: 1.4});
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({canvasContext: canvas.getContext('2d')!, viewport}).promise;
          images.push(canvas.toDataURL('image/jpeg', 0.88));
        }
        if (!cancelled) {
          setPageImages(images);
          setPageCount(doc.numPages);
        }
      } catch (e) {
        if (!cancelled) setError('Failed to render PDF: ' + (e as Error).message);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf]);

  // ── Assess form with AI ─────────────────────────────────────────────────────

  const assessForm = useCallback(async () => {
    setAssessing(true);
    setError(null);
    setStatus('AI is analyzing the form…');
    try {
      const form = new FormData();
      form.append('pdf', pdf);
      const res = await fetch('/api/pdf-autofill/analyze-form', {method: 'POST', body: form});
      if (!res.ok) throw new Error((await res.json()).error);
      const {fields: detectedFields} = await res.json();

      setFields(
        (detectedFields || []).map((f: any) => ({
          id: uid(),
          name: f.name || 'field_' + uid(),
          label: f.label || f.name || 'Unnamed Field',
          type: f.type || 'text',
          description: f.description || '',
          required: f.required ?? false,
          defaultValue: f.defaultValue || '',
          page: f.page ?? 0,
          x: typeof f.x === 'number' ? f.x : 0.1,
          y: typeof f.y === 'number' ? f.y : 0.1,
        })),
      );
      setStatus('');
    } catch (e) {
      setError((e as Error).message);
      setStatus('');
    } finally {
      setAssessing(false);
    }
  }, [pdf]);

  // ── Field drag ──────────────────────────────────────────────────────────────

  const handleMarkerMouseDown = useCallback((e: React.MouseEvent, fieldId: string, pageIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingId(fieldId);
    draggingPage.current = pageIndex;
    setSelectedId(fieldId);
  }, []);

  const handlePageMouseMove = useCallback(
    (e: React.MouseEvent, pageIndex: number) => {
      if (!draggingId || draggingPage.current !== pageIndex) return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0.01, Math.min(0.99, (e.clientY - rect.top) / rect.height));
      setFields(prev => prev.map(f => (f.id === draggingId ? {...f, x, y, page: pageIndex} : f)));
    },
    [draggingId],
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
    draggingPage.current = -1;
  }, []);

  // ── Add field by clicking on page ───────────────────────────────────────────

  const handlePageClick = useCallback(
    (e: React.MouseEvent, pageIndex: number) => {
      if (draggingId) return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const newField: TemplateField = {
        id: uid(),
        name: 'field_' + uid(),
        label: 'New Field',
        type: 'text',
        description: '',
        required: false,
        defaultValue: '',
        page: pageIndex,
        x: Math.max(0.01, Math.min(0.99, x)),
        y: Math.max(0.01, Math.min(0.99, y)),
      };
      setFields(prev => [...prev, newField]);
      setSelectedId(newField.id);
    },
    [draggingId],
  );

  // ── Field editor helpers ────────────────────────────────────────────────────

  const updateField = useCallback((id: string, patch: Partial<TemplateField>) => {
    setFields(prev => prev.map(f => (f.id === id ? {...f, ...patch} : f)));
  }, []);

  const deleteField = useCallback((id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    setSelectedId(null);
  }, []);

  // ── Save template ───────────────────────────────────────────────────────────

  const saveTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Convert PDF file to base64
      const arrayBuffer = await pdf.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), ''));

      const res = await fetch('/api/pdf-autofill/templates', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDesc.trim(),
          fileName: pdf.name,
          pdfBase64: base64,
          pageCount,
          fields,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      const {template} = await res.json();
      onSaved(template._id, template.name, fields);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [templateName, templateDesc, pdf, pageCount, fields, onSaved]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}>
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-700 px-5 py-3 flex items-center gap-4">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
          ← Back
        </button>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="text-gray-400 text-sm flex-shrink-0">Template Name:</span>
          <input
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500 w-64"
            placeholder="e.g. OREA Form 100"
          />
          <input
            value={templateDesc}
            onChange={e => setTemplateDesc(e.target.value)}
            className="bg-gray-800 text-gray-300 text-sm px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500 flex-1 min-w-0"
            placeholder="Description (optional)"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={assessForm}
            disabled={assessing || rendering}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1.5">
            {assessing ? (
              <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              '⚡'
            )}
            Assess Form
          </button>

          <button
            onClick={saveTemplate}
            disabled={saving || rendering}
            className="px-4 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-40 transition-colors flex items-center gap-1.5">
            {saving ? (
              <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              '💾'
            )}
            Save Template
          </button>
        </div>
      </header>

      {/* Status / Error */}
      {(status || error) && (
        <div
          className={`flex-shrink-0 px-5 py-2 text-sm ${
            error ? 'bg-red-900/50 text-red-300' : 'bg-blue-900/50 text-blue-300'
          }`}>
          {error ? `⚠ ${error}` : status}
        </div>
      )}

      {/* Instructions */}
      <div className="flex-shrink-0 bg-gray-900/60 border-b border-gray-700 px-5 py-1.5 text-xs text-gray-500 flex gap-6">
        <span>
          ⚡ Click <strong className="text-gray-400">Assess Form</strong> to auto-detect fields
        </span>
        <span>➕ Click anywhere on the PDF to add a field</span>
        <span>✋ Drag a field marker to reposition it</span>
        <span>✏️ Click a marker to edit its definition</span>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left: PDF canvas ── */}
        <div className="flex-1 overflow-y-auto bg-gray-800 p-4 flex flex-col items-center gap-4">
          {rendering ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Rendering PDF…</p>
            </div>
          ) : (
            pageImages.map((img, pageIdx) => (
              <div
                key={pageIdx}
                className="relative flex-shrink-0 shadow-2xl rounded overflow-hidden"
                style={{cursor: draggingId ? 'grabbing' : 'crosshair'}}
                onClick={e => handlePageClick(e, pageIdx)}
                onMouseMove={e => handlePageMouseMove(e, pageIdx)}>
                {/* Page image */}
                <img
                  src={img}
                  alt={`Page ${pageIdx + 1}`}
                  className="block max-w-[700px] w-full select-none"
                  draggable={false}
                />

                {/* Field markers for this page */}
                {fields
                  .filter(f => f.page === pageIdx)
                  .map(field => {
                    const color = FIELD_COLORS[field.type] || 'bg-gray-500';
                    const isSelected = field.id === selectedId;
                    return (
                      <div
                        key={field.id}
                        className="absolute flex items-center gap-1 group"
                        style={{
                          left: `${field.x * 100}%`,
                          top: `${field.y * 100}%`,
                          transform: 'translate(-6px, -6px)',
                          cursor: 'grab',
                          zIndex: isSelected ? 20 : 10,
                        }}
                        onMouseDown={e => handleMarkerMouseDown(e, field.id, pageIdx)}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedId(field.id);
                        }}>
                        {/* Pin dot */}
                        <div
                          className={`w-3 h-3 rounded-full border-2 border-white shadow-md flex-shrink-0 transition-transform ${color} ${
                            isSelected ? 'scale-150' : 'group-hover:scale-125'
                          }`}
                        />
                        {/* Label */}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded shadow text-white whitespace-nowrap pointer-events-none ${color} ${
                            isSelected ? 'ring-2 ring-white' : ''
                          }`}>
                          {field.label}
                        </span>
                      </div>
                    );
                  })}

                {/* Page number badge */}
                <div className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded pointer-events-none">
                  Page {pageIdx + 1}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Right: Field editor ── */}
        <aside className="w-80 flex-shrink-0 border-l border-gray-700 bg-gray-900 flex flex-col text-white overflow-hidden">
          {/* Selected field editor */}
          <div className="flex-shrink-0 border-b border-gray-700">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-gray-200">{selectedField ? 'Edit Field' : 'Select a Field'}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedField ? 'Edit its definition below' : 'Click a marker or add one from the PDF'}
              </p>
            </div>

            {selectedField ? (
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Label (human-readable)</label>
                  <input
                    value={selectedField.label}
                    onChange={e => updateField(selectedField.id, {label: e.target.value})}
                    className="w-full bg-gray-800 text-white text-sm px-2.5 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Internal name (camelCase)</label>
                  <input
                    value={selectedField.name}
                    onChange={e => updateField(selectedField.id, {name: e.target.value})}
                    className="w-full bg-gray-800 text-gray-300 text-sm px-2.5 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Type</label>
                  <select
                    value={selectedField.type}
                    onChange={e => updateField(selectedField.id, {type: e.target.value as any})}
                    className="w-full bg-gray-800 text-white text-sm px-2.5 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500">
                    {FIELD_TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Description</label>
                  <textarea
                    value={selectedField.description}
                    onChange={e => updateField(selectedField.id, {description: e.target.value})}
                    rows={2}
                    className="w-full bg-gray-800 text-gray-300 text-sm px-2.5 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1">Page (0-indexed)</label>
                    <input
                      type="number"
                      min={0}
                      max={pageCount - 1}
                      value={selectedField.page}
                      onChange={e => updateField(selectedField.id, {page: Number(e.target.value)})}
                      className="w-full bg-gray-800 text-white text-sm px-2.5 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="w-16">
                    <label className="text-xs text-gray-400 block mb-1">X (0–1)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={selectedField.x.toFixed(3)}
                      onChange={e => updateField(selectedField.id, {x: Number(e.target.value)})}
                      className="w-full bg-gray-800 text-white text-sm px-2 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="w-16">
                    <label className="text-xs text-gray-400 block mb-1">Y (0–1)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={selectedField.y.toFixed(3)}
                      onChange={e => updateField(selectedField.id, {y: Number(e.target.value)})}
                      className="w-full bg-gray-800 text-white text-sm px-2 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Default value
                    <span className="text-gray-600 ml-1">(used when AI can't find a match)</span>
                  </label>
                  {/* Mode toggle */}
                  <div className="flex mb-2 rounded overflow-hidden border border-gray-600">
                    {(['text', 'date'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          updateField(selectedField.id, {
                            defaultValueMode: mode,
                            defaultValue: '',
                            defaultValueDateOffset: 0,
                            defaultValueDatePart: 'full',
                          })
                        }
                        className={`flex-1 py-1 text-xs font-medium transition-colors ${
                          (selectedField.defaultValueMode ?? 'text') === mode
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}>
                        {mode === 'text' ? 'Text' : 'Date'}
                      </button>
                    ))}
                  </div>

                  {(selectedField.defaultValueMode ?? 'text') === 'text' ? (
                    <input
                      value={selectedField.defaultValue}
                      onChange={e => updateField(selectedField.id, {defaultValue: e.target.value})}
                      placeholder="e.g. Canada, USD, N/A …"
                      className="w-full bg-gray-800 text-gray-300 text-sm px-2.5 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <div className="space-y-2">
                      {/* Offset */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 flex-shrink-0">Today +</span>
                        <input
                          type="number"
                          min={0}
                          value={selectedField.defaultValueDateOffset ?? 0}
                          onChange={e =>
                            updateField(selectedField.id, {defaultValueDateOffset: Math.max(0, Number(e.target.value))})
                          }
                          className="w-20 bg-gray-800 text-white text-sm px-2.5 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-xs text-gray-400">days</span>
                      </div>

                      {/* Part selector */}
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Output format</label>
                        <select
                          value={selectedField.defaultValueDatePart ?? 'full'}
                          onChange={e => updateField(selectedField.id, {defaultValueDatePart: e.target.value as any})}
                          className="w-full bg-gray-800 text-white text-sm px-2.5 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-purple-500">
                          <optgroup label="Full date">
                            <option value="full">Full — April 5, 2026</option>
                          </optgroup>
                          <optgroup label="Day">
                            <option value="D">D — 5 (no leading zero)</option>
                            <option value="DD">DD — 05 (with leading zero)</option>
                          </optgroup>
                          <optgroup label="Month">
                            <option value="M">M — 4 (no leading zero)</option>
                            <option value="MM">MM — 04 (with leading zero)</option>
                            <option value="MMM">MMM — Apr (abbreviated)</option>
                            <option value="MMMM">MMMM — April (full name)</option>
                          </optgroup>
                          <optgroup label="Year">
                            <option value="YY">YY — 26 (two digits)</option>
                            <option value="YYYY">YYYY — 2026 (four digits)</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Preview */}
                      <p className="text-xs text-gray-500">
                        Preview:{' '}
                        <span className="text-purple-400">
                          {(() => {
                            const d = new Date();
                            d.setDate(d.getDate() + (selectedField.defaultValueDateOffset ?? 0));
                            const part = selectedField.defaultValueDatePart ?? 'full';
                            if (part === 'D') return String(d.getDate());
                            if (part === 'DD') return String(d.getDate()).padStart(2, '0');
                            if (part === 'M') return String(d.getMonth() + 1);
                            if (part === 'MM') return String(d.getMonth() + 1).padStart(2, '0');
                            if (part === 'MMM') return d.toLocaleDateString('en-US', {month: 'short'});
                            if (part === 'MMMM') return d.toLocaleDateString('en-US', {month: 'long'});
                            if (part === 'YY') return String(d.getFullYear()).slice(-2);
                            if (part === 'YYYY') return String(d.getFullYear());
                            return d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
                          })()}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="always-default-check"
                    checked={selectedField.alwaysUseDefault ?? false}
                    onChange={e => updateField(selectedField.id, {alwaysUseDefault: e.target.checked})}
                    className="rounded accent-purple-500"
                  />
                  <label htmlFor="always-default-check" className="text-xs text-gray-300">
                    Always use default
                    <span className="text-gray-600 ml-1">(ignore AI value)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="req-check"
                    checked={selectedField.required}
                    onChange={e => updateField(selectedField.id, {required: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="req-check" className="text-xs text-gray-400">
                    Required field
                  </label>
                </div>

                <button
                  onClick={() => deleteField(selectedField.id)}
                  className="w-full py-1.5 text-xs text-red-400 border border-red-800 rounded hover:bg-red-900/40 transition-colors">
                  Delete Field
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-600 text-xs py-8">No field selected</div>
            )}
          </div>

          {/* All fields list */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">{fields.length} FIELDS</span>
              <button
                onClick={() => {
                  const newField: TemplateField = {
                    id: uid(),
                    name: 'field_' + uid(),
                    label: 'New Field',
                    type: 'text',
                    description: '',
                    required: false,
                    defaultValue: '',
                    page: 0,
                    x: 0.1,
                    y: 0.1,
                  };
                  setFields(prev => [...prev, newField]);
                  setSelectedId(newField.id);
                }}
                className="text-xs text-blue-400 hover:text-blue-300">
                + Add
              </button>
            </div>

            {fields.map(field => {
              const color = FIELD_COLORS[field.type] || 'bg-gray-500';
              const isSelected = field.id === selectedId;
              return (
                <div
                  key={field.id}
                  onClick={() => setSelectedId(field.id)}
                  className={`px-4 py-2.5 cursor-pointer border-b border-gray-800 flex items-center gap-2.5 hover:bg-gray-800 transition-colors ${
                    isSelected ? 'bg-gray-800 border-l-2 border-l-blue-500' : ''
                  }`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-200 truncate">{field.label}</p>
                    <p className="text-xs text-gray-500 truncate">
                      pg {field.page + 1} · {field.type}
                    </p>
                  </div>
                  {field.required && <span className="text-xs text-amber-500 flex-shrink-0">*</span>}
                </div>
              );
            })}

            {fields.length === 0 && (
              <div className="p-4 text-center text-gray-600 text-xs py-8">
                No fields yet. Click "Assess Form" or click on the PDF to add fields.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
