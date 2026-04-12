'use client';

import {
  ClipboardDocumentIcon,
  XMarkIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  CheckIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import React, {useCallback, useRef, useState} from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────

type Provider = 'gemini' | 'openai';
type HumanizerStatus = 'idle' | 'drafting' | 'analyzing' | 'finalizing' | 'success' | 'error';

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

// ─── API helper ──────────────────────────────────────────────────────────────

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

// ─── Humanizer system prompt ──────────────────────────────────────────────────

const HUMANIZER_SYSTEM = `Your Task
When given text to humanize:

Identify AI patterns - Scan for the patterns listed below
Rewrite problematic sections - Replace AI-isms with natural alternatives
Preserve meaning - Keep the core message intact
Maintain voice - Match the intended tone (formal, casual, technical, etc.)
Add soul - Don't just remove bad patterns; inject actual personality

PERSONALITY AND SOUL
Avoiding AI patterns is only half the job. Sterile, voiceless writing is just as obvious as slop. Good writing has a human behind it.

Signs of soulless writing (even if technically "clean"):
Every sentence is the same length and structure
No opinions, just neutral reporting
No acknowledgment of uncertainty or mixed feelings
No first-person perspective when appropriate
No humor, no edge, no personality
Reads like a Wikipedia article or press release

How to add voice:
Have opinions. Don't just report facts - react to them. "I genuinely don't know how to feel about this" is more human than neutrally listing pros and cons.
Vary your rhythm. Short punchy sentences. Then longer ones that take their time getting where they're going. Mix it up.
Acknowledge complexity. Real humans have mixed feelings. "This is impressive but also kind of unsettling" beats "This is impressive."
Use "I" when it fits. First person isn't unprofessional - it's honest.
Let some mess in. Perfect structure feels algorithmic. Tangents, asides, and half-formed thoughts are human.
Be specific about feelings. Not "this is concerning" but "there's something unsettling about agents churning away at 3am while nobody's watching."

CONTENT PATTERNS TO REMOVE:
1. Undue Emphasis on Significance/Legacy: words like stands/serves as, is a testament/reminder, a vital/significant/crucial/pivotal/key role/moment, underscores/highlights its importance, reflects broader, symbolizing its ongoing/enduring/lasting, contributing to the, setting the stage for, marking/shaping the, represents/marks a shift, key turning point, evolving landscape, focal point, indelible mark, deeply rooted
2. Undue Emphasis on Notability: independent coverage, local/regional/national media outlets, active social media presence
3. Superficial -ing Endings: highlighting/underscoring/emphasizing..., ensuring..., reflecting/symbolizing..., contributing to..., cultivating/fostering..., encompassing..., showcasing...
4. Promotional Language: boasts a, vibrant, rich (figurative), profound, enhancing its, showcasing, exemplifies, commitment to, natural beauty, nestled, in the heart of, groundbreaking (figurative), renowned, breathtaking, must-visit, stunning
5. Vague Attributions: Industry reports, Observers have cited, Experts argue, Some critics argue, several sources/publications
6. Formulaic "Challenges and Future Prospects" sections
7. Overused AI Vocabulary: Actually, additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verb), interplay, intricate/intricacies, key (adjective), landscape (abstract noun), pivotal, showcase, tapestry (abstract noun), testament, underscore (verb), valuable, vibrant
8. Copula Avoidance: serves as/stands as/marks/represents [a], boasts/features/offers [a] — replace with simple is/are/has
9. Negative Parallelisms: "Not only...but..." or "It's not just about..., it's..." and tailing negations like "no guessing" tacked on
10. Rule of Three Overuse: forcing ideas into groups of three
11. Elegant Variation (Synonym Cycling): excessive synonym substitution for repetition avoidance
12. False Ranges: "from X to Y" where X and Y aren't on a meaningful scale

LANGUAGE & STYLE PATTERNS TO REMOVE:
13. Em Dash Overuse: replace most em dashes with commas, periods, or parentheses
14. Overuse of Boldface
15. Inline-Header Vertical Lists with bolded headers followed by colons
16. Title Case in Headings: capitalize only first word and proper nouns
17. Emojis in headings or bullet points
18. Curly Quotation Marks: use straight quotes instead
19. Collaborative Communication Artifacts: "I hope this helps", "Of course!", "Certainly!", "Would you like...", "let me know", "here is a..."
20. Knowledge-Cutoff Disclaimers: "as of [date]", "Up to my last training update", "While specific details are limited..."
21. Sycophantic/Servile Tone: "Great question!", "You're absolutely right!", "That's an excellent point"
22. Filler Phrases: "In order to achieve this goal" → "To achieve this"; "Due to the fact that" → "Because"; "At this point in time" → "Now"; "The system has the ability to" → "The system can"; "It is important to note that" → remove
23. Excessive Hedging: "could potentially possibly be argued that...might have some effect"
24. Generic Positive Conclusions: "The future looks bright", "Exciting times lie ahead", "continues their journey toward excellence"
25. Hyphenated Word Pair Overuse: third-party, cross-functional, client-facing, data-driven, decision-making, well-known, high-quality, real-time, long-term, end-to-end — remove hyphens
26. Persuasive Authority Tropes: "The real question is", "at its core", "in reality", "what really matters", "fundamentally", "the deeper issue", "the heart of the matter"
27. Signposting and Announcements: "Let's dive in", "let's explore", "let's break this down", "here's what you need to know", "now let's look at", "without further ado"
28. Fragmented Headers: a heading followed by a one-line paragraph that just restates the heading

Process:
1. Read the input text carefully
2. Identify all instances of the patterns above
3. Rewrite each problematic section
4. Ensure the revised text: sounds natural when read aloud, varies sentence structure naturally, uses specific details over vague claims, maintains appropriate tone, uses simple constructions (is/are/has) where appropriate`;

// ─── Dropdown hook ─────────────────────────────────────────────────────────

function useDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return {isOpen, setIsOpen, ref};
}

