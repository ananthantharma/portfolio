/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {$createCodeNode} from '@lexical/code';
import {INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {INSERT_HORIZONTAL_RULE_COMMAND} from '@lexical/react/LexicalHorizontalRuleNode';
import {LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {INSERT_TABLE_COMMAND} from '@lexical/table';
import {$createParagraphNode, $getSelection, $isRangeSelection, ElementNode, LexicalEditor} from 'lexical';
import {CalendarDays, CheckSquare, Code, Heading1, Heading2, Heading3, List, ListOrdered, PenLine, ScrollText, SeparatorHorizontal, Table, Type} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import {createPortal} from 'react-dom';

import {$createDrawingNode} from '../DrawingNode';

class SlashOption extends MenuOption {
  title: string;
  hint: string;
  Icon: typeof Type;
  keywords: string[];
  run: (editor: LexicalEditor) => void;
  constructor(title: string, opts: {hint: string; Icon: typeof Type; keywords: string[]; run: (editor: LexicalEditor) => void}) {
    super(title);
    this.title = title;
    this.hint = opts.hint;
    this.Icon = opts.Icon;
    this.keywords = opts.keywords;
    this.run = opts.run;
  }
}

const setBlock = (editor: LexicalEditor, make: () => ElementNode) =>
  editor.update(() => {
    const sel = $getSelection();
    if ($isRangeSelection(sel)) $setBlocksType(sel, make);
  });

/** Type "/" on a line to insert headings, lists, tables and more without the toolbar. */
export default function SlashMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);
  const trigger = useBasicTypeaheadTriggerMatch('/', {minLength: 0});

  const all = useMemo(
    () => [
      new SlashOption('Text', {hint: 'Plain paragraph', Icon: Type, keywords: ['paragraph', 'normal', 'p'], run: e => setBlock(e, () => $createParagraphNode())}),
      new SlashOption('Heading 1', {hint: 'Big section title', Icon: Heading1, keywords: ['h1', 'title'], run: e => setBlock(e, () => $createHeadingNode('h1'))}),
      new SlashOption('Heading 2', {hint: 'Medium heading', Icon: Heading2, keywords: ['h2', 'subtitle'], run: e => setBlock(e, () => $createHeadingNode('h2'))}),
      new SlashOption('Heading 3', {hint: 'Small heading', Icon: Heading3, keywords: ['h3'], run: e => setBlock(e, () => $createHeadingNode('h3'))}),
      new SlashOption('Bulleted list', {hint: 'Simple bullets', Icon: List, keywords: ['bullet', 'ul', 'unordered'], run: e => e.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}),
      new SlashOption('Numbered list', {hint: '1, 2, 3', Icon: ListOrdered, keywords: ['number', 'ol', 'ordered'], run: e => e.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}),
      new SlashOption('Checklist', {hint: 'To-do boxes', Icon: CheckSquare, keywords: ['todo', 'check', 'task'], run: e => e.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)}),
      new SlashOption('Quote', {hint: 'Call out a quote', Icon: ScrollText, keywords: ['blockquote', 'citation'], run: e => setBlock(e, () => $createQuoteNode())}),
      new SlashOption('Code block', {hint: 'Monospace block', Icon: Code, keywords: ['code', 'snippet'], run: e => setBlock(e, () => $createCodeNode())}),
      new SlashOption('Table', {hint: '3 × 3 with header row', Icon: Table, keywords: ['grid', 'table'], run: e => e.dispatchCommand(INSERT_TABLE_COMMAND, {rows: '3', columns: '3', includeHeaders: {rows: true, columns: false}})}),
      new SlashOption('Divider', {hint: 'Horizontal line', Icon: SeparatorHorizontal, keywords: ['hr', 'line', 'separator', 'rule'], run: e => e.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}),
      new SlashOption("Today's date", {hint: new Date().toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}), Icon: CalendarDays, keywords: ['date', 'today', 'now'], run: e => e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) sel.insertText(new Date().toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}));
      })}),
      new SlashOption('Drawing', {hint: 'Sketch canvas', Icon: PenLine, keywords: ['draw', 'sketch', 'canvas'], run: e => e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) sel.insertNodes([$createDrawingNode()]);
      })}),
    ],
    [],
  );

  const options = useMemo(() => {
    const q = (query || '').toLowerCase();
    return q ? all.filter(o => o.title.toLowerCase().includes(q) || o.keywords.some(k => k.includes(q))) : all;
  }, [all, query]);

  return (
    <LexicalTypeaheadMenuPlugin<SlashOption>
      menuRenderFn={(anchorRef, {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex}) =>
        anchorRef.current && options.length
          ? createPortal(
              <div className="mt-6 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                <p className="px-2 pb-1 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Insert</p>
                <div className="max-h-72 overflow-y-auto">
                  {options.map((o, i) => (
                    <button
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left ${selectedIndex === i ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                      key={o.key}
                      onClick={() => selectOptionAndCleanUp(o)}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      ref={el => o.setRefElement(el)}
                      type="button">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${selectedIndex === i ? 'border-indigo-200 bg-white text-indigo-600' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                        <o.Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-slate-800">{o.title}</span>
                        <span className="block truncate text-[11.5px] text-slate-400">{o.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>,
              anchorRef.current,
            )
          : null
      }
      onQueryChange={setQuery}
      onSelectOption={(option, textNode, closeMenu) => {
        editor.update(() => textNode?.remove());
        option.run(editor);
        closeMenu();
      }}
      options={options}
      triggerFn={trigger}
    />
  );
}
