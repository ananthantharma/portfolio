/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {ChevronDown, Gavel, ListChecks, ListTodo, Siren, Sparkles} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {TaskVendor} from '../../Tasks/types';
import {sectionItems} from './meetingNotes';
import NoteRecordModal, {NoteRecordRequest} from './NoteRecordModal';
import {htmlToText} from './vendorApi';
import styles from './VendorPage.module.css';

interface Props {
  project: TaskVendor;
  note: {id: string; title: string};
  // Current HTML of the open tab (includes unsaved edits)
  getHtml: () => string;
}

/**
 * "Create from note" menu for project notes: turn the selected text (or the whole note) into a
 * task, decision, or attention item, or review a meeting note's Action Items / Decisions.
 * Every option opens a prefilled form; nothing is created without confirming.
 */
export default function ProjectNoteActions({project, note, getHtml}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{top: number; left: number} | null>(null);
  const [selection, setSelection] = useState('');
  const [request, setRequest] = useState<NoteRecordRequest | null>(null);
  const [found, setFound] = useState<{actions: string[]; decisions: string[]}>({actions: [], decisions: []});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openMenu = () => {
    const html = getHtml();
    setFound({actions: sectionItems(html, 'Action Items'), decisions: sectionItems(html, 'Decisions')});
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 260;
      setPos({top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))});
    }
    setOpen(true);
  };

  const source = () => selection.trim() || htmlToText(getHtml());
  const choose = (next: NoteRecordRequest) => {
    setOpen(false);
    setRequest(next);
  };
  const from = selection.trim() ? 'selection' : 'note';

  return (
    <>
      <button
        aria-expanded={open}
        className={styles.noteActionsButton}
        // Capture the highlighted text before the click moves focus out of the editor
        onMouseDown={() => setSelection(window.getSelection()?.toString() || '')}
        onClick={() => (open ? setOpen(false) : openMenu())}
        ref={buttonRef}
        title="Create a task, decision, or attention item from this note"
        type="button">
        <Sparkles size={13} /> Create from note <ChevronDown size={12} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div className={`${styles.noteActionsMenu} ${styles.scope}`} ref={menuRef} role="menu" style={{top: pos.top, left: pos.left}}>
            <div className={styles.noteActionsHint}>
              {from === 'selection' ? 'Using the text you selected' : 'Using the whole note (select text first to use just part of it)'}
            </div>
            <button onClick={() => choose({kind: 'task', text: source()})} role="menuitem" type="button">
              <ListTodo size={14} /> Task
            </button>
            <button
              onClick={() => choose({kind: 'decision', text: source(), title: from === 'note' ? note.title : undefined})}
              role="menuitem"
              type="button">
              <Gavel size={14} /> {from === 'note' ? 'Convert to decision' : 'Decision'}
            </button>
            <button onClick={() => choose({kind: 'attention', text: source()})} role="menuitem" type="button">
              <Siren size={14} /> Attention item (risk, issue…)
            </button>
            {(found.actions.length > 0 || found.decisions.length > 0) && <div className={styles.noteActionsDivider}>From this meeting note</div>}
            {found.actions.length > 0 && (
              <button onClick={() => choose({kind: 'review-tasks', items: found.actions})} role="menuitem" type="button">
                <ListChecks size={14} /> Tasks from Action Items ({found.actions.length})
              </button>
            )}
            {found.decisions.length > 0 && (
              <button onClick={() => choose({kind: 'review-decisions', items: found.decisions})} role="menuitem" type="button">
                <Gavel size={14} /> Decisions from Decisions ({found.decisions.length})
              </button>
            )}
          </div>,
          document.body,
        )}
      {request && <NoteRecordModal note={note} onClose={() => setRequest(null)} project={project} request={request} />}
    </>
  );
}
