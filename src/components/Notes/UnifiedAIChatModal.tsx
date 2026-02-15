/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Bot,
    ChevronDown,
    FilePenLine,
    FileText,
    ImageIcon,
    Loader2,
    Paperclip,
    Plus,
    Send,
    Trash2,
    User,
    X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getChatResponse } from '../../lib/gemini';
import { getOpenAIChatResponse, MessageContent } from '../../lib/openai';

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

// Model definitions matching the existing implementations
const GEMINI_MODELS = [
    { id: 'gemini-flash-latest', label: 'Gemini Flash Latest', provider: 'gemini' as const },
    { id: 'gemini-pro-latest', label: 'Gemini Pro Latest', provider: 'gemini' as const },
    { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite Latest', provider: 'gemini' as const },
];

const OPENAI_MODELS = [
    { id: 'gpt-4o', label: 'GPT-5.2', provider: 'openai' as const },
    { id: 'gpt-4o-mini', label: 'GPT-5 mini', provider: 'openai' as const },
    { id: 'gpt-3.5-turbo', label: 'GPT-5 nano', provider: 'openai' as const },
];

const ALL_MODELS = [...GEMINI_MODELS, ...OPENAI_MODELS];

interface Attachment {
    type: 'image' | 'pdf' | 'text';
    content?: string; // Base64 (for images/pdf) or raw text
    url?: string; // Oracle Object Storage URL
    name: string;
    mimeType?: string;
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'model';
    content: string;
    images?: string[]; // Base64 images attached to this message
    timestamp: number;
}

interface SavedSessionSummary {
    _id: string;
    title: string;
    provider: string;
    model: string;
    createdAt: string;
    updatedAt: string;
}

interface LocalSession {
    localId: string;
    dbId?: string; // MongoDB _id once saved
    title: string;
    provider: 'gemini' | 'openai';
    model: string;
    messages: ChatMessage[];
    systemInstruction: string;
    activeGem?: string | null;
    isLoaded: boolean; // Whether messages are loaded from DB
    isDirty: boolean; // Whether there are unsaved changes
}

interface UnifiedAIChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    geminiApiKey: string | null;
    openaiApiKey: string | null;
}

