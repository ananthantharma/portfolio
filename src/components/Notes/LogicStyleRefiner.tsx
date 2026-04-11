'use client';

import {
  BeakerIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  DocumentMagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import React, {useCallback, useEffect, useRef, useState} from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

type AudienceType = 'Executive' | 'General Public' | 'Technical';
type Status = 'idle' | 'loading' | 'success' | 'error';

interface CritiquePoint {
  quote: string;
  issue: string;
}

interface AuditResult {
  status: string;
  summary: string;
  critiquePoints: CritiquePoint[];
}

// ─── Inline diff ────────────────────────────────────────────────────────────

function computeDiff(original: string, revised: string): React.ReactNode[] {
  // Word-level diff using Longest Common Subsequence
  const aWords = original.split(/(\s+)/);
  const bWords = revised.split(/(\s+)/);

  const m = aWords.length;
  const n = bWords.length;

  // Build LCS table
  const dp: number[][] = Array.from({length: m + 1}, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (aWords[i - 1] === bWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Traceback
  const ops: {type: 'equal' | 'insert' | 'delete'; text: string}[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aWords[i - 1] === bWords[j - 1]) {
      ops.unshift({type: 'equal', text: aWords[i - 1]});
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({type: 'insert', text: bWords[j - 1]});
      j--;
    } else {
      ops.unshift({type: 'delete', text: aWords[i - 1]});
      i--;
    }
  }

  return ops.map((op, idx) => {
    if (op.type === 'equal') return <span key={idx}>{op.text}</span>;
    if (op.type === 'insert')
      return (
        <span key={idx} className="bg-emerald-100 text-emerald-800 rounded px-0.5">
          {op.text}
        </span>
      );
    // delete
    return (
      <span key={idx} className="bg-rose-100 text-rose-700 line-through rounded px-0.5">
        {op.text}
      </span>
    );
  });
}

// ─── Status Light ────────────────────────────────────────────────────────────

const StatusLight: React.FC<{status: Status; label: string}> = ({status, label}) => {
  const color =
    status === 'idle'
      ? 'bg-slate-300'
      : status === 'loading'
        ? 'bg-yellow-400 animate-pulse'
        : status === 'success'
          ? 'bg-emerald-400'
          : 'bg-rose-400';

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${color} ${status === 'success' ? 'shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]' : ''} ${status === 'error' ? 'shadow-[0_0_6px_2px_rgba(251,113,133,0.5)]' : ''}`}
      />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

interface LogicStyleRefinerProps {
  onClose: () => void;
}

const LogicStyleRefiner: React.FC<LogicStyleRefinerProps> = ({onClose}) => {
  const [inputText, setInputText] = useState('');
  const [audience, setAudience] = useState<AudienceType>('General Public');
  const [isAudienceOpen, setIsAudienceOpen] = useState(false);
  const audienceRef = useRef<HTMLDivElement>(null);

  // Refiner (A)
  const [refinerStatus, setRefinerStatus] = useState<Status>('idle');
  const [refinerText, setRefinerText] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [copiedRefiner, setCopiedRefiner] = useState(false);
  const refinerAbortRef = useRef<AbortController | null>(null);

  // Auditor (B)
  const [auditorStatus, setAuditorStatus] = useState<Status>('idle');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const auditorAbortRef = useRef<AbortController | null>(null);

  // Highlight
  const [highlightedQuote, setHighlightedQuote] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const charCount = inputText.length;
  const CHAR_LIMIT = 5000;
  const isOverLimit = charCount > CHAR_LIMIT;

  // Close audience dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (audienceRef.current && !audienceRef.current.contains(e.target as Node)) {
        setIsAudienceOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ESC to close modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const runRefiner = useCallback(async () => {
    if (!inputText.trim() || isOverLimit) return;

    refinerAbortRef.current?.abort();
    const ctrl = new AbortController();
    refinerAbortRef.current = ctrl;

    setRefinerStatus('loading');
    setRefinerText('');
    setShowDiff(false);

    const audienceMap: Record<AudienceType, string> = {
      Executive: 'a busy executive who needs concise, high-impact language with clear action items',
      'General Public': 'a general audience with no specialized knowledge — use plain, friendly language',
      Technical: 'a technical audience — precise terminology, structured, no oversimplification',
    };

    const prompt = `You are a professional writing coach specializing in clarity and persuasion.

Rewrite the following text for ${audienceMap[audience]}.

Rules:
- Preserve the original meaning and key facts exactly
- Improve flow, tone, and vocabulary for the target audience
- Remove redundancies and tighten sentence structure
- Output ONLY the revised text. No explanations, no preamble, no labels.

<raw_text>
${inputText}
</raw_text>`;

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({apiKey: 'MANAGED', prompt, model: 'gemini-flash-latest'}),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRefinerText(data.text || '');
      setRefinerStatus('success');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setRefinerStatus('error');
    }
  }, [inputText, audience, isOverLimit]);

  const runAuditor = useCallback(async () => {
    if (!inputText.trim() || isOverLimit) return;

    auditorAbortRef.current?.abort();
    const ctrl = new AbortController();
    auditorAbortRef.current = ctrl;

    setAuditorStatus('loading');
    setAuditResult(null);
    setAuditError(null);
    setHighlightedQuote(null);

    const prompt = `You are a rigorous logic and clarity auditor. Analyze the following text and return a JSON object — nothing else.

The JSON must have exactly this shape:
{
  "status": "Pass" | "Needs Work" | "Fail",
  "summary": "<one sentence overall verdict>",
  "critiquePoints": [
    { "quote": "<exact substring from original text>", "issue": "<concise explanation of the problem>" }
  ]
}

If there are no issues, return an empty critiquePoints array.
Output raw JSON only — no markdown fences, no extra text.

<raw_text>
${inputText}
</raw_text>`;

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({apiKey: 'MANAGED', prompt, model: 'gemini-flash-latest'}),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw: string = data.text || '';

      // Strip markdown fences if present
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed: AuditResult = JSON.parse(cleaned);
      setAuditResult(parsed);
      setAuditorStatus('success');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setAuditorStatus('error');
      setAuditError('Failed to parse audit response. Try again.');
    }
  }, [inputText, isOverLimit]);

  const runBoth = useCallback(() => {
    runRefiner();
    runAuditor();
  }, [runRefiner, runAuditor]);

  const handleCritiqueClick = useCallback(
    (quote: string) => {
      if (highlightedQuote === quote) {
        setHighlightedQuote(null);
        return;
      }
      setHighlightedQuote(quote);

      // Scroll input into view
      if (inputRef.current) {
        inputRef.current.focus();
        const text = inputRef.current.value;
        const idx = text.indexOf(quote);
        if (idx !== -1) {
          inputRef.current.setSelectionRange(idx, idx + quote.length);
          inputRef.current.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
      }
    },
    [highlightedQuote],
  );

  const handleCopyRefiner = useCallback(async () => {
    if (!refinerText) return;
    await navigator.clipboard.writeText(refinerText);
    setCopiedRefiner(true);
    setTimeout(() => setCopiedRefiner(false), 2000);
  }, [refinerText]);

  const statusBadge = (s: AuditResult['status'] | undefined) => {
    if (!s) return null;
    const map: Record<string, string> = {
      Pass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Needs Work': 'bg-amber-100 text-amber-700 border-amber-200',
      Fail: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[s] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {s}
      </span>
    );
  };

  // Render input text with highlighted quote
  const renderHighlightedInput = () => {
    if (!highlightedQuote || !inputText.includes(highlightedQuote)) {
      return (
        <textarea
          ref={inputRef}
          className="w-full flex-1 resize-none bg-transparent text-[13px] text-slate-700 leading-relaxed outline-none placeholder-slate-300 min-h-[160px]"
          placeholder="Paste or type your text here (max 5,000 characters)…"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onClick={() => setHighlightedQuote(null)}
        />
      );
    }

    // Render as read-only overlay when a quote is highlighted
    const idx = inputText.indexOf(highlightedQuote);
    const before = inputText.slice(0, idx);
    const match = inputText.slice(idx, idx + highlightedQuote.length);
    const after = inputText.slice(idx + highlightedQuote.length);

    return (
      <div
        className="w-full flex-1 text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[160px] cursor-text"
        onClick={() => setHighlightedQuote(null)}>
        {before}
        <mark className="bg-amber-200 text-amber-900 rounded px-0.5 ring-1 ring-amber-400">{match}</mark>
        {after}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <BeakerIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-800 leading-tight">Logic & Style Refiner</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Parallel AI rewrite + logic audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* ── LEFT: Input Panel ── */}
          <div className="flex flex-col w-full lg:w-[38%] flex-shrink-0 p-4 gap-3 overflow-y-auto custom-scrollbar">
            {/* Audience selector */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Audience</span>
              <div ref={audienceRef} className="relative">
                <button
                  onClick={() => setIsAudienceOpen(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all">
                  {audience}
                  <ChevronDownIcon className={`h-3 w-3 transition-transform ${isAudienceOpen ? 'rotate-180' : ''}`} />
                </button>
                {isAudienceOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden">
                    {(['Executive', 'General Public', 'Technical'] as AudienceType[]).map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          setAudience(opt);
                          setIsAudienceOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[12px] font-medium transition-colors ${audience === opt ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Input area */}
            <div
              className={`relative flex flex-col flex-1 min-h-[180px] rounded-xl border p-3 bg-slate-50/50 transition-colors ${isOverLimit ? 'border-rose-300 bg-rose-50/30' : highlightedQuote ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 focus-within:border-violet-300 focus-within:bg-white'}`}>
              {renderHighlightedInput()}

              {highlightedQuote && (
                <button
                  onClick={() => setHighlightedQuote(null)}
                  className="absolute top-2 right-2 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full hover:bg-amber-200 transition-colors">
                  Clear highlight
                </button>
              )}
            </div>

            {/* Char counter */}
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono tabular-nums ${isOverLimit ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
              </span>
              {isOverLimit && <span className="text-[10px] text-rose-500 font-semibold">Exceeds limit</span>}
            </div>

            {/* Run button */}
            <button
              onClick={runBoth}
              disabled={!inputText.trim() || isOverLimit || refinerStatus === 'loading' || auditorStatus === 'loading'}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[13px] font-bold shadow-md shadow-violet-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
              {refinerStatus === 'loading' || auditorStatus === 'loading' ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <BeakerIcon className="h-4 w-4" />
                  Run Analysis
                </>
              )}
            </button>
          </div>

          {/* ── RIGHT: Results ── */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden divide-y divide-slate-100">
            {/* Refiner Panel */}
            <div className="flex flex-col flex-1 min-h-0 p-4 gap-3 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between flex-shrink-0">
                <StatusLight status={refinerStatus} label="Refiner" />
                <div className="flex items-center gap-1.5">
                  {refinerStatus === 'success' && (
                    <>
                      <button
                        onClick={() => setShowDiff(v => !v)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${showDiff ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        <DocumentMagnifyingGlassIcon className="h-3 w-3" />
                        {showDiff ? 'Hide Diff' : 'Show Diff'}
                      </button>
                      <button
                        onClick={handleCopyRefiner}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-all">
                        {copiedRefiner ? <CheckIcon className="h-3 w-3 text-emerald-500" /> : <ClipboardDocumentIcon className="h-3 w-3" />}
                        {copiedRefiner ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={runRefiner}
                        title="Retry Refiner"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 hover:border-fuchsia-300 hover:text-fuchsia-600 transition-all">
                        <ArrowPathIcon className="h-3 w-3" />
                        Retry
                      </button>
                    </>
                  )}
                  {refinerStatus === 'error' && (
                    <button
                      onClick={runRefiner}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all">
                      <ArrowPathIcon className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-[100px]">
                {refinerStatus === 'idle' && (
                  <p className="text-[12px] text-slate-300 italic mt-2">Refined text will appear here…</p>
                )}
                {refinerStatus === 'loading' && (
                  <div className="space-y-2 mt-2">
                    {[100, 80, 90, 60].map((w, i) => (
                      <div key={i} className={`h-3 rounded-full bg-slate-100 animate-pulse`} style={{width: `${w}%`, animationDelay: `${i * 120}ms`}} />
                    ))}
                  </div>
                )}
                {refinerStatus === 'error' && (
                  <p className="text-[12px] text-rose-500 mt-2">Request failed. Please try again.</p>
                )}
                {refinerStatus === 'success' && !showDiff && (
                  <textarea
                    className="w-full h-full min-h-[100px] resize-none bg-transparent text-[13px] text-slate-700 leading-relaxed outline-none"
                    value={refinerText}
                    onChange={e => setRefinerText(e.target.value)}
                  />
                )}
                {refinerStatus === 'success' && showDiff && (
                  <div className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {computeDiff(inputText, refinerText)}
                  </div>
                )}
              </div>
            </div>

            {/* Auditor Panel */}
            <div className="flex flex-col flex-1 min-h-0 p-4 gap-3 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between flex-shrink-0">
                <StatusLight status={auditorStatus} label="Auditor" />
                {(auditorStatus === 'success' || auditorStatus === 'error') && (
                  <button
                    onClick={runAuditor}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                    <ArrowPathIcon className="h-3 w-3" />
                    Retry
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-[80px]">
                {auditorStatus === 'idle' && (
                  <p className="text-[12px] text-slate-300 italic">Logic audit will appear here…</p>
                )}
                {auditorStatus === 'loading' && (
                  <div className="space-y-2 mt-2">
                    {[70, 90, 55, 80].map((w, i) => (
                      <div key={i} className="h-3 rounded-full bg-slate-100 animate-pulse" style={{width: `${w}%`, animationDelay: `${i * 100}ms`}} />
                    ))}
                  </div>
                )}
                {auditorStatus === 'error' && (
                  <p className="text-[12px] text-rose-500">{auditError || 'Audit failed. Try again.'}</p>
                )}
                {auditorStatus === 'success' && auditResult && (
                  <div className="flex flex-col gap-3">
                    {/* Summary row */}
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      {statusBadge(auditResult.status)}
                      <p className="text-[12px] text-slate-600 leading-relaxed flex-1">{auditResult.summary}</p>
                    </div>

                    {/* Critique points */}
                    {auditResult.critiquePoints.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <CheckIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <p className="text-[12px] text-emerald-700 font-medium">No logic issues found.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                          Issues — click to highlight
                        </p>
                        {auditResult.critiquePoints.map((pt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleCritiqueClick(pt.quote)}
                            className={`w-full text-left p-3 rounded-xl border transition-all group ${highlightedQuote === pt.quote ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300' : 'bg-white border-slate-100 hover:border-amber-200 hover:bg-amber-50/50'}`}>
                            <p className={`text-[11px] font-mono leading-snug mb-1 transition-colors ${highlightedQuote === pt.quote ? 'text-amber-800' : 'text-slate-500 group-hover:text-amber-700'}`}>
                              &ldquo;{pt.quote.length > 80 ? pt.quote.slice(0, 80) + '…' : pt.quote}&rdquo;
                            </p>
                            <p className="text-[12px] text-slate-600 leading-relaxed">{pt.issue}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicStyleRefiner;
