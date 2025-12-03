import { Bot, FilePenLine, Loader2, PlusCircle, Send, Trash2, User } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { getChatResponse } from '../lib/gemini';

const EMAIL_PROMPT = `Restructure, rephrase, or completely rewrite the content as deemed necessary for clarity and impact.

Enhance style and vocabulary, focusing on office settings and emails. When a user provides text, begins correcting grammar and rewording as necessary for clarity. You can rearrange the structure to flow well if needed. The assistant's interactions are minimal but approachable and helpful, inquiring in a friendly manner for any clarifications about the text's context or specific rewording preferences. Make sure to use words that are frequently used in everyday office setting.

avoid using:

1. --

2. -

3. ;

4. bullet points

5. em-dashes

6. I am writing

7. Hope you are well`;

interface Message {
  role: 'user' | 'model';
  parts: string;
}

interface ChatInterfaceProps {
  apiKey: string;
  onClearKey: () => void;
}

export function ChatInterface({ apiKey, onClearKey }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [systemInstruction, setSystemInstruction] = useState<string | undefined>(undefined);
  const [activeGem, setActiveGem] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setSystemInstruction(undefined);
    setActiveGem(null);
  };

  const handleEmailRefine = () => {
    setMessages([]);
    setInput('');
    setSystemInstruction(EMAIL_PROMPT);
    setActiveGem('Email Refiner');
    // Focus the textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', parts: userMessage }]);
    setIsLoading(true);

    try {
      const response = await getChatResponse(apiKey, messages, userMessage, selectedModel, systemInstruction);
      setMessages(prev => [...prev, { role: 'model', parts: response }]);
    } catch (error: unknown) {
      console.error('Error getting response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          parts: `Error: ${errorMessage}. Please check your API key and try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100">
      <header className="flex items-center justify-between px-6 py-4 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-400" />
            <h1 className="text-lg font-semibold hidden sm:block">Ananthan's AI</h1>
          </div>
          <select
            className="bg-zinc-700 text-zinc-100 text-sm rounded-lg px-3 py-1.5 border border-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={e => setSelectedModel(e.target.value)}
            value={selectedModel}>
            <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
            <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image Preview</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          {activeGem && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 text-xs font-medium">
              <FilePenLine className="w-3 h-3" />
              {activeGem}
            </div>
          )}
          <button
            className={`text-sm transition-colors flex items-center gap-2 ${activeGem === 'Email Refiner' ? 'text-purple-400' : 'text-zinc-400 hover:text-purple-400'
              }`}
            onClick={handleEmailRefine}
            title="Start Email Refiner Gem">
            <FilePenLine className="w-4 h-4" />
            <span className="hidden sm:inline">Refine Email</span>
          </button>
          <div className="h-4 w-px bg-zinc-700"></div>
          <button
            className="text-sm text-zinc-400 hover:text-blue-400 transition-colors flex items-center gap-2"
            onClick={handleNewChat}
            title="Start New Chat">
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          <div className="h-4 w-px bg-zinc-700"></div>
          <button
            className="text-sm text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-2"
            onClick={onClearKey}
            title="Clear API Key">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear Key</span>
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
            <Bot className="w-12 h-12 opacity-20" />
            <p className="text-lg">Welcome Ananthan. What can I do for you today?</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} key={idx}>
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'
                  }`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>

              <div
                className={`px-4 py-3 rounded-2xl ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'
                  }`}>
                <div className="prose prose-invert max-w-none text-sm sm:text-base">
                  <ReactMarkdown>{msg.parts}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-none border border-zinc-700 flex items-center">
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <form className="max-w-4xl mx-auto relative flex items-end gap-2" onSubmit={handleSubmit}>
          <div className="relative flex-1">
            <textarea
              className="w-full bg-zinc-800 text-zinc-100 rounded-xl pl-4 pr-12 py-3 border border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-zinc-500 resize-none min-h-[50px] max-h-[200px]"
              disabled={isLoading}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Gemini..."
              ref={textareaRef}
              rows={1}
              value={input}
            />
            <button
              className="absolute right-2 bottom-2 p-2 text-zinc-400 hover:text-blue-400 disabled:opacity-50 disabled:hover:text-zinc-400 transition-colors"
              disabled={!input.trim() || isLoading}
              type="submit">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
