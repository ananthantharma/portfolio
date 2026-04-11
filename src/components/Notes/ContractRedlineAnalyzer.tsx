'use client';

import {
  ArrowPathIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, {useCallback, useEffect, useRef, useState} from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────

type Provider = 'gemini' | 'openai';

interface ModelOption {
  id: string;
  label: string;
  provider: Provider;
  supportsImages: boolean;
}

const MODEL_OPTIONS: ModelOption[] = [
  {id: 'gemini-pro-latest', label: 'Gemini Pro', provider: 'gemini', supportsImages: true},
  {id: 'gemini-flash-latest', label: 'Gemini Flash', provider: 'gemini', supportsImages: true},
  {id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', provider: 'gemini', supportsImages: true},
  {id: 'gpt-4o', label: 'GPT-5.2', provider: 'openai', supportsImages: false},
  {id: 'gpt-4o-mini', label: 'GPT-5 mini', provider: 'openai', supportsImages: false},
  {id: 'gpt-3.5-turbo', label: 'GPT-5 nano', provider: 'openai', supportsImages: false},
];

const DEFAULT_MODEL = MODEL_OPTIONS[0]; // gemini-pro-latest

const SYSTEM_PROMPT = `You are a Senior Commercial and Legal Negotiator representing the Owner (Ontario Power Generation / OPG). You are reviewing supplier/vendor redlines and comments on a contract.
1. Transcribe the tracked changes accurately, paying strict attention to insertions and deletions.
2. Assess the commercial and legal risk of these specific edits to OPG.
3. Determine the negotiation stance (Accept, Reject, Modify).
4. Draft a direct, professional response to the vendor that defends OPG's interests. Use everyday language, no legal fluff, and do not concede leverage.

The user may provide only an image of redlines, only text comments, or both. Assess whatever is provided.

Respond with ONLY a valid JSON object — no markdown fences, no preamble, no trailing text:
{
  "transcriptionCheck": "Briefly state what changes you detected in the image so the user can verify accuracy.",
  "riskLevel": "High",
  "assessment": {
    "commercial": "Analysis of cost, scope, or leverage impacts.",
    "legal": "Analysis of liability, indemnity, or compliance impacts."
  },
  "recommendedStance": "Direct advice on what to hold firm on.",
  "draftResponse": "The exact text to copy-paste to the vendor/supplier."
}`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalysisResult {
  transcriptionCheck: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  assessment: {
    commercial: string;
    legal: string;
  };
  recommendedStance: string;
  draftResponse: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const RiskBadge: React.FC<{level: AnalysisResult['riskLevel']}> = ({level}) => {
  const map = {
    High: {
      pill: 'bg-rose-100 text-rose-700 border-rose-200',
      dot: 'bg-rose-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.5)] animate-pulse',
    },
    Medium: {
      pill: 'bg-amber-100 text-amber-700 border-amber-200',
      dot: 'bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.5)]',
    },
    Low: {
      pill: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]',
    },
  };
  const {pill, dot} = map[level];
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold text-[12px] ${pill}`}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
      {level} Risk
    </div>
  );
};

function useDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return {isOpen, setIsOpen, ref};
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ContractRedlineAnalyzerProps {
  onClose: () => void;
}

const ContractRedlineAnalyzer: React.FC<ContractRedlineAnalyzerProps> = ({onClose}) => {
  // Inputs
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [commentText, setCommentText] = useState('');
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Model
  const [selectedModel, setSelectedModel] = useState<ModelOption>(DEFAULT_MODEL);
  const modelDropdown = useDropdown();

  // Analysis state
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Output copy states
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [transcriptionOpen, setTranscriptionOpen] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  const hasImage = !!imageDataUrl;
  const hasText = commentText.trim().length > 0;
  const canSubmit = (hasImage || hasText) && status !== 'loading';

  // ── Image intake helpers ─────────────────────────────────────────────────

  const loadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setImageDataUrl(dataUrl);
      setImageMimeType(file.type || 'image/png');
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(i => i.type.startsWith('image/'));
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) loadImage(file);
      }
    },
    [loadImage],
  );

  // Listen for paste on the dropzone AND globally when no input is focused
  useEffect(() => {
    const zone = dropzoneRef.current;
    zone?.addEventListener('paste', handlePaste as EventListener);
    return () => zone?.removeEventListener('paste', handlePaste as EventListener);
  }, [handlePaste]);

  // Global paste fallback (when no text input is focused)
  useEffect(() => {
    const globalPaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) return;
      handlePaste(e);
    };
    window.addEventListener('paste', globalPaste);
    return () => window.removeEventListener('paste', globalPaste);
  }, [handlePaste]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
      if (file) loadImage(file);
    },
    [loadImage],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImage(file);
      e.target.value = '';
    },
    [loadImage],
  );

  // ── API call ─────────────────────────────────────────────────────────────

  const runAnalysis = useCallback(async () => {
    if (!canSubmit) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus('loading');
    setResult(null);
    setParseError(null);

    const textSection = hasText
      ? `\n\nVendor comments / email chain:\n${commentText.trim()}`
      : '';

    const prompt = `${SYSTEM_PROMPT}${textSection}`;

    try {
      let responseText = '';

      if (selectedModel.provider === 'gemini') {
        const attachments = imageDataUrl
          ? [{type: 'image', content: imageDataUrl, mimeType: imageMimeType}]
          : [];

        const res = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            apiKey: 'MANAGED',
            prompt,
            model: selectedModel.id,
            attachments,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        responseText = data.text || '';
      } else {
        // OpenAI — text only (image not supported via this endpoint)
        const res = await fetch('/api/openai/generate', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            apiKey: 'MANAGED',
            model: selectedModel.id,
            messages: [{role: 'user', content: prompt}],
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        responseText = data.text || '';
      }

      const cleaned = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();

      const parsed: AnalysisResult = JSON.parse(cleaned);
      setResult(parsed);
      setTranscriptionOpen(true);
      setStatus('success');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Analysis error:', err);
      setParseError('Failed to parse response. Try again or switch to a more capable model.');
      setStatus('error');
    }
  }, [canSubmit, hasText, hasImage, commentText, imageDataUrl, imageMimeType, selectedModel]);

  const handleCopyDraft = useCallback(async () => {
    if (!result?.draftResponse) return;
    await navigator.clipboard.writeText(result.draftResponse);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  }, [result]);

  const providerDot: Record<Provider, string> = {
    gemini: 'bg-blue-500',
    openai: 'bg-emerald-500',
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-sm">
              <DocumentMagnifyingGlassIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-800 leading-tight">
                Contract Redline & Comment Analyzer
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                OPG Owner perspective &mdash; commercial & legal risk assessment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Model picker */}
            <div ref={modelDropdown.ref} className="relative">
              <button
                onClick={() => modelDropdown.setIsOpen(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11.5px] font-semibold text-slate-700 hover:border-slate-300 transition-all whitespace-nowrap">
                <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${providerDot[selectedModel.provider]}`} />
                {selectedModel.label}
                {!selectedModel.supportsImages && hasImage && (
                  <ExclamationTriangleIcon className="h-3 w-3 text-amber-400" title="This model does not support image input" />
                )}
                <ChevronDownIcon className={`h-3 w-3 transition-transform duration-150 ${modelDropdown.isOpen ? 'rotate-180' : ''}`} />
              </button>
              {modelDropdown.isOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden">
                  <div className="px-3 pt-2.5 pb-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Google Gemini</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Supports image input</p>
                  </div>
                  {MODEL_OPTIONS.filter(m => m.provider === 'gemini').map(m => (
                    <button
                      key={m.id}
                      onClick={() => {setSelectedModel(m); modelDropdown.setIsOpen(false);}}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors ${
                        selectedModel.id === m.id ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'
                      }`}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      {m.label}
                      {m.id === DEFAULT_MODEL.id && (
                        <span className="ml-auto text-[9px] text-slate-400 font-normal">default</span>
                      )}
                    </button>
                  ))}
                  <div className="mx-3 my-1.5 h-px bg-slate-100" />
                  <div className="px-3 pt-1 pb-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">OpenAI</p>
                    <p className="text-[9px] text-amber-500 mt-0.5">Text only — no image analysis</p>
                  </div>
                  {MODEL_OPTIONS.filter(m => m.provider === 'openai').map(m => (
                    <button
                      key={m.id}
                      onClick={() => {setSelectedModel(m); modelDropdown.setIsOpen(false);}}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors ${
                        selectedModel.id === m.id ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'
                      }`}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      {m.label}
                    </button>
                  ))}
                  <div className="h-1.5" />
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
              title="Close">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">

          {/* ── Inputs ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5 border-b border-slate-100">

            {/* Input A — Image dropzone */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Input A &mdash; Redline Screenshot
                </p>
                {!selectedModel.supportsImages && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                    <ExclamationTriangleIcon className="h-3 w-3" />
                    Image ignored by selected model
                  </span>
                )}
              </div>

              {!imageDataUrl ? (
                <div
                  ref={dropzoneRef}
                  tabIndex={0}
                  onDragOver={e => {e.preventDefault(); setIsDraggingOver(true);}}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed min-h-[180px] cursor-pointer transition-all duration-150 outline-none focus:border-violet-400 ${
                    isDraggingOver
                      ? 'border-violet-400 bg-violet-50'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <PhotoIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-[12px] font-semibold text-slate-500">
                      Paste screenshot here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ctrl+V &nbsp;&middot;&nbsp; drag &amp; drop &nbsp;&middot;&nbsp; or{' '}
                      <label className="text-violet-600 cursor-pointer hover:underline">
                        browse
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileInput}
                        />
                      </label>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group min-h-[180px] flex items-center justify-center">
                  <img
                    src={imageDataUrl}
                    alt="Redline screenshot"
                    className="max-h-[260px] max-w-full object-contain rounded-lg"
                  />
                  <button
                    onClick={() => setImageDataUrl(null)}
                    className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-[9px] font-semibold backdrop-blur-sm">
                    Image loaded &mdash; hover to remove
                  </div>
                </div>
              )}
            </div>

            {/* Input B — Comments textarea */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Input B &mdash; Vendor Comments / Email Chain
              </p>
              <textarea
                className="flex-1 min-h-[180px] resize-none rounded-xl border border-slate-200 px-4 py-3 text-[12.5px] text-slate-700 leading-relaxed outline-none placeholder-slate-300 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-slate-300 transition-colors"
                placeholder="Paste vendor comments, email chains, or negotiation notes here…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              {!hasImage && !hasText && (
                <span>Provide a redline screenshot, vendor comments, or both to begin.</span>
              )}
              {(hasImage || hasText) && (
                <>
                  {hasImage && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-semibold">
                      <PhotoIcon className="h-3 w-3" /> Image ready
                    </span>
                  )}
                  {hasText && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold">
                      {commentText.trim().length} chars of comments
                    </span>
                  )}
                </>
              )}
            </div>
            <button
              onClick={runAnalysis}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white text-[12.5px] font-bold shadow-md shadow-slate-900/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
              {status === 'loading' ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                  Assess Risk
                </>
              )}
            </button>
          </div>

          {/* ── Loading skeleton ── */}
          {status === 'loading' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <ArrowPathIcon className="h-5 w-5 text-slate-400 animate-spin flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded-full bg-slate-200 animate-pulse w-2/3" />
                  <div className="h-2.5 rounded-full bg-slate-100 animate-pulse w-1/2" style={{animationDelay: '100ms'}} />
                </div>
                <p className="text-[11px] text-slate-400 font-medium italic flex-shrink-0">
                  Analyzing commercial and legal risk…
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Risk Level', 60],
                  ['Transcription', 90],
                  ['Commercial', 75],
                  ['Legal', 80],
                ].map(([label, w], i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-100 space-y-2.5">
                    <div className="h-2.5 rounded-full bg-slate-200 animate-pulse" style={{width: `${w}%`, animationDelay: `${i * 80}ms`}} />
                    <div className="h-2 rounded-full bg-slate-100 animate-pulse w-full" style={{animationDelay: `${i * 80 + 40}ms`}} />
                    <div className="h-2 rounded-full bg-slate-100 animate-pulse" style={{width: '85%', animationDelay: `${i * 80 + 80}ms`}} />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 pt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <div className="m-5 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-rose-700">Analysis failed</p>
                <p className="text-[12px] text-rose-600 mt-0.5">{parseError}</p>
              </div>
              <button
                onClick={runAnalysis}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all flex-shrink-0">
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* ── Results ── */}
          {status === 'success' && result && (
            <div className="p-5 flex flex-col gap-4">

              {/* Risk badge row */}
              <div className="flex items-center justify-between">
                <RiskBadge level={result.riskLevel} />
                <button
                  onClick={runAnalysis}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-all">
                  <ArrowPathIcon className="h-3 w-3" />
                  Re-analyze
                </button>
              </div>

              {/* Transcription warning — collapsible */}
              {result.transcriptionCheck && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                  <button
                    onClick={() => setTranscriptionOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                        Transcription Check
                      </span>
                      <span className="text-[10px] text-amber-500">— verify AI accuracy before proceeding</span>
                    </div>
                    <ChevronDownIcon
                      className={`h-4 w-4 text-amber-400 flex-shrink-0 transition-transform duration-150 ${transcriptionOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {transcriptionOpen && (
                    <div className="px-4 pb-3 border-t border-amber-200/60">
                      <p className="text-[12.5px] text-amber-800 leading-relaxed pt-2.5">
                        {result.transcriptionCheck}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Assessment panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Commercial */}
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-black text-indigo-600">$</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Commercial Impact
                    </p>
                  </div>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{result.assessment.commercial}</p>
                </div>

                {/* Legal */}
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-black text-violet-600">§</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Legal Impact
                    </p>
                  </div>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{result.assessment.legal}</p>
                </div>
              </div>

              {/* Recommended stance */}
              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
                  OPG Negotiation Stance
                </p>
                <p className="text-[13px] text-white leading-relaxed">{result.recommendedStance}</p>
              </div>

              {/* Draft response — copy block */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Draft Response to Vendor
                  </p>
                  <button
                    onClick={handleCopyDraft}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-all">
                    {copiedDraft ? (
                      <>
                        <CheckIcon className="h-3 w-3 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-3 w-3" />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
                    {result.draftResponse}
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractRedlineAnalyzer;
