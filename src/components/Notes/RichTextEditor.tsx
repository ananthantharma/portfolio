import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';

// Lexical Core
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {ClickableLinkPlugin} from '@lexical/react/LexicalClickableLinkPlugin';

// Lexical Nodes & Commands
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {CodeNode, CodeHighlightNode} from '@lexical/code';
import {ListItemNode, ListNode} from '@lexical/list';
import {LinkNode, AutoLinkNode, $isLinkNode} from '@lexical/link';
import {TableNode, TableCellNode, TableRowNode} from '@lexical/table';
import {ImageNode, $createImageNode} from './ImageNode';
import {DrawingNode, $createDrawingNode} from './DrawingNode';
import {ImagePastePlugin} from './ImagePastePlugin';
import {TableActionsPlugin} from './TableActionsPlugin';
import {TRANSFORMERS} from '@lexical/markdown';

import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import {CheckListPlugin} from '@lexical/react/LexicalCheckListPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {LinkPlugin} from '@lexical/react/LexicalLinkPlugin';
import {TabIndentationPlugin} from '@lexical/react/LexicalTabIndentationPlugin';
import {AutoLinkPlugin, createLinkMatcherWithRegExp} from '@lexical/react/LexicalAutoLinkPlugin';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import {TableOfContentsPlugin} from '@lexical/react/LexicalTableOfContentsPlugin';

const URL_REGEX =
  /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/;

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, text => (text.startsWith('http') ? text : `https://${text}`)),
  createLinkMatcherWithRegExp(EMAIL_REGEX, text => `mailto:${text}`),
];

import {
  $getRoot,
  $isElementNode,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  PASTE_COMMAND,
} from 'lexical';
import {$createHeadingNode} from '@lexical/rich-text';
import {INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, INSERT_CHECK_LIST_COMMAND} from '@lexical/list';
import {INSERT_TABLE_COMMAND} from '@lexical/table';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {$createCodeNode} from '@lexical/code';
import {$setBlocksType, $patchStyleText} from '@lexical/selection';

// UI components for Toolbar
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Undo,
  Redo,
  Type,
  Code,
  Link as LinkIcon,
  Table,
  Baseline,
  PaintBucket,
  ImagePlus,
  PenLine,
  X,
  Check,
} from 'lucide-react';

export interface RichTextEditorProps {
  onChange: (value: string, delta: any, source: string, editor: any) => void;
  onBlur?: () => void;
  placeholder?: string;
  value: string;
}

// ── LinkPastePlugin: ensures pasted plain-text URLs become clickable links ────
function LinkPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      event => {
        const clipboardEvent = event as ClipboardEvent;
        const data = clipboardEvent.clipboardData;
        if (!data) return false;

        // Only intercept plain-text pastes (no HTML or files in clipboard)
        const html = data.getData('text/html');
        if (html) return false; // Let the default HTML paste handle it

        const text = data.getData('text/plain').trim();
        if (!text) return false;

        // Check if the entire pasted text is a single URL
        const fullUrlRegex = /^(https?:\/\/|www\.)[^\s]+$/i;
        if (!fullUrlRegex.test(text)) return false;

        // It's a bare URL — insert as a link node
        event.preventDefault();
        const url = text.startsWith('http') ? text : `https://${text}`;
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}

