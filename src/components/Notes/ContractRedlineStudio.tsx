/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props, @next/next/no-img-element */
'use client';

// Contract Redline & Comment Analyzer, version 2 (admin only, /notes/contract-review).
// Adds analyst guidance (Input C), a risk-tolerance dial (Input D), a plain-language analogy,
// and a colour-coded redraft that keeps each party's tracked changes and shows suggestions in yellow.

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  PencilSquareIcon,
  PhotoIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {DEFAULT_MODEL, MODEL_OPTIONS, ModelOption, Provider, RiskBadge, useDropdown} from './ContractRedlineAnalyzer';

// ─── Risk tolerance (Input D) ────────────────────────────────────────────────

const TOLERANCE: Record<number, {label: string; hint: string; instruction: string}> = {
  1: {
    label: 'Not important',
    hint: 'Be flexible. Only push back on clear deal-breakers.',
    instruction:
      'This topic is NOT important to OPG. Be pragmatic and flexible: accept or lightly modify reasonable vendor changes, keep the relationship smooth, and only push back on clear deal-breakers (e.g. unlimited liability, unlawful terms, uninsurable risk). Suggested redraft changes should be minimal.',
  },
  2: {
    label: 'Low importance',
    hint: 'Lean toward accommodating the vendor.',
    instruction:
      'This topic is of LOW importance to OPG. Lean toward accommodating the vendor where the risk is manageable, and prefer light-touch modifications over rejection. Keep suggested redraft changes modest.',
  },
  3: {
    label: 'Default stance',
    hint: 'Standard OPG position.',
    instruction: "Take OPG's standard, balanced negotiating position on this topic.",
  },
  4: {
    label: 'Important',
    hint: 'Push harder to protect OPG.',
    instruction:
      'This topic is IMPORTANT to OPG. Push harder than usual: reject changes that shift risk or cost to OPG unless there is a clear offsetting benefit, and propose protective language in the redraft.',
  },
  5: {
    label: 'Very important',
    hint: 'Hold firm. Reject risk shifted to OPG.',
    instruction:
      "This topic is VERY IMPORTANT to OPG. Hold firm: reject vendor changes that reduce OPG's protections or shift risk, cost, or liability to OPG; restore or strengthen protective language in the redraft; concede nothing material.",
  },
};

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildPrompt({comments, guidance, tolerance}: {comments: string; guidance: string; tolerance: number}) {
  const t = TOLERANCE[tolerance];
  return `You are a Senior Commercial and Legal Negotiator representing the Owner (Ontario Power Generation / OPG). You are reviewing supplier/vendor redlines and comments on a contract.
1. Transcribe the tracked changes accurately, paying strict attention to insertions and deletions and to WHO made each change (each party's changes usually appear in a different colour).
2. Assess the commercial and legal risk of these specific edits to OPG.
3. Determine the negotiation stance (Accept, Reject, Modify).
4. Give a short, simple everyday analogy that explains the risk to OPG colleagues who are not lawyers.
5. Redraft the affected clause(s): keep the original wording and every existing tracked change (insertions and deletions by either party, with that party's colour), then add OPG's suggested changes on top.
6. Draft a direct, professional response to the vendor that defends OPG's interests. Use everyday language, no legal fluff, and do not concede leverage.

RISK TOLERANCE for this topic: ${tolerance} out of 5 (${t.label}). ${t.instruction}
Let this tolerance shape the risk level, the stance, how much you change in the redraft, and the tone of both replies.
${guidance.trim() ? `\nANALYST GUIDANCE (from the OPG reviewer — follow it unless it would clearly harm OPG, and say so if it would):\n${guidance.trim()}\n` : ''}
The user may provide only an image of redlines, only text comments, or both. Assess whatever is provided.

REDRAFT RULES:
- "segments" must reconstruct each clause in reading order. Concatenating every segment's text in order gives the marked-up clause.
- type "original": unchanged contract text.
- type "insert": text a party has ADDED in the existing redline. Set "party" to who made it.
- type "delete": text a party has STRUCK in the existing redline (keep it so the user can see it). Set "party".
- type "suggest_insert": text YOU recommend OPG adds now.
- type "suggest_delete": existing text YOU recommend OPG strikes now (including vendor insertions OPG should reject).
- "parties": every party whose changes appear, with the colour used for their changes in the screenshot as a hex code (estimate from the image; if there is no image, use #c62828 for the vendor and #1565c0 for OPG).
- Keep spacing inside segment text so words don't run together.
- "proposedClean": the clause as it would read if OPG's suggestions are accepted (no markup).
- If there is no clause text to work from, return an empty "clauses" array.

Respond with ONLY a valid JSON object — no markdown fences, no preamble, no trailing text:
{
  "transcriptionCheck": "Briefly state what changes you detected (and who made them) so the user can verify accuracy.",
  "riskLevel": "High",
  "assessment": {
    "commercial": "Analysis of cost, scope, or leverage impacts.",
    "legal": "Analysis of liability, indemnity, or compliance impacts."
  },
  "recommendedStance": "Direct advice on what to hold firm on.",
  "analogy": "2-3 short sentences. A simple everyday analogy (home, car, renting, insurance, etc.) that explains the risk to OPG in plain words someone can repeat in a meeting.",
  "redraft": {
    "clauses": [
      {
        "reference": "e.g. Section 12.3 – Limitation of Liability",
        "parties": [{"name": "Vendor", "color": "#c62828"}, {"name": "OPG", "color": "#1565c0"}],
        "segments": [
          {"type": "original", "text": "The Contractor's total liability "},
          {"type": "delete", "party": "Vendor", "text": "shall not exceed the Contract Price"},
          {"type": "insert", "party": "Vendor", "text": "is limited to fees paid in the prior 12 months"},
          {"type": "suggest_delete", "text": "in the prior 12 months"},
          {"type": "suggest_insert", "text": "under this Contract"},
          {"type": "original", "text": "."}
        ],
        "rationale": "Why each suggested change protects OPG, in one or two sentences.",
        "proposedClean": "The Contractor's total liability is limited to fees paid under this Contract."
      }
    ]
  },
  "casualResponse": "A relaxed, conversational reply to the vendor — formality level 6 out of 10. Still professional and firm, but written like a confident colleague. No stiff legal phrasing. Short sentences. Gets to the point fast.",
  "draftResponse": "The formal version — exact text to copy-paste to the vendor/supplier. Formality level 10 out of 10."
}${comments.trim() ? `\n\nVendor comments / email chain:\n${comments.trim()}` : ''}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type SegmentType = 'original' | 'insert' | 'delete' | 'suggest_insert' | 'suggest_delete';

interface Segment {
  type: SegmentType;
  text: string;
  party?: string;
}

interface Clause {
  reference?: string;
  parties?: {name: string; color: string}[];
  segments: Segment[];
  rationale?: string;
  proposedClean?: string;
}

interface StudioResult {
  transcriptionCheck: string;
  riskLevel: string;
  assessment: {commercial: string; legal: string};
  recommendedStance: string;
  analogy?: string;
  redraft?: {clauses?: Clause[]};
  casualResponse?: string;
  draftResponse: string;
}

const FALLBACK_COLORS = ['#c62828', '#1565c0', '#2e7d32', '#6a1b9a', '#ef6c00'];
const SUGGEST_BG = '#fff176';
const SUGGEST_EDGE = '#c9a400';

/** Each party's colour, trusting the model's hex only when it's a real colour. */
function partyColors(clause: Clause) {
  const map = new Map<string, string>();
  (clause.parties || []).forEach((p, i) => {
    const color = /^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    map.set((p.name || '').toLowerCase(), color);
  });
  return (party?: string) => {
    const key = (party || '').toLowerCase();
    if (!map.has(key)) map.set(key, FALLBACK_COLORS[map.size % FALLBACK_COLORS.length]);
    return map.get(key)!;
  };
}

function segmentStyle(seg: Segment, colorOf: (p?: string) => string): React.CSSProperties {
  switch (seg.type) {
    case 'insert':
      return {color: colorOf(seg.party), textDecoration: 'underline', textDecorationThickness: '1.5px', textUnderlineOffset: '3px'};
    case 'delete':
      return {color: colorOf(seg.party), textDecoration: 'line-through', textDecorationThickness: '1.5px'};
    case 'suggest_insert':
      return {background: SUGGEST_BG, boxShadow: `inset 0 -2px 0 ${SUGGEST_EDGE}`, color: '#3a2f00', fontWeight: 600, borderRadius: 2};
    case 'suggest_delete':
      return {background: SUGGEST_BG, color: '#6b5a00', textDecoration: 'line-through', textDecorationThickness: '2px', borderRadius: 2};
    default:
      return {};
  }
}

const SEGMENT_LABEL: Record<SegmentType, string> = {
  original: 'Original text',
  insert: 'added',
  delete: 'struck',
  suggest_insert: 'Suggested addition',
  suggest_delete: 'Suggested deletion',
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cssText = (style: React.CSSProperties) =>
  Object.entries(style)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${typeof v === 'number' ? `${v}px` : v}`)
    .join(';');

