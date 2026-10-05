export const dynamic = 'force-dynamic';
import {GoogleGenerativeAI, Part} from '@google/generative-ai';
import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {authOptions} from '@/lib/auth';

export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const PRIORITIES = ['High', 'Medium', 'Low', 'None'] as const;
const MAX_CHECKLIST = 4;
const FOLLOW_UP_PREFIX = /^\s*follow[\s-]*up\s*[:\-–—]\s*/i;

const PROMPT = `You are the personal assistant for Ananthan. Ananthan just pasted some raw content — it could be an
email chain, a screenshot of a conversation or document, a chat log, or rough notes.

Who is who:
- Ananthan is the user. In an email chain he is the sender or recipient named Ananthan; in rough notes "I" / "me" is Ananthan.
- Everyone else is another person (a colleague, a vendor, a manager, etc.).

Create exactly ONE task for Ananthan out of it, written from Ananthan's point of view.

First decide the direction:
- FOLLOW-UP: Ananthan is the one who asked someone else to do something (he delegated it, requested information,
  or is waiting on them to deliver). Set "followUp": true. The title says who owes what, e.g. "Sarah to send the revised SOW".
- OWN ACTION: someone asked Ananthan to do something, or it is something Ananthan must do himself.
  Set "followUp": false. The title starts with a verb, e.g. "Review the Q3 vendor invoice".
If the latest message in a chain is Ananthan's request to someone else, it is a FOLLOW-UP.

Return ONLY valid JSON in this exact shape:
{
  "followUp": true | false,
  "title": "short task title WITHOUT any 'Follow Up' prefix (it is added automatically)",
  "notes": "2-4 sentences: the request, the key context, and anything Ananthan must not forget (names, amounts, links, dates)",
  "priority": "High" | "Medium" | "Low" | "None",
  "dueDate": "YYYY-MM-DD, or null if none is stated or clearly implied",
  "category": "one short label, e.g. Projects!, Admin!, Vendor Management",
  "emailSubject": "the email's Subject line exactly as written, without RE:/FW: prefixes, or null if this is not an email",
  "subtasks": ["high-level checklist items only"]
}

Checklist rules — important:
- Keep it HIGH-LEVEL: 2-4 items for a real piece of work, never more than ${MAX_CHECKLIST}. Use [] for a single simple action.
- Each item is one short line naming a milestone (e.g. "Agree pricing with vendor"), never a detailed step-by-step instruction.
- For a FOLLOW-UP, list only what Ananthan is waiting to receive or confirm (often 1-2 items, or []).
- Do not pad the list. Fewer is better.`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    }

    const {text, image} = (await req.json()) as {
      text?: string;
      image?: {data?: string; mimeType?: string};
    };

    const hasText = typeof text === 'string' && text.trim().length > 0;
    const imageData = typeof image?.data === 'string' ? image.data.trim() : '';
    const hasImage = imageData.length > 0;
    if (!hasText && !hasImage) {
      return NextResponse.json({success: false, error: 'Nothing to analyze — paste some text or an image.'}, {status: 400});
    }

    const model = genAI.getGenerativeModel({model: 'gemini-flash-latest'});

    const parts: Part[] = [
      {text: `${PROMPT}\n\nPasted content:\n"""\n${hasText ? text!.trim() : '(see the attached image)'}\n"""`},
    ];
    if (hasImage) {
      parts.push({inlineData: {data: imageData, mimeType: image?.mimeType || 'image/png'}});
    }

    const result = await model.generateContent(parts);
    let clean = result.response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    const objectMatch = clean.match(/\{[\s\S]*\}/);
    if (objectMatch) clean = objectMatch[0];

    const raw = JSON.parse(clean) as Record<string, unknown>;

    const priority = PRIORITIES.includes(raw.priority as (typeof PRIORITIES)[number])
      ? (raw.priority as (typeof PRIORITIES)[number])
      : 'None';

    const subtasks = Array.isArray(raw.subtasks)
      ? raw.subtasks
          .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
          .map(s => s.trim())
          .slice(0, MAX_CHECKLIST)
      : [];

    // The "Follow Up:" prefix is applied here so it is always spelled the same way
    const rawTitle = typeof raw.title === 'string' ? raw.title.trim() : '';
    const followUp = raw.followUp === true || FOLLOW_UP_PREFIX.test(rawTitle);
    const baseTitle = rawTitle.replace(FOLLOW_UP_PREFIX, '').trim() || 'New task';

    // Strip reply/forward prefixes so the subject matches every message in the Outlook thread
    const emailSubject =
      typeof raw.emailSubject === 'string'
        ? raw.emailSubject
            .replace(/^(\s*(re|fw|fwd|aw|wg|tr)\s*(\[\d+\])?\s*:\s*)+/i, '')
            .trim()
            .slice(0, 500)
        : '';

    const data = {
      title: followUp ? `Follow Up: ${baseTitle}` : baseTitle,
      emailSubject,
      followUp,
      notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
      priority,
      dueDate: typeof raw.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw.dueDate) ? raw.dueDate.slice(0, 10) : null,
      category: typeof raw.category === 'string' ? raw.category.trim() : '',
      subtasks,
    };

    return NextResponse.json({success: true, data});
  } catch (error) {
    console.error('Task capture error:', error);
    const message = error instanceof Error ? error.message : 'Failed to turn that into a task';
    return NextResponse.json({success: false, error: message}, {status: 500});
  }
}