// ── Custom Toolbar Plugin ─────────────────────────────────────────────────────
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [linkPopover, setLinkPopover] = useState<{open: boolean; url: string} | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatAlign = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  const formatHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize));
      }
    });
  };

  const formatBulletList = () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  const formatNumberedList = () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  const formatCheckList = () => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);

  const formatCodeBlock = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createCodeNode());
    });
  };

  const openLinkPopover = () => {
    // Read current link URL if cursor is inside an existing link
    editor.read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodes = selection.getNodes();
        for (const node of nodes) {
          const parent = node.getParent();
          if ($isLinkNode(parent)) {
            setLinkPopover({open: true, url: parent.getURL()});
            return;
          }
          if ($isLinkNode(node)) {
            setLinkPopover({open: true, url: (node as any).getURL?.() ?? ''});
            return;
          }
        }
      }
      setLinkPopover({open: true, url: ''});
    });
  };

  const submitLink = (url: string) => {
    setLinkPopover(null);
    const trimmed = url.trim();
    if (!trimmed) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      return;
    }
    const finalUrl = trimmed.startsWith('http') || trimmed.startsWith('mailto:') ? trimmed : `https://${trimmed}`;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, finalUrl);
  };

  // Close popover on outside click
  useEffect(() => {
    if (!linkPopover) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest('[data-link-popover]')) setLinkPopover(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [linkPopover]);

  // Auto-focus the link input
  useEffect(() => {
    if (linkPopover && linkInputRef.current) {
      setTimeout(() => linkInputRef.current?.focus(), 50);
    }
  }, [linkPopover]);

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {columns: '3', rows: '3', includeHeaders: false});
  };

  const insertDrawing = () => {
    editor.update(() => {
      const sel = $getSelection();
      const node = $createDrawingNode();
      if ($isRangeSelection(sel)) {
        sel.insertNodes([node]);
      } else {
        const root = $getRoot();
        const para = $createParagraphNode();
        root.append(para);
        para.insertAfter(node);
      }
    });
  };

  const applyTextColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) $patchStyleText(selection, {color});
    });
  };

  const applyHighlight = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) $patchStyleText(selection, {'background-color': color});
    });
  };

  const textColors = [
    '#000000', '#374151', '#6B7280', '#EF4444', '#F97316',
    '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
    '#DC2626', '#D97706', '#15803D', '#1D4ED8', '#7C3AED', '#ffffff',
  ];
  const highlightColors = [
    '#FEF08A', '#BEF264', '#6EE7B7', '#93C5FD', '#F9A8D4',
    '#FCA5A5', '#FCD34D', '#A5F3FC', '#C4B5FD', '#FDE68A', 'transparent',
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {/* Undo/Redo */}
      <button onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Undo">
        <Undo className="w-4 h-4" />
      </button>
      <button onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Redo">
        <Redo className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Headings */}
      <div className="relative group">
        <button className="flex items-center gap-1 p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900">
          <Type className="w-4 h-4" />
        </button>
        <div className="absolute top-full left-0 hidden group-hover:flex flex-col bg-white border border-gray-200 shadow-lg rounded-md z-10 p-1 w-24">
          <button onClick={() => formatHeading('h1')} className="px-3 py-1 text-left text-sm hover:bg-gray-50 rounded">Heading 1</button>
          <button onClick={() => formatHeading('h2')} className="px-3 py-1 text-left text-sm hover:bg-gray-50 rounded">Heading 2</button>
          <button onClick={() => formatHeading('h3')} className="px-3 py-1 text-left text-sm hover:bg-gray-50 rounded">Heading 3</button>
        </div>
      </div>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Text Format */}
      <button onClick={() => formatText('bold')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Bold"><Bold className="w-4 h-4" /></button>
      <button onClick={() => formatText('italic')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Italic"><Italic className="w-4 h-4" /></button>
      <button onClick={() => formatText('underline')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Underline"><Underline className="w-4 h-4" /></button>
      <button onClick={() => formatText('strikethrough')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>

      {/* Text Color */}
      <div className="relative group">
        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Text Color">
          <Baseline className="w-4 h-4" />
        </button>
        <div className="absolute top-full left-0 hidden group-hover:grid grid-cols-4 gap-1 bg-white border border-gray-200 shadow-lg rounded-md z-20 p-2" style={{width: '108px'}}>
          {textColors.map(c => (
            <button key={c} onClick={() => applyTextColor(c)}
              style={{backgroundColor: c, border: c === '#ffffff' ? '1px solid #e5e7eb' : 'none'}}
              className="w-6 h-6 rounded-sm hover:scale-110 transition-transform" title={c} />
          ))}
        </div>
      </div>

      {/* Highlight */}
      <div className="relative group">
        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Highlight">
          <PaintBucket className="w-4 h-4" />
        </button>
        <div className="absolute top-full left-0 hidden group-hover:grid grid-cols-4 gap-1 bg-white border border-gray-200 shadow-lg rounded-md z-20 p-2" style={{width: '108px'}}>
          {highlightColors.map(c => (
            <button key={c} onClick={() => applyHighlight(c === 'transparent' ? '' : c)}
              style={{backgroundColor: c === 'transparent' ? '#fff' : c, border: '1px solid #e5e7eb'}}
              className="w-6 h-6 rounded-sm hover:scale-110 transition-transform text-xs" title={c === 'transparent' ? 'Remove' : c}>
              {c === 'transparent' ? '✕' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Alignment */}
      <button onClick={() => formatAlign('left')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Align Left"><AlignLeft className="w-4 h-4" /></button>
      <button onClick={() => formatAlign('center')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Align Center"><AlignCenter className="w-4 h-4" /></button>
      <button onClick={() => formatAlign('right')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Align Right"><AlignRight className="w-4 h-4" /></button>
      <button onClick={() => formatAlign('justify')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Justify"><AlignJustify className="w-4 h-4" /></button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Lists */}
      <button onClick={formatBulletList} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Bullet List"><List className="w-4 h-4" /></button>
      <button onClick={formatNumberedList} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
      <button onClick={formatCheckList} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Check List"><CheckSquare className="w-4 h-4" /></button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Code */}
      <button onClick={formatCodeBlock} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Code Block"><Code className="w-4 h-4" /></button>

      {/* Link — with inline popover */}
      <div className="relative">
        <button
          ref={linkBtnRef}
          onClick={openLinkPopover}
          className={`p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 ${linkPopover ? 'bg-blue-50 text-blue-600' : ''}`}
          title="Insert / Edit Link (Ctrl+K)">
          <LinkIcon className="w-4 h-4" />
        </button>

        {linkPopover && (
          <div
            data-link-popover="true"
            className="absolute top-full left-0 mt-1 z-50 flex items-center gap-1 bg-white border border-slate-200 shadow-xl rounded-lg px-2 py-1.5"
            style={{minWidth: 280}}>
            <LinkIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              ref={linkInputRef}
              type="url"
              placeholder="https://example.com"
              value={linkPopover.url}
              onChange={e => setLinkPopover({...linkPopover, url: e.target.value})}
              onKeyDown={e => {
                if (e.key === 'Enter') submitLink(linkPopover.url);
                if (e.key === 'Escape') setLinkPopover(null);
              }}
              className="flex-1 text-[12px] text-slate-700 outline-none bg-transparent placeholder-slate-300"
            />
            <button
              onMouseDown={e => { e.preventDefault(); submitLink(linkPopover.url); }}
              className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Apply link">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={e => { e.preventDefault(); setLinkPopover(null); }}
              className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500" title="Cancel">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <button onClick={insertTable} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Insert Table"><Table className="w-4 h-4" /></button>

      {/* Drawing Canvas */}
      <button onClick={insertDrawing} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="Insert Drawing Canvas">
        <PenLine className="w-4 h-4" />
      </button>

      {/* Insert Image from file */}
      <label className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer" title="Insert Image">
        <ImagePlus className="w-4 h-4" />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const src = reader.result as string;
              editor.update(() => {
                const node = $createImageNode({src, altText: file.name});
                const sel = $getSelection();
                if ($isRangeSelection(sel)) sel.insertNodes([node]);
              });
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

// ── Logic Plugin for State Sync ───────────────────────────────────────────────
function ValueSyncPlugin({value, onChange}: {value: string; onChange: any}) {
  const [editor] = useLexicalComposerContext();
  const lastUpdateValue = useRef('');
  const isInitializing = useRef(true);

  useEffect(() => {
    if (value !== lastUpdateValue.current || isInitializing.current) {
      isInitializing.current = false;
      editor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(value, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        $getRoot().clear();
        $getRoot().append(...nodes);
      });
      lastUpdateValue.current = value;
    }
  }, [editor, value]);

  return (
    <OnChangePlugin
      onChange={(editorState, latestEditor) => {
        editorState.read(() => {
          const html = $generateHtmlFromNodes(latestEditor, null);
          if (html !== lastUpdateValue.current) {
            lastUpdateValue.current = html;
            onChange(html, null, 'user', latestEditor);
          }
        });
      }}
      ignoreSelectionChange
    />
  );
}

function CustomPlaceholder({placeholder}: {placeholder?: string}) {
  return (
    <div
      className="absolute top-[42px] left-[32px] md:left-[48px] text-slate-300 pointer-events-none select-none"
      style={{fontSize: '16px'}}>
      {placeholder || 'Start typing something beautiful...'}
    </div>
  );
}

function EditorRefPlugin({editorRef}: {editorRef: React.MutableRefObject<any>}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => { editorRef.current = editor; }, [editor, editorRef]);
  return null;
}

// ── Main Editor Component ─────────────────────────────────────────────────────

const RichTextEditor = React.memo(
  forwardRef<any, RichTextEditorProps>(({onChange, onBlur, placeholder, value}, ref) => {
    const editorConfig = {
      namespace: 'NotesEditor',
      nodes: [
        HeadingNode,
        QuoteNode,
        ListItemNode,
        ListNode,
        LinkNode,
        AutoLinkNode,
        ImageNode,
        DrawingNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        CodeNode,
        CodeHighlightNode,
      ],
      theme: {
        paragraph: 'mb-3',
        heading: {
          h1: 'text-3xl font-bold mb-4 mt-2 tracking-tight text-gray-900',
          h2: 'text-2xl font-semibold mb-3 mt-4 tracking-tight text-gray-800',
          h3: 'text-xl font-semibold mb-2 mt-4 text-gray-700',
        },
        list: {
          ul: 'list-disc pl-6 mb-3',
          ol: 'list-decimal pl-6 mb-3',
          listitem: 'mb-1',
        },
        text: {
          bold: 'font-bold text-slate-900',
          italic: 'italic',
          underline: 'underline underline-offset-4 decoration-indigo-200/50',
          strikethrough: 'line-through text-slate-400',
          underlineStrikethrough: 'underline line-through underline-offset-4 decoration-indigo-200/50',
        },
        link: 'lexical-link',
        table: 'lexical-table',
        tableRow: 'lexical-table-row',
        tableCell: 'lexical-table-cell',
        tableCellHeader: 'lexical-table-cell lexical-table-cell-header',
      },
      onError(error: Error) {
        console.error('Lexical Error:', error);
      },
    };

    const lexicalEditorRef = useRef<any>(null);

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => lexicalEditorRef.current,
        insertText: (text: string) => {
          const editor = lexicalEditorRef.current;
          if (!editor) return;
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.insertText(text);
            } else {
              const root = $getRoot();
              const lastChild = root.getLastChild();
              if (lastChild && $isElementNode(lastChild)) {
                lastChild.append($createTextNode(text));
              } else {
                const para = $createParagraphNode();
                para.append($createTextNode(text));
                root.append(para);
              }
            }
          });
        },
        appendHtml: (html: string) => {
          const editor = lexicalEditorRef.current;
          if (!editor) return;
          editor.update(() => {
            const parser = new DOMParser();
            const dom = parser.parseFromString(html, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            const root = $getRoot();
            nodes.forEach(node => {
              if ($isElementNode(node)) {
                root.append(node);
              } else {
                const para = $createParagraphNode();
                para.append(node);
                root.append(para);
              }
            });
          });
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    return (
      <div className="h-full flex flex-col relative bg-white selection:bg-indigo-50/70">
        <LexicalComposer initialConfig={editorConfig}>
          <div className="flex flex-col h-full relative">
            {/* Sticky Toolbar */}
            <div className="sticky top-0 z-[100] w-full bg-white/80 backdrop-blur-md border-b border-black/[0.03] px-6 py-2 transition-all duration-300">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <ToolbarPlugin />
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    onBlur={onBlur}
                    className="h-full overflow-y-auto w-full outline-none px-8 md:px-16 pt-12 pb-32 text-[17px] leading-[1.8] text-slate-800 font-sans"
                  />
                }
                placeholder={<CustomPlaceholder placeholder={placeholder} />}
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <ListPlugin />
              <CheckListPlugin />
              <TablePlugin hasCellMerge hasCellBackgroundColor hasHorizontalScroll />
              <TableActionsPlugin />
              <LinkPlugin />
              <ClickableLinkPlugin newTab />
              <AutoLinkPlugin matchers={MATCHERS} />
              <LinkPastePlugin />
              <TabIndentationPlugin />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
              <TableOfContentsPlugin>{() => <></>}</TableOfContentsPlugin>
              <ValueSyncPlugin value={value} onChange={onChange} />
              <ImagePastePlugin />
              <EditorRefPlugin editorRef={lexicalEditorRef} />
            </div>

            {/* Stats bar */}
            <div className="absolute bottom-4 right-8 z-[50] flex items-center gap-4 px-4 py-1.5 rounded-full bg-slate-50/50 backdrop-blur-sm border border-black/[0.03] text-[10px] font-medium text-slate-400 select-none">
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-600">{(value || '').replace(/<[^>]*>/g, '').length}</span>
                <span>CHARS</span>
              </div>
              <div className="w-[1px] h-3 bg-slate-200" />
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-600">
                  {Math.max(1, Math.ceil((value || '').replace(/<[^>]*>/g, '').split(/\s+/).length / 200))}
                </span>
                <span>MIN READ</span>
              </div>
            </div>
          </div>
        </LexicalComposer>
      </div>
    );
  }),
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
