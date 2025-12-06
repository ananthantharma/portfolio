import { Dialog, Transition } from '@headlessui/react';
import { ArrowPathIcon, CheckIcon, SparklesIcon, XMarkIcon, ExclamationTriangleIcon, FlagIcon } from '@heroicons/react/24/outline'; // Outline for unflagged and AI
import { ExclamationTriangleIcon as ExclamationTriangleIconSolid, FlagIcon as FlagIconSolid } from '@heroicons/react/24/solid'; // Solid for flagged
import React, { Fragment, useEffect, useRef, useState } from 'react';

import { INotePage } from '@/models/NotePage';

import RichTextEditor from './RichTextEditor';

interface NoteEditorProps {
  page: INotePage | null;
  onSave: (id: string, content: string) => void;
  onToggleFlag: (id: string, field: 'isFlagged' | 'isImportant', value: boolean) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = React.memo(({ onSave, onToggleFlag, page }) => {
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isImportant, setIsImportant] = useState(false);

  // AI Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [insertionRange, setInsertionRange] = useState<{ index: number; length: number } | null>(null);

  // Refs
  const contentRef = React.useRef(content);
  const isDirtyRef = React.useRef(isDirty);
  const onSaveRef = React.useRef(onSave);
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
  }, [page?._id]); // Only re-run when page ID changes (switch) or on unmount

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

  const handleContentChange = React.useCallback((val: string) => {
    setContent(val);
    setIsDirty(true);
  }, []);

  const handleGenerateAI = async () => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    let range = quill.getSelection();
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
      alert("Please select some text in the note to ask AI.");
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

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await response.json();
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
    const quill = quillRef.current?.getEditor();
    if (quill && insertionRange) {
      quill.deleteText(insertionRange.index, insertionRange.length);
      quill.insertText(insertionRange.index, generatedText);
      // Trigger update manually if needed, but onChange usually catches it
    } else {
      alert("Could not insert text. Lost selection context.");
    }
    setIsModalOpen(false);
  };

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-gray-400">
        Select a page to start editing
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white text-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-800">{page.title}</h1>
          <span className="text-xs text-gray-500">Last edited: {new Date(page.updatedAt).toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:bg-gray-300"
            onClick={handleGenerateAI}
            title="Ask AI"
          >
            <SparklesIcon className="h-5 w-5" />
            Ask AI
          </button>
          <button
            className={`rounded-full p-2 transition-colors ${isImportant ? 'text-orange-500 bg-orange-50 hover:bg-orange-100' : 'text-gray-400 hover:bg-gray-100 hover:text-orange-400'
              }`}
            onClick={handleToggleImportant}
            title={isImportant ? "Mark as not important" : "Mark as important"}
          >
            {isImportant ? <ExclamationTriangleIconSolid className="h-6 w-6" /> : <ExclamationTriangleIcon className="h-6 w-6" />}
          </button>
          <button
            className={`rounded-full p-2 transition-colors ${isFlagged ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:bg-gray-100 hover:text-red-400'
              }`}
            onClick={handleToggleFlagged}
            title={isFlagged ? "Unflag task" : "Flag as key task"}
          >
            {isFlagged ? <FlagIconSolid className="h-6 w-6" /> : <FlagIcon className="h-6 w-6" />}
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${isDirty ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-gray-300'
              }`}
            disabled={!isDirty}
            onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <RichTextEditor
          ref={quillRef}
          onChange={handleContentChange}
          placeholder="Start typing your notes here..."
          value={content}
        />
      </div>

      {/* Gemini Result Modal */}
      <Transition appear as={Fragment} show={isModalOpen}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
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
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5 text-purple-600" />
                      Gemini Suggestion
                    </div>
                    {!isGenerating && (
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
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
                      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto whitespace-pre-wrap text-sm text-gray-800">
                        {generatedText}
                      </div>
                    )}
                  </div>

                  {!isGenerating && (
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                        onClick={() => setIsModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="inline-flex justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 gap-2 items-center"
                        onClick={handleInsertAI}
                      >
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
    </div>
  );
});

NoteEditor.displayName = 'NoteEditor';

export default NoteEditor;
