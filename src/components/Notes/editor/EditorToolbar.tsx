/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {$createCodeNode,$isCodeNode} from '@lexical/code';
import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {$isListNode, INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListNode, REMOVE_LIST_COMMAND} from '@lexical/list';
import {$convertToMarkdownString, TRANSFORMERS} from '@lexical/markdown';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {INSERT_HORIZONTAL_RULE_COMMAND} from '@lexical/react/LexicalHorizontalRuleNode';
import {$createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode} from '@lexical/rich-text';
import {$getSelectionStyleValueForProperty, $patchStyleText, $setBlocksType} from '@lexical/selection';
import {INSERT_TABLE_COMMAND} from '@lexical/table';
import {$findMatchingParent, $getNearestNodeOfType, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $setSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  KEY_DOWN_COMMAND,
  LexicalEditor,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  TextFormatType,
  UNDO_COMMAND,
} from 'lexical';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Download,
  Eraser,
  FileText,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  PenLine,
  Plus,
  Printer,
  Redo,
  Replace,
  ScrollText,
  Search,
  SeparatorHorizontal,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Underline,
  Undo,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {$createDrawingNode} from '../DrawingNode';
import {$createImageNode} from '../ImageNode';

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'code' | 'bullet' | 'number' | 'check';

const BLOCKS: {key: BlockType; label: string; preview: string}[] = [
  {key: 'paragraph', label: 'Normal text', preview: 'text-[14px]'},
  {key: 'h1', label: 'Heading 1', preview: 'text-[20px] font-bold'},
  {key: 'h2', label: 'Heading 2', preview: 'text-[17px] font-semibold'},
  {key: 'h3', label: 'Heading 3', preview: 'text-[15px] font-semibold'},
  {key: 'quote', label: 'Quote', preview: 'text-[14px] italic border-l-2 border-slate-300 pl-2'},
  {key: 'code', label: 'Code block', preview: 'text-[13px] font-mono'},
];
const FONTS: {label: string; value: string}[] = [
  {label: 'Default', value: ''},
  {label: 'Arial', value: 'Arial, Helvetica, sans-serif'},
  {label: 'Calibri', value: 'Calibri, Carlito, sans-serif'},
  {label: 'Georgia', value: 'Georgia, serif'},
  {label: 'Times New Roman', value: '"Times New Roman", Times, serif'},
  {label: 'Verdana', value: 'Verdana, Geneva, sans-serif'},
  {label: 'Courier New', value: '"Courier New", Courier, monospace'},
];
const SIZES = [10, 11, 12, 13, 14, 16, 17, 18, 20, 24, 28, 32, 36, 48, 60];
const DEFAULT_SIZE = 17;
const TEXT_COLORS = ['#0f172a', '#475569', '#94a3b8', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488', '#2563eb', '#4f46e5', '#9333ea', '#db2777'];
const HIGHLIGHTS = ['#fef08a', '#fde68a', '#fed7aa', '#fecaca', '#fbcfe8', '#e9d5ff', '#c7d2fe', '#bfdbfe', '#a5f3fc', '#bbf7d0', '#d9f99d', '#e2e8f0'];

// Image helper: keep pasted/uploaded pictures small enough to save
async function compressImage(dataUrl: string, maxWidth = 1600, quality = 0.85): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Word-compatible HTML document around the note's HTML. */
export function wordDocument(title: string, body: string) {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#1e293b}h1{font-size:20pt}h2{font-size:16pt}h3{font-size:13pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #94a3b8;padding:4pt 6pt;vertical-align:top}th{background:#f1f5f9}blockquote{border-left:3pt solid #cbd5e1;margin-left:0;padding-left:10pt;color:#475569}code,pre{font-family:Consolas,monospace;background:#f1f5f9}img{max-width:100%}</style></head><body>${body}</body></html>`;
}

/* ── small building blocks ── */

function ToolButton({active, disabled, title, onClick, children, className = ''}: {active?: boolean; disabled?: boolean; title: string; onClick: () => void; children: React.ReactNode; className?: string}) {
  return (
    <button
      aria-label={title}
      aria-pressed={active}
      className={`flex h-8 min-w-[32px] items-center justify-center gap-1 rounded-md px-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 ${active ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800' : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={e => e.preventDefault()}
      title={title}
      type="button">
      {children}
    </button>
  );
}

/** Click-to-open menu that closes on outside click or Escape. */
function Menu({button, children, title, width = 220, align = 'left', open, setOpen}: {button: React.ReactNode; children: React.ReactNode; title: string; width?: number; align?: 'left' | 'right'; open: boolean; setOpen: (v: boolean) => void}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);
  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-label={title}
        className={`flex h-8 items-center gap-1 rounded-md px-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 ${open ? 'bg-slate-100 text-slate-900' : ''}`}
        onClick={() => setOpen(!open)}
        onMouseDown={e => e.preventDefault()}
        title={title}
        type="button">
        {button}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className={`absolute top-full z-[300] mt-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${align === 'right' ? 'right-0' : 'left-0'}`} style={{width}}>
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({onClick, children, active, hint}: {onClick: () => void; children: React.ReactNode; active?: boolean; hint?: string}) {
  return (
    <button
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-100 ${active ? 'bg-indigo-50 text-indigo-700' : ''}`}
      onClick={onClick}
      onMouseDown={e => e.preventDefault()}
      type="button">
      {children}
      {hint && <span className="ml-auto text-[11px] text-slate-400">{hint}</span>}
      {active && !hint && <Check className="ml-auto h-3.5 w-3.5" />}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />;

/* ── find & replace ── */

type Match = {key: string; offset: number};

function FindReplacePanel({editor, onClose}: {editor: LexicalEditor; onClose: () => void}) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const supportsHighlight = typeof window !== 'undefined' && 'highlights' in CSS && typeof (window as unknown as {Highlight?: unknown}).Highlight === 'function';

  useEffect(() => inputRef.current?.focus(), []);

  const compute = useCallback(() => {
    if (!query) return setMatches([]);
    const q = matchCase ? query : query.toLowerCase();
    const found: Match[] = [];
    editor.getEditorState().read(() => {
      $getRoot()
        .getAllTextNodes()
        .forEach(node => {
          const text = matchCase ? node.getTextContent() : node.getTextContent().toLowerCase();
          let i = text.indexOf(q);
          while (i !== -1) {
            found.push({key: node.getKey(), offset: i});
            i = text.indexOf(q, i + q.length);
          }
        });
    });
    setMatches(found);
    setIndex(i => (found.length ? Math.min(i, found.length - 1) : 0));
  }, [editor, query, matchCase]);

  useEffect(() => {
    compute();
    return editor.registerUpdateListener(({dirtyElements, dirtyLeaves}) => {
      if (dirtyElements.size || dirtyLeaves.size) compute();
    });
  }, [compute, editor]);

  // Paint matches with the CSS Highlight API (falls back to just scrolling to them)
  const rangeFor = useCallback(
    (m: Match) => {
      const el = editor.getElementByKey(m.key);
      if (!el) return null;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const textNode = walker.nextNode();
      if (!textNode) return null;
      const range = document.createRange();
      const len = textNode.textContent?.length || 0;
      range.setStart(textNode, Math.min(m.offset, len));
      range.setEnd(textNode, Math.min(m.offset + query.length, len));
      return range;
    },
    [editor, query.length],
  );
  useEffect(() => {
    if (!supportsHighlight) return;
    const reg = (CSS as unknown as {highlights: Map<string, unknown>}).highlights;
    const HL = (window as unknown as {Highlight: new (...r: Range[]) => unknown}).Highlight;
    const ranges = matches.map(rangeFor).filter((r): r is Range => !!r);
    reg.set('note-find', new HL(...ranges));
    const current = matches[index] ? rangeFor(matches[index]) : null;
    if (current) reg.set('note-find-current', new HL(current));
    else reg.delete('note-find-current');
    return () => {
      reg.delete('note-find');
      reg.delete('note-find-current');
    };
  }, [matches, index, rangeFor, supportsHighlight]);

  const goTo = (i: number) => {
    if (!matches.length) return;
    const next = (i + matches.length) % matches.length;
    setIndex(next);
    const m = matches[next];
    editor.getElementByKey(m.key)?.scrollIntoView({block: 'center', behavior: 'smooth'});
  };

  const select = (m: Match) =>
    editor.update(() => {
      const sel = $createRangeSelection();
      sel.anchor.set(m.key, m.offset, 'text');
      sel.focus.set(m.key, m.offset + query.length, 'text');
      $setSelection(sel);
    });

  const replaceOne = () => {
    const m = matches[index];
    if (!m) return;
    editor.update(() => {
      const node = $getNodeByKey(m.key);
      if ($isTextNode(node)) node.spliceText(m.offset, query.length, replacement, false);
    });
  };
  const replaceAll = () => {
    if (!query) return;
    const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
    editor.update(() => {
      $getRoot()
        .getAllTextNodes()
        .forEach(node => {
          const text = node.getTextContent();
          if (re.test(text)) node.setTextContent(text.replace(re, replacement));
          re.lastIndex = 0;
        });
    });
  };

  const input = 'h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
  return (
    <div className="absolute right-4 top-full z-[250] mt-2 w-[360px] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
      <div className="flex items-center gap-1.5">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          className={input}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') goTo(e.shiftKey ? index - 1 : index + 1);
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Find in note"
          ref={inputRef}
          value={query}
        />
        <span className="w-14 shrink-0 text-center text-[11.5px] tabular-nums text-slate-400">{query ? `${matches.length ? index + 1 : 0}/${matches.length}` : ''}</span>
        <ToolButton disabled={!matches.length} onClick={() => goTo(index - 1)} title="Previous (Shift+Enter)">
          <ChevronUp className="h-4 w-4" />
        </ToolButton>
        <ToolButton disabled={!matches.length} onClick={() => goTo(index + 1)} title="Next (Enter)">
          <ChevronDown className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={onClose} title="Close (Esc)">
          <X className="h-4 w-4" />
        </ToolButton>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Replace className="h-4 w-4 shrink-0 text-slate-400" />
        <input className={input} onChange={e => setReplacement(e.target.value)} placeholder="Replace with" value={replacement} />
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <input checked={matchCase} className="accent-indigo-600" onChange={e => setMatchCase(e.target.checked)} type="checkbox" /> Match case
        </label>
        <button className="ml-auto rounded-md px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40" disabled={!matches.length} onClick={() => select(matches[index])} type="button">
          Select
        </button>
        <button className="rounded-md border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" disabled={!matches.length} onClick={replaceOne} type="button">
          Replace
        </button>
        <button className="rounded-md bg-indigo-600 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-40" disabled={!matches.length} onClick={replaceAll} type="button">
          Replace all
        </button>
      </div>
    </div>
  );
}

/* ── the toolbar ── */

export default function EditorToolbar({title, getHtml, pageView, onTogglePageView}: {title?: string; getHtml: () => string; pageView: boolean; onTogglePageView: () => void}) {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState({
    block: 'paragraph' as BlockType,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    superscript: false,
    subscript: false,
    code: false,
    align: 'left' as ElementFormatType,
    font: '',
    size: DEFAULT_SIZE,
    color: '',
    background: '',
    link: false,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [link, setLink] = useState<{url: string} | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [tableHover, setTableHover] = useState({r: 3, c: 3});
  const [notice, setNotice] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);

  const readState = useCallback(() => {
    const sel = $getSelection();
    if (!$isRangeSelection(sel)) return;
    const anchor = sel.anchor.getNode();
    let element =
      anchor.getKey() === 'root'
        ? anchor
        : $findMatchingParent(anchor, e => {
            const p = e.getParent();
            return p !== null && $isRootOrShadowRoot(p);
          });
    if (element === null) element = anchor.getTopLevelElementOrThrow();
    let block: BlockType = 'paragraph';
    if ($isListNode(element)) {
      const parentList = $getNearestNodeOfType(anchor, ListNode);
      const type = (parentList || element).getListType();
      block = type === 'number' ? 'number' : type === 'check' ? 'check' : 'bullet';
    } else if ($isHeadingNode(element)) block = element.getTag() as BlockType;
    else if ($isQuoteNode(element)) block = 'quote';
    else if ($isCodeNode(element)) block = 'code';
    const node = sel.anchor.getNode();
    const parent = node.getParent();
    const sizeText = $getSelectionStyleValueForProperty(sel, 'font-size', `${DEFAULT_SIZE}px`);
    setState({
      block,
      bold: sel.hasFormat('bold'),
      italic: sel.hasFormat('italic'),
      underline: sel.hasFormat('underline'),
      strikethrough: sel.hasFormat('strikethrough'),
      superscript: sel.hasFormat('superscript'),
      subscript: sel.hasFormat('subscript'),
      code: sel.hasFormat('code'),
      align: ($isElementNode(element) ? element.getFormatType() : '') || 'left',
      font: $getSelectionStyleValueForProperty(sel, 'font-family', ''),
      size: parseInt(sizeText, 10) || DEFAULT_SIZE,
      color: $getSelectionStyleValueForProperty(sel, 'color', ''),
      background: $getSelectionStyleValueForProperty(sel, 'background-color', ''),
      link: $isLinkNode(parent) || $isLinkNode(node),
    });
  }, []);

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({editorState}) => editorState.read(readState)),
        editor.registerCommand(
          SELECTION_CHANGE_COMMAND,
          () => {
            readState();
            return false;
          },
          COMMAND_PRIORITY_CRITICAL,
        ),
        editor.registerCommand(
          CAN_UNDO_COMMAND,
          v => {
            setCanUndo(v);
            return false;
          },
          COMMAND_PRIORITY_CRITICAL,
        ),
        editor.registerCommand(
          CAN_REDO_COMMAND,
          v => {
            setCanRedo(v);
            return false;
          },
          COMMAND_PRIORITY_CRITICAL,
        ),
        // Word-style shortcuts
        editor.registerCommand(
          KEY_DOWN_COMMAND,
          (e: KeyboardEvent) => {
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return false;
            const k = e.key.toLowerCase();
            if (k === 'k') {
              e.preventDefault();
              openLink();
              return true;
            }
            if (k === 'f' || k === 'h') {
              e.preventDefault();
              setFindOpen(true);
              return true;
            }
            if (e.altKey && ['1', '2', '3'].includes(k)) {
              e.preventDefault();
              setBlock(`h${k}` as BlockType);
              return true;
            }
            if (e.altKey && k === '0') {
              e.preventDefault();
              setBlock('paragraph');
              return true;
            }
            if (e.shiftKey && (k === '&' || k === '7')) {
              e.preventDefault();
              setBlock('number');
              return true;
            }
            if (e.shiftKey && (k === '*' || k === '8')) {
              e.preventDefault();
              setBlock('bullet');
              return true;
            }
            if (e.shiftKey && k === 'x') {
              e.preventDefault();
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
              return true;
            }
            if (k === '.' || k === ',') {
              e.preventDefault();
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, k === '.' ? 'superscript' : 'subscript');
              return true;
            }
            if (k === '\\') {
              e.preventDefault();
              clearFormatting();
              return true;
            }
            return false;
          },
          COMMAND_PRIORITY_HIGH,
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, readState],
  );

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (link) setTimeout(() => linkInput.current?.focus(), 30);
  }, [link]);

  const closeMenu = () => setMenu(null);
  const style = (patch: Record<string, string | null>) =>
    editor.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) $patchStyleText(sel, patch);
    });
  const format = (f: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, f);

  function setBlock(b: BlockType) {
    closeMenu();
    if (b === 'bullet' || b === 'number' || b === 'check') {
      if (state.block === b) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      else editor.dispatchCommand(b === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : b === 'number' ? INSERT_ORDERED_LIST_COMMAND : INSERT_CHECK_LIST_COMMAND, undefined);
      return;
    }
    editor.update(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      $setBlocksType(sel, () => (b === 'paragraph' ? $createParagraphNode() : b === 'quote' ? $createQuoteNode() : b === 'code' ? $createCodeNode() : $createHeadingNode(b)));
    });
  }

  function clearFormatting() {
    editor.update(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      sel.extract().forEach(node => {
        if ($isTextNode(node)) {
          node.setFormat(0);
          node.setStyle('');
        }
      });
    });
  }

  const stepSize = (dir: 1 | -1) => {
    const i = SIZES.findIndex(s => s >= state.size);
    const cur = i === -1 ? SIZES.length - 1 : i;
    const next = SIZES[Math.max(0, Math.min(SIZES.length - 1, SIZES[cur] === state.size ? cur + dir : dir > 0 ? cur : cur - 1))];
    style({'font-size': `${next}px`});
  };

  function openLink() {
    editor.getEditorState().read(() => {
      const sel = $getSelection();
      let url = '';
      if ($isRangeSelection(sel)) {
        const node = sel.anchor.getNode();
        const parent = node.getParent();
        if ($isLinkNode(parent)) url = parent.getURL();
        else if ($isLinkNode(node)) url = node.getURL();
      }
      setLink({url});
    });
  }
  const applyLink = () => {
    if (!link) return;
    const url = link.url.trim();
    setLink(null);
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url ? (/^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`) : null);
  };

  const insertDrawing = () =>
    editor.update(() => {
      const sel = $getSelection();
      const node = $createDrawingNode();
      if ($isRangeSelection(sel)) sel.insertNodes([node]);
      else $getRoot().append(node);
    });
  const insertDate = () =>
    editor.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) sel.insertText(new Date().toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}));
    });

  const download = (name: string, content: BlobPart, type: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], {type}));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const fileBase = (title || 'note').replace(/[^\w\- ]+/g, '').trim() || 'note';
  const exportWord = () => {
    closeMenu();
    download(`${fileBase}.doc`, `﻿${wordDocument(title || 'Note', getHtml())}`, 'application/msword');
    setNotice('Downloaded a Word document');
  };
  const printPdf = () => {
    closeMenu();
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const doc = frame.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(wordDocument(title || 'Note', `${title ? `<h1>${title.replace(/</g, '&lt;')}</h1>` : ''}${getHtml()}`));
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    }, 250);
  };
  const copyMarkdown = async () => {
    closeMenu();
    const md = editor.getEditorState().read(() => $convertToMarkdownString(TRANSFORMERS));
    try {
      await navigator.clipboard.writeText(md);
      setNotice('Copied as Markdown');
    } catch {
      setNotice('Could not copy');
    }
  };

  const currentBlock = BLOCKS.find(b => b.key === state.block) || {label: state.block === 'bullet' ? 'Bulleted list' : state.block === 'number' ? 'Numbered list' : 'Checklist'};
  const currentFont = FONTS.find(f => f.value && state.font && state.font.toLowerCase().startsWith(f.value.split(',')[0].replace(/"/g, '').toLowerCase())) || FONTS.find(f => f.value === state.font) || FONTS[0];
  const AlignIcon = {left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify}[state.align as 'left'] || AlignLeft;

  return (
    <div className="relative flex w-full flex-wrap items-center gap-0.5">
      <ToolButton disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo (Ctrl+Z)">
        <Undo className="h-4 w-4" />
      </ToolButton>
      <ToolButton disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo (Ctrl+Y)">
        <Redo className="h-4 w-4" />
      </ToolButton>
      <Divider />

      {/* Paragraph style */}
      <Menu button={<span className="w-[92px] truncate text-left text-[12.5px] font-medium">{currentBlock.label}</span>} open={menu === 'block'} setOpen={v => setMenu(v ? 'block' : null)} title="Paragraph style" width={220}>
        {BLOCKS.map(b => (
          <MenuItem active={state.block === b.key} hint={b.key.startsWith('h') ? `Ctrl+Alt+${b.key[1]}` : b.key === 'paragraph' ? 'Ctrl+Alt+0' : undefined} key={b.key} onClick={() => setBlock(b.key)}>
            <span className={b.preview}>{b.label}</span>
          </MenuItem>
        ))}
      </Menu>

      {/* Font */}
      <Menu button={<span className="w-[78px] truncate text-left text-[12.5px]" style={{fontFamily: currentFont.value || undefined}}>{currentFont.label}</span>} open={menu === 'font'} setOpen={v => setMenu(v ? 'font' : null)} title="Font" width={200}>
        {FONTS.map(f => (
          <MenuItem
            active={currentFont.label === f.label}
            key={f.label}
            onClick={() => {
              style({'font-family': f.value || null});
              closeMenu();
            }}>
            <span style={{fontFamily: f.value || undefined}}>{f.label}</span>
          </MenuItem>
        ))}
      </Menu>

      {/* Size */}
      <div className="flex items-center rounded-md border border-slate-200">
        <ToolButton className="h-7 min-w-[26px]" onClick={() => stepSize(-1)} title="Smaller text">
          <Minus className="h-3.5 w-3.5" />
        </ToolButton>
        <Menu button={<span className="w-6 text-center text-[12.5px] tabular-nums">{state.size}</span>} open={menu === 'size'} setOpen={v => setMenu(v ? 'size' : null)} title="Font size" width={96}>
          <div className="max-h-64 overflow-y-auto">
            {SIZES.map(s => (
              <MenuItem
                active={state.size === s}
                key={s}
                onClick={() => {
                  style({'font-size': s === DEFAULT_SIZE ? null : `${s}px`});
                  closeMenu();
                }}>
                {s}
              </MenuItem>
            ))}
          </div>
        </Menu>
        <ToolButton className="h-7 min-w-[26px]" onClick={() => stepSize(1)} title="Bigger text">
          <Plus className="h-3.5 w-3.5" />
        </ToolButton>
      </div>
      <Divider />

      <ToolButton active={state.bold} onClick={() => format('bold')} title="Bold (Ctrl+B)">
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton active={state.italic} onClick={() => format('italic')} title="Italic (Ctrl+I)">
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton active={state.underline} onClick={() => format('underline')} title="Underline (Ctrl+U)">
        <Underline className="h-4 w-4" />
      </ToolButton>
      <ToolButton active={state.strikethrough} onClick={() => format('strikethrough')} title="Strikethrough (Ctrl+Shift+X)">
        <Strikethrough className="h-4 w-4" />
      </ToolButton>
      <Menu button={<MoreHorizontal className="h-4 w-4" />} open={menu === 'more'} setOpen={v => setMenu(v ? 'more' : null)} title="More text formatting" width={230}>
        <MenuItem active={state.superscript} hint="Ctrl+." onClick={() => (format('superscript'), closeMenu())}>
          <Superscript className="h-4 w-4" /> Superscript
        </MenuItem>
        <MenuItem active={state.subscript} hint="Ctrl+," onClick={() => (format('subscript'), closeMenu())}>
          <Subscript className="h-4 w-4" /> Subscript
        </MenuItem>
        <MenuItem active={state.code} onClick={() => (format('code'), closeMenu())}>
          <Code className="h-4 w-4" /> Inline code
        </MenuItem>
        <div className="my-1 h-px bg-slate-100" />
        <MenuItem hint="Ctrl+\" onClick={() => (clearFormatting(), closeMenu())}>
          <Eraser className="h-4 w-4" /> Clear formatting
        </MenuItem>
      </Menu>

      {/* Colours */}
      <Menu
        button={
          <span className="flex flex-col items-center">
            <Baseline className="h-4 w-4" />
            <span className="-mt-0.5 h-[3px] w-4 rounded-full" style={{background: state.color || '#0f172a'}} />
          </span>
        }
        open={menu === 'color'}
        setOpen={v => setMenu(v ? 'color' : null)}
        title="Text colour"
        width={196}>
        <div className="grid grid-cols-6 gap-1.5 p-1">
          {TEXT_COLORS.map(c => (
            <button aria-label={c} className="h-6 w-6 rounded-md ring-1 ring-black/10 transition hover:scale-110" key={c} onClick={() => (style({color: c}), closeMenu())} onMouseDown={e => e.preventDefault()} style={{background: c}} type="button" />
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2 border-t border-slate-100 px-1 pt-2">
          <label className="flex flex-1 cursor-pointer items-center gap-2 text-[12px] text-slate-600">
            <input className="h-6 w-6 cursor-pointer rounded border-0 p-0" onChange={e => style({color: e.target.value})} type="color" /> Custom
          </label>
          <button className="text-[12px] font-medium text-slate-500 hover:text-slate-800" onClick={() => (style({color: null}), closeMenu())} onMouseDown={e => e.preventDefault()} type="button">
            Automatic
          </button>
        </div>
      </Menu>
      <Menu
        button={
          <span className="flex flex-col items-center">
            <Highlighter className="h-4 w-4" />
            <span className="-mt-0.5 h-[3px] w-4 rounded-full" style={{background: state.background || '#fef08a'}} />
          </span>
        }
        open={menu === 'highlight'}
        setOpen={v => setMenu(v ? 'highlight' : null)}
        title="Highlight"
        width={196}>
        <div className="grid grid-cols-6 gap-1.5 p-1">
          {HIGHLIGHTS.map(c => (
            <button aria-label={c} className="h-6 w-6 rounded-md ring-1 ring-black/10 transition hover:scale-110" key={c} onClick={() => (style({'background-color': c}), closeMenu())} onMouseDown={e => e.preventDefault()} style={{background: c}} type="button" />
          ))}
        </div>
        <button className="mt-1 w-full border-t border-slate-100 px-1 pt-2 text-left text-[12px] font-medium text-slate-500 hover:text-slate-800" onClick={() => (style({'background-color': null}), closeMenu())} onMouseDown={e => e.preventDefault()} type="button">
          No highlight
        </button>
      </Menu>
      <Divider />

      {/* Alignment */}
      <Menu button={<AlignIcon className="h-4 w-4" />} open={menu === 'align'} setOpen={v => setMenu(v ? 'align' : null)} title="Alignment" width={170}>
        {(
          [
            ['left', 'Left', AlignLeft],
            ['center', 'Center', AlignCenter],
            ['right', 'Right', AlignRight],
            ['justify', 'Justify', AlignJustify],
          ] as const
        ).map(([key, label, Icon]) => (
          <MenuItem active={state.align === key} key={key} onClick={() => (editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, key), closeMenu())}>
            <Icon className="h-4 w-4" /> {label}
          </MenuItem>
        ))}
      </Menu>
      <ToolButton active={state.block === 'bullet'} onClick={() => setBlock('bullet')} title="Bulleted list (Ctrl+Shift+8)">
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton active={state.block === 'number'} onClick={() => setBlock('number')} title="Numbered list (Ctrl+Shift+7)">
        <ListOrdered className="h-4 w-4" />
      </ToolButton>
      <ToolButton active={state.block === 'check'} onClick={() => setBlock('check')} title="Checklist">
        <CheckSquare className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)} title="Decrease indent (Shift+Tab)">
        <IndentDecrease className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)} title="Increase indent (Tab)">
        <IndentIncrease className="h-4 w-4" />
      </ToolButton>
      <Divider />

      {/* Insert */}
      <div className="relative">
        <ToolButton active={state.link || !!link} onClick={openLink} title="Link (Ctrl+K)">
          <LinkIcon className="h-4 w-4" />
        </ToolButton>
        {link && (
          <div className="absolute left-0 top-full z-[300] mt-1 flex w-[300px] items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <LinkIcon className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              className="h-7 min-w-0 flex-1 bg-transparent px-1 text-[13px] text-slate-700 outline-none placeholder:text-slate-300"
              onChange={e => setLink({url: e.target.value})}
              onKeyDown={e => {
                if (e.key === 'Enter') applyLink();
                if (e.key === 'Escape') setLink(null);
              }}
              placeholder="Paste or type a link"
              ref={linkInput}
              value={link.url}
            />
            <ToolButton className="text-emerald-600" onClick={applyLink} title="Apply">
              <Check className="h-4 w-4" />
            </ToolButton>
            {state.link && (
              <ToolButton
                className="text-rose-500"
                onClick={() => {
                  setLink(null);
                  editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
                }}
                title="Remove link">
                <X className="h-4 w-4" />
              </ToolButton>
            )}
          </div>
        )}
      </div>
      <Menu button={<Table className="h-4 w-4" />} open={menu === 'table'} setOpen={v => setMenu(v ? 'table' : null)} title="Insert table" width={196}>
        <div className="grid grid-cols-8 gap-[3px] p-1" onMouseLeave={() => setTableHover({r: 3, c: 3})}>
          {Array.from({length: 64}).map((_, i) => {
            const r = Math.floor(i / 8) + 1;
            const c = (i % 8) + 1;
            const on = r <= tableHover.r && c <= tableHover.c;
            return (
              <button
                aria-label={`${r} by ${c}`}
                className={`h-[18px] w-[18px] rounded-[3px] border ${on ? 'border-indigo-400 bg-indigo-100' : 'border-slate-200 bg-white'}`}
                key={i}
                onClick={() => {
                  editor.dispatchCommand(INSERT_TABLE_COMMAND, {rows: String(r), columns: String(c), includeHeaders: {rows: true, columns: false}});
                  closeMenu();
                }}
                onMouseDown={e => e.preventDefault()}
                onMouseEnter={() => setTableHover({r, c})}
                type="button"
              />
            );
          })}
        </div>
        <p className="pb-1 text-center text-[12px] text-slate-500">
          {tableHover.r} × {tableHover.c} table
        </p>
      </Menu>
      <ToolButton onClick={() => imageInput.current?.click()} title="Insert picture">
        <ImagePlus className="h-4 w-4" />
      </ToolButton>
      <input
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async () => {
            const src = await compressImage(reader.result as string);
            editor.update(() => {
              const node = $createImageNode({src, altText: file.name});
              const sel = $getSelection();
              if ($isRangeSelection(sel)) sel.insertNodes([node]);
              else $getRoot().append(node);
            });
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
        ref={imageInput}
        type="file"
      />
      <Menu button={<Plus className="h-4 w-4" />} open={menu === 'insert'} setOpen={v => setMenu(v ? 'insert' : null)} title="Insert" width={210}>
        <MenuItem onClick={() => (editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined), closeMenu())}>
          <SeparatorHorizontal className="h-4 w-4" /> Divider line
        </MenuItem>
        <MenuItem onClick={() => (insertDate(), closeMenu())}>
          <CalendarDays className="h-4 w-4" /> Today&apos;s date
        </MenuItem>
        <MenuItem onClick={() => setBlock('quote')}>
          <ScrollText className="h-4 w-4" /> Quote
        </MenuItem>
        <MenuItem onClick={() => setBlock('code')}>
          <Code className="h-4 w-4" /> Code block
        </MenuItem>
        <MenuItem onClick={() => (insertDrawing(), closeMenu())}>
          <PenLine className="h-4 w-4" /> Drawing canvas
        </MenuItem>
        <p className="px-2.5 pb-1 pt-1.5 text-[11px] text-slate-400">Tip: type “/” on a new line for quick inserts.</p>
      </Menu>

      {/* Right side: find, page view, export */}
      <div className="ml-auto flex items-center gap-0.5">
        <ToolButton active={findOpen} onClick={() => setFindOpen(v => !v)} title="Find & replace (Ctrl+F)">
          <Search className="h-4 w-4" />
        </ToolButton>
        <ToolButton active={pageView} onClick={onTogglePageView} title={pageView ? 'Switch to full-width view' : 'Page view (like a Word page)'}>
          <FileText className="h-4 w-4" />
        </ToolButton>
        <Menu align="right" button={<Download className="h-4 w-4" />} open={menu === 'export'} setOpen={v => setMenu(v ? 'export' : null)} title="Export" width={230}>
          <MenuItem onClick={exportWord}>
            <FileText className="h-4 w-4 text-blue-600" /> Download as Word (.doc)
          </MenuItem>
          <MenuItem onClick={printPdf}>
            <Printer className="h-4 w-4" /> Print or save as PDF
          </MenuItem>
          <MenuItem onClick={() => void copyMarkdown()}>
            <Copy className="h-4 w-4" /> Copy as Markdown
          </MenuItem>
        </Menu>
      </div>

      {findOpen && <FindReplacePanel editor={editor} onClose={() => setFindOpen(false)} />}
      {notice && <div className="pointer-events-none absolute right-4 top-full z-[260] mt-2 rounded-full bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white shadow-lg">{notice}</div>}
    </div>
  );
}
