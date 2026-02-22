import { createEditor } from 'lexical';
import { TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { CodeNode, CodeHighlightNode } from '@lexical/code';

// Check any missing node error dynamically

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

// Import plugins using require (so we don't need React wrapper, but we can call init functions if available)
// Wait, we can't mount React components in Node without JSDOM, but we can search the source code for error 173

console.log('Editor nodes:', Array.from(editor._nodes.keys()));
