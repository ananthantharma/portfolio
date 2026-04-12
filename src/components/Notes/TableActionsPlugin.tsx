'use client';
/**
 * TableActionsPlugin
 *
 * Two features in one plugin:
 * 1. Column resize — drag the right border of any table cell to resize the column.
 * 2. Floating table toolbar — appears when the cursor is inside a table, with
 *    buttons to add/remove rows and columns.
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getNearestNodeFromDOMNode, $getNodeByKey} from 'lexical';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
} from '@lexical/table';

const MIN_COL_WIDTH = 60;
const RESIZE_ZONE = 6; // px from right border that triggers resize

// ─── Column Resizer ───────────────────────────────────────────────────────────

function useColumnResizer(editor: ReturnType<typeof useLexicalComposerContext>[0]) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const colIndex = useRef(-1);
  const domTable = useRef<HTMLTableElement | null>(null);
  const tableKey = useRef<string | null>(null);

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;

    function nearRightEdge(cell: HTMLTableCellElement, clientX: number) {
      const r = cell.getBoundingClientRect();
      return clientX >= r.right - RESIZE_ZONE && clientX <= r.right + RESIZE_ZONE;
    }

    function getCellEl(target: EventTarget | null): HTMLTableCellElement | null {
      let el = target as HTMLElement | null;
      while (el && el !== root) {
        if (el.tagName === 'TD' || el.tagName === 'TH') return el as HTMLTableCellElement;
        el = el.parentElement;
      }
      return null;
    }

    const onMouseMove = (e: MouseEvent) => {
      if (dragging.current) return;
      const cell = getCellEl(e.target);
      root.style.cursor = cell && nearRightEdge(cell, e.clientX) ? 'col-resize' : '';
    };

    const onMouseDown = (e: MouseEvent) => {
      const cell = getCellEl(e.target);
      if (!cell || !nearRightEdge(cell, e.clientX)) return;
      e.preventDefault();
      e.stopPropagation();

      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = cell.getBoundingClientRect().width;
      colIndex.current = cell.cellIndex;
      domTable.current = cell.closest('table') as HTMLTableElement;

      editor.read(() => {
        try {
          const node = $getNearestNodeFromDOMNode(cell);
          if (!$isTableCellNode(node)) return;
          let p = node.getParent();
          while (p && !$isTableNode(p)) p = p.getParent();
          if (p && $isTableNode(p)) tableKey.current = p.getKey();
        } catch {
          // ignore
        }
      });

      document.addEventListener('mousemove', onDocMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onDocMove = (e: MouseEvent) => {
      if (!dragging.current || !domTable.current) return;
      const newW = Math.max(MIN_COL_WIDTH, startWidth.current + (e.clientX - startX.current));
      const col = colIndex.current;
      for (const row of Array.from(domTable.current.rows)) {
        const c = row.cells[col];
        if (c) {
          c.style.width = `${newW}px`;
          c.style.minWidth = `${newW}px`;
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newW = Math.max(MIN_COL_WIDTH, startWidth.current + (e.clientX - startX.current));
      dragging.current = false;
      root.style.cursor = '';
      document.removeEventListener('mousemove', onDocMove);
      document.removeEventListener('mouseup', onMouseUp);

      // Persist widths back into Lexical nodes
      if (tableKey.current) {
        const col = colIndex.current;
        editor.update(() => {
          try {
            const tableNode = $getNodeByKey(tableKey.current!);
            if (!tableNode || !$isTableNode(tableNode)) return;
            for (const row of tableNode.getChildren()) {
              if (!$isTableRowNode(row)) continue;
              const cell = row.getChildren()[col];
              if (cell && $isTableCellNode(cell)) {
                cell.getWritable().setWidth(newW);
              }
            }
          } catch {
            // ignore
          }
        });
      }
    };

    root.addEventListener('mousemove', onMouseMove);
    root.addEventListener('mousedown', onMouseDown);

    return () => {
      root.removeEventListener('mousemove', onMouseMove);
      root.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onDocMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [editor]);
}

// ─── Floating Table Toolbar ───────────────────────────────────────────────────

interface ToolbarPos {
  top: number;
  left: number;
}

function TableFloatingToolbar({
  pos,
  onClose,
}: {
  pos: ToolbarPos;
  onClose: () => void;
}) {
  const [editor] = useLexicalComposerContext();

  const btn = (label: string, title: string, onClick: () => void) => (
    <button
      key={label}
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        onClick();
        onClose();
      }}
      className="px-2 py-1 text-[11px] font-medium text-slate-600 rounded hover:bg-slate-100 whitespace-nowrap transition-colors">
      {label}
    </button>
  );

  const dispatch = (fn: () => void) =>
    editor.update(fn, {discrete: true});

  return (
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
      }}
      className="flex items-center gap-0.5 px-1 py-1 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 select-none">
      {btn('+Row ↑', 'Insert row above', () => dispatch(() => $insertTableRowAtSelection(false)))}
      {btn('+Row ↓', 'Insert row below', () => dispatch(() => $insertTableRowAtSelection(true)))}
      <div className="w-px h-4 bg-slate-200" />
      {btn('+Col ←', 'Insert column left', () => dispatch(() => $insertTableColumnAtSelection(false)))}
      {btn('+Col →', 'Insert column right', () => dispatch(() => $insertTableColumnAtSelection(true)))}
      <div className="w-px h-4 bg-slate-200" />
      {btn('−Row', 'Delete row', () => dispatch(() => $deleteTableRowAtSelection()))}
      {btn('−Col', 'Delete column', () => dispatch(() => $deleteTableColumnAtSelection()))}
    </div>
  );
}

// ─── Main Plugin ──────────────────────────────────────────────────────────────

export function TableActionsPlugin(): React.ReactPortal | null {
  const [editor] = useLexicalComposerContext();
  const [toolbarPos, setToolbarPos] = useState<ToolbarPos | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useColumnResizer(editor);

  const updateToolbarPosition = useCallback(() => {
    const root = editor.getRootElement();
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setToolbarPos(null); return; }
    const range = sel.getRangeAt(0);
    let el = range.commonAncestorContainer as HTMLElement;
    if (el.nodeType === Node.TEXT_NODE) el = el.parentElement!;

    // Walk up to find a table
    let cell: HTMLTableCellElement | null = null;
    let cursor: HTMLElement | null = el;
    while (cursor && cursor !== root) {
      if (cursor.tagName === 'TD' || cursor.tagName === 'TH') {
        cell = cursor as HTMLTableCellElement;
        break;
      }
      cursor = cursor.parentElement;
    }

    if (!cell) { setToolbarPos(null); return; }

    const table = cell.closest('table');
    if (!table) { setToolbarPos(null); return; }
    const rect = table.getBoundingClientRect();
    setToolbarPos({
      top: rect.top - 36,
      left: rect.left,
    });
  }, [editor]);

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;

    const onSelChange = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      updateToolbarPosition();
    };

    document.addEventListener('selectionchange', onSelChange);
    root.addEventListener('click', onSelChange);

    return () => {
      document.removeEventListener('selectionchange', onSelChange);
      root.removeEventListener('click', onSelChange);
    };
  }, [editor, updateToolbarPosition]);

  if (!toolbarPos) return null;

  return createPortal(
    <TableFloatingToolbar pos={toolbarPos} onClose={() => setToolbarPos(null)} />,
    document.body,
  );
}