const UnifiedAIChatModal: React.FC<UnifiedAIChatModalProps> = React.memo(
    ({ isOpen, onClose, geminiApiKey, openaiApiKey }) => {
        // Session state
        const [sessions, setSessions] = useState<LocalSession[]>([]);
        const [savedSessions, setSavedSessions] = useState<SavedSessionSummary[]>([]);
        const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

        // UI State
        const [input, setInput] = useState('');
        const [isLoading, setIsLoading] = useState(false);
        const [isSaving, setIsSaving] = useState(false);
        const [isLoadingSessions, setIsLoadingSessions] = useState(false);
        const [isLoadingMessages, setIsLoadingMessages] = useState(false);
        const [selectedModel, setSelectedModel] = useState(ALL_MODELS[0].id);
        const [showModelDropdown, setShowModelDropdown] = useState(false);
        const [attachments, setAttachments] = useState<Attachment[]>([]);

        const messagesEndRef = useRef<HTMLDivElement>(null);
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const dropdownRef = useRef<HTMLDivElement>(null);
        const imageInputRef = useRef<HTMLInputElement>(null);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const currentModel = useMemo(
            () => ALL_MODELS.find(m => m.id === selectedModel) || ALL_MODELS[0],
            [selectedModel],
        );

        const currentSession = useMemo(
            () => sessions.find(s => s.localId === currentSessionId) || null,
            [sessions, currentSessionId],
        );

        // Close dropdown on outside click
        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                    setShowModelDropdown(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        // Load saved session titles on open
        useEffect(() => {
            if (isOpen) {
                fetchSavedSessions();
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isOpen]);

        // Auto-scroll to bottom
        const scrollToBottom = useCallback(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, []);

        useEffect(() => {
            scrollToBottom();
        }, [currentSession?.messages, isLoading, scrollToBottom]);

        // Auto-resize textarea
        useEffect(() => {
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
            }
        }, [input]);

        // Focus textarea when session changes
        useEffect(() => {
            if (currentSessionId && textareaRef.current) {
                setTimeout(() => textareaRef.current?.focus(), 100);
            }
        }, [currentSessionId]);

        // ========== API Calls ==========

        const fetchSavedSessions = useCallback(async () => {
            setIsLoadingSessions(true);
            try {
                const res = await fetch('/api/ai-chat/sessions');
                if (res.ok) {
                    const data = await res.json();
                    setSavedSessions(data.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch saved sessions:', err);
            } finally {
                setIsLoadingSessions(false);
            }
        }, []);

        const loadSessionMessages = useCallback(
            async (dbId: string) => {
                // Check if already loaded in local sessions
                const existingLocal = sessions.find(s => s.dbId === dbId);
                if (existingLocal && existingLocal.isLoaded) {
                    setCurrentSessionId(existingLocal.localId);
                    return;
                }

                setIsLoadingMessages(true);
                try {
                    const res = await fetch(`/api/ai-chat/sessions?id=${dbId}`);
                    if (res.ok) {
                        const data = await res.json();
                        const sessionData = data.data;

                        const localId = `loaded_${Date.now()}`;
                        const newLocal: LocalSession = {
                            localId,
                            dbId: sessionData._id,
                            title: sessionData.title,
                            provider: sessionData.provider,
                            model: sessionData.model,
                            messages: sessionData.messages || [],
                            systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
                            isLoaded: true,
                            isDirty: false,
                        };

                        setSessions(prev => {
                            // Remove any existing local reference
                            const filtered = prev.filter(s => s.dbId !== dbId);
                            return [newLocal, ...filtered];
                        });
                        setCurrentSessionId(localId);
                        setSelectedModel(sessionData.model);
                    }
                } catch (err) {
                    console.error('Failed to load session messages:', err);
                } finally {
                    setIsLoadingMessages(false);
                }
            },
            [sessions],
        );

        const saveSession = useCallback(
            async (sessionToSave: LocalSession) => {
                if (!sessionToSave || sessionToSave.messages.length === 0) return;

                setIsSaving(true);
                try {
                    if (sessionToSave.dbId) {
                        // Update existing
                        await fetch('/api/ai-chat/sessions', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id: sessionToSave.dbId,
                                title: sessionToSave.title,
                                messages: sessionToSave.messages,
                                model: sessionToSave.model,
                                provider: sessionToSave.provider,
                            }),
                        });

                        setSessions(prev =>
                            prev.map(s =>
                                s.localId === sessionToSave.localId ? { ...s, isDirty: false } : s,
                            ),
                        );
                    } else {
                        // Create new
                        const res = await fetch('/api/ai-chat/sessions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                title: sessionToSave.title,
                                provider: sessionToSave.provider,
                                model: sessionToSave.model,
                                messages: sessionToSave.messages,
                            }),
                        });

                        if (res.ok) {
                            const data = await res.json();
                            setSessions(prev =>
                                prev.map(s =>
                                    s.localId === sessionToSave.localId
                                        ? { ...s, dbId: data.data._id, isDirty: false }
                                        : s,
                                ),
                            );
                            // Refresh saved sessions list
                            fetchSavedSessions();
                        }
                    }
                } catch (err) {
                    console.error('Failed to save session:', err);
                } finally {
                    setIsSaving(false);
                }
            },
            [fetchSavedSessions],
        );

        const deleteSession = useCallback(
            async (e: React.MouseEvent, localId: string) => {
                e.stopPropagation();
                const session = sessions.find(s => s.localId === localId);

                if (session?.dbId) {
                    try {
                        await fetch(`/api/ai-chat/sessions?id=${session.dbId}`, { method: 'DELETE' });
                        setSavedSessions(prev => prev.filter(s => s._id !== session.dbId));
                    } catch (err) {
                        console.error('Failed to delete session:', err);
                    }
                }

                setSessions(prev => prev.filter(s => s.localId !== localId));
                if (currentSessionId === localId) {
                    const remaining = sessions.filter(s => s.localId !== localId);
                    setCurrentSessionId(remaining.length > 0 ? remaining[0].localId : null);
                }
            },
            [sessions, currentSessionId],
        );

        const deleteSavedSession = useCallback(
            async (e: React.MouseEvent, dbId: string) => {
                e.stopPropagation();
                try {
                    await fetch(`/api/ai-chat/sessions?id=${dbId}`, { method: 'DELETE' });
                    setSavedSessions(prev => prev.filter(s => s._id !== dbId));
                    setSessions(prev => prev.filter(s => s.dbId !== dbId));
                } catch (err) {
                    console.error('Failed to delete saved session:', err);
                }
            },
            [],
        );

        // ========== Session Operations ==========

        const createNewSession = useCallback(
            (overrides?: Partial<LocalSession>) => {
                const localId = `new_${Date.now()}`;
                const newSession: LocalSession = {
                    localId,
                    title: 'New Chat',
                    provider: currentModel.provider,
                    model: currentModel.id,
                    messages: [],
                    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
                    activeGem: null,
                    isLoaded: true,
                    isDirty: false,
                    ...overrides,
                };
                setSessions(prev => [newSession, ...prev]);
                setCurrentSessionId(localId);
                setInput('');
            },
            [currentModel],
        );

        const handleNewChat = useCallback(() => {
            createNewSession();
        }, [createNewSession]);

        const handleEmailRefine = useCallback(() => {
            createNewSession({
                title: 'Email Refiner',
                systemInstruction: EMAIL_PROMPT,
                activeGem: 'Email Refiner',
            });
        }, [createNewSession]);

        // ========== Attachment Handling ==========

        const PAR_URL_BASE = 'https://objectstorage.ca-toronto-1.oraclecloud.com/p/QLAWx8wCq1Wb3kBchcG9RCcy3TcngoiuartQbdYovOIXVvYxNVvBGtWE09o29MvG/n/yzo9jkinnwr6/b/bucket-20260103-1212/o/';

        // Compress and resize image for client-side sending
        const compressImage = useCallback((file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                const QUALITY = 0.6;

                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = event => {
                    const img = new Image();
                    img.src = event.target?.result as string;
                    img.onload = () => {
                        let width = img.width;
                        let height = img.height;

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
                        const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
                        resolve(dataUrl);
                    };
                    img.onerror = error => reject(error);
                };
                reader.onerror = error => reject(error);
            });
        }, []);

        // Upload file to Oracle Object Storage
        const uploadToOracle = useCallback(async (file: File): Promise<string> => {
            const objectName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const uploadUrl = `${PAR_URL_BASE}${objectName}`;

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
        }, []);

        // Handle file selection from input
        const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files) return;
            const files = Array.from(e.target.files);
            const newAttachments: Attachment[] = [];
            const MAX_SIZE = 50 * 1024 * 1024; // 50MB

            for (const file of files) {
                if (file.size > MAX_SIZE) {
                    alert(`File ${file.name} is too large. Max size is 50MB.`);
                    continue;
                }

                try {
                    // Images - compress client-side
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

                    // PDF - upload to Oracle
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
                            console.error('PDF Upload failed', err);
                            alert(`Failed to upload ${file.name}`);
                        }
                        continue;
                    }

                    // Plain text fallback
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
            e.target.value = ''; // Allow re-selecting same file
        }, [compressImage, uploadToOracle]);

        // Handle image paste from clipboard
        const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
        }, [compressImage]);

        // Remove an attachment by index
        const removeAttachment = useCallback((index: number) => {
            setAttachments(prev => prev.filter((_, i) => i !== index));
        }, []);

        // ========== Chat Submit ==========

        const handleSubmit = useCallback(
            async (e: React.FormEvent) => {
                e.preventDefault();
                if ((!input.trim() && attachments.length === 0) || isLoading || !currentSessionId) return;

                const userMessageText = input.trim();
                const currentAttachments = [...attachments];
                setInput('');
                setAttachments([]);

                // Determine model being used
                const model = ALL_MODELS.find(m => m.id === selectedModel) || ALL_MODELS[0];

                // Auto-create session if none exists
                let activeSessionId = currentSessionId;
                if (!currentSession) {
                    const localId = `new_${Date.now()}`;
                    const newSession: LocalSession = {
                        localId,
                        title: 'New Chat',
                        provider: model.provider,
                        model: model.id,
                        messages: [],
                        systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
                        isLoaded: true,
                        isDirty: false,
                    };
                    setSessions(prev => [newSession, ...prev]);
                    setCurrentSessionId(localId);
                    activeSessionId = localId;
                }

                // Collect image data URLs for display in chat
                const imageDataUrls = currentAttachments
                    .filter(a => a.type === 'image' && a.content)
                    .map(a => a.content as string);

                const userMessage: ChatMessage = {
                    role: 'user',
                    content: userMessageText || (currentAttachments.length > 0 ? `[Attached ${currentAttachments.length} file(s)]` : ''),
                    images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
                    timestamp: Date.now(),
                };

                // Optimistic update
                setSessions(prev =>
                    prev.map(s => {
                        if (s.localId === activeSessionId) {
                            const newTitle =
                                s.messages.length === 0 && s.title === 'New Chat'
                                    ? userMessageText.slice(0, 40) + (userMessageText.length > 40 ? '...' : '')
                                    : s.title;
                            return {
                                ...s,
                                title: newTitle,
                                provider: model.provider,
                                model: model.id,
                                messages: [...s.messages, userMessage],
                                isDirty: true,
                            };
                        }
                        return s;
                    }),
                );

                setIsLoading(true);

                try {
                    let responseText: string;
                    const sessionLocal = sessions.find(s => s.localId === activeSessionId);
                    const systemInstruction =
                        sessionLocal?.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION;

                    if (model.provider === 'gemini') {
                        const apiKey = geminiApiKey || 'GEMINI_SCOPED';
                        const history = (sessionLocal?.messages || []).map(m => ({
                            role: m.role === 'assistant' ? ('model' as const) : (m.role as 'user' | 'model'),
                            parts: m.content,
                        }));

                        // Build Gemini attachments array
                        const geminiAttachments = currentAttachments.map(att => ({
                            type: att.type,
                            content: att.content,
                            url: att.url,
                            name: att.name,
                            mimeType: att.mimeType,
                        }));

                        responseText = await getChatResponse(
                            apiKey,
                            history,
                            userMessageText,
                            model.id,
                            systemInstruction,
                            geminiAttachments,
                            false,
                        );
                    } else {
                        const apiKey = openaiApiKey || 'MANAGED';
                        const history = (sessionLocal?.messages || []).map(m => ({
                            role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant',
                            content: m.content as MessageContent,
                        }));

                        // Extract image data URLs for OpenAI Vision
                        const openaiImages = currentAttachments
                            .filter(a => a.type === 'image' && a.content)
                            .map(a => a.content as string);

                        responseText = await getOpenAIChatResponse(
                            apiKey,
                            history,
                            userMessageText,
                            model.id,
                            systemInstruction,
                            openaiImages.length > 0 ? openaiImages : undefined,
                        );
                    }

                    const assistantMessage: ChatMessage = {
                        role: model.provider === 'gemini' ? 'model' : 'assistant',
                        content: responseText,
                        timestamp: Date.now(),
                    };

                    // Build the complete session for saving BEFORE setState
                    // We need the latest state, so use the functional updater
                    let sessionForSave: LocalSession | null = null;
                    setSessions(prev => {
                        return prev.map(s => {
                            if (s.localId === activeSessionId) {
                                const updated = {
                                    ...s,
                                    messages: [...s.messages, assistantMessage],
                                    isDirty: true,
                                };
                                sessionForSave = updated;
                                return updated;
                            }
                            return s;
                        });
                    });

                    // Use a microtask to ensure setSessions updater has run
                    // and sessionForSave has been assigned
                    await new Promise(resolve => setTimeout(resolve, 50));

                    if (sessionForSave) {
                        saveSession(sessionForSave);
                    }
                } catch (error: unknown) {
                    const errorMessage =
                        error instanceof Error ? error.message : 'Unknown error occurred';
                    const errorMsg: ChatMessage = {
                        role: model.provider === 'gemini' ? 'model' : 'assistant',
                        content: `Error: ${errorMessage}. Please check your API key and try again.`,
                        timestamp: Date.now(),
                    };

                    setSessions(prev =>
                        prev.map(s => {
                            if (s.localId === activeSessionId) {
                                return { ...s, messages: [...s.messages, errorMsg] };
                            }
                            return s;
                        }),
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                input,
                attachments,
                isLoading,
                currentSessionId,
                currentSession,
                selectedModel,
                sessions,
                geminiApiKey,
                openaiApiKey,
                saveSession,
            ],
        );

        // ========== Markdown Rendering ==========

        const preprocessMarkdown = useCallback((content: string) => {
            if (!content) return '';
            let processed = content;
            processed = processed.replace(/([^\n])\n(```)/g, '$1\n\n$2');
            processed = processed.replace(/(^|\n)([^|\n]+)(\|)/g, '$1$2\n\n$3');
            processed = processed.replace(/\| *(\| *[^ |])/g, '|\n$1');
            return processed;
        }, []);

        const markdownComponents: any = useMemo(
            () => ({
                table: ({ node, ...props }: any) => (
                    <div className="overflow-x-auto my-4 rounded-xl border border-zinc-700/50 bg-zinc-800/20">
                        <table className="min-w-full divide-y divide-zinc-700/50" {...props} />
                    </div>
                ),
                thead: ({ node, ...props }: any) => <thead className="bg-zinc-800" {...props} />,
                tbody: ({ node, ...props }: any) => (
                    <tbody className="divide-y divide-zinc-700 bg-zinc-900/50" {...props} />
                ),
                tr: ({ node, ...props }: any) => (
                    <tr className="transition-colors hover:bg-zinc-800/30" {...props} />
                ),
                th: ({ node, ...props }: any) => (
                    <th
                        className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider"
                        {...props}
                    />
                ),
                td: ({ node, ...props }: any) => (
                    <td className="px-6 py-4 text-sm text-zinc-300 whitespace-normal" {...props} />
                ),
                p: ({ node, ...props }: any) => (
                    <p className="mb-4 leading-7 last:mb-0" {...props} />
                ),
                a: ({ node, ...props }: any) => (
                    <a
                        className="text-blue-400 hover:text-blue-300 underline underline-offset-4"
                        target="_blank"
                        {...props}
                    />
                ),
                ul: ({ node, ...props }: any) => (
                    <ul
                        className="my-4 ml-6 list-disc space-y-2 marker:text-zinc-500"
                        {...props}
                    />
                ),
                ol: ({ node, ...props }: any) => (
                    <ol
                        className="my-4 ml-6 list-decimal space-y-2 marker:text-zinc-500"
                        {...props}
                    />
                ),
                li: ({ node, ...props }: any) => <li className="pl-2" {...props} />,
                blockquote: ({ node, ...props }: any) => (
                    <blockquote
                        className="border-l-4 border-zinc-600 pl-4 my-4 italic text-zinc-400"
                        {...props}
                    />
                ),
                hr: ({ node, ...props }: any) => (
                    <hr className="my-6 border-zinc-700" {...props} />
                ),
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
                        <code
                            className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-400"
                            {...props}
                        >
                            {children}
                        </code>
                    );
                },
            }),
            [],
        );

        // ========== Key Handlers ==========

        const handleKeyDown = useCallback(
            (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                }
            },
            [handleSubmit],
        );

        // ========== Derived State ==========

        // Saved sessions that aren't already loaded locally
        const unloadedSavedSessions = useMemo(() => {
            const loadedDbIds = new Set(sessions.filter(s => s.dbId).map(s => s.dbId));
            return savedSessions.filter(s => !loadedDbIds.has(s._id));
        }, [sessions, savedSessions]);

        if (!isOpen) return null;

        const providerColor =
            currentModel.provider === 'gemini'
                ? {
                    accent: 'text-blue-400',
                    accentBg: 'bg-blue-500/10',
                    accentBorder: 'border-blue-500/20',
                    avatarBg: 'bg-blue-600',
                    ring: 'focus:ring-blue-500',
                    hoverText: 'hover:text-blue-400',
                    dot: 'bg-blue-400',
                }
                : {
                    accent: 'text-emerald-400',
                    accentBg: 'bg-emerald-500/10',
                    accentBorder: 'border-emerald-500/20',
                    avatarBg: 'bg-emerald-600',
                    ring: 'focus:ring-emerald-500',
                    hoverText: 'hover:text-emerald-400',
                    dot: 'bg-emerald-400',
                };

        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="relative w-[95vw] h-[92vh] max-w-[1400px] bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-700/50 flex overflow-hidden animate-in fade-in duration-200">
                    {/* Close Button */}
                    <button
                        className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all border border-zinc-700/50"
                        onClick={onClose}
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Sidebar */}
                    <div className="w-72 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950/50">
                        {/* New Chat Button */}
                        <div className="p-4 border-b border-zinc-800">
                            <button
                                className="w-full flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-zinc-800 to-zinc-800/80 hover:from-zinc-700 hover:to-zinc-700/80 text-zinc-100 rounded-xl transition-all border border-zinc-700/50 text-sm font-medium shadow-lg shadow-black/20"
                                onClick={handleNewChat}
                            >
                                <Plus className="w-4 h-4" />
                                New Chat
                            </button>

                            <button
                                className="w-full flex items-center gap-2 px-4 py-2 mt-2 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all text-xs font-medium"
                                onClick={handleEmailRefine}
                            >
                                <FilePenLine className="w-3.5 h-3.5" />
                                Email Refiner
                            </button>
                        </div>

                        {/* Active Sessions */}
                        <div className="flex-1 overflow-y-auto">
                            {sessions.length > 0 && (
                                <div className="p-2">
                                    <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                                        Active Chats
                                    </p>
                                    {sessions.map(session => (
                                        <div
                                            className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm mb-0.5 ${currentSessionId === session.localId
                                                ? 'bg-zinc-800 text-white shadow-md shadow-black/20'
                                                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                                                }`}
                                            key={session.localId}
                                            onClick={() => {
                                                setCurrentSessionId(session.localId);
                                                setSelectedModel(session.model);
                                            }}
                                        >
                                            <div
                                                className={`w-2 h-2 rounded-full flex-shrink-0 ${session.provider === 'gemini' ? 'bg-blue-400' : 'bg-emerald-400'
                                                    }`}
                                            />
                                            <span className="truncate flex-1 text-left">{session.title}</span>
                                            {session.isDirty && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Unsaved" />
                                            )}
                                            <button
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity flex-shrink-0"
                                                onClick={e => deleteSession(e, session.localId)}
                                                title="Delete chat"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Saved Sessions (titles only) */}
                            <div className="p-2 border-t border-zinc-800/50">
                                <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                                    Saved History
                                </p>
                                {isLoadingSessions ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                                    </div>
                                ) : unloadedSavedSessions.length === 0 ? (
                                    <p className="px-3 py-4 text-xs text-zinc-600 text-center">
                                        No saved chats yet
                                    </p>
                                ) : (
                                    unloadedSavedSessions.map(saved => (
                                        <div
                                            className="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 mb-0.5"
                                            key={saved._id}
                                            onClick={() => loadSessionMessages(saved._id)}
                                        >
                                            <div
                                                className={`w-2 h-2 rounded-full flex-shrink-0 opacity-50 ${saved.provider === 'gemini' ? 'bg-blue-400' : 'bg-emerald-400'
                                                    }`}
                                            />
                                            <span className="truncate flex-1 text-left">{saved.title}</span>
                                            <span className="text-[10px] text-zinc-600 flex-shrink-0">
                                                {new Date(saved.updatedAt).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                            <button
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity flex-shrink-0"
                                                onClick={e => deleteSavedSession(e, saved._id)}
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Sidebar Footer */}
                        <div className="p-3 border-t border-zinc-800 text-center">
                            <span className="text-[10px] text-zinc-600">
                                {sessions.length} active · {savedSessions.length} saved
                            </span>
                        </div>
                    </div>

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Header */}
                        <header className="flex items-center justify-between px-6 py-3.5 bg-zinc-800/50 border-b border-zinc-700/50 backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-lg ${providerColor.avatarBg} flex items-center justify-center`}>
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-white">
                                            {currentSession?.title || 'AI Assistant'}
                                        </h2>
                                        <p className={`text-[10px] ${providerColor.accent}`}>
                                            {currentModel.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}
                                        </p>
                                    </div>
                                </div>

                                {/* Model Selector */}
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-700 transition-all ${providerColor.ring} focus:ring-1 outline-none`}
                                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${providerColor.dot}`} />
                                        {currentModel.label}
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showModelDropdown && (
                                        <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl shadow-black/40 py-1 z-50 min-w-[240px] overflow-hidden">
                                            {/* Gemini Models */}
                                            <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest bg-zinc-800/50">
                                                Google Gemini
                                            </p>
                                            {GEMINI_MODELS.map(model => (
                                                <button
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${selectedModel === model.id
                                                        ? 'bg-blue-500/10 text-blue-400'
                                                        : 'text-zinc-300 hover:bg-zinc-700/50'
                                                        }`}
                                                    key={model.id}
                                                    onClick={() => {
                                                        setSelectedModel(model.id);
                                                        setShowModelDropdown(false);
                                                    }}
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                                    {model.label}
                                                </button>
                                            ))}

                                            <div className="my-1 border-t border-zinc-700/50" />

                                            {/* OpenAI Models */}
                                            <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest bg-zinc-800/50">
                                                OpenAI
                                            </p>
                                            {OPENAI_MODELS.map(model => (
                                                <button
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${selectedModel === model.id
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'text-zinc-300 hover:bg-zinc-700/50'
                                                        }`}
                                                    key={model.id}
                                                    onClick={() => {
                                                        setSelectedModel(model.id);
                                                        setShowModelDropdown(false);
                                                    }}
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                    {model.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mr-10">
                                {currentSession?.activeGem && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 text-xs font-medium">
                                        <FilePenLine className="w-3 h-3" />
                                        {currentSession.activeGem}
                                    </div>
                                )}
                                {isSaving && (
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Saving...
                                    </div>
                                )}
                            </div>
                        </header>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                            {!currentSession || currentSession.messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                                    {isLoadingMessages ? (
                                        <>
                                            <Loader2 className="w-10 h-10 animate-spin text-zinc-600" />
                                            <p className="text-sm text-zinc-600">Loading conversation...</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <Bot className="w-16 h-16 text-zinc-700" />
                                                <div
                                                    className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${providerColor.dot} opacity-80`}
                                                />
                                            </div>
                                            <p className="text-lg font-medium text-zinc-400">
                                                What can I help you with?
                                            </p>
                                            <p className="text-sm text-zinc-600">
                                                Select a model and start chatting
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                currentSession.messages.map((msg, idx) => {
                                    const isUser = msg.role === 'user';
                                    return (
                                        <div
                                            className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                                            key={idx}
                                        >
                                            <div
                                                className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'
                                                    }`}
                                            >
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-violet-600' : providerColor.avatarBg
                                                        }`}
                                                >
                                                    {isUser ? (
                                                        <User className="w-5 h-5 text-white" />
                                                    ) : (
                                                        <Bot className="w-5 h-5 text-white" />
                                                    )}
                                                </div>

                                                <div
                                                    className={`px-4 py-3 rounded-2xl ${isUser
                                                        ? 'bg-violet-600 text-white rounded-tr-none'
                                                        : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/50'
                                                        }`}
                                                >
                                                    <div className="prose prose-invert max-w-none text-sm sm:text-base">
                                                        {/* Render attached images */}
                                                        {msg.images && msg.images.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mb-2">
                                                                {msg.images.map((img, i) => (
                                                                    <img
                                                                        alt="Attached"
                                                                        className="max-w-full rounded-lg max-h-48 object-contain border border-zinc-600/50"
                                                                        key={i}
                                                                        src={img}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                        <ReactMarkdown
                                                            components={markdownComponents}
                                                            remarkPlugins={plugins}
                                                        >
                                                            {preprocessMarkdown(msg.content)}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {isLoading && (
                                <div className="flex gap-4 justify-start">
                                    <div
                                        className={`w-8 h-8 rounded-full ${providerColor.avatarBg} flex items-center justify-center flex-shrink-0`}
                                    >
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-none border border-zinc-700/50 flex items-center gap-2">
                                        <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                                        <span className="text-xs text-zinc-500">Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 backdrop-blur-xl">
                            {/* Hidden file inputs */}
                            <input
                                accept="image/*"
                                className="hidden"
                                multiple
                                onChange={handleFileSelect}
                                ref={imageInputRef}
                                type="file"
                            />
                            <input
                                accept=".pdf,.txt,.doc,.docx,.csv,.xlsx,.xls"
                                className="hidden"
                                multiple
                                onChange={handleFileSelect}
                                ref={fileInputRef}
                                type="file"
                            />

                            <form className="max-w-4xl mx-auto" onSubmit={handleSubmit}>
                                {/* Attachment preview */}
                                {attachments.length > 0 && (
                                    <div className="flex gap-2 mb-3 flex-wrap">
                                        {attachments.map((att, idx) => (
                                            <div
                                                className="relative group flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300"
                                                key={idx}
                                            >
                                                {att.type === 'image' ? (
                                                    <img
                                                        alt={att.name}
                                                        className="h-8 w-8 rounded object-cover"
                                                        src={att.content}
                                                    />
                                                ) : (
                                                    <FileText className="w-4 h-4 text-zinc-400" />
                                                )}
                                                <span className="truncate max-w-[120px]">{att.name}</span>
                                                <button
                                                    className="ml-1 p-0.5 rounded-full bg-zinc-700 hover:bg-red-500/80 text-zinc-400 hover:text-white transition-colors"
                                                    onClick={(e) => { e.preventDefault(); removeAttachment(idx); }}
                                                    type="button"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="relative flex items-end gap-2">
                                    {/* Attach buttons */}
                                    <div className="flex flex-col gap-1 pb-1">
                                        <button
                                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                                            onClick={() => imageInputRef.current?.click()}
                                            title="Attach images"
                                            type="button"
                                        >
                                            <ImageIcon className="w-4.5 h-4.5" />
                                        </button>
                                        <button
                                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                                            onClick={() => fileInputRef.current?.click()}
                                            title="Attach files (PDF, text, etc.)"
                                            type="button"
                                        >
                                            <Paperclip className="w-4.5 h-4.5" />
                                        </button>
                                    </div>

                                    <div className="relative flex-1">
                                        <textarea
                                            className={`w-full bg-zinc-800 text-zinc-100 rounded-xl pl-4 pr-12 py-3 border border-zinc-700 ${providerColor.ring} focus:ring-2 focus:border-transparent outline-none transition-all placeholder-zinc-500 resize-none min-h-[50px] max-h-[200px]`}
                                            disabled={isLoading}
                                            onChange={e => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            onPaste={handlePaste}
                                            placeholder={`Message ${currentModel.provider === 'gemini' ? 'Gemini' : 'OpenAI'}... (paste images here)`}
                                            ref={textareaRef}
                                            rows={1}
                                            value={input}
                                        />
                                        <button
                                            className={`absolute right-2 bottom-2 p-2 text-zinc-400 ${providerColor.hoverText} disabled:opacity-50 disabled:hover:text-zinc-400 transition-colors`}
                                            disabled={(!input.trim() && attachments.length === 0) || isLoading}
                                            type="submit"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${providerColor.dot}`} />
                                        <span className="text-[10px] text-zinc-600">
                                            {currentModel.label} · {currentModel.provider === 'gemini' ? 'Gemini' : 'OpenAI'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-zinc-600">
                                        Shift+Enter for new line · Paste images with Ctrl+V
                                    </span>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    },
);

UnifiedAIChatModal.displayName = 'UnifiedAIChatModal';

export default UnifiedAIChatModal;
