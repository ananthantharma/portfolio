'use client';
/**
 * ImagePastePlugin — intercepts clipboard paste events and inserts images
 * from the clipboard into the Lexical editor as ImageNodes.
 *
 * Images are converted to base64 data URLs (no server upload required).
 */
import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$insertNodes, $createParagraphNode, PASTE_COMMAND, COMMAND_PRIORITY_LOW} from 'lexical';
import {$getSelection, $isRangeSelection} from 'lexical';
import {$createImageNode} from './ImageNode';

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImagePastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Register a PASTE_COMMAND listener to capture clipboard image items
    const unregister = editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        // Collect all image items from the clipboard
        const imageItems: DataTransferItem[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            imageItems.push(items[i]);
          }
        }

        if (imageItems.length === 0) return false; // Let Lexical handle text/HTML pastes

        // ✅ KEY FIX: If the clipboard also has HTML (e.g. Excel table copy),
        // the image is just a bitmap preview. Let Lexical handle it as HTML
        // so the table structure is preserved.
        const hasHtml = Array.from(items).some(item => item.type === 'text/html');
        if (hasHtml) return false;

        // We found images — prevent the default Lexical paste and handle ourselves
        event.preventDefault();

        imageItems.forEach(async item => {
          const file = item.getAsFile();
          if (!file) return;

          try {
            const dataUrl = await fileToDataURL(file);
            editor.update(() => {
              const imageNode = $createImageNode({
                src: dataUrl,
                altText: file.name || 'Pasted image',
              });
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                selection.insertNodes([imageNode]);
              } else {
                const para = $createParagraphNode();
                para.append(imageNode);
                $insertNodes([para]);
              }
            });
          } catch (e) {
            console.error('Failed to paste image:', e);
          }
        });

        return true; // Mark as handled
      },
      COMMAND_PRIORITY_LOW,
    );

    return unregister;
  }, [editor]);

  return null;
}
