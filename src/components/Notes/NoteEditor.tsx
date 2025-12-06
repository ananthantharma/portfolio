'use client';

import { ExclamationTriangleIcon, FlagIcon } from '@heroicons/react/24/outline'; // Outline for unflagged
import { ExclamationTriangleIcon as ExclamationTriangleIconSolid, FlagIcon as FlagIconSolid } from '@heroicons/react/24/solid'; // Solid for flagged
import React, { useEffect, useState } from 'react';

import { INotePage } from '@/models/NotePage';

import RichTextEditor from './RichTextEditor';

interface NoteEditorProps {
  page: INotePage | null;
  onSave: (id: string, content: string) => void;
  onToggleFlag: (id: string, field: 'isFlagged' | 'isImportant', value: boolean) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = React.memo(({ page, onSave, onToggleFlag }) => {
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isImportant, setIsImportant] = useState(false);

  // Refs to track current state for auto-save cleanup
  const contentRef = React.useRef(content);
  const isDirtyRef = React.useRef(isDirty);
  const onSaveRef = React.useRef(onSave);

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
            onClick={handleToggleImportant}
            className={`rounded-full p-2 transition-colors ${isImportant ? 'text-orange-500 bg-orange-50 hover:bg-orange-100' : 'text-gray-400 hover:bg-gray-100 hover:text-orange-400'
              }`}
            title={isImportant ? "Mark as not important" : "Mark as important"}
          >
            {isImportant ? <ExclamationTriangleIconSolid className="h-6 w-6" /> : <ExclamationTriangleIcon className="h-6 w-6" />}
          </button>
          <button
            onClick={handleToggleFlagged}
            className={`rounded-full p-2 transition-colors ${isFlagged ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:bg-gray-100 hover:text-red-400'
              }`}
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
          onChange={handleContentChange}
          placeholder="Start typing your notes here..."
          value={content}
        />
      </div>
    </div>
  );
});

NoteEditor.displayName = 'NoteEditor';

export default NoteEditor;
