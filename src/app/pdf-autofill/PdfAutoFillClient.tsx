/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, {useCallback, useState} from 'react';
import TemplateEditor from './TemplateEditor';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedFact {
  key: string;
  value: string;
  confidence: number;
  source?: string;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'amount' | 'checkbox' | 'signature' | 'other';
  description: string;
  required: boolean;
  defaultValue?: string;
  defaultValueMode?: 'text' | 'date';
  defaultValueDateOffset?: number;
  defaultValueDatePart?: 'full' | 'D' | 'DD' | 'M' | 'MM' | 'MMM' | 'MMMM' | 'YY' | 'YYYY';
  alwaysUseDefault?: boolean;
  // Flat PDF coordinates (fraction of page dimensions, y from top)
  page?: number;
  x?: number;
  y?: number;
}

function resolveFieldDefault(f: FormField): string {
  if (f.defaultValueMode === 'date') {
    const d = new Date();
    d.setDate(d.getDate() + (f.defaultValueDateOffset ?? 0));
    const part = f.defaultValueDatePart ?? 'full';
    if (part === 'D') return String(d.getDate());
    if (part === 'DD') return String(d.getDate()).padStart(2, '0');
    if (part === 'M') return String(d.getMonth() + 1);
    if (part === 'MM') return String(d.getMonth() + 1).padStart(2, '0');
    if (part === 'MMM') return d.toLocaleDateString('en-US', {month: 'short'});
    if (part === 'MMMM') return d.toLocaleDateString('en-US', {month: 'long'});
    if (part === 'YY') return String(d.getFullYear()).slice(-2);
    if (part === 'YYYY') return String(d.getFullYear());
    return d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
  }
  return f.defaultValue || '';
}

interface FieldMapping {
  fieldName: string;
  suggestedValue: string;
  confidence: number;
  explanation: string;
}

type Step = 'idle' | 'processing' | 'review';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceClass(c: number) {
  if (c >= 0.8)
    return {
      border: 'border-l-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700',
      input: 'border-emerald-200 focus:ring-emerald-400',
    };
  if (c >= 0.5)
    return {
      border: 'border-l-amber-500',
      badge: 'bg-amber-100 text-amber-700',
      input: 'border-amber-200 focus:ring-amber-400',
    };
  return {
    border: 'border-l-red-400',
    badge: 'bg-red-100 text-red-600',
    input: 'border-red-200 focus:ring-red-400 bg-red-50',
  };
}

const FILE_ACCEPT = '.pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg';

