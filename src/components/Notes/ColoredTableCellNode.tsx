import { TableCellNode, TableCellHeaderStates } from '@lexical/table';
import { DOMConversionMap, DOMConversionOutput, LexicalNode, $applyNodeReplacement } from 'lexical';

export class ColoredTableCellNode extends TableCellNode {
    static getType(): string {
        return 'colored-tablecell';
    }

    static clone(node: ColoredTableCellNode): ColoredTableCellNode {
        return new ColoredTableCellNode(
            node.__headerState,
            node.__colSpan,
            node.__width,
            node.__key,
        );
    }

    static importDOM(): DOMConversionMap | null {
        return {
            td: () => ({
                conversion: convertTableCellNodeElement,
                priority: 4,
            }),
            th: () => ({
                conversion: convertTableCellNodeElement,
                priority: 4,
            }),
        };
    }
}

export function $createColoredTableCellNode(
    headerState: number = TableCellHeaderStates.NO_STATUS,
    colSpan: number = 1,
    width?: number,
): ColoredTableCellNode {
    return $applyNodeReplacement(new ColoredTableCellNode(headerState, colSpan, width));
}

function convertTableCellNodeElement(domNode: Node): DOMConversionOutput {
    const domNode_ = domNode as HTMLTableCellElement;
    const nodeName = domNode.nodeName.toLowerCase();

    let width: number | undefined = undefined;
    if (/^(\d+(?:\.\d+)?)px$/.test(domNode_.style.width)) {
        width = parseFloat(domNode_.style.width);
    }

    const tableCellNode = $createColoredTableCellNode(
        nodeName === 'th' ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS,
        domNode_.colSpan,
        width,
    );

    // Lexical properties
    // Accessing protected/private properties required by the original lexical design
    (tableCellNode as any).__rowSpan = domNode_.rowSpan;

    const backgroundColor = domNode_.style.backgroundColor;
    if (backgroundColor && backgroundColor !== '') {
        // Preserve background colors from Excel!
        (tableCellNode as any).setBackgroundColor(backgroundColor);
    }

    return {
        after: (childLexicalNodes: Array<LexicalNode>) => {
            // Use original table cell import fallback logic
            const tableCellImportDOM = TableCellNode.importDOM();
            if (tableCellImportDOM && tableCellImportDOM[nodeName]) {
                const originalConversion = (tableCellImportDOM[nodeName] as any)(domNode_);
                if (originalConversion && originalConversion.after) {
                    return originalConversion.after(childLexicalNodes);
                }
            }
            return childLexicalNodes;
        },
        node: tableCellNode,
    };
}
