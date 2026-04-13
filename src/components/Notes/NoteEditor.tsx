/* eslint-disable simple-import-sort/imports */
'use client';

import {Dialog, Transition} from '@headlessui/react';
import {
  ArrowPathIcon,
  BriefcaseIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  CodeBracketIcon, // Icon for Rewrite
  ExclamationTriangleIcon,
  FlagIcon,
  SparklesIcon,
  WrenchIcon,
  QueueListIcon,
  XMarkIcon,
  PlusIcon,
  FaceSmileIcon,
  DocumentTextIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import {
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  FlagIcon as FlagIconSolid,
} from '@heroicons/react/24/solid';
import {useSession} from 'next-auth/react';
import useDetectOutsideClick from '@/hooks/useDetectOutsideClick'; // Import useSession
import React, {Fragment, useCallback, useEffect, useRef, useState} from 'react';

import {INotePage} from '@/models/NotePage';

import RichTextEditor from './RichTextEditor';

import ToDoModal from './ToDoModal';
import PromptEditorModal from './PromptEditorModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {renderToStaticMarkup} from 'react-dom/server';
import {AttachmentManager} from './AttachmentManager';
import RewriteModal from './RewriteModal'; // Import RewriteModal
import ExecutiveModal from './ExecutiveModal';
import {useBadgeSettings} from './BadgeSettingsContext'; // Added import

const REFINE_PROMPT = `System: Act as a communications ghostwriter. Return ONLY the rewritten text. No intros, no outros, no quotes.

Task: Rewrite the text below into a [Professionalism: 7/10] style. Voice: Competent colleague. Clear, punchy, and natural.

Hard Constraints:

No Dashes: Never use em-dashes (—), en-dashes (–), or hyphens to connect clauses. Use periods for new sentences.

No Corporate Fluff: Never use "utilize," "facilitate," or "leverage." Use simple verbs.

No Transitions: Avoid "Moreover," "Furthermore," or "In conclusion."

Sentence Flow: Vary lengths, but prioritize short, declarative sentences.

Here is the text to rewrite:`;

const SUMMARIZE_PROMPT = `System: Provide a concise executive summary of the following content. Bullet points are preferred for readability. Key points only.`;

const SUGGEST_PROMPT = `System: Analyze the text and provide 3-5 concrete suggestions for improvement, clarity, expansion, or tone matching. Format as a brief checklist.`;

interface NoteEditorProps {
  onSave: (id: string, data: any) => Promise<void>;
  page: INotePage | null;
  initialTabId?: string;
}

const NoteEditor: React.FC<NoteEditorProps> = React.memo(({onSave, page, initialTabId}) => {
  const {data: session} = useSession(); // Get session data
  // Tab State
  const [tabs, setTabs] = useState<
    {
      _id?: string;
      title: string;
      content: string;
      color?: string;
      isImportant?: boolean;
      isFlagged?: boolean;
      order: number;
    }[]
  >([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  // We still need a content state for the editor to bind to, which syncs with active tab
  const [editorContent, setEditorContent] = useState('');
  const {getBadgeStyle} = useBadgeSettings(); // Hook

  // Emoji picker state
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [activeCategoryKey, setActiveCategoryKey] = useState('smileys');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('recentEmojis') || '[]');
    } catch {
      return [];
    }
  });
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  useDetectOutsideClick(emojiPickerRef, () => setIsEmojiPickerOpen(false));

  // Badge/ToDo State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pageTodos, setPageTodos] = useState<any[]>([]);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ... (Modal states)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIActionsOpen, setIsAIActionsOpen] = useState(false);
  const aiActionsRef = useRef<HTMLDivElement>(null);
  useDetectOutsideClick(aiActionsRef, () => setIsAIActionsOpen(false));
  const [isGenerating, setIsGenerating] = useState(false);
  // ...

  // Update ToDos for Badge Counts
  useEffect(() => {
    if (page?._id) {
      // Fetch todos for this page
      const fetchPageTodos = async () => {
        try {
          const res = await fetch(`/api/todos?sourcePageId=${page._id}`);
          const data = await res.json();
          if (data.success) {
            setPageTodos(data.data);
          }
        } catch (e) {
          console.error('Failed to fetch page todos', e);
        }
      };
      fetchPageTodos();

      // Poll every 30s to keep badges fresh? Or rely on manual updates?
      // Let's just fetch once on mount/page change for now.
    }
  }, [page?._id]);

  // Fetch Saved Organize Prompt
  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const res = await fetch('/api/prompts/organize');
        const data = await res.json();
        if (data.prompt) {
          setOrganizePrompt(data.prompt);
        }
      } catch (e) {
        console.error('Failed to fetch organize prompt', e);
      }
    };
    fetchPrompt();
  }, []);

  // Tab Flag Handlers
  const handleToggleImportant = () => {
    setTabs(prev =>
      prev.map(t => {
        if (t._id === activeTabId || t.title === activeTabId) {
          return {...t, isImportant: !t.isImportant};
        }
        return t;
      }),
    );
    setIsDirty(true);
  };

  const handleToggleFlagged = () => {
    setTabs(prev =>
      prev.map(t => {
        if (t._id === activeTabId || t.title === activeTabId) {
          return {...t, isFlagged: !t.isFlagged};
        }
        return t;
      }),
    );
    setIsDirty(true);
  };

  const [generatedText, setGeneratedText] = useState('');
  const [isMarkdownResponse, setIsMarkdownResponse] = useState(false);
  // insertionRange removed — was Quill-only, no longer needed with Lexical
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setInsertionRange = (_: unknown) => {}; // no-op shim so callers don't break

  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [rewriteSelectedText, setRewriteSelectedText] = useState('');

  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const [organizePrompt, setOrganizePrompt] = useState('');

  const [isToDoOpen, setIsToDoOpen] = useState(false);

  // Tab Indicator State
  const [indicatorStyle, setIndicatorStyle] = useState({left: 0, width: 0});
  const tabsRef = useRef<(HTMLDivElement | null)[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);

  // Sync contentRef with editorContent
  const contentRef = useRef(''); // Assuming contentRef is meant to be defined here
  useEffect(() => {
    contentRef.current = editorContent;
  }, [editorContent]);

  // Migration & Initialization Effect
  useEffect(() => {
    if (page) {
      setIsDirty(false);

      if (page.tabs && page.tabs.length > 0) {
        // Sort tabs by order
        const sortedTabs = [...page.tabs].sort((a, b) => (a.order || 0) - (b.order || 0));
        setTabs(sortedTabs);

        let targetTabId = sortedTabs[0]._id || sortedTabs[0].title;

        // Try to load from localStorage first
        const savedTabId = localStorage.getItem(`last_tab_${page._id}`);
        if (savedTabId && sortedTabs.some(t => t._id === savedTabId || t.title === savedTabId)) {
          targetTabId = savedTabId;
        } else if (activeTabId) {
          // 1. Try exact ID match (e.g. editing existing tab)
          const idMatch = sortedTabs.find(t => t._id === activeTabId || t.title === activeTabId);
          if (idMatch) {
            targetTabId = idMatch._id || idMatch.title;
          } else {
            // 2. Try Title match (e.g. saving a new tab, ID changed from 'new-...' to real ID)
            const currentTab = tabs.find(t => t._id === activeTabId || t.title === activeTabId);
            if (currentTab) {
              const titleMatch = sortedTabs.find(t => t.title === currentTab.title);
              if (titleMatch) {
                targetTabId = titleMatch._id || titleMatch.title;
              }
            }
          }
        }

        // Override if initialTabId is provided (e.g. from handleJumpToTask)
        if (initialTabId) {
          const found = sortedTabs.find(t => t._id === initialTabId || t.title === initialTabId);
          if (found) {
            targetTabId = found._id || found.title;
          }
        }

        setActiveTabId(targetTabId);
        const activeTab = sortedTabs.find(t => (t._id || t.title) === targetTabId);
        setEditorContent(activeTab?.content || '');
      } else {
        // ... (legacy migration)
        const initialContent = page.content || '';
        const defaultTab = {
          _id: 'default-tab', // Temporary ID for UI
          title: page.title || 'General', // Use page title for default tab
          content: initialContent,
          color: '#ffffff',
          isImportant: page.isImportant || false,
          isFlagged: page.isFlagged || false,
          order: 0,
        };
        setTabs([defaultTab]);
        setActiveTabId('default-tab');
        setEditorContent(initialContent);
      }
    } else {
      setTabs([]);
      setActiveTabId(null);
      setEditorContent('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, initialTabId]);

  // Sync Editor Content when Active Tab Changes & Persist Active Tab
  useEffect(() => {
    if (activeTabId && page?._id) {
      localStorage.setItem(`last_tab_${page._id}`, activeTabId);
    }
    if (activeTabId && tabs.length > 0) {
      const activeTab = tabs.find(t => t._id === activeTabId || t.title === activeTabId);
      if (activeTab) {
        setEditorContent(activeTab.content);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  // Handlers for Tabs
  // Update Tab Indicator Position
  useEffect(() => {
    const activeTabIndex = tabs.findIndex(t => t._id === activeTabId || t.title === activeTabId);
    if (activeTabIndex !== -1 && tabsRef.current[activeTabIndex]) {
      const activeElement = tabsRef.current[activeTabIndex];
      if (activeElement) {
        setIndicatorStyle({
          left: activeElement.offsetLeft,
          width: activeElement.offsetWidth,
        });
      }
    }
  }, [activeTabId, tabs]);

  // Helper to package tabs for saving (Syncs active content + Sanitizes IDs)
  const prepareTabsPayload = (tabsToSave: typeof tabs) => {
    return tabsToSave.map(t => {
      // 1. Sync Active Content (Defensive Check for current edits)
      let currentContent = t.content;
      if (t._id === activeTabId || t.title === activeTabId) {
        currentContent = editorContent;
      }

      // 2. Prepare Object (Explicit properties to avoid 'rest' spread issues)
      const isTempId = t._id && (t._id.startsWith('new-') || t._id === 'default-tab' || t._id.startsWith('recovered-'));

      return {
        title: t.title,
        content: currentContent,
        color: t.color,
        isImportant: t.isImportant,
        isFlagged: t.isFlagged,
        order: t.order,
        // Only include _id if it's a real server ID
        ...(!isTempId && t._id ? {_id: t._id} : {}),
      };
    });
  };

  const handleAddTab = async () => {
    // 1. Sync current content to active tab before adding new one
    const updatedTabs = tabs.map(t => {
      if (t._id === activeTabId || t.title === activeTabId) {
        return {...t, content: editorContent};
      }
      return t;
    });

    const newTab = {
      title: `Tab ${updatedTabs.length + 1}`,
      content: '', // New tab starts empty
      color: '#ffffff',
      order: updatedTabs.length,
      _id: `new-${Date.now()}`,
    };

    // 2. Add new tab
    const newTabs = [...updatedTabs, newTab];
    setTabs(newTabs);

    // 3. Switch to new tab
    setActiveTabId(newTab._id);
    setEditorContent('');

    // 4. Immediate Save (Prevents data loss/ID mismatch issues)
    if (page) {
      try {
        setIsSaving(true);
        const sanitizedTabs = prepareTabsPayload(newTabs);
        await onSave(page._id as string, sanitizedTabs as any);
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to save new tab', error);
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsDirty(true);
    }
  };

  const handleDeleteTab = async (tabId: string) => {
    if (tabs.length <= 1) {
      alert('Cannot delete the last tab.');
      return;
    }
    if (!confirm('Are you sure you want to delete this tab?')) return;

    // Sync current content before modifying tabs array
    const currentSyncedTabs = tabs.map(t => {
      if (t._id === activeTabId || t.title === activeTabId) {
        return {...t, content: editorContent};
      }
      return t;
    });

    const newTabs = currentSyncedTabs.filter(t => t._id !== tabId && t.title !== tabId);
    setTabs(newTabs);

    // Switch to first tab if active was deleted
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0]._id || newTabs[0].title);
      setEditorContent(newTabs[0].content);
    }

    // Immediate Save
    if (page) {
      try {
        setIsSaving(true);
        const sanitizedTabs = prepareTabsPayload(newTabs);
        await onSave(page._id as string, sanitizedTabs as any);
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to save deletion', error);
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsDirty(true);
    }
  };

  const handleRenameTab = (tabId: string, newTitle: string) => {
    // Sync active content first (in case we run this while typing?)
    // Actually input `onChange` runs separate from editor `onChange`.
    // But safely syncing is better.

    const newTabs = tabs.map(t => {
      // Create a base object that has the latest content if it's the active tab
      let updatedTab = t;
      if (t._id === activeTabId || t.title === activeTabId) {
        updatedTab = {...t, content: editorContent};
      }

      // Now apply rename if it matches target
      if (updatedTab._id === tabId || (!updatedTab._id && updatedTab.title === tabId)) {
        return {...updatedTab, title: newTitle};
      }
      return updatedTab;
    });
    setTabs(newTabs);
    setIsDirty(true);
  };

  // Upated Save Handler
  // Upated Save Handler
  // Upated Save Handler
  const handleSave = async () => {
    if (page) {
      // Prepare payload (Sync active content + Sanitize)
      const sanitizedTabs = prepareTabsPayload(tabs);

      // Send to Parent
      try {
        setIsSaving(true);
        setSaveError(null);
        await onSave(page._id as string, sanitizedTabs as any);
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to save page', error);
        setSaveError('Save failed — page may be too large. Try removing large images.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleContentChange = useCallback(
    (val: string, _delta: any, source: string) => {
      // CRITICAL FIX: Only update state if the change comes from the USER.
      // Programmatic changes (e.g. switching tabs loads empty content) trigger 'api' source.
      // If we process 'api' changes, we might overwrite the PREVIOUS tab's content with the NEW tab's empty content
      // because of closure staleness or race conditions.
      if (source !== 'user') return;

      setEditorContent(val);
      // Update the tabs state immediately so that if we switch tabs or save, it's captured
      setTabs(prev =>
        prev.map(t => {
          if (t._id === activeTabId || t.title === activeTabId) {
            return {...t, content: val};
          }
          return t;
        }),
      );
      setIsDirty(true);
    },
    [activeTabId],
  );

  // Helper to get selected text — Lexical-compatible using window.getSelection()
  // Note: kept for potential future use but handleOpenRewrite uses getSelection directly

  const handleOpenRewrite = () => {
    const text = window.getSelection()?.toString()?.trim();
    if (!text) {
      alert('Please select some text to rewrite.');
      return;
    }
    setRewriteSelectedText(text);
    setInsertionRange(null);
    setIsRewriteModalOpen(true);
  };

  const handleCloseRewriteModal = useCallback(() => {
    setIsRewriteModalOpen(false);
  }, []);

  const handleRewrittenInsertMemo = useCallback(
    (newText: string) => {
      const htmlToInsert = `<p>${newText.replace(/\n/g, '</p><p>')}</p>`;
      // ✅ Directly insert into Lexical via the ref
      if (quillRef.current?.appendHtml) {
        quillRef.current.appendHtml(htmlToInsert);
      } else {
        setEditorContent(prev => prev + '\n' + htmlToInsert);
      }
      setTabs(prev =>
        prev.map(t =>
          t._id === activeTabId || t.title === activeTabId ? {...t, content: t.content + '\n' + htmlToInsert} : t,
        ),
      );
      setIsDirty(true);
    },
    [activeTabId],
  );

  const handleRefineAI = async () => {
    const text = window.getSelection()?.toString()?.trim() || '';

    if (!text) {
      alert('Please select some text to refine.');
      return;
    }

    setInsertionRange(null); // No longer quill-range-based; we use selection info
    setIsModalOpen(true);
    setIsGenerating(true);
    setGeneratedText('');
    setIsMarkdownResponse(false);

    const fullPrompt = `${REFINE_PROMPT}\n\n"${text}"`;

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: fullPrompt,
          model: 'gemini-flash-latest',
          apiKey: 'MANAGED',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setGeneratedText(`Error: ${data.details || data.error || 'Unknown error'}`);
        return;
      }
      setGeneratedText(data.text || 'Failed to refine content.');
    } catch (error) {
      console.error(error);
      setGeneratedText('Error connecting to Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSummarizeAI = async () => {
    // Use selection or full editor HTML content
    const selectedText = window.getSelection()?.toString()?.trim();
    const text =
      selectedText ||
      (editorContent ? new DOMParser().parseFromString(editorContent, 'text/html').body.innerText.trim() : '');

    if (!text) {
      alert('No text found to summarize.');
      return;
    }

    setInsertionRange(null);
    setIsModalOpen(true);
    setIsGenerating(true);
    setGeneratedText('');
    setIsMarkdownResponse(true);

    const fullPrompt = `${SUMMARIZE_PROMPT}\n\n"${text}"`;

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: fullPrompt,
          model: 'gemini-flash-latest',
          apiKey: 'MANAGED',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setGeneratedText(`Error: ${data.details || data.error || 'Unknown error'}`);
        return;
      }
      setGeneratedText(data.text || 'Failed to summarize content.');
    } catch (error) {
      console.error(error);
      setGeneratedText('Error connecting to Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestAI = async () => {
    const selectedText = window.getSelection()?.toString()?.trim();
    const text =
      selectedText ||
      (editorContent ? new DOMParser().parseFromString(editorContent, 'text/html').body.innerText.trim() : '');

    if (!text) {
      alert('No text found to analyze.');
      return;
    }

    setInsertionRange(null);
    setIsModalOpen(true);
    setIsGenerating(true);
    setGeneratedText('');
    setIsMarkdownResponse(true);

    const fullPrompt = `${SUGGEST_PROMPT}\n\n"${text}"`;

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: fullPrompt,
          model: 'gemini-flash-latest',
          apiKey: 'MANAGED',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setGeneratedText(`Error: ${data.details || data.error || 'Unknown error'}`);
        return;
      }
      setGeneratedText(data.text || 'Failed to generate suggestions.');
    } catch (error) {
      console.error(error);
      setGeneratedText('Error connecting to Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOrganizeAI = async () => {
    const text = window.getSelection()?.toString()?.trim();

    if (!text) {
      alert('Please select some text to organize.');
      return;
    }

    setInsertionRange(null);
    setIsPromptEditorOpen(true);
  };

  const handleRunOrganize = async (customPrompt: string) => {
    try {
      await fetch('/api/prompts/organize', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt: customPrompt}),
      });
      setOrganizePrompt(customPrompt);
    } catch (e) {
      console.error('Failed to save prompt:', e);
    }

    setIsModalOpen(true);
    setIsGenerating(true);
    setGeneratedText('');
    setIsMarkdownResponse(true);

    // Get selected text directly from window selection
    const text =
      window.getSelection()?.toString()?.trim() ||
      (editorContent ? new DOMParser().parseFromString(editorContent, 'text/html').body.innerText.trim() : '');

    const fullPrompt = `${customPrompt}\n\n"${text}"`;

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: fullPrompt,
          model: 'gemini-flash-latest',
          apiKey: 'MANAGED',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setGeneratedText(`Error: ${data.details || data.error || 'Unknown error'}`);
        return;
      }
      setGeneratedText(data.text || 'Failed to organize content.');
    } catch (error) {
      console.error(error);
      setGeneratedText('Error connecting to Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAI = async () => {
    const text = window.getSelection()?.toString()?.trim();

    if (!text) {
      alert('Please select some text in the note to ask AI.');
      return;
    }

    setInsertionRange(null);
    setIsModalOpen(true);
    setIsGenerating(true);
    setGeneratedText('');
    setIsMarkdownResponse(false);

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt: text, apiKey: 'MANAGED', model: 'gemini-flash-latest'}),
      });
      const data = await response.json();

      if (!response.ok) {
        setGeneratedText(`Error: ${data.details || data.error || 'Unknown error'}`);
        return;
      }
      setGeneratedText(data.text || 'Failed to generate response.');
    } catch (error) {
      console.error(error);
      setGeneratedText('Error connecting to Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertAI = () => {
    const htmlToInsert = isMarkdownResponse
      ? renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedText}</ReactMarkdown>)
      : `<p>${generatedText.replace(/\n/g, '</p><p>')}</p>`;

    // ✅ Directly insert into Lexical via the ref (reliable, no stale-state risk)
    if (quillRef.current?.appendHtml) {
      quillRef.current.appendHtml(htmlToInsert);
    } else {
      // Fallback via state sync
      setEditorContent(prev => prev + '\n' + htmlToInsert);
    }

    // Keep tabs state in sync so Save captures the new content
    setTabs(prev =>
      prev.map(t =>
        t._id === activeTabId || t.title === activeTabId ? {...t, content: t.content + '\n' + htmlToInsert} : t,
      ),
    );
    setIsDirty(true);
    setIsModalOpen(false);
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleOpenToDo = useCallback(() => {
    setIsToDoOpen(true);
  }, []);

  const handleCloseToDo = useCallback(() => {
    setIsToDoOpen(false);
  }, []);

  const handleInsertSymbol = (symbol: string) => {
    // Insert via Lexical editor ref at current cursor position
    if (quillRef.current?.insertText) {
      quillRef.current.insertText(symbol);
    } else {
      // Fallback: append to content state
      const appended = editorContent + ' ' + symbol;
      setEditorContent(appended);
      setTabs(prev =>
        prev.map(t => (t._id === activeTabId || t.title === activeTabId ? {...t, content: appended} : t)),
      );
    }
    setIsDirty(true);
  };

  const EMOJI_CATEGORIES = [
    {
      label: '🕐 Recent',
      key: 'recent',
      emojis: [] as string[], // populated from recentEmojis state
    },
    {
      label: '😀 Smileys',
      key: 'smileys',
      emojis: [
        '😀',
        '😃',
        '😄',
        '😁',
        '😆',
        '😅',
        '🤣',
        '😂',
        '🙂',
        '🙃',
        '😉',
        '😊',
        '😇',
        '🥰',
        '😍',
        '🤩',
        '😘',
        '😗',
        '☺️',
        '😚',
        '😙',
        '🥲',
        '😋',
        '😛',
        '😜',
        '🤪',
        '😝',
        '🤑',
        '🤗',
        '🤭',
        '🤫',
        '🤔',
        '🤐',
        '🤨',
        '😐',
        '😑',
        '😶',
        '😏',
        '😒',
        '🙄',
        '😬',
        '🤥',
        '😌',
        '😔',
        '😪',
        '🤤',
        '😴',
        '😷',
        '🤒',
        '🤕',
        '🤢',
        '🤮',
        '🤧',
        '🥵',
        '🥶',
        '🥴',
        '😵',
        '🤯',
        '🤠',
        '🥳',
        '🥸',
        '😎',
        '🤓',
        '🧐',
        '😕',
        '😟',
        '🙁',
        '☹️',
        '😮',
        '😯',
        '😲',
        '😳',
        '🥺',
        '😦',
        '😧',
        '😨',
        '😰',
        '😥',
        '😢',
        '😭',
        '😱',
        '😖',
        '😣',
        '😞',
        '😓',
        '😩',
        '😫',
        '🥱',
        '😤',
        '😡',
        '😠',
        '🤬',
        '😈',
        '👿',
        '💀',
        '☠️',
        '💩',
        '🤡',
        '👹',
        '👺',
        '👻',
        '👾',
        '🤖',
      ],
    },
    {
      label: '👋 People',
      key: 'people',
      emojis: [
        '👋',
        '🤚',
        '🖐️',
        '✋',
        '🖖',
        '🤙',
        '💪',
        '🦾',
        '🖕',
        '✌️',
        '🤞',
        '🤟',
        '🤘',
        '🤙',
        '👈',
        '👉',
        '👆',
        '🖕',
        '👇',
        '☝️',
        '👍',
        '👎',
        '✊',
        '👊',
        '🤛',
        '🤜',
        '👏',
        '🙌',
        '👐',
        '🤲',
        '🤝',
        '🙏',
        '✍️',
        '💅',
        '🤳',
        '💃',
        '🕺',
        '👶',
        '🧒',
        '👦',
        '👧',
        '🧑',
        '👱',
        '👩',
        '👨',
        '🧓',
        '👴',
        '👵',
        '🧔',
        '👱‍♀️',
        '👮',
        '👷',
        '💂',
        '🕵️',
        '👩‍⚕️',
        '👨‍⚕️',
        '👩‍🌾',
        '👨‍🌾',
        '👩‍🍳',
        '👨‍🍳',
        '👩‍🎓',
        '👨‍🎓',
        '👩‍🎤',
        '👨‍🎤',
        '👩‍🏫',
        '👨‍🏫',
        '👩‍🏭',
        '👨‍🏭',
        '👩‍💻',
        '👨‍💻',
        '👩‍💼',
        '👨‍💼',
        '👩‍🔧',
        '👨‍🔧',
        '👩‍🔬',
        '👨‍🔬',
        '👩‍🎨',
        '👨‍🎨',
        '👩‍✈️',
        '👨‍✈️',
        '👩‍🚀',
        '👨‍🚀',
        '👩‍🚒',
        '👨‍🚒',
      ],
    },
    {
      label: '🐶 Animals',
      key: 'animals',
      emojis: [
        '🐶',
        '🐱',
        '🐭',
        '🐹',
        '🐰',
        '🦊',
        '🐻',
        '🐼',
        '🐻‍❄️',
        '🐨',
        '🐯',
        '🦁',
        '🐮',
        '🐷',
        '🐸',
        '🐵',
        '🙈',
        '🙉',
        '🙊',
        '🐔',
        '🐧',
        '🐦',
        '🐤',
        '🦆',
        '🦅',
        '🦉',
        '🦇',
        '🐺',
        '🐗',
        '🐴',
        '🦄',
        '🐝',
        '🐛',
        '🦋',
        '🐌',
        '🐞',
        '🐜',
        '🦟',
        '🦗',
        '🦂',
        '🐢',
        '🐍',
        '🦎',
        '🦖',
        '🦕',
        '🐙',
        '🦑',
        '🦐',
        '🦞',
        '🦀',
        '🐡',
        '🐟',
        '🐠',
        '🐬',
        '🐳',
        '🐋',
        '🦈',
        '🐊',
        '🐅',
        '🐆',
        '🦓',
        '🦬',
        '🦍',
        '🦧',
        '🦣',
        '🐘',
        '🦛',
        '🦏',
        '🐪',
        '🐫',
        '🦒',
        '🦘',
        '🦬',
        '🐃',
        '🐂',
        '🐄',
        '🐎',
        '🐖',
        '🐏',
        '🐑',
        '🦙',
        '🐐',
        '🦌',
        '🐕',
        '🐩',
        '🦮',
        '🐈',
        '🦤',
        '🦚',
        '🦜',
        '🦢',
        '🦩',
        '🕊️',
        '🐇',
        '🦝',
        '🦨',
        '🦡',
        '🦦',
        '🦥',
        '🐁',
        '🐀',
        '🐿️',
      ],
    },
    {
      label: '🍕 Food',
      key: 'food',
      emojis: [
        '🍎',
        '🍐',
        '🍊',
        '🍋',
        '🍌',
        '🍉',
        '🍇',
        '🍓',
        '🫐',
        '🍈',
        '🍒',
        '🍑',
        '🥭',
        '🍍',
        '🥥',
        '🥝',
        '🍅',
        '🍆',
        '🥑',
        '🥦',
        '🥬',
        '🥒',
        '🌶️',
        '🫑',
        '🥕',
        '🧄',
        '🧅',
        '🥔',
        '🍠',
        '🥐',
        '🥯',
        '🍞',
        '🥖',
        '🥨',
        '🧀',
        '🥚',
        '🍳',
        '🧈',
        '🥞',
        '🧇',
        '🥓',
        '🥩',
        '🍗',
        '🍖',
        '🌭',
        '🍔',
        '🍟',
        '🍕',
        '🫓',
        '🥪',
        '🥙',
        '🧆',
        '🌮',
        '🌯',
        '🫔',
        '🥗',
        '🥘',
        '🫕',
        '🍝',
        '🍜',
        '🍲',
        '🍛',
        '🍣',
        '🍱',
        '🥟',
        '🦪',
        '🍤',
        '🍙',
        '🍚',
        '🍘',
        '🍥',
        '🥮',
        '🍢',
        '🧁',
        '🍰',
        '🎂',
        '🍮',
        '🍭',
        '🍬',
        '🍫',
        '🍿',
        '🍩',
        '🍪',
        '🌰',
        '🥜',
        '🍯',
        '🧃',
        '🥤',
        '🧋',
        '☕',
        '🫖',
        '🍵',
        '🧉',
        '🍺',
        '🍻',
        '🥂',
        '🍷',
        '🫗',
        '🥃',
        '🍸',
        '🍹',
        '🧊',
        '🥄',
        '🍴',
        '🍽️',
      ],
    },
    {
      label: '✈️ Travel',
      key: 'travel',
      emojis: [
        '🚗',
        '🚕',
        '🚙',
        '🚌',
        '🚎',
        '🏎️',
        '🚓',
        '🚑',
        '🚒',
        '🚐',
        '🛻',
        '🚚',
        '🚛',
        '🚜',
        '🏍️',
        '🛵',
        '🚲',
        '🛴',
        '🛹',
        '🛼',
        '🚏',
        '🛣️',
        '🛤️',
        '⛽',
        '🚨',
        '🚥',
        '🚦',
        '🛑',
        '🏗️',
        '🚢',
        '✈️',
        '🛩️',
        '🛫',
        '🛬',
        '🪂',
        '💺',
        '🚁',
        '🚟',
        '🚠',
        '🚡',
        '🛰️',
        '🚀',
        '🛸',
        '🛶',
        '⛵',
        '🚤',
        '🛥️',
        '🛳️',
        '⛴️',
        '🚂',
        '🚃',
        '🚄',
        '🚅',
        '🚆',
        '🚇',
        '🚈',
        '🚉',
        '🚊',
        '🚝',
        '🚞',
        '🗺️',
        '🧭',
        '⛰️',
        '🌋',
        '🗻',
        '🏕️',
        '🏖️',
        '🏜️',
        '🏝️',
        '🏞️',
        '🏟️',
        '🏛️',
        '🏗️',
        '🧱',
        '🏘️',
        '🏚️',
        '🏠',
        '🏡',
        '🏢',
        '🏣',
        '🏤',
        '🏥',
        '🏦',
        '🏨',
        '🏩',
        '🏪',
        '🏫',
        '🏬',
        '🏭',
        '🏯',
        '🏰',
        '🗼',
        '🗽',
        '🗾',
        '🎌',
        '🏳️',
        '🏴',
      ],
    },
    {
      label: '⚽ Activities',
      key: 'activities',
      emojis: [
        '⚽',
        '🏀',
        '🏈',
        '⚾',
        '🥎',
        '🎾',
        '🏐',
        '🏉',
        '🥏',
        '🎱',
        '🪀',
        '🏓',
        '🏸',
        '🏒',
        '🥍',
        '🏑',
        '🏏',
        '🪃',
        '🥅',
        '⛳',
        '🪁',
        '🏹',
        '🎣',
        '🤿',
        '🥊',
        '🥋',
        '🎽',
        '🛹',
        '🛷',
        '⛸️',
        '🥌',
        '🎿',
        '⛷️',
        '🏂',
        '🪂',
        '🏋️',
        '🤼',
        '🤸',
        '⛹️',
        '🤺',
        '🏇',
        '🧘',
        '🎗️',
        '🎟️',
        '🎫',
        '🎖️',
        '🏆',
        '🥇',
        '🥈',
        '🥉',
        '⚽',
        '🏅',
        '🎪',
        '🤹',
        '🎭',
        '🎨',
        '🎬',
        '🎤',
        '🎧',
        '🎼',
        '🎹',
        '🥁',
        '🪘',
        '🎷',
        '🎺',
        '🎸',
        '🪕',
        '🎻',
        '🎲',
        '♟️',
        '🎯',
        '🎳',
        '🎮',
        '🎰',
        '🧩',
      ],
    },
    {
      label: '💡 Objects',
      key: 'objects',
      emojis: [
        '💡',
        '🔦',
        '🕯️',
        '🪔',
        '📱',
        '💻',
        '🖥️',
        '🖨️',
        '⌨️',
        '🖱️',
        '🖲️',
        '💽',
        '💾',
        '💿',
        '📀',
        '📷',
        '📸',
        '📹',
        '🎥',
        '📽️',
        '🎞️',
        '📞',
        '☎️',
        '📟',
        '📠',
        '📺',
        '📻',
        '🧭',
        '⏰',
        '🕰️',
        '⌚',
        '📡',
        '🔋',
        '🔌',
        '💡',
        '🔦',
        '🕯️',
        '🗑️',
        '🛢️',
        '💸',
        '💵',
        '💴',
        '💶',
        '💷',
        '🪙',
        '💰',
        '💳',
        '💎',
        '⚖️',
        '🧰',
        '🪛',
        '🔧',
        '🪚',
        '🔨',
        '⛏️',
        '⚒️',
        '🛠️',
        '🗡️',
        '⚔️',
        '🛡️',
        '🔫',
        '🪃',
        '🏹',
        '🪤',
        '🪣',
        '🔑',
        '🗝️',
        '🔒',
        '🔓',
        '🚪',
        '🪟',
        '🛋️',
        '🪑',
        '🚿',
        '🛁',
        '🧴',
        '🪠',
        '🧹',
        '🧺',
        '🧻',
        '🪣',
        '🧼',
        '🫧',
        '🪥',
        '🧽',
        '🪒',
        '🧻',
        '🛒',
        '🚬',
        '🗺️',
        '📦',
        '📬',
        '📭',
        '📮',
        '🏷️',
        '📝',
        '📖',
      ],
    },
    {
      label: '🔣 Symbols',
      key: 'symbols',
      emojis: [
        '❤️',
        '🧡',
        '💛',
        '💚',
        '💙',
        '💜',
        '🖤',
        '🤍',
        '🤎',
        '💔',
        '❣️',
        '💕',
        '💞',
        '💓',
        '💗',
        '💖',
        '💘',
        '💝',
        '💟',
        '☮️',
        '✝️',
        '☪️',
        '🕉️',
        '☸️',
        '🔯',
        '🕎',
        '☯️',
        '☦️',
        '🛐',
        '⛎',
        '♈',
        '♉',
        '♊',
        '♋',
        '♌',
        '♍',
        '♎',
        '♏',
        '♐',
        '♑',
        '♒',
        '♓',
        '⛎',
        '🔀',
        '🔁',
        '🔂',
        '▶️',
        '⏩',
        '⏭️',
        '⏯️',
        '◀️',
        '⏪',
        '⏮️',
        '🔼',
        '⏫',
        '🔽',
        '⏬',
        '⏸️',
        '⏹️',
        '⏺️',
        '🎦',
        '🔅',
        '🔆',
        '📶',
        '📳',
        '📴',
        '📵',
        '📳',
        '🔇',
        '🔈',
        '🔉',
        '🔊',
        '📢',
        '📣',
        '🔔',
        '🔕',
        '✅',
        '❌',
        '❎',
        '🔴',
        '🟠',
        '🟡',
        '🟢',
        '🔵',
        '🟣',
        '⚫',
        '⚪',
        '🟤',
        '🔺',
        '🔻',
        '🔷',
        '🔶',
        '🔹',
        '🔸',
        '🔲',
        '🔳',
        '▪️',
        '▫️',
        '◾',
        '◽',
        '◼️',
        '◻️',
        '⬛',
        '⬜',
      ],
    },
    {
      label: '💼 Work',
      key: 'work',
      emojis: [
        '📊',
        '📈',
        '📉',
        '📋',
        '📌',
        '📍',
        '📎',
        '🖇️',
        '📏',
        '📐',
        '✂️',
        '🗃️',
        '🗄️',
        '🗑️',
        '📁',
        '📂',
        '🗂️',
        '📅',
        '📆',
        '🗒️',
        '🗓️',
        '📇',
        '📈',
        '📉',
        '📊',
        '📋',
        '📌',
        '📍',
        '📎',
        '🖇️',
        '📏',
        '📐',
        '✂️',
        '🗃️',
        '🗄️',
        '🗑️',
        '📦',
        '📫',
        '📪',
        '📬',
        '📭',
        '📮',
        '🗳️',
        '✏️',
        '✒️',
        '🖋️',
        '🖊️',
        '🖌️',
        '🖍️',
        '📝',
        '💼',
        '📁',
        '📂',
        '🗂️',
        '🖥️',
        '💻',
        '⌨️',
        '📱',
        '📞',
        '☎️',
        '📟',
        '📠',
        '📡',
        '🔭',
        '🔬',
        '🧫',
        '🧪',
        '🧬',
        '🔍',
        '🔎',
        '💡',
        '🔦',
        '💰',
        '💵',
        '💴',
        '💶',
        '💷',
        '💸',
        '💳',
        '🧾',
        '⚖️',
        '🏦',
        '🏢',
        '🤝',
        '📊',
        '🗃️',
        '📋',
        '📌',
        '🖊️',
        '✅',
        '❎',
        '🚨',
        '⚠️',
        '🔔',
        '🔕',
        '📢',
        '📣',
        '🔑',
        '🗝️',
      ],
    },
  ];

  const handleSaveToDo = useCallback(
    async (toDoData: {title: string; priority: string; dueDate: Date; category: string; notes: string}) => {
      try {
        if (!page) return;

        const currentTab = tabs.find(t => t._id === activeTabId || t.title === activeTabId);

        const response = await fetch('/api/todos', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            ...toDoData,
            sourcePageId: page._id,
            tabId: currentTab?._id,
            tabName: currentTab?.title,
          }),
        });

        if (response.ok) {
          // Ideally show a success notification
          alert('To Do created successfully!');
        } else {
          alert('Failed to create To Do.');
        }
      } catch (error) {
        console.error('Error creating To Do:', error);
        alert('Error creating To Do.');
      }
    },
    [page, tabs, activeTabId],
  );

  if (!page) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#FAFAF8] to-[#F0EFEB]">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Select a Page</h3>
          <p className="text-[13px] text-gray-400 leading-relaxed">
            Choose a page from the sidebar to start editing, or create a new one with the{' '}
            <span className="font-medium text-gray-500">+</span> button.
          </p>
        </div>
      </div>
    );
  }

  const isAuthorizedFull = session?.user?.email === 'lankanprinze@gmail.com';

  return (
    <div className="flex h-full flex-col bg-white text-gray-900">
      {/* Tab Bar — Segmented Control Style */}
      <div className="flex items-center gap-3 border-b border-black/[0.03] px-6 py-2.5 bg-[#FAF9F6]/50 backdrop-blur-sm">
        <div className="relative inline-flex items-center bg-slate-200/40 rounded-xl p-1 gap-1">
          <div
            className="absolute top-1 bottom-1 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.02] transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] z-0"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              opacity: indicatorStyle.width > 0 ? 1 : 0,
              backgroundColor: '#fff',
            }}
          />

          {tabs.map((tab, index) => {
            const isActive = tab._id === activeTabId || tab.title === activeTabId;

            // Calculate Badge Count
            // Match by ID primarily, fallback to Name for robustness (legacy support)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tabTasks = pageTodos.filter(
              (todo: any) =>
                !todo.isCompleted &&
                (todo.tabId === tab._id || (tab._id?.startsWith('new-') && todo.tabName === tab.title)),
            );

            let minDays: number | null = null;
            if (tabTasks.length > 0) {
              const dates = tabTasks
                .map((t: any) => (t.dueDate ? new Date(t.dueDate).getTime() : null))
                .filter((d: number | null) => d !== null) as number[];

              if (dates.length > 0) {
                const minDate = Math.min(...dates);
                minDays = Math.ceil((minDate - Date.now()) / (1000 * 60 * 60 * 24));
              }
            }

            const {className, style} = getBadgeStyle(minDays);

            return (
              <div
                key={tab._id || tab.title}
                ref={el => (tabsRef.current[index] = el)}
                className={`group relative z-10 flex cursor-pointer items-center justify-center rounded-md pl-2 pr-7 py-1 text-[11px] font-medium leading-none transition-colors duration-200 select-none ${
                  isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => {
                  const updatedTabs = tabs.map(t => {
                    if (t._id === activeTabId || t.title === activeTabId) {
                      return {...t, content: editorContent};
                    }
                    return t;
                  });
                  setTabs(updatedTabs);
                  setActiveTabId(tab._id || tab.title);
                  setEditorContent(tab.content);
                }}>
                {/* Status Badge (Important/Flagged) */}
                {(tab.isImportant || tab.isFlagged) && (
                  <span className="absolute -top-1.5 -left-1 flex h-3 w-3 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 z-40 shadow-sm">
                    {tab.isImportant ? (
                      <ExclamationTriangleIconSolid className="h-2 w-2 text-red-500" />
                    ) : (
                      <FlagIconSolid className="h-2 w-2 text-blue-500" />
                    )}
                  </span>
                )}

                {/* Badge Notification */}
                {tabTasks.length > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-1 flex h-3 min-w-[12px] items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white ring-1 ring-white z-30 ${className}`}
                    style={style}>
                    {tabTasks.length}
                  </span>
                )}

                {/* Color Picker - Always Visible, Left Side */}
                <div className="relative z-20 w-3 h-3 mr-1.5 flex-shrink-0 overflow-hidden rounded-full hover:scale-110 transition-transform">
                  <input
                    type="color"
                    className="absolute -top-1 -left-1 w-6 h-6 border-none p-0 cursor-pointer opacity-0"
                    value={tab.color || '#ffffff'}
                    onChange={e => {
                      const newColor = e.target.value;
                      setTabs(
                        tabs.map(t => (t._id === tab._id && t.title === tab.title ? {...t, color: newColor} : t)),
                      );
                      setIsDirty(true);
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                  <div
                    className="w-full h-full rounded-full border border-gray-300"
                    style={{backgroundColor: tab.color || '#ffffff'}}></div>
                </div>

                {/* Auto-width Container: Grid stack with invisible span and absolute input */}
                <div className="grid place-items-center" style={{gridTemplateAreas: '"stack"'}}>
                  {/* Invisible sizing span - dictates width */}
                  <span
                    className="invisible opacity-0 px-1 whitespace-pre leading-none pointer-events-none font-medium text-xs"
                    style={{gridArea: 'stack'}}
                    aria-hidden="true">
                    {tab.title}
                  </span>

                  {/* Input for editing - absolute over the span */}
                  <input
                    className={`bg-transparent border-none outline-none ring-0 w-full text-center p-0 m-0 font-medium text-xs leading-none ${
                      isActive ? '' : 'pointer-events-none'
                    }`}
                    style={{gridArea: 'stack', minWidth: '2ch'}}
                    onChange={e => handleRenameTab(tab._id || tab.title, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    value={tab.title}
                    size={1}
                  />
                </div>

                {/* Tab Controls (Delete Only) */}
                <div
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 z-20 items-center justify-center rounded-full ${
                    isActive ? 'flex' : 'hidden group-hover:flex'
                  }`}>
                  {/* Delete Button */}
                  <button
                    className={`rounded-full p-0.5 text-gray-400 hover:bg-white hover:text-red-600 transition-all ${
                      tabs.length <= 1 ? '!hidden' : ''
                    } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                    disabled={isSaving}
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteTab(tab._id || tab.title);
                    }}>
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Tab Button */}
        <button
          className={`rounded-full p-1.5 text-gray-300 hover:bg-white/80 hover:text-gray-500 transition-all ${
            isSaving ? 'opacity-50 cursor-wait' : ''
          }`}
          onClick={handleAddTab}
          disabled={isSaving}
          title="Add Tab">
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-3">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{page.title}</h1>
          <span className="text-[11px] text-gray-400 mt-0.5">
            {(() => {
              const diff = Date.now() - new Date(page.updatedAt).getTime();
              const mins = Math.floor(diff / 60000);
              if (mins < 1) return 'Edited just now';
              if (mins < 60) return `Edited ${mins}m ago`;
              const hrs = Math.floor(mins / 60);
              if (hrs < 24) return `Edited ${hrs}h ago`;
              const days = Math.floor(hrs / 24);
              if (days < 7) return `Edited ${days}d ago`;
              return `Edited ${new Date(page.updatedAt).toLocaleDateString()}`;
            })()}
          </span>
        </div>
        <div className="flex gap-2">
          {/* Emoji Picker */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              className="flex items-center rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700"
              onClick={() => setIsEmojiPickerOpen(prev => !prev)}
              title="Insert Emoji"
              type="button">
              <FaceSmileIcon className="h-4 w-4" />
            </button>

            {isEmojiPickerOpen &&
              (() => {
                const allCategories = EMOJI_CATEGORIES.map(c =>
                  c.key === 'recent' ? {...c, emojis: recentEmojis} : c,
                ).filter(c => c.key !== 'recent' || c.emojis.length > 0);

                const currentCat = allCategories.find(c => c.key === activeCategoryKey) || allCategories[0];
                const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis).filter((e, i, arr) => arr.indexOf(e) === i);
                const displayEmojis = emojiSearch.trim()
                  ? allEmojis.filter(e => e.includes(emojiSearch))
                  : currentCat?.emojis ?? [];

                return (
                  <div
                    className="absolute left-0 top-full mt-1.5 z-[9999] w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-200/60 flex flex-col overflow-hidden"
                    style={{maxHeight: '360px'}}>
                    {/* Search */}
                    <div className="p-2 border-b border-gray-100 flex-shrink-0">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search emojis..."
                        value={emojiSearch}
                        onChange={e => setEmojiSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[12px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    {/* Category tabs */}
                    {!emojiSearch.trim() && (
                      <div className="flex gap-0.5 px-1.5 py-1 border-b border-gray-100 overflow-x-auto scrollbar-hide flex-shrink-0">
                        {allCategories.map(cat => (
                          <button
                            key={cat.key}
                            onClick={() => setActiveCategoryKey(cat.key)}
                            className={`flex-shrink-0 px-2 py-1 rounded-lg text-[14px] transition-all ${
                              activeCategoryKey === cat.key
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                            title={cat.label}>
                            {cat.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Emoji grid */}
                    <div className="flex-1 overflow-y-auto p-2">
                      {displayEmojis.length === 0 ? (
                        <p className="text-center text-gray-400 text-[12px] py-6">No emojis found</p>
                      ) : (
                        <div className="grid grid-cols-8 gap-0.5">
                          {displayEmojis.map((emoji, i) => (
                            <button
                              key={`${emoji}-${i}`}
                              onClick={() => {
                                handleInsertSymbol(emoji);
                                setRecentEmojis(prev => {
                                  const updated = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 24);
                                  try {
                                    localStorage.setItem('recentEmojis', JSON.stringify(updated));
                                  } catch {}
                                  return updated;
                                });
                                setIsEmojiPickerOpen(false);
                                setEmojiSearch('');
                              }}
                              className="flex items-center justify-center w-8 h-8 rounded-lg text-[18px] hover:bg-gray-100 transition-colors leading-none"
                              title={emoji}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>

          {/* Recover Legacy Content Button - Only show if legacy content exists */}
          {page.content && page.content.trim().length > 0 && (
            <button
              onClick={() => {
                const legacyTab = {
                  title: 'Recovered Legacy',
                  content: page.content,
                  color: '#fee2e2', // Light red/pink to stand out
                  order: tabs.length,
                  _id: `recovered-${Date.now()}`,
                };
                // Sync current state first!
                const updatedTabs = tabs.map(t => {
                  if (t._id === activeTabId || t.title === activeTabId) {
                    return {...t, content: editorContent};
                  }
                  return t;
                });
                const newTabs = [...updatedTabs, legacyTab];
                setTabs(newTabs);
                setActiveTabId(legacyTab._id);
                setEditorContent(legacyTab.content);
                setIsDirty(true);
                alert('Legacy content has been recovered into a new tab. Please save to persist it.');
              }}
              className={`flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-600 transition-all hover:bg-amber-100 hover:text-amber-700 disabled:opacity-50 disabled:cursor-wait`}
              disabled={isSaving}
              title="Found content from before tabs were implemented. Click to recover.">
              <ExclamationTriangleIconSolid className="h-4 w-4" />
            </button>
          )}

          {/* AI Actions Dropdown - Consolidated */}
          <div className="relative" ref={aiActionsRef}>
            <button
              className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-1.5 text-[11px] font-medium text-indigo-600 transition-all hover:from-indigo-100 hover:to-violet-100 ${
                isAIActionsOpen ? 'ring-2 ring-indigo-100' : ''
              }`}
              type="button"
              onClick={() => setIsAIActionsOpen(!isAIActionsOpen)}>
              <SparklesIcon className="h-3.5 w-3.5" />
              AI Actions
            </button>
            {isAIActionsOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-black/[0.06] rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    handleOrganizeAI();
                    setIsAIActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2">
                  <QueueListIcon className="h-3.5 w-3.5" />
                  Organize
                </button>
                <button
                  onClick={() => {
                    handleSummarizeAI();
                    setIsAIActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2">
                  <DocumentTextIcon className="h-3.5 w-3.5" />
                  Summarize
                </button>
                <button
                  onClick={() => {
                    handleSuggestAI();
                    setIsAIActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2">
                  <LightBulbIcon className="h-3.5 w-3.5" />
                  Suggest
                </button>
                <button
                  onClick={() => {
                    handleRefineAI();
                    setIsAIActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2">
                  <WrenchIcon className="h-3.5 w-3.5" />
                  Refine
                </button>
                <button
                  onClick={() => {
                    handleGenerateAI();
                    setIsAIActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Question
                </button>
                <button
                  onClick={() => {
                    setIsExecutiveModalOpen(true);
                    setIsAIActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors flex items-center gap-2">
                  <BriefcaseIcon className="h-3.5 w-3.5" />
                  Executive
                </button>
                {isAuthorizedFull && (
                  <button
                    onClick={() => {
                      handleOpenRewrite();
                      setIsAIActionsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors flex items-center gap-2">
                    <CodeBracketIcon className="h-3.5 w-3.5" />
                    Rewrite
                  </button>
                )}
              </div>
            )}
          </div>

          {/* To Do Button */}
          <button
            className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700"
            onClick={handleOpenToDo}
            title="Create To Do">
            <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
            To Do
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleImportant}
              className={`p-1.5 rounded-md transition-all ${
                tabs.find(t => t._id === activeTabId || t.title === activeTabId)?.isImportant
                  ? 'bg-amber-50 text-amber-500'
                  : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
              }`}
              title="Mark Important">
              {tabs.find(t => t._id === activeTabId || t.title === activeTabId)?.isImportant ? (
                <ExclamationTriangleIconSolid className="h-4 w-4" />
              ) : (
                <ExclamationTriangleIcon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleToggleFlagged}
              className={`p-1.5 rounded-md transition-all ${
                tabs.find(t => t._id === activeTabId || t.title === activeTabId)?.isFlagged
                  ? 'bg-rose-50 text-rose-500'
                  : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
              }`}
              title="Flag Page">
              {tabs.find(t => t._id === activeTabId || t.title === activeTabId)?.isFlagged ? (
                <FlagIconSolid className="h-4 w-4" />
              ) : (
                <FlagIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          <button
            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              isDirty ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-emerald-50 text-emerald-600 cursor-default'
            } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
            disabled={!isDirty || isSaving}
            onClick={handleSave}>
            {isSaving ? (
              <ArrowPathIcon className="h-3 w-3 animate-spin" />
            ) : isDirty ? (
              <>Save</>
            ) : (
              <CheckIcon className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mx-5 mb-1 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
          <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{saveError}</span>
          <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setSaveError(null)}>
            <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-hidden px-5 py-3 relative">
        <RichTextEditor
          onChange={handleContentChange}
          placeholder="Start typing your notes here..."
          ref={quillRef}
          value={editorContent}
        />
      </div>

      {/* Gemini Result Modal */}
      <Transition appear={true} as={Fragment} show={isModalOpen}>
        <Dialog className="relative z-50" onClose={handleCloseModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5 text-purple-600" />
                      Gemini Suggestion
                    </div>
                    {!isGenerating && (
                      <button className="text-gray-400 hover:text-gray-500" onClick={handleCloseModal}>
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </Dialog.Title>
                  <div className="mt-4">
                    {isGenerating ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <ArrowPathIcon className="h-8 w-8 animate-spin text-purple-600" />
                        <p className="mt-2 text-sm text-gray-500">Thinking...</p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-6 max-h-[60vh] overflow-y-auto w-full">
                        {isMarkdownResponse ? (
                          <div className="prose prose-indigo max-w-none prose-sm leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedText}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap text-sm text-gray-800">{generatedText}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {!isGenerating && (
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                        onClick={handleCloseModal}>
                        Cancel
                      </button>
                      <button
                        className="inline-flex justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 gap-2 items-center"
                        onClick={handleInsertAI}>
                        <CheckIcon className="h-4 w-4" />
                        Insert
                      </button>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <ExecutiveModal
        isOpen={isExecutiveModalOpen}
        onClose={() => setIsExecutiveModalOpen(false)}
        onInsert={handleRewrittenInsertMemo}
      />

      <RewriteModal
        isOpen={isRewriteModalOpen}
        onClose={handleCloseRewriteModal}
        onInsert={handleRewrittenInsertMemo}
        originalText={rewriteSelectedText}
      />

      <ToDoModal
        initialTitle={tabs.find(t => t._id === activeTabId || t.title === activeTabId)?.title || page?.title || ''}
        isOpen={isToDoOpen}
        onClose={handleCloseToDo}
        onSave={handleSaveToDo}
      />

      <PromptEditorModal
        isOpen={isPromptEditorOpen}
        onClose={() => setIsPromptEditorOpen(false)}
        onSaveAndRun={handleRunOrganize}
        initialPrompt={organizePrompt}
      />

      <ExecutiveModal
        isOpen={isExecutiveModalOpen}
        onClose={() => setIsExecutiveModalOpen(false)}
        onInsert={handleRewrittenInsertMemo}
      />

      <RewriteModal
        isOpen={isRewriteModalOpen}
        onClose={handleCloseRewriteModal}
        onInsert={handleRewrittenInsertMemo}
        originalText={rewriteSelectedText}
      />

      <ToDoModal
        initialTitle={tabs.find(t => t._id === activeTabId || t.title === activeTabId)?.title || page?.title || ''}
        isOpen={isToDoOpen}
        onClose={handleCloseToDo}
        onSave={handleSaveToDo}
      />

      <PromptEditorModal
        isOpen={isPromptEditorOpen}
        onClose={() => setIsPromptEditorOpen(false)}
        onSaveAndRun={handleRunOrganize}
        initialPrompt={organizePrompt}
      />

      {/* Attachments Section */}
      <AttachmentManager pageId={page._id as string} />
    </div>
  );
});

NoteEditor.displayName = 'NoteEditor';

export default NoteEditor;
