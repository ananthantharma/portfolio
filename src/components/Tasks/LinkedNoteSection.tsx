/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {ExternalLink, FileText, Link2, Plus, X} from 'lucide-react';
import React, {useState} from 'react';

import NoteLinkModal from './NoteLinkModal';
import NoteQuickEditModal from './NoteQuickEditModal';
import {Task} from './types';

interface LinkedNoteSectionProps {
  task: Task;
  onPatch: (id: string, patch: Record<string, unknown>) => void;
}

/** "Linked note" property — create/link a NotePage to a task, open it, or quick-edit it inline. */
export default function LinkedNoteSection({task, onPatch}: LinkedNoteSectionProps) {
  const [linkMode, setLinkMode] = useState<'search' | 'create' | null>(null);
  const [quickEditPageId, setQuickEditPageId] = useState<string | null>(null);

  const linkedPage = task.sourcePageId && typeof task.sourcePageId === 'object' ? task.sourcePageId : null;
  const linkedPageId = linkedPage ? linkedPage._id : typeof task.sourcePageId === 'string' ? task.sourcePageId : null;

  const handleLinked = (page: {_id: string; title: string}) => {
    onPatch(task._id, {sourcePageId: page._id});
    setLinkMode(null);
    setQuickEditPageId(page._id); // jump straight into quick-edit so they can start writing
  };

  const unlink = () => onPatch(task._id, {sourcePageId: null});

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-slate-400" />
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Linked note</h4>
      </div>

      {linkedPage ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-2xl bg-indigo-50/70 px-3.5 py-2.5 text-[12px] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
          <FileText className="h-4 w-4 shrink-0" />
          <button
            className="min-w-0 flex-1 truncate text-left font-semibold hover:underline"
            onClick={() => setQuickEditPageId(linkedPage._id)}
            title="Quick view & edit">
            {linkedPage.title}
          </button>
          {task.tabName && <span className="shrink-0 text-indigo-400">· {task.tabName}</span>}
          <a
            className="shrink-0 rounded-lg p-1 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
            href={`/notes?pageId=${linkedPage._id}`}
            rel="noopener noreferrer"
            target="_blank"
            title="Open full page in /notes">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
            onClick={unlink}
            title="Unlink note">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : linkedPageId ? (
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-indigo-50/70 px-3.5 py-2.5 text-[12px] text-indigo-400 dark:bg-indigo-500/10">
          <FileText className="h-4 w-4 shrink-0 animate-pulse" />
          Linking note…
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400"
            onClick={() => setLinkMode('search')}>
            <Link2 className="h-3.5 w-3.5" /> Link note
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400"
            onClick={() => setLinkMode('create')}>
            <Plus className="h-3.5 w-3.5" /> New note
          </button>
        </div>
      )}

      {linkMode && (
        <NoteLinkModal
          initialMode={linkMode}
          onClose={() => setLinkMode(null)}
          onLinked={handleLinked}
          taskTitle={task.title}
        />
      )}
      {quickEditPageId && <NoteQuickEditModal onClose={() => setQuickEditPageId(null)} pageId={quickEditPageId} />}
    </div>
  );
}
