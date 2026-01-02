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

const ORGANIZE_PROMPT = `
Role: Act as a specialized Executive Assistant for a Senior Procurement Manager.

Task: I will provide raw, unorganized notes. Organize them into a polished document strictly optimized for a Quill JS editor.

Quill JS Formatting Rules (STRICT):

Standard Font Size: Do NOT use # or ## headers. All text must be the same size.

Headings: Use Bold Text for section headings. Do not use all caps.

Indented Bullets: Every bullet point must start with four spaces followed by a bullet symbol (e.g., •). This ensures they appear "tabbed" in the editor.

The "Double Break" Rule: You must hit the "Enter" key three times between every section. This creates a visible empty line in Quill.

No HTML/Code: Do not use <br>, \\n, or backticks. Use only plain text and bolding.

The Emoji Map (Apply directly to text):

🏢 Vendors/Suppliers: (e.g., 🏢 Hexagon)

👤 People/Stakeholders: (e.g., 👤 Chris Woodcock)

💰 Financials/Costs/Savings: (e.g., 💰 $3M)

⚠️ Risks/Warnings: (e.g., ⚠️ Support ending)

🛑 Critical Blockers: (e.g., 🛑 Integration failed)

📅 Deadlines/Dates: (e.g., 📅 December 26)

💡 Ideas/Opportunities: (e.g., 💡 Lessons learned)

📜 Policy/Contract: (e.g., 📜 Master Agreement)

Document Structure:

Executive Summary: A 1-2 sentence "Bottom Line Up Front" (BLUF).

Thematic Sections: Group points logically (e.g., Project Context, Financial Impact).

Next Steps / Action Items: End every task with the string: 🔴‼️💥ACTION💥‼️🔴
`;

const REFINE_PROMPT = `System: Act as a communications ghostwriter. Return ONLY the rewritten text. No intros, no outros, no quotes.

Task: Rewrite the text below into a [Professionalism: 7/10] style. Voice: Competent colleague. Clear, punchy, and natural.

Hard Constraints:

No Dashes: Never use em-dashes (—), en-dashes (–), or hyphens to connect clauses. Use periods for new sentences.

No Corporate Fluff: Never use "utilize," "facilitate," or "leverage." Use simple verbs.

No Transitions: Avoid "Moreover," "Furthermore," or "In conclusion."

Sentence Flow: Vary lengths, but prioritize short, declarative sentences.

Here is the text to rewrite:`;

interface NoteEditorProps {
  onSave: (id: string, content: string) => void;
  onToggleFlag: (id: string, field: 'isFlagged' | 'isImportant', value: boolean) => void;
  page: INotePage | null;
}