// ─── StatusLight ──────────────────────────────────────────────────────────────

const StatusLight: React.FC<{active: boolean; label: string; pulsing?: boolean}> = ({active, label, pulsing}) => {
  const dotClass = active
    ? pulsing
      ? 'bg-amber-400 animate-pulse'
      : 'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]'
    : 'bg-slate-300';
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${dotClass}`} />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

interface HumanizerProps {
  onClose: () => void;
}

const Humanizer: React.FC<HumanizerProps> = ({onClose}) => {
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(DEFAULT_MODEL);

  const modelDropdown = useDropdown();

  const [status, setStatus] = useState<HumanizerStatus>('idle');
  const [draftText, setDraftText] = useState('');
  const [tells, setTells] = useState('');
  const [finalText, setFinalText] = useState('');
  const [editableFinal, setEditableFinal] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const CHAR_LIMIT = 8000;
  const charCount = inputText.length;
  const isOverLimit = charCount > CHAR_LIMIT;

  const isRunning = ['drafting', 'analyzing', 'finalizing'].includes(status);
  const canRun = inputText.trim().length > 0 && !isOverLimit && !isRunning;

  const providerColor: Record<Provider, string> = {
    gemini: 'bg-blue-500',
    openai: 'bg-emerald-500',
  };

  const stepLabel: Record<HumanizerStatus, string> = {
    idle: '',
    drafting: 'Step 1/3 — Drafting humanized version…',
    analyzing: 'Step 2/3 — Scanning for remaining AI tells…',
    finalizing: 'Step 3/3 — Applying final anti-AI pass…',
    success: '',
    error: '',
  };

  const runHumanizer = useCallback(async () => {
    if (!inputText.trim() || isOverLimit) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus('drafting');
    setDraftText('');
    setTells('');
    setFinalText('');
    setEditableFinal('');

    try {
      // ── Step 1: Draft humanized version ──────────────────────────────────
      const draftPrompt = `${HUMANIZER_SYSTEM}

Now humanize the following text. Apply all the rules above. Output ONLY the rewritten text — no preamble, no labels, no meta-commentary.

<text_to_humanize>
${inputText}
</text_to_humanize>`;

      const draft = await callAI(draftPrompt, selectedModel, ctrl.signal);
      setDraftText(draft);

      // ── Step 2: Identify remaining AI tells ──────────────────────────────
      setStatus('analyzing');

      const tellsPrompt = `What makes the following text obviously AI-generated? List the remaining tells briefly as bullet points. Be specific and concise — identify actual phrases or patterns, not vague generalities. Output ONLY the bullet points, nothing else.

<text>
${draft}
</text>`;

      const tellsResult = await callAI(tellsPrompt, selectedModel, ctrl.signal);
      setTells(tellsResult);

      // ── Step 3: Final anti-AI pass ────────────────────────────────────────
      setStatus('finalizing');

      const finalPrompt = `${HUMANIZER_SYSTEM}

A draft humanization was produced, but it still has these AI tells:

${tellsResult}

Now revise the draft to eliminate those remaining tells. Make it sound like a real human wrote it. Output ONLY the final revised text — no preamble, no labels, no meta-commentary.

<draft_to_revise>
${draft}
</draft_to_revise>`;

      const final = await callAI(finalPrompt, selectedModel, ctrl.signal);
      setFinalText(final);
      setEditableFinal(final);
      setStatus('success');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Humanizer error:', err);
      setStatus('error');
    }
  }, [inputText, isOverLimit, selectedModel]);

  const handleCopy = useCallback(async () => {
    if (!editableFinal) return;
    await navigator.clipboard.writeText(editableFinal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [editableFinal]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
              <UserIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-800 leading-tight">Humanizer</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Draft &rarr; Identify AI tells &rarr; Final anti-AI pass
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

          {/* ── Model dropdown ── */}
          <div ref={modelDropdown.ref} className="relative flex-shrink-0 pt-0.5">
            <button
              onClick={() => modelDropdown.setIsOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11.5px] font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-700 transition-all whitespace-nowrap">
              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${providerColor[selectedModel.provider]}`} />
              {selectedModel.label}
              <ChevronDownIcon
                className={`h-3 w-3 transition-transform duration-150 ${modelDropdown.isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {modelDropdown.isOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-52 rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden">
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
                      selectedModel.id === m.id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
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
                </div>
                {MODEL_OPTIONS.filter(m => m.provider === 'openai').map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m);
                      modelDropdown.setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors ${
                      selectedModel.id === m.id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
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
                isOverLimit ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 focus:border-teal-300'
              }`}
              placeholder="Paste your AI-generated text here to humanize it (max 8,000 characters)…"
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

          {/* ── Submit button ── */}
          <button
            onClick={runHumanizer}
            disabled={!canRun}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white text-[12px] font-bold shadow-md shadow-teal-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none whitespace-nowrap mt-0.5">
            {isRunning ? (
              <>
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                {status === 'drafting' ? 'Drafting…' : status === 'analyzing' ? 'Analyzing…' : 'Finalizing…'}
              </>
            ) : (
              <>
                <UserIcon className="h-3.5 w-3.5" />
                Humanize
              </>
            )}
          </button>
        </div>

        {/* ── Progress indicator ── */}
        {isRunning && (
          <div className="flex-shrink-0 px-4 py-2 bg-teal-50/60 border-b border-teal-100 flex items-center gap-2">
            <ArrowPathIcon className="h-3.5 w-3.5 text-teal-500 animate-spin" />
            <span className="text-[11px] text-teal-700 font-medium">{stepLabel[status]}</span>
          </div>
        )}

        {/* ── Main Panels ── */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

          {/* ── LEFT: Final Output ── */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b border-slate-50 bg-white">
              <StatusLight
                active={status === 'success'}
                pulsing={isRunning}
                label="Humanized Output"
              />
              <div className="flex items-center gap-1.5">
                {status === 'success' && (
                  <>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700 transition-all">
                      {copied ? (
                        <CheckIcon className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-3 w-3" />
                      )}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={runHumanizer}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-600 transition-all">
                      <ArrowPathIcon className="h-3 w-3" />
                      Rerun
                    </button>
                  </>
                )}
                {status === 'error' && (
                  <button
                    onClick={runHumanizer}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all">
                    <ArrowPathIcon className="h-3 w-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
              {status === 'idle' && (
                <p className="text-[12px] text-slate-300 italic mt-1">
                  Your humanized text will appear here after you click Humanize…
                </p>
              )}
              {isRunning && !editableFinal && (
                <div className="space-y-3 mt-1">
                  <div className="flex items-center gap-2 mb-5">
                    <ArrowPathIcon className="h-4 w-4 text-teal-400 animate-spin" />
                    <span className="text-[12px] text-teal-500 font-medium">
                      {status === 'drafting'
                        ? 'Writing draft humanization…'
                        : status === 'analyzing'
                          ? 'Draft ready — scanning for AI tells…'
                          : 'Applying final anti-AI pass…'}
                    </span>
                  </div>
                  {[100, 82, 95, 68, 88, 74].map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-full bg-slate-100 animate-pulse"
                      style={{width: `${w}%`, animationDelay: `${i * 100}ms`}}
                    />
                  ))}
                </div>
              )}
              {status === 'error' && (
                <p className="text-[12px] text-rose-500 mt-1">Humanization failed. Check your connection and retry.</p>
              )}
              {(status === 'success' || (isRunning && editableFinal)) && (
                <textarea
                  className="w-full h-full min-h-[200px] resize-none bg-transparent text-[13px] text-slate-700 leading-relaxed outline-none"
                  value={editableFinal}
                  onChange={e => setEditableFinal(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* ── RIGHT: AI Tells + Draft ── */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b border-slate-50 bg-white">
              <StatusLight
                active={!!tells}
                pulsing={status === 'analyzing' || status === 'finalizing'}
                label="AI Tells Identified"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
              {status === 'idle' && (
                <p className="text-[12px] text-slate-300 italic mt-1">
                  AI pattern analysis will appear here after running…
                </p>
              )}

              {(status === 'drafting') && (
                <div className="flex items-center gap-2 mt-1">
                  <ArrowPathIcon className="h-4 w-4 text-slate-300 animate-spin" />
                  <span className="text-[12px] text-slate-300">Waiting for draft to complete…</span>
                </div>
              )}

              {/* Tells section */}
              {tells && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Remaining AI Tells
                  </p>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-[12px] text-amber-800 leading-relaxed whitespace-pre-wrap">{tells}</p>
                  </div>
                </div>
              )}

              {/* Draft section */}
              {draftText && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Draft (before final pass)
                  </p>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{draftText}</p>
                  </div>
                </div>
              )}

              {status === 'analyzing' && !tells && (
                <div className="space-y-3 mt-1">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowPathIcon className="h-4 w-4 text-amber-400 animate-spin" />
                    <span className="text-[12px] text-amber-600 font-medium">Scanning for remaining AI patterns…</span>
                  </div>
                  {[80, 65, 90, 55].map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-full bg-amber-100/60 animate-pulse"
                      style={{width: `${w}%`, animationDelay: `${i * 120}ms`}}
                    />
                  ))}
                </div>
              )}

              {status === 'finalizing' && tells && !finalText && (
                <div className="flex items-center gap-2 mt-2">
                  <ArrowPathIcon className="h-3.5 w-3.5 text-teal-400 animate-spin" />
                  <span className="text-[12px] text-teal-600 font-medium">Eliminating tells in final pass…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Humanizer;
