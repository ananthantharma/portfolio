import {
  Bot,
  FileText,
  Loader2,
  FilePenLine,
  PlusCircle,
  Trash2,
  User,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

import { getChatResponse } from '../lib/gemini';
import './ChatInterface.css';

const plugins = [remarkGfm];

const DEFAULT_SYSTEM_INSTRUCTION = ``;

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
  attachments?: Attachment[];
}

interface Attachment {
  type: 'image' | 'pdf' | 'text';
  content?: string; // Base64 (for images/pdf) or raw text
  url?: string; // Oracle Object Storage URL
  name: string;
  mimeType?: string; // For images/pdf
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
  const { data: session } = useSession();
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
  const [useSearch, setUseSearch] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar toggle
  const [showSettings, setShowSettings] = useState(false); // Settings modal
  const [customInstruction, setCustomInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);
  const [attachments, setAttachments] = useState<Attachment[]>([]); // Renamed from selectedImages

  const [selectedModel, setSelectedModel] = useState('gemini-flash-latest');
  const [availableModels, setAvailableModels] = useState<{ id: string; label: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  // Load settings (Hybrid: DB or LocalStorage)
  useEffect(() => {
    const fetchSettings = async () => {
      // 1. Try DB if logged in
      if (session?.user) {
        try {
          const response = await fetch('/api/user/settings');
          if (response.ok) {
            const data = await response.json();
            // Allow empty string if user explicitly cleared it
            if (typeof data.systemInstruction === 'string') {
              setCustomInstruction(data.systemInstruction);
              updateInitialSession(data.systemInstruction);
              return;
            }
          }
        } catch (error) {
          console.error('Failed to fetch DB settings:', error);
        }
      }

      // 2. Fallback to LocalStorage (Guest or DB empty)
      const stored = localStorage.getItem('custom_system_instruction');
      if (stored) {
        setCustomInstruction(stored);
        updateInitialSession(stored);
      }
    };

    fetchSettings();
  }, [session]);

  const updateInitialSession = (instruction: string) => {
    setSessions(prev => {
      if (prev.length === 1 && prev[0].messages.length === 0 && prev[0].title === 'New Chat') {
        return [{ ...prev[0], systemInstruction: instruction }];
      }
      return prev;
    });
  };

  // Save settings (Hybrid)
  const handleSaveSettings = async () => {
    // 1. Always save to LocalStorage (as backup/guest)
    localStorage.setItem('custom_system_instruction', customInstruction);

    // 2. If logged in, also save to DB
    if (session?.user) {
      try {
        const response = await fetch('/api/user/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemInstruction: customInstruction }),
        });

        if (!response.ok) throw new Error('Failed to save to DB');
      } catch (error) {
        console.error('Error saving to DB:', error);
        // Don't alert error if local save worked, just log it.
        // Or alert user? "Saved locally, but sync failed." 
        // Let's keep it silent for smoother UX unless critical.
      }
    }

    setShowSettings(false);
    if (currentSession?.messages.length === 0) {
      updateCurrentSession(s => ({ ...s, systemInstruction: customInstruction }));
    }
    alert('Settings saved!');
  };

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      systemInstruction: customInstruction, // Use dynamic instruction
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

  // Helper: Compress and Resize Image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const MAX_WIDTH = 800; // Increased max width for better visibility
      const MAX_HEIGHT = 800;
      const QUALITY = 0.6; // Slightly lower quality for better compression

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = event => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Resize logic
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG (usually smaller than PNG for photos)
          // If original was PNG with transparency, this turns background black.
          // To keep transparency we might need png, but it doesn't support quality setting well in all browsers.
          // For chat attachments, usually JPEG is fine, but let's check input type.
          // Using JPEG quality 0.6 for significant compression

          // Actually, 'image/png' in toDataURL argument 2 (quality) is generally ignored by browsers.
          // So if we want compression we largely must use jpeg or webp.
          // Let's force WEBP if supported or JPEG.
          // Or just stick to JPEG/WEBP for all for strict size control.
          // Let's try 'image/jpeg' for compression efficiency unless it's strictly needed to be persistent.