/** Rich HTML of the marked-up clause, so colours and strikethroughs survive pasting into Word or Outlook. */
function clauseHtml(clause: Clause) {
  const colorOf = partyColors(clause);
  const body = clause.segments
    .map(seg => {
      const style = cssText(segmentStyle(seg, colorOf));
      const tag = seg.type === 'delete' || seg.type === 'suggest_delete' ? 's' : 'span';
      return style ? `<${tag} style="${style}">${escapeHtml(seg.text)}</${tag}>` : escapeHtml(seg.text);
    })
    .join('');
  return `${clause.reference ? `<p><strong>${escapeHtml(clause.reference)}</strong></p>` : ''}<p style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5">${body}</p>`;
}

function parseResult(text: string): StudioResult {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Some models wrap the JSON in commentary; take the outermost object
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Unreadable response');
  }
}

// ─── Small pieces ────────────────────────────────────────────────────────────

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  const mark = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(c => (c === key ? null : c)), 2000);
  };
  return {copied, mark};
}

function CopyButton({label, done, onClick}: {label: string; done: boolean; onClick: () => void}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-all">
      {done ? <CheckIcon className="h-3 w-3 text-emerald-500" /> : <ClipboardDocumentIcon className="h-3 w-3" />}
      {done ? 'Copied!' : label}
    </button>
  );
}