const NoteEditor: React.FC<NoteEditorProps> = React.memo(({ onSave, onToggleFlag, page }) => {
  const { data: session } = useSession(); // Get session data
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isImportant, setIsImportant] = useState(false);

  // AI Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMarkdownResponse, setIsMarkdownResponse] = useState(false);
  const [insertionRange, setInsertionRange] = useState<{ index: number; length: number } | null>(null);

  // Prompt Editor State
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [organizePrompt, setOrganizePrompt] = useState(ORGANIZE_PROMPT);

  // Fetch saved prompt on mount
  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const res = await fetch('/api/prompts/organize');
        if (res.ok) {
          const data = await res.json();
          if (data.prompt) {
            setOrganizePrompt(data.prompt);
          }
        }
      } catch (error) {
        console.error('Failed to fetch saved prompt:', error);
      }
    };
    fetchPrompt();
  }, []);

  // Rewrite Modal State
  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [rewriteSelectedText, setRewriteSelectedText] = useState('');

  // Refs
  const contentRef = useRef(content);
  const isDirtyRef = useRef(isDirty);
  const onSaveRef = useRef(onSave);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);

  // Sync refs with state
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Auto-save on unmount or page switch
  useEffect(() => {
    const currentId = page?._id;

    return () => {
      // Check if we have a valid ID and unsaved changes
      if (currentId && isDirtyRef.current) {
        console.log(`Auto-saving note ${currentId}`);
        onSaveRef.current(currentId, contentRef.current);
      }
    };
  }, [page?._id]);

  useEffect(() => {
    if (page) {
      setContent(page.content || '');
      setIsFlagged(page.isFlagged || false);
      setIsImportant(page.isImportant || false);
      setIsDirty(false);
    } else {
      setContent('');
      setIsFlagged(false);
      setIsImportant(false);
    }
  }, [page]);

  const handleSave = () => {
    if (page) {
      onSave(page._id as string, content);
      setIsDirty(false);
    }
  };

  const handleToggleFlagged = () => {
    if (page) {
      const newFlagState = !isFlagged;
      setIsFlagged(newFlagState);
      onToggleFlag(page._id as string, 'isFlagged', newFlagState);
    }
  };

  const handleToggleImportant = () => {
    if (page) {
      const newImportantState = !isImportant;
      setIsImportant(newImportantState);
      onToggleFlag(page._id as string, 'isImportant', newImportantState);
    }
  };

  const handleContentChange = useCallback((val: string) => {
    setContent(val);
    setIsDirty(true);
  }, []);

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

  // To Do Modal State
  const [isToDoOpen, setIsToDoOpen] = useState(false);

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

        const response = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...toDoData,
            sourcePageId: page._id,
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
    [page],
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
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-800">{page.title}</h1>
          <span className="text-xs text-gray-500">Last edited: {new Date(page.updatedAt).toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          {/* Symbol Toolbar */}

          {/* Symbol Toolbar - Dropdown */}
          <Menu as="div" className="relative text-left">
            <Menu.Button className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:bg-gray-50 disabled:text-gray-300">
              <FaceSmileIcon className="h-4 w-4" />
              Symbols
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute left-0 mt-2 w-56 origin-top-left divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10 grid grid-cols-5 gap-1 p-2">
                {SYMBOLS.map((s) => (
                  <Menu.Item key={s.char}>
                    {({ active }) => (
                      <button
                        type="button"
                        className={`${active ? 'bg-gray-100' : ''
                          } group flex w-full items-center justify-center rounded-md p-2 text-xl transition-all grayscale hover:grayscale-0`}
                        onClick={() => handleInsertSymbol(s.char)}
                        title={s.tooltip}
                      >
                        {s.char}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>

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

          <button
            className={`rounded-full p-2 transition-colors ${isImportant
              ? 'text-orange-500 bg-orange-50 hover:bg-orange-100'
              : 'text-gray-400 hover:bg-gray-100 hover:text-orange-400'
              }`}
            onClick={handleToggleImportant}
            title={isImportant ? 'Mark as not important' : 'Mark as important'}>
            {isImportant ? (
              <ExclamationTriangleIconSolid className="h-6 w-6" />
            ) : (
              <ExclamationTriangleIcon className="h-6 w-6" />
            )}
          </button>
          <button
            className={`rounded-full p-2 transition-colors ${isFlagged
              ? 'text-red-500 bg-red-50 hover:bg-red-100'
              : 'text-gray-400 hover:bg-gray-100 hover:text-red-400'
              }`}
            onClick={handleToggleFlagged}
            title={isFlagged ? 'Unflag task' : 'Flag as key task'}>
            {isFlagged ? <FlagIconSolid className="h-6 w-6" /> : <FlagIcon className="h-6 w-6" />}
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isDirty
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            disabled={!isDirty}
            onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <RichTextEditor
          onChange={handleContentChange}
          placeholder="Start typing your notes here..."
          ref={quillRef}
          value={content}
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

      <ToDoModal initialTitle={page.title} isOpen={isToDoOpen} onClose={handleCloseToDo} onSave={handleSaveToDo} />

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
