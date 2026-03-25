'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  X,
  Send,
  Bot,
  Copy,
  Trash2,
  Loader2,
  Check,
  ChevronDown,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type AIModel = 'gemini-flash' | 'gemini-pro' | 'gpt-4o' | 'gpt-4o-mini';

const MODEL_OPTIONS: { id: AIModel; label: string; provider: 'gemini' | 'openai' }[] = [
  { id: 'gemini-flash', label: 'Gemini Flash', provider: 'gemini' },
  { id: 'gemini-pro', label: 'Gemini Pro', provider: 'gemini' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'openai' },
];

const MODEL_API_MAP: Record<AIModel, string> = {
  'gemini-flash': 'gemini-flash-latest',
  'gemini-pro': 'gemini-pro-latest',
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
};

interface OrgAISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPageContent?: string;
}

function genId(): string {
  return Math.random().toString(36).slice(2);
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function OrgAISidebar({ isOpen, onClose, selectedPageContent }: OrgAISidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-flash');
  const [usePageContext, setUsePageContext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const getSystemInstruction = (): string => {
    let instruction = 'You are a helpful AI assistant integrated into an organization/productivity app. Be concise, clear, and practical.';
    if (usePageContext && selectedPageContent) {
      instruction += `\n\nCurrent note context:\n\`\`\`\n${selectedPageContent.slice(0, 3000)}\n\`\`\``;
    }
    return instruction;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = {
      id: genId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const modelOption = MODEL_OPTIONS.find(m => m.id === selectedModel)!;
    const apiModel = MODEL_API_MAP[selectedModel];
    const systemInstruction = getSystemInstruction();

    try {
      let responseText = '';

      if (modelOption.provider === 'gemini') {
        const history = messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: m.content,
        }));
        const res = await axios.post('/api/gemini/generate', {
          apiKey: 'GEMINI_SCOPED',
          prompt: userMsg.content,
          model: apiModel,
          systemInstruction,
          history,
        });
        responseText = res.data.text || '';
      } else {
        const openaiMessages = [
          { role: 'system', content: systemInstruction },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMsg.content },
        ];
        const res = await axios.post('/api/openai/generate', {
          apiKey: 'MANAGED',
          model: apiModel,
          messages: openaiMessages,
        });
        responseText = res.data.text || '';
      }

      const assistantMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: `Error: ${err.response?.data?.error || err.message || 'Failed to get response'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async (msg: Message) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const currentModelLabel = MODEL_OPTIONS.find(m => m.id === selectedModel)?.label || 'Select model';

  return (
    <>
      {/* Slide-in panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-[380px] bg-white border-l border-slate-200 shadow-xl z-40 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm">AI Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Model selector */}
        <div className="px-4 py-2.5 border-b border-slate-100 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors w-full"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span className="flex-1 text-left">{currentModelLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            </button>
            {showModelDropdown && (
              <div className="absolute top-9 left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                {MODEL_OPTIONS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => { setSelectedModel(model.id); setShowModelDropdown(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${
                      selectedModel === model.id ? 'text-indigo-600 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      model.provider === 'gemini' ? 'bg-blue-400' : 'bg-emerald-400'
                    }`} />
                    {model.label}
                    {selectedModel === model.id && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Context toggle */}
          {selectedPageContent && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <div
                onClick={() => setUsePageContext(v => !v)}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                  usePageContext ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${
                  usePageContext ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </div>
              <span className="text-xs text-slate-600">Use current note as context</span>
            </label>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">How can I help you?</p>
              <p className="text-slate-300 text-xs mt-1">Ask anything about your notes, tasks, or work</p>

              {/* Suggestions */}
              <div className="mt-4 space-y-1.5">
                {[
                  'Summarize my current note',
                  'Help me write a meeting agenda',
                  'What are best practices for project planning?',
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="block w-full text-left px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative group max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>

                {/* Copy button */}
                <button
                  onClick={() => copyMessage(msg)}
                  className={`absolute -top-2 ${msg.role === 'user' ? '-left-7' : '-right-7'} w-6 h-6 flex items-center justify-center rounded-full border shadow-sm opacity-0 group-hover:opacity-100 transition-all ${
                    msg.role === 'user' ? 'bg-white border-slate-200 text-slate-500' : 'bg-white border-slate-200 text-slate-500'
                  } hover:text-indigo-600`}
                  title="Copy"
                >
                  {copiedId === msg.id
                    ? <Check className="w-3 h-3 text-emerald-500" />
                    : <Copy className="w-3 h-3" />
                  }
                </button>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 px-4 py-3 shrink-0">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask anything... (Enter to send)"
              rows={1}
              className="flex-1 bg-transparent resize-none focus:outline-none text-sm text-slate-900 placeholder-slate-400 max-h-32 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
              onInput={e => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 text-center">
            Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/10"
          onClick={onClose}
        />
      )}
    </>
  );
}