function fileIcon(name: string) {
  if (name.endsWith('.pdf')) return '📄';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return '📝';
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return '📊';
  return '🖼️';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Load pdfjs-dist from CDN at runtime so webpack never bundles it.
// This avoids the "Object.defineProperty called on non-object" ESM webpack crash.
let _pdfjsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    // Use the legacy (CJS-compatible) UMD build so it attaches to window.pdfjsLib
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

// ─── Component ────────────────────────────────────────────────────────────────

interface SavedTemplate {
  _id: string;
  name: string;
  description: string;
  fileName: string;
  pageCount: number;
  fields: FormField[];
  createdAt: string;
}

type SourceRole = 'general' | 'seller' | 'buyer';
interface SourceFile {
  file: File;
  role: SourceRole;
}

const ROLE_LABELS: Record<SourceRole, string> = {
  general: 'General',
  seller: 'Seller / Landlord',
  buyer: 'Buyer / Tenant',
};
const ROLE_COLORS: Record<SourceRole, string> = {
  general: 'bg-gray-100 text-gray-600 border-gray-300',
  seller: 'bg-blue-50 text-blue-700 border-blue-300',
  buyer: 'bg-amber-50 text-amber-700 border-amber-300',
};

export default function PdfAutoFillClient() {
  // Files
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [targetPdf, setTargetPdf] = useState<File | null>(null);
  const [targetPdfUrl, setTargetPdfUrl] = useState<string | null>(null);

  // Template state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null);

  // Pipeline state
  const [step, setStep] = useState<Step>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Data
  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isAcroForm, setIsAcroForm] = useState(false);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  // ─── Source files ────────────────────────────────────────────────────────

  const addSourceFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    setSourceFiles(prev => {
      const names = new Set(prev.map(s => s.file.name));
      return [...prev, ...arr.filter(f => !names.has(f.name)).map(f => ({file: f, role: 'general' as SourceRole}))];
    });
  }, []);

  const removeSource = useCallback((index: number) => {
    setSourceFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateSourceRole = useCallback((index: number, role: SourceRole) => {
    setSourceFiles(prev => prev.map((s, i) => (i === index ? {...s, role} : s)));
  }, []);

  // ─── Fetch templates list ─────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/pdf-autofill/templates');
      const {templates: list} = await res.json();
      setTemplates(list || []);
    } catch {}
    setLoadingTemplates(false);
  }, []);

  const loadTemplate = useCallback(
    async (templateId: string) => {
      try {
        const res = await fetch(`/api/pdf-autofill/templates/${templateId}`);
        const {template} = await res.json();

        // Decode base64 PDF → Blob → File
        const bytes = Uint8Array.from(atob(template.pdfBase64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], {type: 'application/pdf'});
        const file = new File([blob], template.fileName, {type: 'application/pdf'});

        if (targetPdfUrl) URL.revokeObjectURL(targetPdfUrl);
        setTargetPdf(file);
        setTargetPdfUrl(URL.createObjectURL(blob));
        setFormFields(template.fields || []);
        setActiveTemplateId(template._id);
        setActiveTemplateName(template.name);
        setStep('idle');
        setMappings([]);
        setFacts([]);
        setError(null);
        setShowTemplateSelector(false);
      } catch (e) {
        setError('Failed to load template: ' + (e as Error).message);
      }
    },
    [targetPdfUrl],
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      await fetch(`/api/pdf-autofill/templates/${templateId}`, {method: 'DELETE'});
      setTemplates(prev => prev.filter(t => t._id !== templateId));
      if (activeTemplateId === templateId) {
        setActiveTemplateId(null);
        setActiveTemplateName(null);
      }
    },
    [activeTemplateId],
  );

  // ─── Target PDF ──────────────────────────────────────────────────────────

  const setTargetPdfFile = useCallback(
    (file: File) => {
      if (targetPdfUrl) URL.revokeObjectURL(targetPdfUrl);
      setTargetPdf(file);
      setTargetPdfUrl(URL.createObjectURL(file));
      setStep('idle');
      setMappings([]);
      setFormFields([]);
      setFacts([]);
      setError(null);
      setActiveTemplateId(null);
      setActiveTemplateName(null);
    },
    [targetPdfUrl],
  );

  // ─── Auto-fill pipeline ──────────────────────────────────────────────────

  const runAutoFill = useCallback(async () => {
    if (!sourceFiles.length) {
      setError('Please upload at least one source document');
      return;
    }
    if (!targetPdf) {
      setError('Please upload the target PDF form');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      // Step 1: Extract facts from source docs
      const totalSteps = activeTemplateId ? 2 : 3;
      setStatusMsg(`Step 1/${totalSteps} — Extracting facts from source documents…`);
      const extractForm = new FormData();
      sourceFiles.forEach(s => extractForm.append('files', s.file));
      extractForm.append('roles', JSON.stringify(sourceFiles.map(s => s.role)));
      const extractRes = await fetch('/api/pdf-autofill/extract', {method: 'POST', body: extractForm});
      if (!extractRes.ok) throw new Error((await extractRes.json()).error);
      const {facts: extractedFacts} = await extractRes.json();
      setFacts(extractedFacts || []);

      // Step 2: Analyze form — SKIP when using a saved template (fields already defined)
      let fields: FormField[] = formFields; // use template fields by default
      if (!activeTemplateId) {
        setStatusMsg('Step 2/3 — Analyzing PDF form structure…');
        const analyzeForm = new FormData();
        analyzeForm.append('pdf', targetPdf);
        const analyzeRes = await fetch('/api/pdf-autofill/analyze-form', {method: 'POST', body: analyzeForm});
        if (!analyzeRes.ok) throw new Error((await analyzeRes.json()).error);
        const {fields: detectedFields, isAcroForm: acro} = await analyzeRes.json();
        fields = detectedFields || [];
        setFormFields(fields);
        setIsAcroForm(acro);
      }

      // Step 3 (or 2 with template): Map facts → fields
      setStatusMsg(`Step ${totalSteps}/${totalSteps} — Mapping facts to form fields…`);
      const mapRes = await fetch('/api/pdf-autofill/map-fields', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({facts: extractedFacts, fields}),
      });
      if (!mapRes.ok) throw new Error((await mapRes.json()).error);
      const {mappings: mapped} = await mapRes.json();

      // Apply default values — either as fallback or forced override
      const fieldMeta = new Map<string, FormField>(fields.map(f => [f.name, f]));
      const mappingsWithDefaults = (mapped || []).map((m: any) => {
        const fieldDef = fieldMeta.get(m.fieldName);
        const defaultVal = fieldDef ? resolveFieldDefault(fieldDef) : '';
        if (fieldDef?.alwaysUseDefault && defaultVal) {
          // Always override AI value with the configured default
          return {
            ...m,
            suggestedValue: defaultVal,
            explanation: 'Default value (forced)',
            confidence: 1,
          };
        }
        if (!m.suggestedValue && defaultVal) {
          // Fallback: use default only when AI found nothing
          return {
            ...m,
            suggestedValue: defaultVal,
            explanation: m.explanation ? m.explanation + ' (default value applied)' : 'Default value applied',
          };
        }
        return m;
      });
      setMappings(mappingsWithDefaults);

      setStep('review');
      setStatusMsg('');
    } catch (err) {
      setError((err as Error).message);
      setStep('idle');
      setStatusMsg('');
    }
  }, [sourceFiles, targetPdf, formFields, activeTemplateId]);

  // ─── Edit a mapping value ────────────────────────────────────────────────

  const updateMapping = useCallback((index: number, value: string) => {
    setMappings(prev => prev.map((m, i) => (i === index ? {...m, suggestedValue: value} : m)));
  }, []);

  // ─── Export filled PDF ───────────────────────────────────────────────────

  const exportPdf = useCallback(async () => {
    if (!targetPdf || !mappings.length) return;
    setStatusMsg('Generating filled PDF…');
    setError(null);

    try {
      if (isAcroForm) {
        // AcroForm: server fills fields by name via pdf-lib
        const fillForm = new FormData();
        fillForm.append('pdf', targetPdf);
        fillForm.append('mappings', JSON.stringify(mappings));
        fillForm.append('isAcroForm', 'true');
        fillForm.append('fields', JSON.stringify(formFields));

        const res = await fetch('/api/pdf-autofill/fill', {method: 'POST', body: fillForm});
        if (!res.ok) throw new Error((await res.json()).error);
        triggerDownload(await res.blob(), `filled-${targetPdf.name}`);
      } else {
        // Flat PDF: render each page with pdfjs (browser-side), overlay text, export via jsPDF.
        // Load pdfjs from CDN so webpack never bundles it (avoids ESM/Object.defineProperty crash).
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await targetPdf.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({data: new Uint8Array(arrayBuffer)}).promise;

        const {jsPDF} = await import('jspdf');
        let doc: any = null;

        setStatusMsg(`Rendering ${pdfDoc.numPages} page(s)…`);

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          setStatusMsg(`Rendering page ${pageNum} of ${pdfDoc.numPages}…`);
          const page = await pdfDoc.getPage(pageNum);

          // Render at 2× scale for crispness
          const scale = 2;
          const viewport = page.getViewport({scale});
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({canvasContext: canvas.getContext('2d')!, viewport}).promise;

          const pdfW = viewport.width / scale;
          const pdfH = viewport.height / scale;

          if (!doc) {
            doc = new jsPDF({unit: 'pt', format: [pdfW, pdfH], compress: true});
          } else {
            doc.addPage([pdfW, pdfH]);
          }

          // Background: rendered page as JPEG
          doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfW, pdfH);

          // Overlay field values for this page
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 180);

          const pageFields = formFields.filter(f => (f.page ?? 0) === pageNum - 1);
          for (const field of pageFields) {
            const mapping = mappings.find(m => m.fieldName === field.name);
            if (!mapping?.suggestedValue || field.x == null || field.y == null) continue;
            doc.text(mapping.suggestedValue, field.x * pdfW, field.y * pdfH);
          }
        }

        if (doc) doc.save(`filled-${targetPdf.name.replace('.pdf', '')}.pdf`);
      }
    } catch (err) {
      setError((err as Error).message);
    }

    setStatusMsg('');
  }, [targetPdf, mappings, isAcroForm, formFields]);

  // ─── Confidence summary ──────────────────────────────────────────────────

  const highCount = mappings.filter(m => m.confidence >= 0.8).length;
  const midCount = mappings.filter(m => m.confidence >= 0.5 && m.confidence < 0.8).length;
  const lowCount = mappings.filter(m => m.confidence < 0.5).length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Template Editor (full-screen overlay) ── */}
      {showTemplateEditor && targetPdf && (
        <TemplateEditor
          pdf={targetPdf}
          onClose={() => setShowTemplateEditor(false)}
          onSaved={(id, name, fields) => {
            setActiveTemplateId(id);
            setActiveTemplateName(name);
            setFormFields(fields);
            setShowTemplateEditor(false);
            fetchTemplates();
          }}
        />
      )}

      {/* ── Template Selector Modal ── */}
      {showTemplateSelector && (
        <div
          className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowTemplateSelector(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Saved Templates</h2>
              <button onClick={() => setShowTemplateSelector(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <div className="text-4xl mb-3">📋</div>
                  No saved templates yet.
                  <br />
                  Upload a PDF and click "Create Template".
                </div>
              ) : (
                templates.map(t => (
                  <div
                    key={t._id}
                    className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 border-b last:border-0 ${
                      activeTemplateId === t._id ? 'bg-blue-50' : ''
                    }`}>
                    <div className="text-2xl flex-shrink-0">📋</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {t.fileName} · {t.fields?.length ?? 0} fields · {t.pageCount} page(s)
                      </p>
                      {t.description && <p className="text-xs text-gray-500 truncate mt-0.5">{t.description}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => loadTemplate(t._id)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                        Load
                      </button>
                      <button
                        onClick={() => deleteTemplate(t._id)}
                        className="px-3 py-1.5 text-red-500 border border-red-200 text-xs rounded hover:bg-red-50 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        {/* ── Header ── */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                Elevate<span className="text-blue-600">+</span>
              </span>
              <span className="text-gray-400 text-sm">/</span>
              <h1 className="text-x font-bold text-gray-400 tracking-tight">EllieForm</h1>
            </div>

            {activeTemplateName ? (
              <p className="text-xs text-blue-500 mt-0.5">Template: {activeTemplateName}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Ellie reads your files so you can focus on closing deals.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Template buttons */}
            <button
              onClick={() => {
                fetchTemplates();
                setShowTemplateSelector(true);
              }}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              📋 Templates
            </button>
            {targetPdf && (
              <button
                onClick={() => setShowTemplateEditor(true)}
                className="px-3 py-2 text-sm text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1.5">
                ✏️ Create Template
              </button>
            )}

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {step === 'idle' && (
              <button
                onClick={runAutoFill}
                disabled={!sourceFiles.length || !targetPdf}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                <span>⚡</span> Auto-Fill
              </button>
            )}
            {step === 'review' && (
              <>
                <button
                  onClick={() => {
                    setStep('idle');
                    setMappings([]);
                    setFormFields([]);
                    setFacts([]);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Reset
                </button>
                <button
                  onClick={exportPdf}
                  className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
                  <span>⬇</span> Export PDF
                </button>
              </>
            )}
          </div>
        </header>

        {/* ── Status / Error bar ── */}
        {(statusMsg || error) && (
          <div
            className={`flex-shrink-0 px-6 py-2 text-sm flex items-center gap-2 border-b ${
              error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
            {statusMsg && (
              <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
            {error ? `⚠ ${error}` : statusMsg}
          </div>
        )}

        {/* ── Three-panel layout ── */}
        <div className="flex flex-1 min-h-0">
          {/* ── Left panel: Source documents ── */}
          <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Source Documents</h2>
              <p className="text-xs text-gray-400 mt-0.5">Files containing data to extract</p>
            </div>

            {/* Drop zone */}
            <div
              className="mx-3 mt-3 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-400 cursor-pointer transition-colors group"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                addSourceFiles(e.dataTransfer.files);
              }}
              onClick={() => document.getElementById('source-input')?.click()}>
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📂</div>
              <p className="text-xs text-gray-500 group-hover:text-blue-600">Drop files or click to browse</p>
              <p className="text-xs text-gray-400 mt-0.5">PDF · DOCX · XLSX · Images</p>
              <input
                id="source-input"
                type="file"
                multiple
                accept={FILE_ACCEPT}
                className="hidden"
                onChange={e => {
                  if (e.target.files) addSourceFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto mt-2">
              {sourceFiles.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-4 px-4">No source files yet</p>
              )}
              {sourceFiles.map((src, i) => (
                <div key={i} className="px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{fileIcon(src.file.name)}</span>
                    <span className="text-xs text-gray-700 flex-1 truncate" title={src.file.name}>
                      {src.file.name}
                    </span>
                    <button
                      onClick={() => removeSource(i)}
                      className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0 transition-colors"
                      title="Remove">
                      ✕
                    </button>
                  </div>
                  {/* Role selector */}
                  <select
                    value={src.role}
                    onChange={e => updateSourceRole(i, e.target.value as SourceRole)}
                    className={`mt-1.5 w-full text-xs px-2 py-1 rounded border font-medium cursor-pointer focus:outline-none ${
                      ROLE_COLORS[src.role]
                    }`}>
                    {(Object.keys(ROLE_LABELS) as SourceRole[]).map(r => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Extracted facts preview */}
            {facts.length > 0 && (
              <div className="border-t border-gray-100 px-3 py-3">
                <p className="text-xs font-medium text-gray-500 mb-2">{facts.length} facts extracted</p>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {facts.slice(0, 12).map((f: any, i: number) => (
                    <div key={i} className="flex gap-1 text-xs">
                      <span className="text-gray-400 flex-shrink-0 truncate max-w-[90px]">{f.key}:</span>
                      <span className="text-gray-700 truncate">{f.value}</span>
                    </div>
                  ))}
                  {facts.length > 12 && <p className="text-xs text-gray-400">+{facts.length - 12} more</p>}
                </div>
              </div>
            )}
          </aside>

          {/* ── Center panel: PDF preview ── */}
          <main className="flex-1 flex flex-col min-w-0 bg-gray-100">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-gray-800">Target PDF Form</h2>
                {targetPdf && <span className="text-xs text-gray-400">{targetPdf.name}</span>}
                {step === 'review' && isAcroForm && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    AcroForm ✓ fillable
                  </span>
                )}
                {step === 'review' && !isAcroForm && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Flat PDF</span>
                )}
              </div>
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={() => document.getElementById('target-pdf-input')?.click()}>
                {targetPdf ? 'Change PDF' : 'Upload PDF'}
              </button>
              <input
                id="target-pdf-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) setTargetPdfFile(e.target.files[0]);
                  e.target.value = '';
                }}
              />
            </div>

            {/* PDF display area */}
            <div
              className="flex-1 overflow-hidden flex items-stretch justify-center p-4"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f?.type === 'application/pdf') setTargetPdfFile(f);
              }}>
              {!targetPdfUrl ? (
                <div
                  className="self-start mt-12 border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center bg-white hover:border-blue-400 cursor-pointer transition-colors max-w-md w-full mx-auto"
                  onClick={() => document.getElementById('target-pdf-input')?.click()}>
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-600 font-medium text-lg">Drop target PDF form here</p>
                  <p className="text-gray-400 text-sm mt-2">The form you want to auto-fill</p>
                  <p className="text-gray-300 text-xs mt-1">Supports AcroForm (fillable) and flat PDFs</p>
                </div>
              ) : (
                /* Browser-native PDF viewer — no webpack issues, shows AcroForm fields natively */
                <embed src={targetPdfUrl} type="application/pdf" className="w-full h-full rounded shadow-lg" />
              )}
            </div>
          </main>

          {/* ── Right panel: Field mappings ── */}
          <aside className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Field Mappings</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {step === 'review'
                    ? `${mappings.length} fields — review before export`
                    : 'Run Auto-Fill to see suggestions'}
                </p>
              </div>
              {step === 'review' && (
                <div className="flex gap-1 text-xs flex-shrink-0">
                  <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded" title="High confidence">
                    ✓ {highCount}
                  </span>
                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded" title="Needs review">
                    ? {midCount}
                  </span>
                  <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded" title="No match">
                    ! {lowCount}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Idle */}
              {step === 'idle' && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 text-gray-400">
                  <div className="text-5xl mb-4">✨</div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Ready to auto-fill</p>
                  <ol className="text-xs text-left space-y-1 list-decimal list-inside">
                    <li>Upload source documents (left)</li>
                    <li>Upload target PDF form (center)</li>
                    <li>
                      Click <strong>Auto-Fill</strong> above
                    </li>
                    <li>Review &amp; edit values here</li>
                    <li>Export the filled PDF</li>
                  </ol>
                </div>
              )}

              {/* Processing */}
              {step === 'processing' && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-gray-500 text-center px-4">{statusMsg}</p>
                </div>
              )}

              {/* Review — field list */}
              {step === 'review' &&
                mappings.map((mapping, i) => {
                  const field = formFields.find(f => f.name === mapping.fieldName);
                  const cc = confidenceClass(mapping.confidence);

                  return (
                    <div key={i} className={`px-4 py-3 border-b border-gray-50 last:border-0 border-l-4 ${cc.border}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p
                            className="text-xs font-medium text-gray-800 truncate"
                            title={field?.label || mapping.fieldName}>
                            {field?.label || mapping.fieldName}
                          </p>
                          {field?.description && (
                            <p className="text-xs text-gray-400 truncate mt-0.5" title={field.description}>
                              {field.description}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 font-medium ${cc.badge}`}>
                          {Math.round(mapping.confidence * 100)}%
                        </span>
                      </div>
                      <input
                        type="text"
                        value={mapping.suggestedValue}
                        onChange={e => updateMapping(i, e.target.value)}
                        placeholder="No value found — type manually"
                        className={`w-full text-xs border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 transition-colors ${cc.input}`}
                      />
                      {mapping.explanation && (
                        <p className="text-xs text-gray-400 mt-1 truncate" title={mapping.explanation}>
                          {mapping.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Export button */}
            {step === 'review' && (
              <div className="flex-shrink-0 p-3 border-t border-gray-100">
                <button
                  onClick={exportPdf}
                  className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                  <span>⬇</span> Export Filled PDF
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">Values you edited will be used</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
