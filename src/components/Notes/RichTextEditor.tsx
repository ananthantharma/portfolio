import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Lexical Core
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';

// Lexical Nodes & Commands
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { TRANSFORMERS } from '@lexical/markdown';

import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { AutoLinkPlugin, createLinkMatcherWithRegExp } from '@lexical/react/LexicalAutoLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TableOfContentsPlugin } from '@lexical/react/LexicalTableOfContentsPlugin';

const URL_REGEX =
  /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/;

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, (text) => {
    return text.startsWith('http') ? text : `https://${text}`;
  }),
  createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => {
    return `mailto:${text}`;
  }),
];
import {
  $getRoot,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import { $createHeadingNode } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { $setBlocksType } from '@lexical/selection';

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
  Undo,
  Redo,
  Type,
} from 'lucide-react';

export interface RichTextEditorProps {
  onChange: (value: string, delta: any, source: string, editor: any) => void;
  onBlur?: () => void;
  placeholder?: string;
  value: string;
}

// Custom Toolbar Plugin
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

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

  const formatBulletList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const formatNumberedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-white">
      {/* Undo/Redo */}
      <button
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Undo">
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Redo">
        <Redo className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1 border-none" />

      {/* Headings */}
      <div className="relative group">
        <button className="flex items-center gap-1 p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900">
          <Type className="w-4 h-4" />
        </button>
        <div className="absolute top-full left-0 hidden group-hover:flex flex-col bg-white border border-gray-200 shadow-lg rounded-md z-10 p-1 w-24">
          <button onClick={() => formatHeading('h1')} className="px-3 py-1 text-left text-sm hover:bg-gray-50 rounded">
            Heading 1
          </button>
          <button onClick={() => formatHeading('h2')} className="px-3 py-1 text-left text-sm hover:bg-gray-50 rounded">
            Heading 2
          </button>
          <button onClick={() => formatHeading('h3')} className="px-3 py-1 text-left text-sm hover:bg-gray-50 rounded">
            Heading 3
          </button>
        </div>
      </div>

      <div className="w-px h-4 bg-gray-200 mx-1 border-none" />

      {/* Text Format */}
      <button
        onClick={() => formatText('bold')}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Bold">
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => formatText('italic')}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Italic">
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => formatText('underline')}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Underline">
        <Underline className="w-4 h-4" />
      </button>
      <button
        onClick={() => formatText('strikethrough')}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Strikethrough">
        <Strikethrough className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1 border-none" />

      {/* Alignment */}
      <button
        onClick={() => formatAlign('left')}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Align Left">
        <AlignLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => formatAlign('center')}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Align Center">
        <AlignCenter className="w-4 h-4" />
      </button>
      <button
        onClick={() => formatAlign('right')}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Align Right">
        <AlignRight className="w-4 h-4" />
      </button>
      <button
        onClick={() => formatAlign('justify')}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Justify">
        <AlignJustify className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1 border-none" />

      {/* Lists */}
      <button
        onClick={formatBulletList}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Bullet List">
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={formatNumberedList}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
        title="Numbered List">
        <ListOrdered className="w-4 h-4" />
      </button>
    </div>
  );
}

// Logic Plugin for State Sync
function ValueSyncPlugin({ value, onChange }: { value: string; onChange: any }) {
  const [editor] = useLexicalComposerContext();
  const lastUpdateValue = useRef('');
  const isInitializing = useRef(true);

  // Sync prop changes -> editor
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

  // Sync editor changes -> prop
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

function CustomPlaceholder({ placeholder }: { placeholder?: string }) {
  return (
    <div className="absolute top-[24px] left-[32px] text-gray-400 pointer-events-none" style={{ fontSize: '15px' }}>
      {placeholder || 'Start typing...'}
    </div>
  );
}

const RichTextEditor = React.memo(
  forwardRef<any, RichTextEditorProps>(({ onChange, onBlur, placeholder, value }, ref) => {
    const editorConfig = {
      namespace: 'NotesEditor',
      nodes: [
        HeadingNode,
        QuoteNode,
        ListItemNode,
        ListNode,
        LinkNode,
        AutoLinkNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        CodeNode,
        CodeHighlightNode
      ],
      // Adding basic themes to match our Tailwind / old Quill styling inside the content editable area
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
          bold: 'font-bold',
          italic: 'italic',
          underline: 'underline',
          strikethrough: 'line-through',
          underlineStrikethrough: 'underline line-through',
        },
      },
      onError(error: Error) {
        console.error('Lexical Error:', error);
      },
    };

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => null, // Deprecated for external use, returning null
      }),
      [],
    );

    return (
      <div className="h-full flex flex-col relative bg-white border-transparent">
        <LexicalComposer initialConfig={editorConfig}>
          <div className="flex flex-col h-full">
            <ToolbarPlugin />

            <div className="relative flex-1 overflow-hidden">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    onBlur={onBlur}
                    className="h-full overflow-y-auto w-full outline-none px-8 py-6 text-[15px] leading-relaxed text-gray-700"
                  />
                }
                placeholder={<CustomPlaceholder placeholder={placeholder} />}
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <ListPlugin />
              <CheckListPlugin />
              <TablePlugin />
              <LinkPlugin />
              <AutoLinkPlugin matchers={MATCHERS} />
              <TabIndentationPlugin />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
              <TableOfContentsPlugin>
                {() => <></>}
              </TableOfContentsPlugin>
              <ValueSyncPlugin value={value} onChange={onChange} />
            </div>
          </div>
        </LexicalComposer>
      </div>
    );
  }),
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
