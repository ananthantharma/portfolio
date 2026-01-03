import { Bot, FilePenLine, Loader2, Paperclip, PlusCircle, Send, Trash2, User, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getChatResponse } from '../lib/gemini';

const plugins = [remarkGfm];

const DEFAULT_SYSTEM_INSTRUCTION = `Do not use LaTeX or math symbols (like $ or \\mathbf) for simple numbers or tables. Use plain text and standard Markdown tables only. Each row must be on a new line.`;

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

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  systemInstruction?: string;
  activeGem?: string | null;
  createdAt: number;
}

interface ChatInterfaceProps {
  apiKey: string;
  onClearKey: () => void;
}

export function ChatInterface({ apiKey, onClearKey }: ChatInterfaceProps) {
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
      activeGem: null,
      createdAt: Date.now(),
    },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // UI State
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const [selectedModel, setSelectedModel] = useState('gemini-flash-latest');
  const [availableModels, setAvailableModels] = useState<{ id: string; label: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hardcoded models to avoid fetch failure on load
  useEffect(() => {
    // We only care about Flash and Pro for now
    const models = [
      { id: 'gemini-flash-latest', label: 'Gemini Flash Latest' },
      { id: 'gemini-pro-latest', label: 'Gemini Pro Latest' },
      { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite Latest' },
    ];
    setAvailableModels(models);
    setSelectedModel('gemini-flash-latest');
  }, []);

  // Initialize currentSessionId
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const createNewSession = (overrides?: Partial<ChatSession>) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: overrides?.title || 'New Chat',
      messages: [],
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
      activeGem: null,
      createdAt: Date.now(),
      ...overrides,
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const updateCurrentSession = (updater: (session: ChatSession) => ChatSession) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => (s.id === currentSessionId ? updater(s) : s)));
  };

  const handleNewChat = () => {
    createNewSession();
    setInput('');
  };

  const handleEmailRefine = () => {
    createNewSession({
      title: 'Email Refiner',
      systemInstruction: EMAIL_PROMPT,
      activeGem: 'Email Refiner',
    });
    setInput('');
    // Focus the textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);

    if (currentSessionId === sessionId) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      // Clear input so same file can be selected again
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setSelectedImages(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && selectedImages.length === 0) || isLoading || !currentSessionId) return;

    const userMessage = input.trim();
    const currentImages = [...selectedImages];

    setInput('');
    setSelectedImages([]);

    // Optimistically update messages
    updateCurrentSession(session => {
      // Construct parts string for optimistic update (images not fully rendered yet in text mode, but handled by renderMessageContent mostly)
      // Actually, we need to store parts as objects or handle them stringified?
      // Since 'parts' in Message interface is string, we might need to adjust the interface OR append image markdowns
      // BUT 'parts' in this app seems to be just string: interface Message { parts: string }.
      // If we want to support images in history for UI display, we need to change Message interface or hack it.
      // Wait, let's check renderMessageContent... it assumes `msg.parts` is string.
      // To show images in UI history, we should probably update Message structure OR append markdown image syntax?
      // Markdown image with base64 is ugly and slow.
      // Better: Update Message interface to support parts array (like OpenAIChat).
      // BUT that requires refactoring existing messages / type definitions everywhere.
      // SHORTCUT: For now, I will append a special placeholder or just rendering logic updates.
      // actually, let's look at `ChatInterface.tsx` again.
      // `interface Message { role: 'user' | 'model'; parts: string; }`
      // I will update the Message interface locally to support `parts: string | { text?: string; inlineData?: any }[]`?
      // NO, let's stick to string but maybe store images separately for session?
      // OR better: Update Message interface to support `images?: string[]`.

      // Let's modify Message interface above.

      const newMessages = [...session.messages, { role: 'user', parts: userMessage, images: currentImages } as any];

      // Update title if it's the first message and still named "New Chat"
      const newTitle =
        session.messages.length === 0 && session.title === 'New Chat'
          ? userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '')
          : session.title;

      return {
        ...session,
        title: newTitle,
        messages: newMessages,
      };
    });

    setIsLoading(true);

    try {
      const session = sessions.find(s => s.id === currentSessionId);
      const history = session ? session.messages : [];
      const systemInstruction = session?.systemInstruction;

      const response = await getChatResponse(
        apiKey,
        history,
        userMessage,
        selectedModel,
        systemInstruction,
        currentImages,
      );

      updateCurrentSession(s => ({
        ...s,
        messages: [...s.messages, { role: 'model', parts: response }],
      }));
    } catch (error: unknown) {
      console.error('Error getting response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateCurrentSession(s => ({
        ...s,
        messages: [
          ...s.messages,
          {
            role: 'model',
            parts: `Error: ${errorMessage}. Please check your API key and try again.`,
          },
        ],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const preprocessMarkdown = (content: string) => {
    if (!content) return '';

    // DEBUG: Inspect raw content (remove in prod)
    if (content.includes('|')) console.log('Markdown Content:', JSON.stringify(content));

    let processed = content;

    // 1. Ensure newlines before code blocks
    processed = processed.replace(/([^\n])\n(```)/g, '$1\n\n$2');

    // 2. Split text from start of table (e.g. "Table 1 | Header |")
    processed = processed.replace(/(^|\n)([^|\n]+)(\|)/g, '$1$2\n\n$3');

    // 3. Fix compressed tables: Replace "| |" with "|\n|" globally
    // This catches "Header | |---" and "Cell | | NextRowCell"
    // Validated to handle LaTeX cells and generic content.
    processed = processed.replace(/\| *(\| *[^ |])/g, '|\n$1');

    return processed;
  };

  const markdownComponents: any = {
    // Tables - Gemini-like styling (Clean, lighter borders)
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-4 rounded-xl border border-zinc-700/50 bg-zinc-800/20">
        <table className="min-w-full divide-y divide-zinc-700/50" {...props} />
      </div>
    ),
    thead: ({ node, ...props }: any) => <thead className="bg-zinc-800" {...props} />,
    tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-zinc-700 bg-zinc-900/50" {...props} />,
    tr: ({ node, ...props }: any) => <tr className="transition-colors hover:bg-zinc-800/30" {...props} />,
    th: ({ node, ...props }: any) => (
      <th
        className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider"
        {...props}
      />
    ),
    td: ({ node, ...props }: any) => <td className="px-6 py-4 text-sm text-zinc-300 whitespace-normal" {...props} />,

    // Text & Lists
    p: ({ node, ...props }: any) => <p className="mb-4 leading-7 last:mb-0" {...props} />,
    a: ({ node, ...props }: any) => (
      <a className="text-blue-400 hover:text-blue-300 underline underline-offset-4" target="_blank" {...props} />
    ),
    ul: ({ node, ...props }: any) => <ul className="my-4 ml-6 list-disc space-y-2 marker:text-zinc-500" {...props} />,
    ol: ({ node, ...props }: any) => (
      <ol className="my-4 ml-6 list-decimal space-y-2 marker:text-zinc-500" {...props} />
    ),
    li: ({ node, ...props }: any) => <li className="pl-2" {...props} />,
    blockquote: ({ node, ...props }: any) => (
      <blockquote className="border-l-4 border-zinc-600 pl-4 my-4 italic text-zinc-400" {...props} />
    ),
    hr: ({ node, ...props }: any) => <hr className="my-6 border-zinc-700" {...props} />,

    // Code
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="my-6 rounded-lg overflow-hidden border border-zinc-700/50 bg-zinc-900">
          <div className="bg-zinc-800/50 px-4 py-2 text-xs text-zinc-500 border-b border-zinc-700/50 font-mono uppercase tracking-wider flex justify-between">
            <span>{match[1]}</span>
          </div>
          <div className="p-4 overflow-x-auto">
            <pre className="!m-0 !bg-transparent !p-0">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          </div>
        </div>
      ) : (
        <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-400" {...props}>
          {children}
        </code>
      );
    },
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!currentSession) return null;

  return (
    <div className="flex h-full bg-zinc-900 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/50 hidden md:flex">
        <div className="p-4 border-b border-zinc-800">
          <button
            className="w-full flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors border border-zinc-700 text-sm font-medium"
            onClick={handleNewChat}>
            <PlusCircle className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(session => (
            <div
              className={`group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors text-sm ${currentSessionId === session.id
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                }`}
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}>
              <div className="flex-shrink-0">
                {/* Using generic icon for session list */}
                <Bot className="w-4 h-4" />
              </div>
              <span className="truncate flex-1 text-left">{session.title}</span>
              {sessions.length > 1 && (
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                  onClick={e => deleteSession(e, session.id)}
                  title="Delete chat">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800">
          {apiKey === 'MANAGED' || apiKey === 'GEMINI_SCOPED' ? (
            <div className="w-full flex items-center gap-2 px-3 py-2 text-emerald-400 text-sm font-medium bg-emerald-400/10 rounded-lg border border-emerald-400/20">
              <span className="flex-1">✨ Managed Access</span>
            </div>
          ) : (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-red-400 transition-colors text-sm"
              onClick={onClearKey}>
              <Trash2 className="w-4 h-4" />
              Clear API Key
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
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
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            {currentSession.activeGem && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 text-xs font-medium">
                <FilePenLine className="w-3 h-3" />
                {currentSession.activeGem}
              </div>
            )}
            <button
              className={`text-sm transition-colors flex items-center gap-2 ${currentSession.activeGem === 'Email Refiner' ? 'text-purple-400' : 'text-zinc-400 hover:text-purple-400'
                }`}
              onClick={handleEmailRefine}
              title="Start Email Refiner Gem">
              <FilePenLine className="w-4 h-4" />
              <span className="hidden sm:inline">Refine Email</span>
            </button>

            {/* Mobile New Chat Button */}
            <div className="md:hidden h-4 w-px bg-zinc-700"></div>
            <button
              className="md:hidden text-sm text-zinc-400 hover:text-blue-400 transition-colors flex items-center gap-2"
              onClick={handleNewChat}
              title="Start New Chat">
              <PlusCircle className="w-4 h-4" />
            </button>

            {/* Hidden OnClearKey for mobile in header? No, it was there before. */}
            <div className="md:hidden h-4 w-px bg-zinc-700"></div>
            <button
              className="md:hidden text-sm text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-2"
              onClick={onClearKey}
              title="Clear API Key">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {currentSession.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <Bot className="w-12 h-12 opacity-20" />
              <p className="text-lg">Welcome Ananthan. What can I do for you today?</p>
              <p className="text-sm text-gray-500">--------------------------</p>
            </div>
          )}

          {currentSession.messages.map((msg, idx) => (
            <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} key={idx}>
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'
                    }`}>
                  {msg.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                <div
                  className={`px-4 py-3 rounded-2xl ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'
                    }`}>
                  <div className="prose prose-invert max-w-none text-sm sm:text-base">
                    {/* Render User Images if present */}
                    {(msg as any).images?.map((img: string, i: number) => (
                      <img key={i} src={img} alt="User Upload" className="max-w-full rounded-lg mb-2 max-h-64 object-contain" />
                    ))}
                    <ReactMarkdown components={markdownComponents} remarkPlugins={plugins}>
                      {preprocessMarkdown(msg.parts)}
                    </ReactMarkdown>
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
          {/* Image Preview Area */}
          {selectedImages.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
              {selectedImages.map((img, idx) => (
                <div className="relative group flex-shrink-0" key={idx}>
                  <img alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-zinc-700" src={img} />
                  <button
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(idx)}
                    type="button">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex-1 flex gap-2 items-end">
            <input
              accept="image/*"
              className="hidden"
              multiple
              onChange={handleFileSelect}
              ref={fileInputRef}
              type="file"
            />

            <button
              className="p-3 text-zinc-400 hover:text-blue-400 transition-colors bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700"
              onClick={() => fileInputRef.current?.click()}
              title="Upload Image"
              type="button">
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="relative flex-1">
              <textarea
                className="w-full bg-zinc-800 text-zinc-100 rounded-xl pl-4 pr-12 py-3 border border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-zinc-500 resize-none min-h-[50px] max-h-[200px]"
                disabled={isLoading}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Message Gemini..."
                ref={textareaRef}
                rows={1}
                value={input}
              />
              <button
                className="absolute right-2 bottom-2 p-2 text-zinc-400 hover:text-blue-400 disabled:opacity-50 disabled:hover:text-zinc-400 transition-colors"
                disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
                type="submit">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
