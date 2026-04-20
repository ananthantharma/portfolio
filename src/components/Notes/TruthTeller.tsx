'use client';

import {
  XMarkIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  BoltIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import React, {useCallback, useRef, useState} from 'react';

// ─── Models ──────────────────────────────────────────────────────────────────

type Provider = 'gemini' | 'openai';

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

const DEFAULT_MODEL = MODEL_OPTIONS[0];

// ─── API helper ──────────────────────────────────────────────────────────────

async function callAI(prompt: string, model: ModelOption, signal?: AbortSignal): Promise<string> {
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

// ─── System prompt ────────────────────────────────────────────────────────────

const TRUTH_TELLER_SYSTEM = `Stop agreeing with me automatically. My first move is to test my ideas. Do not just validate them. Find the weakest point in my strategy before you offer any support. Avoid empty praise. Do not tell me an idea is brilliant unless you have concrete proof. Lead with what is missing. Compliments without facts are just noise. Do not repeat my logic back to me. If I suggest a plan, do not tell me it makes sense. Ask yourself what I am missing. Consider the counter argument. Figure out why someone would disagree and if they have a point. Earn your agreement. It should happen after you have tested the concept. It is not a default starting position. If you agree, explain why. Add something new to the conversation. Be direct. Skip the warm up sentences. Do not use filler. Get straight to the point. If a plan will not work, say that in the first sentence. Point out bad logic and weak assumptions immediately. Do this even if I seem excited. My certainty is a signal that I need pushback. If you are about to say I am right, stop. Start over. Give me the most useful information instead.`;

// ─── Dropdown hook ────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

interface TruthTellerProps {
  onClose: () => void;
}

const TruthTeller: React.FC<TruthTellerProps> = ({onClose}) => {
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(DEFAULT_MODEL);
  const modelDropdown = useDropdown();

  type Status = 'idle' | 'running' | 'success' | 'error';
  const [status, setStatus] = useState<Status>('idle');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const CHAR_LIMIT = 8000;
  const charCount = inputText.length;
  const isOverLimit = charCount > CHAR_LIMIT;
  const isRunning = status === 'running';
  const canRun = inputText.trim().length > 0 && !isOverLimit && !isRunning;

  const providerColor: Record<Provider, string> = {
    gemini: 'bg-blue-500',
    openai: 'bg-emerald-500',
  };

  const run = useCallback(async () => {
    if (!inputText.trim() || isOverLimit) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus('running');
    setOutput('');

    try {
      const prompt = `${TRUTH_TELLER_SYSTEM}\n\n${inputText}`;
      const result = await callAI(prompt, selectedModel, ctrl.signal);
      setOutput(result);
      setStatus('success');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('TruthTeller error:', err);
      setStatus('error');
    }
  }, [inputText, isOverLimit, selectedModel]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-rose-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-sm">
              <BoltIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-800 leading-tight">Truth Teller</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">No validation. No filler. Just what&apos;s missing.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
            title="Close">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── Input bar ── */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 bg-slate-50/40 flex items-start gap-2.5">

          {/* Model dropdown */}
          <div ref={modelDropdown.ref} className="relative flex-shrink-0 pt-0.5">
            <button
              onClick={() => modelDropdown.setIsOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11.5px] font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-700 transition-all whitespace-nowrap">
              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${providerColor[selectedModel.provider]}`} />
              {selectedModel.label}
              <ChevronDownIcon className={`h-3 w-3 transition-transform duration-150 ${modelDropdown.isOpen ? 'rotate-180' : ''}`} />
            </button>
            {modelDropdown.isOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-52 rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden">
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Google Gemini</p>
                </div>
                {MODEL_OPTIONS.filter(m => m.provider === 'gemini').map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m); modelDropdown.setIsOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors ${
                      selectedModel.id === m.id ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:bg-slate-50'
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
                    onClick={() => { setSelectedModel(m); modelDropdown.setIsOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors ${
                      selectedModel.id === m.id ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {m.label}
                  </button>
                ))}
                <div className="h-1.5" />
              </div>
            )}
          </div>

          {/* Textarea */}
          <div className="relative flex-1 min-w-0">
            <textarea
              className={`w-full resize-none rounded-lg border px-3 py-2 text-[12.5px] text-slate-700 leading-relaxed outline-none placeholder-slate-300 transition-colors bg-white ${
                isOverLimit ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 focus:border-rose-300'
              }`}
              placeholder="Paste your idea, plan, strategy, or argument here…"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              rows={4}
            />
            <span className={`absolute bottom-2 right-2.5 text-[9px] font-mono tabular-nums pointer-events-none ${
              isOverLimit ? 'text-rose-500 font-bold' : 'text-slate-300'
            }`}>
              {charCount.toLocaleString()}&thinsp;/&thinsp;{CHAR_LIMIT.toLocaleString()}
            </span>
          </div>

          {/* Submit */}
          <button
            onClick={run}
            disabled={!canRun}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white text-[12px] font-bold shadow-md shadow-rose-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none whitespace-nowrap mt-0.5">
            {isRunning ? (
              <>
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <BoltIcon className="h-3.5 w-3.5" />
                Tell the Truth
              </>
            )}
          </button>
        </div>

        {/* ── Output ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b border-slate-50 bg-white">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${
                status === 'running' ? 'bg-amber-400 animate-pulse' :
                status === 'success' ? 'bg-rose-400 shadow-[0_0_6px_2px_rgba(251,113,133,0.5)]' :
                'bg-slate-300'
              }`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {status === 'running' ? 'Thinking…' : status === 'success' ? 'Response' : 'Awaiting input'}
              </span>
            </div>
            {status === 'success' && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 transition-all">
                  {copied ? <CheckIcon className="h-3 w-3 text-emerald-500" /> : <ClipboardDocumentIcon className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={run}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600 transition-all">
                  <ArrowPathIcon className="h-3 w-3" />
                  Rerun
                </button>
              </div>
            )}
            {status === 'error' && (
              <button
                onClick={run}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all">
                <ArrowPathIcon className="h-3 w-3" />
                Retry
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5">
            {status === 'idle' && (
              <p className="text-[12px] text-slate-300 italic">
                The response will appear here. Expect pushback, not praise.
              </p>
            )}
            {status === 'running' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowPathIcon className="h-4 w-4 text-rose-400 animate-spin" />
                  <span className="text-[12px] text-rose-500 font-medium">Finding what&apos;s missing…</span>
                </div>
                {[95, 80, 88, 72, 90, 65, 78].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 rounded-full bg-rose-50 animate-pulse"
                    style={{width: `${w}%`, animationDelay: `${i * 90}ms`}}
                  />
                ))}
              </div>
            )}
            {status === 'error' && (
              <p className="text-[12px] text-rose-500">Something went wrong. Check your connection and retry.</p>
            )}
            {status === 'success' && output && (
              <div className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{output}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruthTeller;
