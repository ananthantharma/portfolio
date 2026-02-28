/**
 * ColoredTableCellNode - overrides TableCellNode's importDOM to preserve
 * backgroundColor, text color, and inline text styles from Excel paste.
 *
 * We use Lexical's node replacement API so this node registers under the
 * same type 'tablecell', keeping all internal plugins (TablePlugin, etc.)
 * fully functional.
 */
import {TableCellNode, TableCellHeaderStates, $createTableCellNode} from '@lexical/table';
import {DOMConversionMap, DOMConversionOutput, LexicalNode, $applyNodeReplacement, $isTextNode} from 'lexical';

export class ColoredTableCellNode extends TableCellNode {
  // Keep the SAME type string so Lexical internals still find it as 'tablecell'
  static getType(): string {
    return 'tablecell';
  }

  static clone(node: ColoredTableCellNode): ColoredTableCellNode {
    const cloned = new ColoredTableCellNode(node.__headerState, node.__colSpan, node.__width, node.__key);
    return cloned;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      td: () => ({
        conversion: convertColoredTableCellElement,
        priority: 0,
      }),
      th: () => ({
        conversion: convertColoredTableCellElement,
        priority: 0,
      }),
    };
  }

  // Required so Lexical can instantiate from JSON (including from DB)
  static importJSON(serializedNode: ReturnType<TableCellNode['exportJSON']>): ColoredTableCellNode {
    return TableCellNode.importJSON(serializedNode) as ColoredTableCellNode;
  }
}

function convertColoredTableCellElement(domNode: Node): DOMConversionOutput {
  const el = domNode as HTMLTableCellElement;
  const nodeName = domNode.nodeName.toLowerCase();

  let width: number | undefined = undefined;
  if (/^(\d+(?:\.\d+)?)px$/.test(el.style.width)) {
    width = parseFloat(el.style.width);
  }

  const headerState = nodeName === 'th' ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS;

  // Create via the standard factory so node replacement is applied
  const cellNode = $createTableCellNode(headerState, el.colSpan, width);
  (cellNode as any).__rowSpan = el.rowSpan;

  // ✅ Preserve background color from Excel / Google Sheets
  const bg = el.style.backgroundColor;
  if (bg && bg !== '') {
    cellNode.setBackgroundColor(bg);
  }

  // Preserve vertical alignment
  const va = el.style.verticalAlign;
  if (va === 'middle' || va === 'bottom') {
    cellNode.setVerticalAlign(va);
  }

  const style = el.style;
  const textDecoration = (style?.textDecoration ?? '').split(' ');
  const hasBold = style.fontWeight === '700' || style.fontWeight === 'bold';
  const hasStrike = textDecoration.includes('line-through');
  const hasItalic = style.fontStyle === 'italic';
  const hasUnderline = textDecoration.includes('underline');
  // ✅ Preserve text color set on the <td>/<th> cell itself
  const cellTextColor = el.style.color;

  return {
    after: (children: LexicalNode[]) => {
      for (const child of children) {
        if ($isTextNode(child)) {
          if (hasBold) child.toggleFormat('bold');
          if (hasStrike) child.toggleFormat('strikethrough');
          if (hasItalic) child.toggleFormat('italic');
          if (hasUnderline) child.toggleFormat('underline');
          // Apply cell-level text color only if the text node has no own color
          if (cellTextColor && !child.getStyle().includes('color:')) {
            child.setStyle(`${child.getStyle()}color: ${cellTextColor};`);
          }
        }
      }
      return children;
    },
    node: cellNode,
  };
}

export function $createColoredTableCellNode(
  headerState: number = TableCellHeaderStates.NO_STATUS,
  colSpan: number = 1,
  width?: number,
): ColoredTableCellNode {
  return $applyNodeReplacement(new ColoredTableCellNode(headerState, colSpan, width));
}
