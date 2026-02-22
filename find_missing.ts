import { createEditor } from 'lexical';
import { TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { CodeNode, CodeHighlightNode } from '@lexical/code';

const editor = createEditor({
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
    onError: (e) => console.error(e)
});

try {
    TRANSFORMERS.forEach((transformer) => {
        if (transformer.dependencies) {
            for (const node of transformer.dependencies) {
                if (!editor.hasNode(node)) {
                    console.log("Missing Node:", node.name);
                }
            }
        }
    });
} catch (e) {
    console.log("Crash:", e.message);
}
