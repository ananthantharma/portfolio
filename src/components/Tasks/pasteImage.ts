// Turns a clipboard paste (Ctrl+V) into a Task attachment — images get embedded as base64
// data URLs, matching how file-upload attachments are already stored on ToDo documents.

import {Attachment} from './types';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB — comfortably under Mongo's 16MB document cap

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Returns a ready-to-store Attachment if the paste event contains an image, else null. */
export async function attachmentFromPaste(
  e: React.ClipboardEvent | ClipboardEvent,
): Promise<(Attachment & {data: string}) | null> {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (!file) continue;
      if (file.size > MAX_BYTES) {
        throw new Error('That image is larger than 8MB — try a smaller one.');
      }
      const data = await readFileAsDataUrl(file);
      const ext = item.type.split('/')[1] || 'png';
      return {
        name: `pasted-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`,
        type: item.type,
        data,
        storageType: 'local',
        size: file.size,
      };
    }
  }
  return null;
}