function SectionLabel({children}: {children: React.ReactNode}) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{children}</p>;
}

function ClauseView({clause, copied, onCopyRich, onCopyClean}: {clause: Clause; copied: string | null; onCopyRich: () => void; onCopyClean: () => void}) {
  const colorOf = partyColors(clause);
  const parties = (clause.parties || []).map(p => ({name: p.name, color: colorOf(p.name)}));
  // Parties referenced by segments but missing from the list still get a legend entry
  clause.segments.forEach(seg => {
    if ((seg.type === 'insert' || seg.type === 'delete') && seg.party && !parties.some(p => p.name.toLowerCase() === seg.party!.toLowerCase())) {
      parties.push({name: seg.party, color: colorOf(seg.party)});
    }
  });
  const suggestions = clause.segments.filter(s => s.type === 'suggest_insert' || s.type === 'suggest_delete').length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
        <p className="text-[12.5px] font-bold text-slate-700">{clause.reference || 'Redrafted clause'}</p>
        <div className="flex items-center gap-1.5">
          <CopyButton done={copied === `rich-${clause.reference}`} label="Copy with formatting" onClick={onCopyRich} />
          {clause.proposedClean && <CopyButton done={copied === `clean-${clause.reference}`} label="Copy clean text" onClick={onCopyClean} />}
        </div>
      </div>

      {/* Legend: each party's colour, then the yellow used for suggestions */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pt-3 text-[11px] text-slate-500">
        {parties.map(p => (
          <span key={p.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{background: p.color}} />
            {p.name}: <span style={{color: p.color, textDecoration: 'underline'}}>added</span> /{' '}
            <span style={{color: p.color, textDecoration: 'line-through'}}>struck</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{background: SUGGEST_BG, boxShadow: `inset 0 -2px 0 ${SUGGEST_EDGE}`}} />
          Suggested: <span style={segmentStyle({type: 'suggest_insert', text: ''}, colorOf)}>add</span> /{' '}
          <span style={segmentStyle({type: 'suggest_delete', text: ''}, colorOf)}>remove</span>
        </span>
        <span className="ml-auto text-slate-400">{suggestions} suggested change{suggestions === 1 ? '' : 's'}</span>
      </div>

      <p className="px-4 py-3 text-[14px] leading-[1.9] text-slate-800 whitespace-pre-wrap" style={{fontFamily: 'Georgia, Cambria, serif'}}>
        {clause.segments.map((seg, i) => (
          <span
            key={i}
            style={segmentStyle(seg, colorOf)}
            title={seg.type === 'insert' || seg.type === 'delete' ? `${seg.party || 'A party'} ${SEGMENT_LABEL[seg.type]}` : seg.type === 'original' ? undefined : SEGMENT_LABEL[seg.type]}>
            {seg.text}
          </span>
        ))}
      </p>

      {clause.rationale && (
        <div className="mx-4 mb-3 rounded-lg px-3 py-2 text-[12.5px] text-slate-600 leading-relaxed" style={{background: '#fffbe0', borderLeft: `3px solid ${SUGGEST_EDGE}`}}>
          <strong className="text-slate-700">Why these changes: </strong>
          {clause.rationale}
        </div>
      )}
      {clause.proposedClean && (
        <details className="mx-4 mb-3 text-[12.5px] text-slate-600">
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-slate-700">Show clean version (suggestions accepted)</summary>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed" style={{fontFamily: 'Georgia, Cambria, serif'}}>
            {clause.proposedClean}
          </p>
        </details>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ContractRedlineStudio() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState('image/png');
  const [commentText, setCommentText] = useState('');
  const [guidance, setGuidance] = useState('');
  const [tolerance, setTolerance] = useState(3);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const [selectedModel, setSelectedModel] = useState<ModelOption>(DEFAULT_MODEL);
  const modelDropdown = useDropdown();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<StudioResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [transcriptionOpen, setTranscriptionOpen] = useState(true);
  const {copied, mark} = useCopied();
  const abortRef = useRef<AbortController | null>(null);

  const hasImage = !!imageDataUrl;
  const hasText = commentText.trim().length > 0;
  const canSubmit = (hasImage || hasText) && status !== 'loading';

  const loadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      setImageDataUrl(e.target?.result as string);
      setImageMimeType(file.type || 'image/png');
    };
    reader.readAsDataURL(file);
  }, []);

  // Paste a screenshot anywhere on the page (unless typing in a field)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') && active !== dropzoneRef.current) return;
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        loadImage(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [loadImage]);

  const handleClear = () => {
    abortRef.current?.abort();
    setImageDataUrl(null);
    setCommentText('');
    setGuidance('');
    setTolerance(3);
    setStatus('idle');
    setResult(null);
    setErrorText(null);
  };

  const runAnalysis = async () => {
    if (!canSubmit) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('loading');
    setResult(null);
    setErrorText(null);

    const prompt = buildPrompt({comments: commentText, guidance, tolerance});
    try {
      let responseText = '';
      if (selectedModel.provider === 'gemini') {
        const res = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            apiKey: 'MANAGED',
            prompt,
            model: selectedModel.id,
            attachments: imageDataUrl ? [{type: 'image', content: imageDataUrl, mimeType: imageMimeType}] : [],
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`The AI service returned ${res.status}.`);
        responseText = (await res.json()).text || '';
      } else {
        const res = await fetch('/api/openai/generate', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({apiKey: 'MANAGED', model: selectedModel.id, messages: [{role: 'user', content: prompt}]}),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`The AI service returned ${res.status}.`);
        responseText = (await res.json()).text || '';
      }
      const parsed = parseResult(responseText);
      parsed.redraft = {clauses: (parsed.redraft?.clauses || []).filter(c => Array.isArray(c.segments) && c.segments.length)};
      setResult(parsed);
      setTranscriptionOpen(true);
      setStatus('success');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Redline analysis error:', err);
      setErrorText(
        err instanceof Error && err.message.startsWith('The AI service')
          ? `${err.message} Try again or switch model.`
          : 'Could not read the AI response. Try again or switch to a more capable model.',
      );
      setStatus('error');
    }
  };

  const copyText = async (key: string, text?: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    mark(key);
  };

  const copyRich = async (clause: Clause) => {
    const html = clauseHtml(clause);
    const plain = clause.segments.map(s => s.text).join('');
    try {
      await navigator.clipboard.write([
        new ClipboardItem({'text/html': new Blob([html], {type: 'text/html'}), 'text/plain': new Blob([plain], {type: 'text/plain'})}),
      ]);
    } catch {
      await navigator.clipboard.writeText(plain);
    }
    mark(`rich-${clause.reference}`);
  };

  const providerDot: Record<Provider, string> = {gemini: 'bg-blue-500', openai: 'bg-emerald-500'};
  const t = TOLERANCE[tolerance];
  const clauses = result?.redraft?.clauses || [];

  return (
    <div className="h-full overflow-y-auto bg-slate-50/60">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <Link className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700" href="/notes">
            <ArrowLeftIcon className="h-3.5 w-3.5" /> Notes
          </Link>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-sm flex-shrink-0">
            <DocumentMagnifyingGlassIcon className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[14px] font-bold text-slate-800 leading-tight flex items-center gap-2">
              Contract Redline & Comment Analyzer
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9.5px] font-bold text-violet-700">v2 · Admin</span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5">OPG Owner perspective — commercial & legal risk, analogy, and redraft</p>
          </div>
        </div>
        <div ref={modelDropdown.ref} className="relative flex-shrink-0">
          <button
            onClick={() => modelDropdown.setIsOpen(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11.5px] font-semibold text-slate-700 hover:border-slate-300">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${providerDot[selectedModel.provider]}`} />
            {selectedModel.label}
            {!selectedModel.supportsImages && hasImage && <ExclamationTriangleIcon className="h-3 w-3 text-amber-400" />}
            <ChevronDownIcon className={`h-3 w-3 transition-transform ${modelDropdown.isOpen ? 'rotate-180' : ''}`} />
          </button>
          {modelDropdown.isOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden py-1">
              {(['gemini', 'openai'] as Provider[]).map(provider => (
                <div key={provider}>
                  <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {provider === 'gemini' ? 'Google Gemini · reads images' : 'OpenAI · text only'}
                  </p>
                  {MODEL_OPTIONS.filter(m => m.provider === provider).map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m);
                        modelDropdown.setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium ${selectedModel.id === m.id ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${providerDot[provider]}`} />
                      {m.label}
                      {m.id === DEFAULT_MODEL.id && <span className="ml-auto text-[9px] text-slate-400 font-normal">default</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-5 flex flex-col gap-4">
        {/* Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* A — screenshot */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <SectionLabel>Input A — Redline Screenshot</SectionLabel>
              {!selectedModel.supportsImages && (
                <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                  <ExclamationTriangleIcon className="h-3 w-3" /> Image ignored by selected model
                </span>
              )}
            </div>
            {!imageDataUrl ? (
              <div
                ref={dropzoneRef}
                tabIndex={0}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
                  if (file) loadImage(file);
                }}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed min-h-[170px] bg-white outline-none focus:border-violet-400 ${isDraggingOver ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <PhotoIcon className="h-5 w-5 text-slate-400" />
                </div>
                <div className="text-center px-4">
                  <p className="text-[12px] font-semibold text-slate-500">Paste screenshot here</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ctrl+V · drag &amp; drop · or{' '}
                    <label className="text-violet-600 cursor-pointer hover:underline">
                      browse
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) loadImage(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white group min-h-[170px] flex items-center justify-center">
                <img src={imageDataUrl} alt="Redline screenshot" className="max-h-[240px] max-w-full object-contain" />
                <button
                  onClick={() => setImageDataUrl(null)}
                  aria-label="Remove screenshot"
                  className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* B — vendor comments */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Input B — Vendor Comments / Email Chain</SectionLabel>
            <textarea
              className="flex-1 min-h-[170px] resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12.5px] text-slate-700 leading-relaxed outline-none placeholder-slate-300 focus:border-slate-300"
              placeholder="Paste vendor comments, email chains, or negotiation notes here…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
          </div>

          {/* C — reviewer guidance */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Input C — Your Guidance for the AI</SectionLabel>
            <textarea
              className="min-h-[120px] resize-y rounded-xl border border-violet-200 bg-violet-50/30 px-4 py-3 text-[12.5px] text-slate-700 leading-relaxed outline-none placeholder-slate-400 focus:border-violet-300 focus:bg-white"
              placeholder="Context the AI should take into account, e.g. “We already agreed a 12-month cap in the RFP”, “Legal is fine with mutual indemnity”, “Keep the relationship warm — sole source”."
              value={guidance}
              onChange={e => setGuidance(e.target.value)}
            />
          </div>

          {/* D — risk tolerance */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Input D — How Important Is This Topic?</SectionLabel>
            <div className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[22px] font-bold text-slate-800">
                  {tolerance}
                  <span className="text-[13px] font-semibold text-slate-400"> / 5</span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    tolerance <= 2 ? 'bg-emerald-50 text-emerald-700' : tolerance === 3 ? 'bg-slate-100 text-slate-600' : tolerance === 4 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                  {t.label}
                </span>
              </div>
              <input
                aria-label="Risk tolerance from 1 (not important) to 5 (very important)"
                className="mt-2 w-full accent-slate-800"
                max={5}
                min={1}
                onChange={e => setTolerance(Number(e.target.value))}
                step={1}
                type="range"
                value={tolerance}
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>1 · Not important</span>
                <span>3 · Default</span>
                <span>5 · Very important</span>
              </div>
              <p className="mt-2 text-[11.5px] text-slate-500">{t.hint}</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            {!hasImage && !hasText ? (
              <span>Provide a redline screenshot, vendor comments, or both to begin.</span>
            ) : (
              <>
                {hasImage && <span className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">Image ready</span>}
                {hasText && <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{commentText.trim().length} chars of comments</span>}
                {guidance.trim() && <span className="rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">Guidance included</span>}
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Importance {tolerance}/5</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(hasImage || hasText || guidance || status !== 'idle') && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-[12px] font-semibold hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                <ArrowUturnLeftIcon className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            <button
              onClick={runAnalysis}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 text-white text-[12.5px] font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed">
              {status === 'loading' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentMagnifyingGlassIcon className="h-4 w-4" />}
              {status === 'loading' ? 'Analyzing…' : 'Assess Risk'}
            </button>
          </div>
        </div>

        {status === 'loading' && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
            <ArrowPathIcon className="h-5 w-5 text-slate-400 animate-spin" />
            <p className="text-[12px] text-slate-500">Reading the redline, weighing the risk at importance {tolerance}/5, and drafting the redraft…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <ExclamationTriangleIcon className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-rose-700">Analysis failed</p>
              <p className="text-[12px] text-rose-600 mt-0.5">{errorText}</p>
            </div>
            <button
              onClick={runAnalysis}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 flex-shrink-0">
              <ArrowPathIcon className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {status === 'success' && result && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiskBadge level={result.riskLevel || 'Medium'} />
                <span className="text-[11px] text-slate-400">at importance {tolerance}/5 ({t.label.toLowerCase()})</span>
              </div>
              <button
                onClick={runAnalysis}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 hover:text-slate-700">
                <ArrowPathIcon className="h-3 w-3" /> Re-analyze
              </button>
            </div>

            {result.transcriptionCheck && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                <button onClick={() => setTranscriptionOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-left">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Transcription Check</span>
                    <span className="text-[10px] text-amber-500">— verify AI accuracy before proceeding</span>
                  </div>
                  <ChevronDownIcon className={`h-4 w-4 text-amber-400 transition-transform ${transcriptionOpen ? 'rotate-180' : ''}`} />
                </button>
                {transcriptionOpen && (
                  <p className="px-4 pb-3 pt-2.5 border-t border-amber-200/60 text-[12.5px] text-amber-800 leading-relaxed">{result.transcriptionCheck}</p>
                )}
              </div>
            )}

            {/* Analogy — new */}
            {result.analogy && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <LightBulbIcon className="h-4 w-4 text-sky-600" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-sky-700">Explain It Simply — Analogy for OPG</p>
                  </div>
                  <CopyButton done={copied === 'analogy'} label="Copy" onClick={() => copyText('analogy', result.analogy)} />
                </div>
                <p className="text-[14px] text-slate-800 leading-relaxed">{result.analogy}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600">$</span>
                  <SectionLabel>Commercial Impact</SectionLabel>
                </div>
                <p className="text-[13px] text-slate-700 leading-relaxed">{result.assessment?.commercial}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-[10px] font-black text-violet-600">§</span>
                  <SectionLabel>Legal Impact</SectionLabel>
                </div>
                <p className="text-[13px] text-slate-700 leading-relaxed">{result.assessment?.legal}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-900 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">OPG Negotiation Stance</p>
              <p className="text-[13px] text-white leading-relaxed">{result.recommendedStance}</p>
            </div>

            {/* Redraft — new */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <PencilSquareIcon className="h-4 w-4 text-slate-500" />
                <SectionLabel>Redrafted Wording — Original, Tracked Changes &amp; Suggestions</SectionLabel>
              </div>
              {clauses.length ? (
                clauses.map((clause, i) => (
                  <ClauseView
                    clause={clause}
                    copied={copied}
                    key={`${clause.reference}-${i}`}
                    onCopyClean={() => copyText(`clean-${clause.reference}`, clause.proposedClean)}
                    onCopyRich={() => copyRich(clause)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-[12px] text-slate-500">
                  No clause text to redraft. Add a redline screenshot or paste the clause wording into Input B.
                </div>
              )}
            </div>

            {result.casualResponse && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-100/70">
                  <div className="flex items-center gap-2">
                    <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-indigo-400" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Casual Reply</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-500 font-semibold border border-indigo-200">6 / 10 formality</span>
                  </div>
                  <CopyButton done={copied === 'casual'} label="Copy" onClick={() => copyText('casual', result.casualResponse)} />
                </div>
                <p className="p-4 text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{result.casualResponse}</p>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Draft Response to Vendor</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold border border-slate-200">10 / 10 formality</span>
                </div>
                <CopyButton done={copied === 'draft'} label="Copy to Clipboard" onClick={() => copyText('draft', result.draftResponse)} />
              </div>
              <p className="p-4 text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">{result.draftResponse}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
