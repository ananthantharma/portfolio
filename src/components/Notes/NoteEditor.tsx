/* eslint-disable simple-import-sort/imports */
'use client';

import { Dialog, Transition, Menu } from '@headlessui/react';
import {
  ArrowPathIcon,
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
} from '@heroicons/react/24/outline';
import {
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  FlagIcon as FlagIconSolid,
} from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react'; // Import useSession
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { INotePage } from '@/models/NotePage';

import RichTextEditor from './RichTextEditor';

import ToDoModal from './ToDoModal';
import PromptEditorModal from './PromptEditorModal';
import ReactMarkdown from 'react-markdown';
import { renderToStaticMarkup } from 'react-dom/server';
import { AttachmentManager } from './AttachmentManager';
import RewriteModal from './RewriteModal'; // Import RewriteModal
import { useBadgeSettings } from './BadgeSettingsContext'; // Added import



const REFINE_PROMPT = `System: Act as a communications ghostwriter. Return ONLY the rewritten text. No intros, no outros, no quotes.

Task: Rewrite the text below into a [Professionalism: 7/10] style. Voice: Competent colleague. Clear, punchy, and natural.

Hard Constraints:

No Dashes: Never use em-dashes (—), en-dashes (–), or hyphens to connect clauses. Use periods for new sentences.

No Corporate Fluff: Never use "utilize," "facilitate," or "leverage." Use simple verbs.

No Transitions: Avoid "Moreover," "Furthermore," or "In conclusion."

Sentence Flow: Vary lengths, but prioritize short, declarative sentences.

Here is the text to rewrite:`;

interface NoteEditorProps {
  onSave: (id: string, data: any) => Promise<void>;
  page: INotePage | null;
  initialTabId?: string;
}