          const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
          resolve(dataUrl);
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Helper: Upload file to Oracle Object Storage
  const uploadToOracle = async (file: File): Promise<string> => {
    // URL Layout: https://objectstorage.REGION.oraclecloud.com/p/PAR_TOKEN/n/NAMESPACE/b/BUCKET/o/OBJECT_NAME
    const PAR_URL_BASE = 'https://objectstorage.ca-toronto-1.oraclecloud.com/p/QLAWx8wCq1Wb3kBchcG9RCcy3TcngoiuartQbdYovOIXVvYxNVvBGtWE09o29MvG/n/yzo9jkinnwr6/b/bucket-20260103-1212/o/';
    const objectName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploadUrl = `${PAR_URL_BASE}${objectName}`;

    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        }
      });

      if (!response.ok) {
        throw new Error(`Oracle Upload Failed: ${response.statusText}`);
      }
      return uploadUrl;
    } catch (error) {
      console.error('Error uploading to Oracle:', error);
      throw error;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newAttachments: Attachment[] = [];
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB Limit for Oracle

      setIsLoading(true);

      for (const file of files) {
        if (file.size > MAX_SIZE) {
          alert(`File ${file.name} is too large. Max size is 50MB.`);
          continue;
        }

        try {
          // 1. Images - Keep Client Side Compression (Small Payload)
          if (file.type.startsWith('image/')) {
            const compressed = await compressImage(file);
            newAttachments.push({
              type: 'image',
              content: compressed,
              name: file.name,
              mimeType: 'image/jpeg',
            });
            continue;
          }

          // 2. PDF (Upload to Oracle)
          if (file.type === 'application/pdf') {
            try {
              const url = await uploadToOracle(file);
              newAttachments.push({
                type: 'pdf',
                url,
                name: file.name,
                mimeType: 'application/pdf',
              });
            } catch (err) {
              console.error("PDF Upload failed", err);
              alert(`Failed to upload ${file.name}`);
            }
            continue;
          }

          // 3. Word (Extract Text Client-Side)
          if (file.name.endsWith('.docx')) {
            const reader = new FileReader();
            await new Promise<void>((resolve, reject) => {
              reader.onload = async e => {
                try {
                  const arrayBuffer = e.target?.result as ArrayBuffer;
                  const result = await mammoth.extractRawText({ arrayBuffer });
                  newAttachments.push({
                    type: 'text',
                    content: result.value, // Text is small, safe to send inline
                    name: file.name,
                  });
                  resolve();
                } catch (err) {
                  reject(err);
                }
              };
              reader.readAsArrayBuffer(file);
            });
            continue;
          }

          // 4. Excel (Extract CSV Client-Side)
          if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
            const reader = new FileReader();
            await new Promise<void>((resolve, reject) => {
              reader.onload = e => {
                try {
                  const data = new Uint8Array(e.target?.result as ArrayBuffer);
                  const workbook = XLSX.read(data, { type: 'array' });
                  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                  const csv = XLSX.utils.sheet_to_csv(firstSheet);
                  newAttachments.push({
                    type: 'text',
                    content: csv, // Text is small, safe to send inline
                    name: file.name,
                  });
                  resolve();
                } catch (err) {
                  reject(err);
                }
              };
              reader.readAsArrayBuffer(file);
            });
            continue;
          }

          // 5. Plain Text
          const text = await file.text();
          newAttachments.push({
            type: 'text',
            content: text,
            name: file.name,
          });

        } catch (error) {
          console.error('Error processing file:', file.name, error);
          alert(`Failed to process ${file.name}`);
        }
      }

      setAttachments(prev => [...prev, ...newAttachments]);
      setIsLoading(false);
      // Clear input so same file can be selected again
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          try {
            const compressed = await compressImage(file);
            setAttachments(prev => [
              ...prev,
              {
                type: 'image',
                content: compressed,
                name: 'Pasted Image',
                mimeType: 'image/jpeg',
              },
            ]);
          } catch (error) {
            console.error('Error pasting image:', error);
          }
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading || !currentSessionId) return;

    const userMessage = input.trim();
    const currentAttachments = [...attachments];

    setInput('');
    setAttachments([]);

    // Optimistically update messages
    updateCurrentSession(session => {
      const newMessages = [
        ...session.messages,
        { role: 'user', parts: userMessage, attachments: currentAttachments } as any,
      ];

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
        currentAttachments,
        useSearch,
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
      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider" {...props} />
    ),
    td: ({ node, ...props }: any) => <td className="px-6 py-4 text-sm text-zinc-300 whitespace-normal" {...props} />,

    // Text & Lists
    p: ({ node, ...props }: any) => <p className="mb-4 leading-7 last:mb-0" {...props} />,
    a: ({ node, ...props }: any) => (
      <a className="text-blue-400 hover:text-blue-300 underline underline-offset-4" target="_blank" {...props} />
    ),
    ul: ({ node, ...props }: any) => <ul className="my-4 ml-6 list-disc space-y-2 marker:text-zinc-500" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="my-4 ml-6 list-decimal space-y-2 marker:text-zinc-500" {...props} />,
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
      <div
        className={`w-64 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900 transition-transform duration-300 absolute md:relative z-50 h-full ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}>
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
              onClick={() => {
                setCurrentSessionId(session.id);
                setShowSidebar(false);
              }}>
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
        <header className="flex items-center justify-between p-4 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-1 text-zinc-400 hover:text-white"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <Menu className="w-6 h-6" />
            </button>
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
          {/* Mr-12 on mobile to clear the fixed hamburger menu */}
          <div className="flex items-center gap-3 mr-12 md:mr-0">
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

            {/* New Chat Button (Always Visible) */}
            <div className="h-4 w-px bg-zinc-700"></div>
            <button
              className="text-sm text-zinc-400 hover:text-blue-400 transition-colors flex items-center gap-2"
              onClick={handleNewChat}
              title="Start New Chat">
              <PlusCircle className="w-5 h-5" />
            </button>

            {/* Clear API Key */}
            <div className="h-4 w-px bg-zinc-700"></div>
            <button
              className="md:hidden text-sm text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-2"
              onClick={onClearKey}
              title="Clear API Key">
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Settings Button */}
            <div className="h-4 w-px bg-zinc-700"></div>
            <button
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-2"
              onClick={() => setShowSettings(true)}
              title="Settings">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Settings Modal */}
        {showSettings && (
          <div className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                <h3 className="text-lg font-semibold text-white">System Instructions</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <p className="text-sm text-zinc-400 mb-2">
                  Edit the default system instruction for new chats. This controls how Gemini behaves.
                </p>
                <textarea
                  className="w-full h-64 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Enter system instructions..."
                />
              </div>
              <div className="p-4 border-t border-zinc-700 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setCustomInstruction(DEFAULT_SYSTEM_INSTRUCTION); // Reset to default
                  }}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Reset to Default
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        )}

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
                      <img
                        key={i}
                        src={img}
                        alt="User Upload"
                        className="max-w-full rounded-lg mb-2 max-h-64 object-contain"
                      />
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
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-center">
          <form onSubmit={handleSubmit} className="w-full flex justify-center">
            <div className="AI-Input">
              {/* Hidden Inputs */}
              <input
                type="file"
                id="photos"
                accept="image/*"
                ref={imagesInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
              <input
                type="file"
                id="files"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />

              {/* Search Toggle */}
              <input
                id="search"
                type="checkbox"
                checked={useSearch}
                onChange={(e) => setUseSearch(e.target.checked)}
              />

              {/* Note: Camera removed as requested */}
              {/* <input type="file" id="camera" accept="image/*" capture="environment" /> */}

              <input id="voice" type="checkbox" />
              <label htmlFor="voice">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="30"
                  height="30"
                  fill="var(--neutral-color)"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
                  ></path>
                </svg>
              </label>

              {/* Voice/Mic (Visual only for now unless wired) */}
              <input id="mic" type="checkbox" />
              <label htmlFor="mic">
                <svg
                  viewBox="0 0 16 16"
                  fill="var(--neutral-color)"
                  height="30"
                  width="30"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5"
                  ></path>
                  <path
                    d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3"
                  ></path>
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="30"
                  height="30"
                  fill="var(--neutral-color)"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M13 8c0 .564-.094 1.107-.266 1.613l-.814-.814A4 4 0 0 0 12 8V7a.5.5 0 0 1 1 0zm-5 4c.818 0 1.578-.245 2.212-.667l.718.719a5 5 0 0 1-2.43.923V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 1 0v1a4 4 0 0 0 4 4m3-9v4.879l-1-1V3a2 2 0 0 0-3.997-.118l-.845-.845A3.001 3.001 0 0 1 11 3"
                  ></path>
                  <path
                    d="m9.486 10.607-.748-.748A2 2 0 0 1 6 8v-.878l-1-1V8a3 3 0 0 0 4.486 2.607m-7.84-9.253 12 12 .708-.708-12-12z"
                  ></path>
                </svg>
              </label>

              <div className="chat-marquee">
                <ul>
                  <li onClick={() => setInput("Summerize this")}>Summerize this for me</li>
                  <li onClick={() => setInput("Rewrite this - Casual")}>Rewrite this - Casual</li>
                  <li onClick={() => setInput("Rewrite this - Professional")}>Rewrite this - Professional</li>
                </ul>
                {/* Duplicated for smooth marquee */}
                <ul>
                  <li onClick={() => setInput("Summerize this")}>Summerize this</li>
                  <li onClick={() => setInput("Rewrite this - Casual")}>Rewrite this - Casual</li>
                  <li onClick={() => setInput("Rewrite this - Professional")}>Rewrite this - Professional</li>
                </ul>
              </div>

              <div className="chat-container">
                <label htmlFor="chat-input" className="chat-wrapper">
                  {/* Attachments Preview inside text area wrapper? Or above? User didn't specify. Keeping them above might be safer but user's UI has limited space.
                     I'll render them inside the wrapper above the textarea for now using the existing logic adapted.
                 */}
                  {attachments.length > 0 && (
                    <div className="flex gap-2 mb-2 w-full overflow-x-auto">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="relative group">
                          {att.type === 'image' ? (
                            <img src={att.content} className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-10 bg-zinc-700 rounded flex items-center justify-center">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <button onClick={(e) => { e.preventDefault(); removeAttachment(idx); }} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-[10px] text-white">x</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    id="chat-input"
                    placeholder="Ask anything"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    ref={textareaRef}
                  ></textarea>

                  <div className="button-bar">
                    <div className="left-buttons">
                      <input id="appendix" type="checkbox" />
                      <label htmlFor="appendix">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          fill="var(--neutral-color)"
                          viewBox="0 0 16 16"
                        >
                          <path
                            d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0z"
                          ></path>
                        </svg>
                      </label>
                      <div id="appendix-bar">
                        <label htmlFor="appendix">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="30"
                            height="30"
                            fill="var(--primary-color)"
                            viewBox="0 0 16 16"
                          >
                            <path
                              d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
                            ></path>
                          </svg>
                        </label>
                        {/* Camera removed */}
                        {/* Photos - Trigger file input */}
                        <label htmlFor="photos">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="30"
                            height="30"
                            fill="var(--primary-color)"
                            viewBox="0 0 16 16"
                          >
                            <path d="M4.502 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"></path>
                            <path
                              d="M14.002 13a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2V5A2 2 0 0 1 2 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-1.998 2M14 2H4a1 1 0 0 0-1 1h9.002a2 2 0 0 1 2 2v7A1 1 0 0 0 15 11V3a1 1 0 0 0-1-1M2.002 4a1 1 0 0 0-1 1v8l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .577-.094l1.777 1.947V5a1 1 0 0 0-1-1z"
                            ></path>
                          </svg>
                        </label>
                        {/* Files - Trigger file input */}
                        <label htmlFor="files">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="30"
                            height="30"
                            fill="var(--primary-color)"
                            viewBox="0 0 16 16"
                          >
                            <path
                              d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139q.323-.119.684-.12h5.396z"
                            ></path>
                          </svg>
                        </label>
                      </div>

                      {/* Search Checkbox */}
                      <input id="search" type="checkbox" checked={useSearch} onChange={(e) => setUseSearch(e.target.checked)} />
                      <label htmlFor="search" title="Enable Internet Search">
                        <svg
                          viewBox="0 0 16 16"
                          fill="var(--neutral-color)"
                          height="20"
                          width="20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855q-.215.403-.395.872c.705.157 1.472.257 2.282.287zM4.249 3.539q.214-.577.481-1.078a7 7 0 0 1 .597-.933A7 7 0 0 0 3.051 3.05q.544.277 1.198.49zM3.509 7.5c.036-1.07.188-2.087.436-3.008a9 9 0 0 1-1.565-.667A6.96 6.96 0 0 0 1.018 7.5zm1.4-2.741a12.3 12.3 0 0 0-.4 2.741H7.5V5.091c-.91-.03-1.783-.145-2.591-.332M8.5 5.09V7.5h2.99a12.3 12.3 0 0 0-.399-2.741c-.808.187-1.681.301-2.591.332zM4.51 8.5c.035.987.176 1.914.399 2.741A13.6 13.6 0 0 1 7.5 10.91V8.5zm3.99 0v2.409c.91.03 1.783.145 2.591.332.223-.827.364-1.754.4-2.741zm-3.282 3.696q.18.469.395.872c.552 1.035 1.218 1.65 1.887 1.855V11.91c-.81.03-1.577.13-2.282.287zm.11 2.276a7 7 0 0 1-.598-.933 9 9 0 0 1-.481-1.079 8.4 8.4 0 0 0-1.198.49 7 7 0 0 0 2.276 1.522zm-1.383-2.964A13.4 13.4 0 0 1 3.508 8.5h-2.49a6.96 6.96 0 0 0 1.362 3.675c.47-.258.995-.482 1.565-.667m6.728 2.964a7 7 0 0 0 2.275-1.521 8.4 8.4 0 0 0-1.197-.49 9 9 0 0 1-.481 1.078 7 7 0 0 1-.597.933M8.5 11.909v3.014c.67-.204 1.335-.82 1.887-1.855q.216-.403.395-.872A12.6 12.6 0 0 0 8.5 11.91zm3.555-.401c.57.185 1.095.409 1.565.667A6.96 6.96 0 0 0 14.982 8.5h-2.49a13.4 13.4 0 0 1-.437 3.008M14.982 7.5a6.96 6.96 0 0 0-1.362-3.675c-.47.258-.995.482-1.565.667.248.92.4 1.938.437 3.008zM11.27 2.461q.266.502.482 1.078a8.4 8.4 0 0 0 1.196-.49 7 7 0 0 0-2.275-1.52c.218.283.418.597.597.932m-.488 1.343a8 8 0 0 0-.395-.872C9.835 1.897 9.17 1.282 8.5 1.077V4.09c.81-.03 1.577-.13 2.282-.287z"
                          ></path>
                        </svg>
                      </label>
                    </div>

                    <div className="right-buttons">
                      <label htmlFor="voice">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          fill="var(--neutral-color)"
                          viewBox="0 0 16 16"
                        >
                          <path
                            d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5"
                          ></path>
                          <path
                            d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3"
                          ></path>
                        </svg>
                      </label>
                      <button type="submit" disabled={(!input.trim() && attachments.length === 0) || isLoading}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="30"
                          height="30"
                          fill="var(--neutral-color)"
                          viewBox="0 0 16 16"
                        >
                          <path
                            d="M16 8A8 8 0 1 0 0 8a8 8 0 0 0 16 0m-7.5 3.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707z"
                          ></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
