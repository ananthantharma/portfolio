'use client';

import {
  BeakerIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import React, {useCallback, useEffect, useRef, useState} from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────

type AudienceType = 'Executive' | 'General Public' | 'Technical';
type Provider = 'gemini' | 'openai';
type PipelineStatus = 'idle' | 'loading' | 'success' | 'error';
type CritiqueType = 'logic' | 'clarity' | 'redundancy';

interface ModelOption {
  id: string;
  label: string;
  provider: Provider;
}

const MODEL_OPTIONS: ModelOption[] = [
  {id: 'gemini-flash-latest', label: 'Gemini Flash', provider: 'gemini'},
  {id: 'gemini-pro-latest', label: 'Gemini Pro', provider: 'gemini'},
  {id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', provider: 'gemini'},
  {id: 'gpt-4o', label: 'GPT-5.2', provider: 'openai'},
  {id: 'gpt-4o-mini', label: 'GPT-5 mini', provider: 'openai'},
  {id: 'gpt-3.5-turbo', label: 'GPT-5 nano', provider: 'openai'},
];

const DEFAULT_MODEL = MODEL_OPTIONS[0]; // gemini-flash-latest

// ─── API helper — routes to the right endpoint by provider ──────────────────

async function callAI(
  prompt: string,
  model: ModelOption,
  signal?: AbortSignal,
): Promise<string> {
  if (model.provider === 'gemini') {
    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({apiKey: 'MANAGED', prompt, model: model.id}),
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.text || '';
  } else {
    // OpenAI — messages-based endpoint
    const res = await fetch('/api/openai/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        apiKey: 'MANAGED',
        model: model.id,
        messages: [{role: 'user', content: prompt}],
      }),
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.text || '';
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Critique {
  id: string;
  type: CritiqueType;
  quote: string;
  issue: string;
  suggestedInstruction: string;
}

interface AuditResult {
  status: 'red' | 'yellow' | 'green';
  summary: string;
  critiques: Critique[];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatusLight: React.FC<{status: PipelineStatus; label: string}> = ({status, label}) => {
  const dotClass =
    status === 'idle'
      ? 'bg-slate-300'
      : status === 'loading'
        ? 'bg-yellow-400 animate-pulse'
        : status === 'success'
          ? 'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]'
          : 'bg-rose-400 shadow-[0_0_6px_2px_rgba(251,113,133,0.5)]';

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${dotClass}`} />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
};

const TypeBadge: React.FC<{type: CritiqueType}> = ({type}) => {
  const styles: Record<CritiqueType, string> = {
    logic: 'bg-rose-50 text-rose-600 border-rose-100',
    clarity: 'bg-amber-50 text-amber-600 border-amber-100',
    redundancy: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${styles[type]}`}>
      {type}
    </span>
  );
};

const AuditStatusBadge: React.FC<{status: AuditResult['status']}> = ({status}) => {
  const map: Record<string, {cls: string; label: string; dot: string}> = {
    red: {
      cls: 'bg-rose-100 text-rose-700 border-rose-200',
      label: 'Needs Work',
      dot: 'bg-rose-400 shadow-[0_0_6px_2px_rgba(251,113,133,0.45)]',
    },
    yellow: {
      cls: 'bg-amber-100 text-amber-700 border-amber-200',
      label: 'Minor Issues',
      dot: 'bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.45)]',
    },
    green: {
      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      label: 'Looks Good',
      dot: 'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.45)]',
    },
  };
  const {cls, label, dot} = map[status] ?? map.yellow;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-500 ${dot}`} />
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
        {label}
      </span>
    </div>
  );
};

// ─── Dropdown ─────────────────────────────────────────────────────────────────

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

interface LogicStyleRefinerProps {
  onClose: () => void;
}

const LogicStyleRefiner: React.FC<LogicStyleRefinerProps> = ({onClose}) => {
  const [inputText, setInputText] = useState('');
  const [audience, setAudience] = useState<AudienceType>('General Public');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(DEFAULT_MODEL);

  const audienceDropdown = useDropdown();
  const modelDropdown = useDropdown();

  // Left panel — Refiner
  const [refinerStatus, setRefinerStatus] = useState<PipelineStatus>('idle');
  const [refinedText, setRefinedText] = useState('');
  const [copiedRefiner, setCopiedRefiner] = useState(false);
  const refinerAbortRef = useRef<AbortController | null>(null);

  // Right panel — Auditor
  const [auditorStatus, setAuditorStatus] = useState<PipelineStatus>('idle');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const auditorAbortRef = useRef<AbortController | null>(null);

  // Per-critique fix state
  const [fixingIds, setFixingIds] = useState<Set<string>>(new Set());

  // Ref so Request C always reads the latest refined text
  const refinedTextRef = useRef(refinedText);
  useEffect(() => {
    refinedTextRef.current = refinedText;
  }, [refinedText]);

  const CHAR_LIMIT = 5000;
  const charCount = inputText.length;
  const isOverLimit = charCount > CHAR_LIMIT;

  // ─── Request B: Auditor ─────────────────────────────────────────────────
  const runAuditor = useCallback(
    async (textToAudit: string, signal?: AbortSignal) => {
      setAuditorStatus('loading');
      setAuditResult(null);
      setAuditError(null);

      const prompt = `You are a rigorous logic, clarity, and redundancy auditor.

Analyze the text below and return ONLY a valid JSON object — no markdown fences, no preamble, no trailing text.

Required schema:
{
  "status": "red" | "yellow" | "green",
  "summary": "One sentence overall verdict.",
  "critiques": [
    {
      "id": "unique-kebab-id",
      "type": "logic" | "clarity" | "redundancy",
      "quote": "The exact flawed sentence or phrase copied verbatim from the text.",
      "issue": "Concise explanation of the problem.",
      "suggestedInstruction": "A precise command describing exactly how to fix it."
    }
  ]
}

Rules:
- "status" green = no significant issues, yellow = minor, red = significant problems.
- "quote" must be an exact substring present in the provided text.
- If no issues, set critiques to an empty array [].
- Output raw JSON only — absolutely nothing else.

<refined_text>
${textToAudit}
</refined_text>`;

      try {
        const text = await callAI(prompt, selectedModel, signal);
        const cleaned = text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/, '')
          .trim();
        const parsed: AuditResult = JSON.parse(cleaned);
        setAuditResult(parsed);
        setAuditorStatus('success');
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Auditor error:', err);
        setAuditorStatus('error');
        setAuditError('Could not parse audit response. Try retrying.');
      }
    },
    [selectedModel],
  );

  // ─── Request A → B: Sequential Pipeline ─────────────────────────────────
  const runPipeline = useCallback(async () => {
    if (!inputText.trim() || isOverLimit) return;

    refinerAbortRef.current?.abort();
    auditorAbortRef.current?.abort();

    const refCtrl = new AbortController();
    const audCtrl = new AbortController();
    refinerAbortRef.current = refCtrl;
    auditorAbortRef.current = audCtrl;

    setRefinerStatus('loading');
    setRefinedText('');
    setAuditorStatus('idle');
    setAuditResult(null);
    setAuditError(null);
    setFixingIds(new Set());

    const audienceMap: Record<AudienceType, string> = {
      Executive: 'a busy executive who values concise, high-impact language with clear action items',
      'General Public': 'a general audience — plain, friendly, everyday language; no jargon',
      Technical: 'a technical audience — precise terminology, well-structured, no oversimplification',
    };

    const prompt = `You are a professional writing coach specialising in grammar, clarity, and conciseness.

Rewrite the following text for ${audienceMap[audience]}.

Rules:
- Fix all grammar, spelling, and punctuation errors.
- Improve clarity and conciseness — eliminate redundant words and phrases.
- Use professional, smart, everyday vocabulary appropriate for the audience.
- Preserve all original facts and meaning exactly.
- Output ONLY the revised text. No preamble, no labels, no explanations.

<raw_text>
${inputText}
</raw_text>`;

    try {
      const refined = await callAI(prompt, selectedModel, refCtrl.signal);
      setRefinedText(refined);
      setRefinerStatus('success');

      // Step 2: audit the refined output
      await runAuditor(refined, audCtrl.signal);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Refiner error:', err);
      setRefinerStatus('error');
    }
  }, [inputText, audience, isOverLimit, selectedModel, runAuditor]);

  // ─── Request C: Targeted Fixer ──────────────────────────────────────────
  const runFixer = useCallback(async (critique: Critique) => {
    setFixingIds(prev => new Set(prev).add(critique.id));

    const currentText = refinedTextRef.current;
    const prompt = `You are a precise text editor. Apply one specific edit to a text body.

Instructions:
1. Locate this exact quote in the text: "${critique.quote}"
2. Apply this instruction: ${critique.suggestedInstruction}
3. Return the fully updated text, maintaining original formatting and structure everywhere else.
4. Output ONLY the updated text. No preamble, no labels, no explanations.

<full_text>
${currentText}
</full_text>`;

    try {
      const updatedText = await callAI(prompt, selectedModel);
      setRefinedText(updatedText);
      setAuditResult(prev => {
        if (!prev) return prev;
        const remaining = prev.critiques.filter(c => c.id !== critique.id);
        return {
          ...prev,
          critiques: remaining,
          status: remaining.length === 0 ? 'green' : prev.status,
          summary: remaining.length === 0 ? 'All issues resolved.' : prev.summary,
        };
      });
    } catch (err) {
      console.error('Fixer failed:', err);
    } finally {
      setFixingIds(prev => {
        const next = new Set(prev);
        next.delete(critique.id);
        return next;
      });
    }
  }, [selectedModel]);

  const handleCopyRefiner = useCallback(async () => {
    if (!refinedText) return;
    await navigator.clipboard.writeText(refinedText);
    setCopiedRefiner(true);
    setTimeout(() => setCopiedRefiner(false), 2000);
  }, [refinedText]);

  const isRunning = refinerStatus === 'loading' || auditorStatus === 'loading';
  const canRun = inputText.trim().length > 0 && !isOverLimit && !isRunning;

  const providerColor: Record<Provider, string> = {
    gemini: 'bg-blue-500',
    openai: 'bg-emerald-500',
  };

  return (
    // ── No onClick on backdrop — must use X button to close ──
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <BeakerIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-800 leading-tight">Logic & Style Refiner</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Sequential pipeline &mdash; Refine &rarr; Audit &rarr; Auto-Fix
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
            title="Close">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── Input Bar ── */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 bg-slate-50/40 flex items-start gap-2.5">

          {/* ── Audience dropdown ── */}
          <div ref={audienceDropdown.ref} className="relative flex-shrink-0 pt-0.5">
            <button
              onClick={() => audienceDropdown.setIsOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11.5px] font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 transition-all whitespace-nowrap">
              {audience}
              <ChevronDownIcon
                className={`h-3 w-3 transition-transform duration-150 ${audienceDropdown.isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {audienceDropdown.isOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden">
                {(['Executive', 'General Public', 'Technical'] as AudienceType[]).map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setAudience(opt);
                      audienceDropdown.setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[12px] font-medium transition-colors ${
                      audience === opt ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Model dropdown ── */}
          <div ref={modelDropdown.ref} className="relative flex-shrink-0 pt-0.5">
            <button
              onClick={() => modelDropdown.setIsOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11.5px] font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition-all whitespace-nowrap">
              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${providerColor[selectedModel.provider]}`} />
              {selectedModel.label}
              <ChevronDownIcon
                className={`h-3 w-3 transition-transform duration-150 ${modelDropdown.isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {modelDropdown.isOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-52 rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden">
                {/* Gemini group */}
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Google Gemini</p>
                </div>
                {MODEL_OPTIONS.filter(m => m.provider === 'gemini').map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m);
                      modelDropdown.setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors ${
                      selectedModel.id === m.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    {m.label}
                    {m.id === DEFAULT_MODEL.id && (
                      <span className="ml-auto text-[9px] text-slate-400 font-normal">default</span>
                    )}
                  </button>
                ))}

                <div className="mx-3 my-1.5 h-px bg-slate-100" />

                {/* OpenAI group */}
                <div className="px-3 pt-1 pb-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">OpenAI</p>
                </div>
                {MODEL_OPTIONS.filter(m => m.provider === 'openai').map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m);
                      modelDropdown.setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors ${
                      selectedModel.id === m.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {m.label}
                  </button>
                ))}
                <div className="h-1.5" />
              </div>
            )}
          </div>

          {/* ── Textarea ── */}
          <div className="relative flex-1 min-w-0">
            <textarea
              className={`w-full resize-none rounded-lg border px-3 py-2 text-[12.5px] text-slate-700 leading-relaxed outline-none placeholder-slate-300 transition-colors bg-white ${
                isOverLimit ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 focus:border-violet-300'
              }`}
              placeholder="Paste or type your text here (max 5,000 characters)…"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              rows={3}
            />
            <span
              className={`absolute bottom-2 right-2.5 text-[9px] font-mono tabular-nums pointer-events-none ${
                isOverLimit ? 'text-rose-500 font-bold' : 'text-slate-300'
              }`}>
              {charCount.toLocaleString()}&thinsp;/&thinsp;{CHAR_LIMIT.toLocaleString()}
            </span>
          </div>

          {/* ── Run button ── */}
          <button
            onClick={runPipeline}
            disabled={!canRun}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[12px] font-bold shadow-md shadow-violet-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none whitespace-nowrap mt-0.5">
            {isRunning ? (
              <>
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                {refinerStatus === 'loading' ? 'Refining…' : 'Auditing…'}
              </>
            ) : (
              <>
                <BeakerIcon className="h-3.5 w-3.5" />
                Run Pipeline
              </>
            )}
          </button>
        </div>

        {/* ── Main Panels ── */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

          {/* ── LEFT: Refined Output ── */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b border-slate-50 bg-white">
              <StatusLight status={refinerStatus} label="Refined Output" />
              <div className="flex items-center gap-1.5">
                {refinerStatus === 'success' && (
                  <>
                    <button
                      onClick={handleCopyRefiner}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-all">
                      {copiedRefiner ? (
                        <CheckIcon className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-3 w-3" />
                      )}
                      {copiedRefiner ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={runPipeline}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-all">
                      <ArrowPathIcon className="h-3 w-3" />
                      Rerun
                    </button>
                  </>
                )}
                {refinerStatus === 'error' && (
                  <button
                    onClick={runPipeline}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all">
                    <ArrowPathIcon className="h-3 w-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
              {refinerStatus === 'idle' && (
                <p className="text-[12px] text-slate-300 italic mt-1">
                  Refined text will appear here after you run the pipeline…
                </p>
              )}
              {refinerStatus === 'loading' && (
                <div className="space-y-3 mt-1">
                  <div className="flex items-center gap-2 mb-5">
                    <ArrowPathIcon className="h-4 w-4 text-violet-400 animate-spin" />
                    <span className="text-[12px] text-violet-500 font-medium">Refining your text…</span>
                  </div>
                  {[100, 78, 92, 65, 85].map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-full bg-slate-100 animate-pulse"
                      style={{width: `${w}%`, animationDelay: `${i * 100}ms`}}
                    />
                  ))}
                </div>
              )}
              {refinerStatus === 'error' && (
                <p className="text-[12px] text-rose-500 mt-1">Refinement failed. Check your connection and retry.</p>
              )}
              {refinerStatus === 'success' && (
                <textarea
                  className="w-full h-full min-h-[200px] resize-none bg-transparent text-[13px] text-slate-700 leading-relaxed outline-none"
                  value={refinedText}
                  onChange={e => setRefinedText(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* ── RIGHT: Logic Audit ── */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b border-slate-50 bg-white">
              <StatusLight
                status={auditorStatus}
                label={auditorStatus === 'loading' ? 'Auditing output…' : 'Logic Audit'}
              />
              <div className="flex items-center gap-2">
                {auditorStatus === 'success' && auditResult && (
                  <AuditStatusBadge status={auditResult.status} />
                )}
                {(auditorStatus === 'success' || auditorStatus === 'error') && refinedText && (
                  <button
                    onClick={() => runAuditor(refinedText)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                    <ArrowPathIcon className="h-3 w-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
              {auditorStatus === 'idle' && (
                <p className="text-[12px] text-slate-300 italic mt-1">
                  {refinerStatus === 'success'
                    ? 'Audit is running…'
                    : 'Audit results will appear after the pipeline runs…'}
                </p>
              )}
              {auditorStatus === 'loading' && (
                <div className="space-y-3 mt-1">
                  <div className="flex items-center gap-2 mb-5">
                    <ArrowPathIcon className="h-4 w-4 text-indigo-400 animate-spin" />
                    <span className="text-[12px] text-indigo-500 font-medium">Auditing refined output…</span>
                  </div>
                  {[75, 92, 58, 83].map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-full bg-slate-100 animate-pulse"
                      style={{width: `${w}%`, animationDelay: `${i * 120}ms`}}
                    />
                  ))}
                </div>
              )}
              {auditorStatus === 'error' && (
                <p className="text-[12px] text-rose-500 mt-1">{auditError || 'Audit failed. Retry above.'}</p>
              )}
              {auditorStatus === 'success' && auditResult && (
                <div className="flex flex-col gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[12px] text-slate-600 leading-relaxed">{auditResult.summary}</p>
                  </div>

                  {auditResult.critiques.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <CheckIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <p className="text-[12px] text-emerald-700 font-medium">No issues found. Looks great!</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {auditResult.critiques.length} issue
                        {auditResult.critiques.length !== 1 ? 's' : ''} &mdash; click ✓ to auto-fix
                      </p>
                      {auditResult.critiques.map(critique => {
                        const isFixing = fixingIds.has(critique.id);
                        return (
                          <div
                            key={critique.id}
                            className={`flex gap-3 p-3 rounded-xl border bg-white transition-all ${
                              isFixing
                                ? 'border-violet-200 bg-violet-50/30'
                                : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
                            }`}>
                            {/* Fix button */}
                            <button
                              onClick={() => !isFixing && runFixer(critique)}
                              disabled={isFixing}
                              title="Auto-fix this issue"
                              className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border transition-all mt-0.5 ${
                                isFixing
                                  ? 'border-violet-200 bg-violet-50 cursor-not-allowed'
                                  : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-500 hover:border-emerald-500 cursor-pointer group/fix'
                              }`}>
                              {isFixing ? (
                                <ArrowPathIcon className="h-3.5 w-3.5 text-violet-400 animate-spin" />
                              ) : (
                                <CheckIcon className="h-3.5 w-3.5 text-emerald-500 group-hover/fix:text-white transition-colors" />
                              )}
                            </button>

                            {/* Critique body */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <TypeBadge type={critique.type} />
                                {isFixing && (
                                  <span className="text-[10px] text-violet-500 font-medium animate-pulse">
                                    Fixing…
                                  </span>
                                )}
                              </div>
                              <p
                                className="text-[11px] font-mono text-slate-400 leading-snug mb-1.5 truncate"
                                title={critique.quote}>
                                &ldquo;
                                {critique.quote.length > 72
                                  ? critique.quote.slice(0, 72) + '…'
                                  : critique.quote}
                                &rdquo;
                              </p>
                              <p className="text-[12px] text-slate-600 leading-relaxed">{critique.issue}</p>
                              <p className="text-[11px] text-indigo-500 mt-1 font-medium italic leading-snug">
                                {critique.suggestedInstruction}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicStyleRefiner;
