/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
import {CodeHighlightNode,CodeNode} from '@lexical/code';
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {AutoLinkNode, LinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {TRANSFORMERS} from '@lexical/markdown';
import {AutoLinkPlugin, createLinkMatcherWithRegExp} from '@lexical/react/LexicalAutoLinkPlugin';
import {CheckListPlugin} from '@lexical/react/LexicalCheckListPlugin';
import {ClickableLinkPlugin} from '@lexical/react/LexicalClickableLinkPlugin';
// Lexical Core
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {HorizontalRulePlugin} from '@lexical/react/LexicalHorizontalRulePlugin';
import {LinkPlugin} from '@lexical/react/LexicalLinkPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {TabIndentationPlugin} from '@lexical/react/LexicalTabIndentationPlugin';
import {TableOfContentsPlugin} from '@lexical/react/LexicalTableOfContentsPlugin';
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
// Lexical Nodes & Commands
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {TableCellNode, TableNode, TableRowNode} from '@lexical/table';
import {$createParagraphNode, $createTextNode, $getRoot, $getSelection, $isElementNode, $isRangeSelection, COMMAND_PRIORITY_LOW, PASTE_COMMAND} from 'lexical';
import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';

import {DrawingNode} from './DrawingNode';
import EditorToolbar from './editor/EditorToolbar';
import FloatingFormatBar from './editor/FloatingFormatBar';
import SlashMenuPlugin from './editor/SlashMenuPlugin';
import {buildStyleImportMap} from './editor/styleImport';
import {ImageNode} from './ImageNode';
import {ImagePastePlugin} from './ImagePastePlugin';
import {TableActionsPlugin} from './TableActionsPlugin';

const URL_REGEX =
  /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/;

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, text => (text.startsWith('http') ? text : `https://${text}`)),
  createLinkMatcherWithRegExp(EMAIL_REGEX, text => `mailto:${text}`),
];

export interface RichTextEditorProps {
  onChange: (value: string, delta: any, source: string, editor: any) => void;
  onBlur?: () => void;
  placeholder?: string;
  value: string;
  /** Used for exported file names */
  title?: string;
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
      ignoreSelectionChange
      onChange={(editorState, latestEditor) => {
        editorState.read(() => {
          const html = $generateHtmlFromNodes(latestEditor, null);
          if (html !== lastUpdateValue.current) {
            lastUpdateValue.current = html;
            onChange(html, null, 'user', latestEditor);
          }
        });
      }}
    />
  );
}

function CustomPlaceholder({placeholder, pageView}: {placeholder?: string; pageView: boolean}) {
  return (
    <div className={`pointer-events-none absolute select-none text-slate-300 ${pageView ? 'left-[72px] top-[72px]' : 'left-8 top-10 md:left-16'}`} style={{fontSize: '17px'}}>
      {placeholder || 'Start typing, or press “/” for headings, lists, tables…'}
    </div>
  );
}

