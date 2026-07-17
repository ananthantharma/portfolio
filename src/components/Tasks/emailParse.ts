// Turns a dropped Outlook item (.msg from the desktop client, or .eml/.txt) into
// plain "email text" the existing /api/gemini/email-parser route already understands.

import MsgReader from '@kenjiuno/msgreader';

export interface ExtractedTask {
  title?: string;
  notes?: string;
  priority?: 'High' | 'Medium' | 'Low' | 'None';
  dueDate?: string | null;
  category?: string;
}

const MSG_EXTENSIONS = ['.msg'];
const TEXT_EXTENSIONS = ['.eml', '.txt', '.md'];

export function isSupportedEmailFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    MSG_EXTENSIONS.some(ext => name.endsWith(ext)) ||
    TEXT_EXTENSIONS.some(ext => name.endsWith(ext)) ||
    file.type === 'message/rfc822'
  );
}

function decodeMsg(buffer: ArrayBuffer): string {
  const reader = new MsgReader(buffer);
  const fields = reader.getFileData();
  const to = (fields.recipients || []).map(r => r.name || r.email).filter(Boolean).join(', ');
  const when = fields.messageDeliveryTime || fields.clientSubmitTime || '';
  const lines = [
    `Subject: ${fields.subject || '(no subject)'}`,
    `From: ${fields.senderName || ''} ${fields.senderEmail ? `<${fields.senderEmail}>` : ''}`.trim(),
    to && `To: ${to}`,
    when && `Date: ${when}`,
    '',
    fields.body || '(no body text found in this message)',
  ].filter((l): l is string => !!l);
  return lines.join('\n');
}

/** Reads a dropped/selected file and returns normalized "email text" ready for the Gemini parser. */
export async function fileToEmailText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (MSG_EXTENSIONS.some(ext => name.endsWith(ext))) {
    const buffer = await file.arrayBuffer();
    try {
      return decodeMsg(buffer);
    } catch (err) {
      throw new Error(`Could not read this .msg file (${err instanceof Error ? err.message : 'unknown error'})`);
    }
  }
  return file.text();
}
