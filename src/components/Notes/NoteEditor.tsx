'use client';

import React, {useEffect, useState} from 'react';

import {INotePage} from '@/models/NotePage';

interface NoteEditorProps {
  page: INotePage | null;
  onSave: (id: string, content: string) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = React.memo(({page, onSave}) => {
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (page) {
      setContent(page.content || '');
      setIsDirty(false);
    } else {
      setContent('');
    }
  }, [page]);

  const handleSave = () => {
    if (page) {
      onSave(page._id as string, content);
      setIsDirty(false);
    }
  };

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-gray-400">
        Select a page to start editing
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-800">{page.title}</h1>
          <span className="text-xs text-gray-500">Last edited: {new Date(page.updatedAt).toLocaleString()}</span>
        </div>
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
            isDirty ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-gray-300'
          }`}
          disabled={!isDirty}
          onClick={handleSave}>
          Save
        </button>
      </div>
      <div className="flex-1 p-6">
        <textarea
          className="h-full w-full resize-none border-none p-0 text-lg text-gray-800 focus:ring-0"
          onChange={e => {
            setContent(e.target.value);
            setIsDirty(true);
          }}
          placeholder="Start typing your notes here..."
          value={content}
        />
      </div>
    </div>
  );
});

NoteEditor.displayName = 'NoteEditor';

export default NoteEditor;