const NoteEditor: React.FC<NoteEditorProps> = React.memo(({ onSave, page, initialTabId }) => {
  const { data: session } = useSession(); // Get session data
  // Tab State
  const [tabs, setTabs] = useState<{ _id?: string; title: string; content: string; color?: string; isImportant?: boolean; isFlagged?: boolean; order: number }[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  // We still need a content state for the editor to bind to, which syncs with active tab
  const [editorContent, setEditorContent] = useState('');
  const { getBadgeStyle } = useBadgeSettings(); // Hook

  // Badge/ToDo State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pageTodos, setPageTodos] = useState<any[]>([]);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ... (Modal states)
  const [isModalOpen, setIsModalOpen] = useState(false);
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
          console.error("Failed to fetch page todos", e);
        }
      };
      fetchPageTodos();

      // Poll every 30s to keep badges fresh? Or rely on manual updates?
      // Let's just fetch once on mount/page change for now.
    }
  }, [page?._id]);


  // Tab Flag Handlers
  const handleToggleImportant = () => {
    setTabs(prev => prev.map(t => {
      if (t._id === activeTabId || t.title === activeTabId) {
        return { ...t, isImportant: !t.isImportant };
      }
      return t;
    }));
    setIsDirty(true);
  };

  const handleToggleFlagged = () => {
    setTabs(prev => prev.map(t => {
      if (t._id === activeTabId || t.title === activeTabId) {
        return { ...t, isFlagged: !t.isFlagged };
      }
      return t;
    }));
    setIsDirty(true);
  };

  const [generatedText, setGeneratedText] = useState('');
  const [isMarkdownResponse, setIsMarkdownResponse] = useState(false);
  const [insertionRange, setInsertionRange] = useState<{ index: number; length: number } | null>(null);

  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [rewriteSelectedText, setRewriteSelectedText] = useState('');

  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [organizePrompt, setOrganizePrompt] = useState('');

  const [isToDoOpen, setIsToDoOpen] = useState(false);

  // Tab Indicator State
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
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

        // Smart Restoration Logic: Try to maintain current active tab
        // If we just saved, the page prop updated. We want to find the tab we were just on.
        // It might have a new ID (if we just created it), so we fallback to Title match.
        if (activeTabId) {
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

        // Override if initialTabId is provided (e.g. deep linking)
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
        // LEGACY MIGRATION: No tabs, but has content
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

  // Sync Editor Content when Active Tab Changes
  useEffect(() => {
    if (activeTabId && tabs.length > 0) {
      const activeTab = tabs.find(t => t._id === activeTabId || t.title === activeTabId); // Match ID or Title
      if (activeTab) {
        setEditorContent(activeTab.content);
        // Note: Removed 'tabs' from dependency to avoid resetting editor content on every keystroke
        // (since typing updates 'tabs' state).
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
        ...(!isTempId && t._id ? { _id: t._id } : {})
      };
    });
  };

  const handleAddTab = async () => {
    // 1. Sync current content to active tab before adding new one
    const updatedTabs = tabs.map(t => {
      if (t._id === activeTabId || t.title === activeTabId) {
        return { ...t, content: editorContent };
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
        console.error("Failed to save new tab", error);
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
        return { ...t, content: editorContent };
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
        console.error("Failed to save deletion", error);
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
        updatedTab = { ...t, content: editorContent };
      }

      // Now apply rename if it matches target
      if (updatedTab._id === tabId || (!updatedTab._id && updatedTab.title === tabId)) {
        return { ...updatedTab, title: newTitle };
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
        await onSave(page._id as string, sanitizedTabs as any);
        setIsDirty(false);
      } catch (error) {
        console.error("Failed to save page", error);
      } finally {
        setIsSaving(false);
      }
    }
  };







  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleContentChange = useCallback((val: string, _delta: any, source: string) => {
    // CRITICAL FIX: Only update state if the change comes from the USER.
    // Programmatic changes (e.g. switching tabs loads empty content) trigger 'api' source.
    // If we process 'api' changes, we might overwrite the PREVIOUS tab's content with the NEW tab's empty content
    // because of closure staleness or race conditions.
    if (source !== 'user') return;

    setEditorContent(val);
    // Update the tabs state immediately so that if we switch tabs or save, it's captured
    setTabs(prev => prev.map(t => {
      if (t._id === activeTabId || t.title === activeTabId) {
        return { ...t, content: val };
      }
      return t;
    }));
    setIsDirty(true);
  }, [activeTabId]);

  // Helper to get selected text
  const getSelectedText = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quill: any = quillRef.current?.getEditor();
    if (!quill) return null;

    const range = quill.getSelection();
    if (!range) return null;

    const text = quill.getText(range.index, range.length);
    return { text, range };
  };

  const handleOpenRewrite = () => {
    const selection = getSelectedText();
    if (!selection || !selection.text || selection.text.trim().length === 0) {
      alert('Please select some text to rewrite.');
      return;
    }

    setRewriteSelectedText(selection.text);
    setInsertionRange(selection.range);
    setIsRewriteModalOpen(true);
  };

  const handleCloseRewriteModal = useCallback(() => {
    setIsRewriteModalOpen(false);
  }, []);

  const handleRewrittenInsertMemo = useCallback(
    (newText: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quill: any = quillRef.current?.getEditor();
      if (quill && insertionRange) {
        quill.deleteText(insertionRange.index, insertionRange.length);
        quill.insertText(insertionRange.index, newText);
      }
    },
    [insertionRange],
  );

  const handleRefineAI = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quillComponent: any = quillRef.current;

    if (!quillComponent) return;

    let quill;
    try {
      quill = quillComponent.getEditor();
    } catch (e) {
      console.error('Error getting editor from ref:', e);
    }

    if (!quill) return;

    const range = quill.getSelection();
    let text = '';

    if (range && range.length > 0) {
      text = quill.getText(range.index, range.length);
    } else {
      const windowSelection = window.getSelection();
      if (windowSelection && windowSelection.toString().length > 0) {
        text = windowSelection.toString();
      }
    }

    if (!text || text.trim().length === 0) {
      alert('Please select some text to refine.');
      return;
    }

    if (range) {
      setInsertionRange(range);
    } else {
      setInsertionRange(null);
    }

    setIsModalOpen(true);
    setIsGenerating(true);
    setGeneratedText('');
    setIsMarkdownResponse(false);

    const fullPrompt = `${REFINE_PROMPT}\n\n"${text}"`;

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          model: 'gemini-flash-latest',
          apiKey: 'MANAGED',
        }),
      });
      const data = await response.json();
      console.log('Refine AI Response:', data);

      if (!response.ok) {
        console.error('Refine AI Error Details:', data);
        setGeneratedText(`Error: ${data.details || data.error || 'Unknown error'}`);
        return;
      }

      if (data.text) {
        setGeneratedText(data.text);
      } else {
        setGeneratedText('Failed to refine content.');
      }
    } catch (error) {
      console.error(error);
      setGeneratedText('Error connecting to Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOrganizeAI = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quillComponent: any = quillRef.current;

    if (!quillComponent) return;

    let quill;
    try {
      quill = quillComponent.getEditor();
    } catch (e) {
      console.error('Error getting editor from ref:', e);
    }

    if (!quill) return;

    const range = quill.getSelection();
    let text = '';

    if (range && range.length > 0) {
      text = quill.getText(range.index, range.length);
    } else {
      const windowSelection = window.getSelection();
      if (windowSelection && windowSelection.toString().length > 0) {
        text = windowSelection.toString();
      }
    }

    if (!text || text.trim().length === 0) {
      alert('Please select some text to organize.');
      return;
    }

    if (range) {
      setInsertionRange(range);
    } else {
      setInsertionRange(null);
    }

    setIsPromptEditorOpen(true);
  };

  const handleRunOrganize = async (customPrompt: string) => {
    // Save the prompt first (or in parallel)
    try {
      await fetch('/api/prompts/organize', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customPrompt }),
      });
      setOrganizePrompt(customPrompt);
    } catch (e) {
      console.error('Failed to save prompt:', e);
    }

    setIsModalOpen(true);
    setIsGenerating(true);
    setGeneratedText('');
    setIsMarkdownResponse(true);

    // Get text again (or use state if we stored it, but getting from quill is safer if reference held)
    // We already set insertionRange but not the text content in state.
    // Let's grab it from Quill again using insertionRange or just re-grab selection logic if safe.
    // Actually simpler: we need the text. Let's just grab it again safely.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quill: any = quillRef.current?.getEditor();
    let text = '';
    if (quill && insertionRange) {
      text = quill.getText(insertionRange.index, insertionRange.length);
    }

    const fullPrompt = `${customPrompt}\n\n"${text}"`;

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (data.text) {
        setGeneratedText(data.text);
      } else {
        setGeneratedText('Failed to organize content.');
      }
    } catch (error) {
      console.error(error);
      setGeneratedText('Error connecting to Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAI = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quillComponent: any = quillRef.current;

    if (!quillComponent) {
      console.error('Quill ref is null');
      return;
    }

    // React-Quill exposes getEditor() or sometimes accessing editor directly depends on version/wrapper
    // If using dynamic import with ssr:false, the ref might be the component instance.
    let quill;
    try {
      quill = quillComponent.getEditor();
    } catch (e) {
      console.error('Error getting editor from ref:', e);
    }

    if (!quill) {
      console.error('Quill instance not found');
      return;
    }

    const range = quill.getSelection();

    let text = '';

    if (range && range.length > 0) {
      text = quill.getText(range.index, range.length);
    } else {
      const windowSelection = window.getSelection();
      if (windowSelection && windowSelection.toString().length > 0) {
        text = windowSelection.toString();
      }
    }

    if (!text || text.trim().length === 0) {
      alert('Please select some text in the note to ask AI.');
      return;
    }

    if (range) {
      setInsertionRange(range);
    } else {
      setInsertionRange(null);
    }

    setIsModalOpen(true);
    setIsGenerating(true);
    setGeneratedText('');
    setIsMarkdownResponse(false);

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, apiKey: 'MANAGED', model: 'gemini-flash-latest' }),
      });
      const data = await response.json();
      console.log('Gemini API Response:', data);

      if (!response.ok) {
        console.error('Gemini API Error Details:', data);
        setGeneratedText(`Error: ${data.details || data.error || 'Unknown error'}`);
        return;
      }

      if (data.text) {
        setGeneratedText(data.text);
      } else {
        setGeneratedText('Failed to generate response.');
      }
    } catch (error) {
      console.error(error);
      setGeneratedText('Error connecting to Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertAI = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quill: any = quillRef.current?.getEditor();
    if (quill && insertionRange) {
      if (isMarkdownResponse) {
        // Convert Markdown to HTML for insertion
        const htmlContent = renderToStaticMarkup(<ReactMarkdown>{generatedText}</ReactMarkdown>);
        quill.deleteText(insertionRange.index, insertionRange.length);
        quill.clipboard.dangerouslyPasteHTML(insertionRange.index, htmlContent);
      } else {
        quill.deleteText(insertionRange.index, insertionRange.length);
        quill.insertText(insertionRange.index, generatedText);
      }
    } else {
      alert('Could not insert text. Lost selection context.');
    }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quill: any = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection(true); // true to focus if not focused, or just get selection
    if (range) {
      quill.insertText(range.index, symbol);
      quill.setSelection(range.index + symbol.length);
    } else {
      // If no selection, append to end? Or just don't insert.
      // Usually better to try to insert at end if no focus, or just focus.
      const length = quill.getLength();
      quill.insertText(length - 1, symbol);
    }
  };

  const SYMBOLS = [
    { char: '🚨', tooltip: 'Instant Action Required' },
    { char: '⏳', tooltip: 'Waiting' },
    { char: '💡', tooltip: 'Good Idea' },
    { char: '⚠️', tooltip: 'Warning' },
    { char: '💰', tooltip: 'Money / Financial' },
    { char: '📉', tooltip: 'Decrease / Loss' },
    { char: '🤝', tooltip: 'Deal / Agreement' },
    { char: '🗣️', tooltip: 'Speak / Announce' },
    { char: '✅', tooltip: 'Complete' },
    { char: '❌', tooltip: 'Cancel / Fail' },
  ];

  const handleSaveToDo = useCallback(
    async (toDoData: { title: string; priority: string; dueDate: Date; category: string; notes: string }) => {
      try {
        if (!page) return;

        const currentTab = tabs.find(t => t._id === activeTabId || t.title === activeTabId);

        const response = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      <div className="flex h-full items-center justify-center bg-white text-gray-400">
        Select a page to start editing
      </div>
    );
  }

  const isAuthorizedFull = session?.user?.email === 'lankanprinze@gmail.com';

  return (
    <div className="flex h-full flex-col bg-white text-gray-900">
      {/* Tab Bar */}
      {/* Tab Bar Container - Segmented Control Style */}
      {/* Tab Bar Container - Segmented Control Style */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 bg-white">
        {/* Sliding Tab Bar */}
        <div className="relative inline-flex items-center bg-gray-100/80 rounded-lg p-0.5 gap-10">
          {/* Sliding Indicator */}
          <div
            className="absolute top-0.5 bottom-0.5 rounded-md shadow-sm ring-1 ring-black/5 transition-all duration-200 ease-out z-0"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              opacity: indicatorStyle.width > 0 ? 1 : 0,
              backgroundColor: tabs.find(t => t._id === activeTabId || t.title === activeTabId)?.color || '#ffffff',
            }}
          />

          {tabs.map((tab, index) => {
            const isActive = tab._id === activeTabId || tab.title === activeTabId;

            // Calculate Badge Count
            // Match by ID primarily, fallback to Name for robustness (legacy support)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tabTasks = pageTodos.filter((todo: any) =>
              !todo.isCompleted && (todo.tabId === tab._id || (tab._id?.startsWith('new-') && todo.tabName === tab.title))
            );

            let minDays: number | null = null;
            if (tabTasks.length > 0) {
              const dates = tabTasks
                .map((t: any) => t.dueDate ? new Date(t.dueDate).getTime() : null)
                .filter((d: number | null) => d !== null) as number[];

              if (dates.length > 0) {
                const minDate = Math.min(...dates);
                minDays = Math.ceil((minDate - Date.now()) / (1000 * 60 * 60 * 24));
              }
            }

            const { className, style } = getBadgeStyle(minDays);

            return (
              <div
                key={tab._id || tab.title}
                ref={el => (tabsRef.current[index] = el)}
                className={`group relative z-10 flex cursor-pointer items-center justify-center rounded-md pl-1.5 pr-6 py-0.5 text-xs font-medium leading-none transition-colors duration-200 ${isActive
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
                onClick={() => {
                  const updatedTabs = tabs.map(t => {
                    if (t._id === activeTabId || t.title === activeTabId) {
                      return { ...t, content: editorContent };
                    }
                    return t;
                  });
                  setTabs(updatedTabs);
                  setActiveTabId(tab._id || tab.title);
                  setEditorContent(tab.content);
                }}
              >
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
                    style={style}
                  >
                    {tabTasks.length}
                  </span>
                )}

                {/* Color Picker - Always Visible, Left Side */}
                <div className="relative z-20 w-3 h-3 mr-1.5 flex-shrink-0 overflow-hidden rounded-full hover:scale-110 transition-transform">
                  <input
                    type="color"
                    className="absolute -top-1 -left-1 w-6 h-6 border-none p-0 cursor-pointer opacity-0"
                    value={tab.color || '#ffffff'}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setTabs(tabs.map(t => (t._id === tab._id && t.title === tab.title) ? { ...t, color: newColor } : t));
                      setIsDirty(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="w-full h-full rounded-full border border-gray-300" style={{ backgroundColor: tab.color || '#ffffff' }}></div>
                </div>

                {/* Auto-width Container: Grid stack with invisible span and absolute input */}
                <div className="grid place-items-center" style={{ gridTemplateAreas: '"stack"' }}>
                  {/* Invisible sizing span - dictates width */}
                  <span
                    className="invisible opacity-0 px-1 whitespace-pre leading-none pointer-events-none font-medium text-xs"
                    style={{ gridArea: 'stack' }}
                    aria-hidden="true"
                  >
                    {tab.title}
                  </span>

                  {/* Input for editing - absolute over the span */}
                  <input
                    className={`bg-transparent border-none outline-none ring-0 w-full text-center p-0 m-0 font-medium text-xs leading-none ${isActive ? '' : 'pointer-events-none'}`}
                    style={{ gridArea: 'stack', minWidth: '2ch' }}
                    onChange={(e) => handleRenameTab(tab._id || tab.title, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    value={tab.title}
                    size={1}
                  />
                </div>

                {/* Tab Controls (Delete Only) */}
                <div className={`absolute right-1 top-1/2 -translate-y-1/2 z-20 items-center justify-center bg-inherit rounded-full ${isActive ? 'flex' : 'hidden group-hover:flex'}`}>
                  {/* Delete Button */}
                  <button
                    className={`rounded-md p-0.5 hover:bg-red-50 hover:text-red-600 transition-colors ${tabs.length <= 1 ? '!hidden' : ''} ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                    disabled={isSaving}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTab(tab._id || tab.title);
                    }}
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Tab Button */}
        <button
          className={`rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
          onClick={handleAddTab}
          disabled={isSaving}
          title="Add Tab"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>



      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-800">{page.title}</h1>
          <span className="text-xs text-gray-500">Last edited: {new Date(page.updatedAt).toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          {/* Symbol Toolbar */}

          {/* Symbol Toolbar - Dropdown */}
          <Menu as="div" className="relative text-left">
            <Menu.Button className="flex items-center rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:bg-gray-50 disabled:text-gray-300">
              <FaceSmileIcon className="h-4 w-4" />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95">
              <Menu.Items className="absolute left-0 mt-2 w-56 origin-top-left divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10 grid grid-cols-5 gap-1 p-2">
                {SYMBOLS.map(s => (
                  <Menu.Item key={s.char}>
                    {({ active }) => (
                      <button
                        type="button"
                        className={`${active ? 'bg-gray-100' : ''
                          } group flex w-full items-center justify-center rounded-md p-2 text-xl transition-all grayscale hover:grayscale-0`}
                        onClick={() => handleInsertSymbol(s.char)}
                        title={s.tooltip}>
                        {s.char}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>

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
                    return { ...t, content: editorContent };
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
              className={`flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-yellow-600 transition-colors hover:bg-gray-200 hover:text-yellow-700 disabled:opacity-50 disabled:cursor-wait`}
              disabled={isSaving}
              title="Found content from before tabs were implemented. Click to recover."
            >
              <ExclamationTriangleIconSolid className="h-4 w-4" />
            </button>
          )}

          {/* Organize Button */}
          <button
            className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:bg-gray-50 disabled:text-gray-300"
            onClick={handleOrganizeAI}
            title="Organize Content"
            type="button">
            <QueueListIcon className="h-4 w-4" />
            Organize
          </button>

          {/* REWRITE AI BUTTON - Restricted Access */}
          {isAuthorizedFull && (
            <button
              className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:bg-gray-50 disabled:text-gray-300"
              onClick={handleOpenRewrite}
              title="Advanced AI Rewrite"
              type="button">
              <CodeBracketIcon className="h-4 w-4" />
              Rewrite
            </button>
          )}

          <button
            className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:bg-gray-50 disabled:text-gray-300"
            onClick={handleRefineAI}
            type="button">
            <WrenchIcon className="h-3 w-3" />
            Refine
          </button>
          <button
            className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:bg-gray-50 disabled:text-gray-300"
            onClick={handleGenerateAI}
            title="Question">
            <SparklesIcon className="h-3 w-3" />
            Question
          </button>

          {/* To Do Button */}
          <button
            className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900"
            onClick={handleOpenToDo}
            title="Create To Do">
            {/* Using ClipboardDocumentListIcon represented as generic SVG here if import fails, but I will import it properly */}
            <ClipboardDocumentListIcon className="h-3 w-3" />
            To Do
          </button>

          {(() => {
            const activeTab = tabs.find(t => t._id === activeTabId || t.title === activeTabId);
            return (
              <>
                <button
                  className={`rounded-full p-2 transition-colors ${activeTab?.isImportant
                    ? 'text-orange-500 bg-orange-50 hover:bg-orange-100'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-orange-400'
                    }`}
                  onClick={handleToggleImportant}
                  title={activeTab?.isImportant ? 'Mark as not important' : 'Mark as important'}>
                  {activeTab?.isImportant ? (
                    <ExclamationTriangleIconSolid className="h-6 w-6" />
                  ) : (
                    <ExclamationTriangleIcon className="h-6 w-6" />
                  )}
                </button>
                <button
                  className={`rounded-full p-2 transition-colors ${activeTab?.isFlagged
                    ? 'text-red-500 bg-red-50 hover:bg-red-100'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-red-400'
                    }`}
                  onClick={handleToggleFlagged}
                  title={activeTab?.isFlagged ? 'Unflag task' : 'Flag as key task'}>
                  {activeTab?.isFlagged ? <FlagIconSolid className="h-6 w-6" /> : <FlagIcon className="h-6 w-6" />}
                </button>
              </>
            );
          })()}
          <button
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isDirty ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
            disabled={!isDirty || isSaving}
            onClick={handleSave}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
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
                      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto w-full">
                        {isMarkdownResponse ? (
                          <div className="prose prose-sm w-full max-w-none">
                            <ReactMarkdown>{generatedText}</ReactMarkdown>
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

      <RewriteModal
        isOpen={isRewriteModalOpen}
        onClose={handleCloseRewriteModal}
        onInsert={handleRewrittenInsertMemo}
        originalText={rewriteSelectedText}
      />

      <ToDoModal
        initialTitle={
          tabs.find(t => t._id === activeTabId || t.title === activeTabId)?.title || page?.title || ''
        }
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
    </div >
  );
});

NoteEditor.displayName = 'NoteEditor';

export default NoteEditor;
