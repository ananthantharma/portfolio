import {
  Bot,
  FilePenLine,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  PlusCircle,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getOpenAIChatResponse, MessageContent } from '../lib/openai';

const plugins = [remarkGfm];

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
  role: 'user' | 'assistant';
  content: MessageContent;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  systemInstruction?: string;
  activeGem?: string | null;
  createdAt: number;
}

interface OpenAIChatInterfaceProps {
  apiKey: string;
  onClearKey: () => void;
}

export function OpenAIChatInterface({ apiKey, onClearKey }: OpenAIChatInterfaceProps) {
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      systemInstruction: undefined,
      activeGem: null,
      createdAt: Date.now(),
    },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Initialize currentSessionId
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  // UI State
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isLoading]);

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
      systemInstruction: undefined,
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
    setSelectedImages([]);
  };

  const handleEmailRefine = () => {
    createNewSession({
      title: 'Email Refiner',
      systemInstruction: EMAIL_PROMPT,
      activeGem: 'Email Refiner',
    });
    setInput('');
    setSelectedImages([]);
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
        // If all deleted, create a new one
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

    const userMessageText = input.trim();
    const currentImages = [...selectedImages];

    setInput('');
    setSelectedImages([]);

    // Construct content for UI
    let uiContent: MessageContent = userMessageText;
    if (currentImages.length > 0) {
      uiContent = [
        { type: 'text', text: userMessageText },
        ...currentImages.map(img => ({ type: 'image_url' as const, image_url: { url: img } })),
      ];
    }

    // Optimistically update messages
    updateCurrentSession(session => {
      const newMessages = [...session.messages, { role: 'user', content: uiContent } as Message];
      // Update title if it's the first message and still named "New Chat"
      const newTitle =
        session.messages.length === 0 && session.title === 'New Chat'
          ? userMessageText.slice(0, 30) + (userMessageText.length > 30 ? '...' : '') || 'Image Chat'
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

      const response = await getOpenAIChatResponse(
        apiKey,
        history,
        userMessageText,
        selectedModel,
        systemInstruction,
        currentImages,
      );

      updateCurrentSession(s => ({
        ...s,
        messages: [...s.messages, { role: 'assistant', content: response }],
      }));
    } catch (error: unknown) {
      console.error('Error getting response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateCurrentSession(s => ({
        ...s,
        messages: [
          ...s.messages,
          {
            role: 'assistant',
            content: `Error: ${errorMessage}. Please check your API key and try again.`,
          },
        ],
      }));
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

  const markdownComponents: any = {
    // Tables
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-6 rounded-lg border border-zinc-700">
        <table className="min-w-full divide-y divide-zinc-700" {...props} />
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

  const renderMessageContent = (content: MessageContent) => {
    if (typeof content === 'string') {
      return (
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown components={markdownComponents} remarkPlugins={plugins}>
            {content}
          </ReactMarkdown>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        {content.map((part, index) => {
          if (part.type === 'image_url') {
            return (
              <img
                alt="User upload"
                className="max-w-full rounded-lg max-h-96 object-contain self-start border border-zinc-700"
                key={index}
                src={part.image_url.url}
              />
            );
          }
          if (part.type === 'text') {
            return (
              <div key={index} className="prose prose-invert max-w-none">
                <ReactMarkdown components={markdownComponents} remarkPlugins={plugins}>
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
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
            <Plus className="w-4 h-4" />
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
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
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
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-red-400 transition-colors text-sm"
            onClick={onClearKey}>
            <Trash2 className="w-4 h-4" />
            Clear API Key
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <header className="flex items-center justify-between px-6 py-4 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-green-400" />
              <h1 className="text-lg font-semibold hidden sm:block">OpenAI Chat</h1>
            </div>
            <select
              className="bg-zinc-700 text-zinc-100 text-sm rounded-lg px-3 py-1.5 border border-zinc-600 focus:ring-2 focus:ring-green-500 outline-none"
              onChange={e => setSelectedModel(e.target.value)}
              value={selectedModel}>
              <option value="gpt-4o">GPT-5.2</option>
              <option value="gpt-4o-mini">GPT-5 mini</option>
              <option value="gpt-3.5-turbo">GPT-5 nano</option>
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
              className="md:hidden text-sm text-zinc-400 hover:text-green-400 transition-colors flex items-center gap-2"
              onClick={handleNewChat}
              title="Start New Chat">
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {currentSession.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <Bot className="w-12 h-12 opacity-20" />
              <p className="text-lg">Welcome. How can I help you today?</p>
            </div>
          )}

          {currentSession.messages.map((msg, idx) => (
            <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} key={idx}>
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-green-600'
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
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
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
          <form className="max-w-4xl mx-auto" onSubmit={handleSubmit}>
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

            <div className="relative flex items-end gap-2">
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
                  className="w-full bg-zinc-800 text-zinc-100 rounded-xl pl-4 pr-12 py-3 border border-zinc-700 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all placeholder-zinc-500 resize-none min-h-[50px] max-h-[200px]"
                  disabled={isLoading}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Message OpenAI..."
                  ref={textareaRef}
                  rows={1}
                  value={input}
                />
                <button
                  className="absolute right-2 bottom-2 p-2 text-zinc-400 hover:text-green-400 disabled:opacity-50 disabled:hover:text-zinc-400 transition-colors"
                  disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
                  type="submit">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