/** Live word / character count from the editor itself (not the saved HTML). */
function StatsPlugin() {
  const [editor] = useLexicalComposerContext();
  const [stats, setStats] = useState({words: 0, chars: 0});
  useEffect(() => {
    const read = () =>
      editor.getEditorState().read(() => {
        const text = $getRoot().getTextContent();
        setStats({words: (text.match(/\S+/g) || []).length, chars: text.replace(/\s/g, '').length});
      });
    read();
    return editor.registerUpdateListener(read);
  }, [editor]);
  return (
    <div className="pointer-events-none absolute bottom-3 right-6 z-[50] flex select-none items-center gap-3 rounded-full border border-black/[0.04] bg-white/80 px-3.5 py-1 text-[10.5px] font-medium text-slate-400 shadow-sm backdrop-blur">
      <span><b className="font-semibold text-slate-600">{stats.words.toLocaleString()}</b> words</span>
      <span className="h-3 w-px bg-slate-200" />
      <span><b className="font-semibold text-slate-600">{stats.chars.toLocaleString()}</b> characters</span>
      <span className="h-3 w-px bg-slate-200" />
      <span><b className="font-semibold text-slate-600">{Math.max(1, Math.ceil(stats.words / 220))}</b> min read</span>
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
  forwardRef<any, RichTextEditorProps>(({onChange, onBlur, placeholder, value, title}, ref) => {
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
        HorizontalRuleNode,
      ],
      // Keep colours, highlights, fonts and sizes when a saved note is opened again
      html: {import: buildStyleImportMap()},
      theme: {
        paragraph: 'mb-3',
        heading: {
          h1: 'text-3xl font-bold mb-4 mt-2 tracking-tight text-gray-900',
          h2: 'text-2xl font-semibold mb-3 mt-4 tracking-tight text-gray-800',
          h3: 'text-xl font-semibold mb-2 mt-4 text-gray-700',
        },
        quote: 'lex-quote',
        code: 'lex-code-block',
        hr: 'lex-hr',
        list: {
          ul: 'list-disc pl-6 mb-3',
          ol: 'list-decimal pl-6 mb-3',
          listitem: 'mb-1',
          listitemChecked: 'lex-check lex-check-on',
          listitemUnchecked: 'lex-check',
          checklist: 'lex-checklist',
          nested: {listitem: 'lex-nested-item'},
        },
        text: {
          bold: 'font-bold text-slate-900',
          italic: 'italic',
          underline: 'underline underline-offset-4 decoration-indigo-200/50',
          strikethrough: 'line-through text-slate-400',
          underlineStrikethrough: 'underline line-through underline-offset-4 decoration-indigo-200/50',
          code: 'lex-inline-code',
          superscript: 'lex-sup',
          subscript: 'lex-sub',
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
    const [pageView, setPageView] = useState(false);
    useEffect(() => {
      try {
        setPageView(localStorage.getItem('NOTE_EDITOR_PAGE_VIEW') === 'true');
      } catch {
        // storage unavailable
      }
    }, []);
    const togglePageView = () =>
      setPageView(v => {
        try {
          localStorage.setItem('NOTE_EDITOR_PAGE_VIEW', String(!v));
        } catch {
          // storage unavailable
        }
        return !v;
      });
    const getHtml = () => {
      const editor = lexicalEditorRef.current;
      if (!editor) return value || '';
      let html = '';
      editor.getEditorState().read(() => {
        html = $generateHtmlFromNodes(editor, null);
      });
      return html;
    };

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
      <div className="relative flex h-full flex-col bg-white selection:bg-indigo-100/70">
        <LexicalComposer initialConfig={editorConfig}>
          <div className="relative flex h-full flex-col">
            {/* Sticky toolbar */}
            <div className="sticky top-0 z-[100] w-full border-b border-slate-200/70 bg-white/90 px-3 py-1.5 backdrop-blur-md md:px-5">
              <EditorToolbar getHtml={getHtml} onTogglePageView={togglePageView} pageView={pageView} title={title} />
            </div>

            <div className={`relative flex-1 overflow-y-auto ${pageView ? 'bg-slate-100/80 px-4 py-8' : ''}`}>
              <div className={pageView ? 'relative mx-auto min-h-[1056px] max-w-[816px] rounded-sm bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08),0_8px_30px_-12px_rgba(15,23,42,0.18)]' : 'relative min-h-full'}>
                <RichTextPlugin
                  ErrorBoundary={LexicalErrorBoundary}
                  contentEditable={
                    <ContentEditable
                      className={`lex-content w-full font-sans text-[17px] leading-[1.8] text-slate-800 outline-none ${pageView ? 'min-h-[1056px] px-[72px] py-[72px]' : 'min-h-full px-8 pb-32 pt-10 md:px-16'}`}
                      onBlur={onBlur}
                    />
                  }
                  placeholder={<CustomPlaceholder pageView={pageView} placeholder={placeholder} />}
                />
              </div>
            </div>
            <HistoryPlugin />
            <ListPlugin />
            <CheckListPlugin />
            <TablePlugin hasCellBackgroundColor hasCellMerge hasHorizontalScroll />
            <TableActionsPlugin />
            <LinkPlugin />
            <ClickableLinkPlugin newTab />
            <AutoLinkPlugin matchers={MATCHERS} />
            <LinkPastePlugin />
            <TabIndentationPlugin />
            <HorizontalRulePlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <TableOfContentsPlugin>{() => <></>}</TableOfContentsPlugin>
            <SlashMenuPlugin />
            <FloatingFormatBar />
            <ValueSyncPlugin onChange={onChange} value={value} />
            <ImagePastePlugin />
            <EditorRefPlugin editorRef={lexicalEditorRef} />
            <StatsPlugin />
          </div>
        </LexicalComposer>
      </div>
    );
  }),
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
