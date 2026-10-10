/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {$isCodeNode} from '@lexical/code';
import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$patchStyleText} from '@lexical/selection';
import {$findMatchingParent, mergeRegister} from '@lexical/utils';
import {$getSelection, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_LOW, FORMAT_TEXT_COMMAND, SELECTION_CHANGE_COMMAND, TextFormatType} from 'lexical';
import {Bold, Check, Eraser, Highlighter, Italic, Link as LinkIcon, Strikethrough, Underline} from 'lucide-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

/** Small bar that floats above selected text with the most-used formatting. */
export default function FloatingFormatBar() {
  const [editor] = useLexicalComposerContext();
  const [pos, setPos] = useState<{top: number; left: number} | null>(null);
  const [formats, setFormats] = useState({bold: false, italic: false, underline: false, strikethrough: false, link: false});
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const mouseDown = useRef(false);

  const update = useCallback(() => {
    const root = editor.getRootElement();
    const native = window.getSelection();
    let show = false;
    editor.getEditorState().read(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel) || sel.isCollapsed() || !sel.getTextContent().trim()) return;
      const anchor = sel.anchor.getNode();
      if ($findMatchingParent(anchor, n => $isCodeNode(n))) return;
      const parent = anchor.getParent();
      setFormats({
        bold: sel.hasFormat('bold'),
        italic: sel.hasFormat('italic'),
        underline: sel.hasFormat('underline'),
        strikethrough: sel.hasFormat('strikethrough'),
        link: $isLinkNode(parent) || $isLinkNode(anchor),
      });
      show = true;
    });
    if (!show || !root || !native || native.rangeCount === 0 || !root.contains(native.anchorNode) || mouseDown.current) {
      if (linkUrl === null) setPos(null);
      return;
    }
    const rect = native.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return setPos(null);
    const width = barRef.current?.offsetWidth || 280;
    setPos({top: Math.max(8, rect.top - 46), left: Math.min(window.innerWidth - width - 8, Math.max(8, rect.left + rect.width / 2 - width / 2))});
  }, [editor, linkUrl]);

  useEffect(() => {
    const onScroll = () => update();
    const onDown = (e: MouseEvent) => {
      if (barRef.current?.contains(e.target as Node)) return;
      mouseDown.current = true;
      setLinkUrl(null);
      setPos(null);
    };
    const onUp = () => {
      mouseDown.current = false;
      setTimeout(update, 0);
    };
    document.addEventListener('selectionchange', update);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    window.addEventListener('scroll', onScroll, true);
    return mergeRegister(
      editor.registerUpdateListener(() => update()),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          update();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      () => {
        document.removeEventListener('selectionchange', update);
        document.removeEventListener('mousedown', onDown);
        document.removeEventListener('mouseup', onUp);
        window.removeEventListener('scroll', onScroll, true);
      },
    );
  }, [editor, update]);

  if (!pos) return null;

  const format = (f: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, f);
  const btn = (active: boolean) => `flex h-8 w-8 items-center justify-center rounded-md transition ${active ? 'bg-white/20 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`;
  const keep = (e: React.MouseEvent) => e.preventDefault();

  return createPortal(
    <div className="fixed z-[400] flex items-center gap-0.5 rounded-xl bg-slate-900 p-1 shadow-2xl ring-1 ring-black/10" onMouseDown={keep} ref={barRef} style={{top: pos.top, left: pos.left}}>
      {linkUrl !== null ? (
        <form
          className="flex items-center gap-1 px-1"
          onSubmit={e => {
            e.preventDefault();
            const url = linkUrl.trim();
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url ? (/^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`) : null);
            setLinkUrl(null);
          }}>
          <input
            autoFocus
            className="h-7 w-56 rounded-md bg-white/10 px-2 text-[13px] text-white outline-none placeholder:text-slate-400"
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setLinkUrl(null)}
            onMouseDown={e => e.stopPropagation()}
            placeholder="Paste a link, Enter to apply"
            value={linkUrl}
          />
          <button className={btn(false)} type="submit">
            <Check className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <>
          <button aria-label="Bold" className={btn(formats.bold)} onClick={() => format('bold')} title="Bold" type="button">
            <Bold className="h-4 w-4" />
          </button>
          <button aria-label="Italic" className={btn(formats.italic)} onClick={() => format('italic')} title="Italic" type="button">
            <Italic className="h-4 w-4" />
          </button>
          <button aria-label="Underline" className={btn(formats.underline)} onClick={() => format('underline')} title="Underline" type="button">
            <Underline className="h-4 w-4" />
          </button>
          <button aria-label="Strikethrough" className={btn(formats.strikethrough)} onClick={() => format('strikethrough')} title="Strikethrough" type="button">
            <Strikethrough className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-white/15" />
          <button
            aria-label="Highlight"
            className={btn(false)}
            onClick={() =>
              editor.update(() => {
                const sel = $getSelection();
                if ($isRangeSelection(sel)) $patchStyleText(sel, {'background-color': '#fef08a'});
              })
            }
            title="Highlight yellow"
            type="button">
            <Highlighter className="h-4 w-4 text-yellow-300" />
          </button>
          <button
            aria-label="Link"
            className={btn(formats.link)}
            onClick={() => (formats.link ? editor.dispatchCommand(TOGGLE_LINK_COMMAND, null) : setLinkUrl(''))}
            title={formats.link ? 'Remove link' : 'Add link'}
            type="button">
            <LinkIcon className="h-4 w-4" />
          </button>
          <button
            aria-label="Clear formatting"
            className={btn(false)}
            onClick={() =>
              editor.update(() => {
                const sel = $getSelection();
                if (!$isRangeSelection(sel)) return;
                sel.extract().forEach(n => {
                  if ($isTextNode(n)) {
                    n.setFormat(0);
                    n.setStyle('');
                  }
                });
              })
            }
            title="Clear formatting"
            type="button">
            <Eraser className="h-4 w-4" />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
