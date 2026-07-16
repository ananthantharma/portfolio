/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {BookOpen, ChevronRight, FolderInput, Loader2, X} from 'lucide-react';
import React, {useEffect, useState} from 'react';

import {api} from './api';
import {Notebook, Page, Section} from './types';

interface MovePageModalProps {
  page: Page;
  notebooks: Notebook[];
  onClose: () => void;
  onMove: (pageId: string, dest: {sectionId: string | null; categoryId: string}) => void;
}

export default function MovePageModal({page, notebooks, onClose, onMove}: MovePageModalProps) {
  const [openNotebookId, setOpenNotebookId] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, Section[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleNotebook = async (nb: Notebook) => {
    if (openNotebookId === nb._id) {
      setOpenNotebookId(null);
      return;
    }
    setOpenNotebookId(nb._id);
    if (!sections[nb._id]) {
      setLoadingId(nb._id);
      try {
        const secs = await api.sections.list(nb._id);
        setSections(prev => ({...prev, [nb._id]: secs}));
      } finally {
        setLoadingId(null);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 pt-[14vh] backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md animate-scale-in overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141d] shadow-float">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-white">
            <FolderInput className="h-4 w-4 shrink-0 text-violet-300" />
            <span className="truncate">Move &ldquo;{page.title || 'Untitled'}&rdquo;</span>
          </div>
          <button
            className="shrink-0 rounded-lg p-1 text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white"
            onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
          {notebooks.length === 0 && (
            <p className="px-3 py-6 text-center text-[12px] text-white/25">No notebooks to move into yet.</p>
          )}
          {notebooks.map(nb => {
            const isOpen = openNotebookId === nb._id;
            return (
              <div key={nb._id}>
                <div className="group flex items-center gap-1 rounded-xl px-1 transition-colors hover:bg-white/[0.05]">
                  <button
                    className="flex flex-1 items-center gap-2 rounded-lg px-2 py-2.5 text-left text-[13px] font-medium text-white/80"
                    onClick={() => toggleNotebook(nb)}>
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 text-white/30 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    />
                    <span className="truncate">{nb.name}</span>
                  </button>
                  <button
                    className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-violet-300 opacity-0 transition-opacity hover:bg-violet-500/15 group-hover:opacity-100"
                    onClick={() => onMove(page._id, {sectionId: null, categoryId: nb._id})}>
                    Move here
                  </button>
                </div>
                {isOpen && (
                  <div className="ml-6 border-l border-white/[0.06] pl-2">
                    {loadingId === nb._id && (
                      <p className="flex items-center gap-2 px-3 py-2 text-[11px] text-white/25">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading sections…
                      </p>
                    )}
                    {sections[nb._id]?.map(sec => (
                      <button
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12.5px] text-white/60 transition-colors hover:bg-violet-500/10 hover:text-violet-200"
                        key={sec._id}
                        onClick={() => onMove(page._id, {sectionId: sec._id, categoryId: nb._id})}>
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-white/25" />
                        <span className="truncate">{sec.name}</span>
                      </button>
                    ))}
                    {sections[nb._id]?.length === 0 && (
                      <p className="px-3 py-2 text-[11px] italic text-white/20">No sections</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
