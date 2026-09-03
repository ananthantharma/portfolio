export const dynamic = 'force-dynamic';
import {GoogleGenerativeAI, Part} from '@google/generative-ai';
import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {authOptions} from '@/lib/auth';

export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const PRIORITIES = ['High', 'Medium', 'Low', 'None'] as const;

const PROMPT = `You are the personal assistant for Ananthan. Ananthan just pasted some raw content — it could be an
email chain, a screenshot of a conversation or document, a chat log, or rough notes.

Create exactly ONE actionable task for Ananthan out of it. Write everything from Ananthan's point of view —
what HE needs to do next.

Return ONLY valid JSON in this exact shape:
{
  "title": "concise, action-oriented, starts with a verb",
  "notes": "2-4 sentences: the request, the key context, and anything Ananthan must not forget (names, amounts, links, dates)",
  "priority": "High" | "Medium" | "Low" | "None",
  "dueDate": "YYYY-MM-DD, or null if none is stated or clearly implied",
  "category": "one short label, e.g. Projects!, Admin!, Vendor Management",
  "subtasks": ["ONLY the major steps / milestones"]
}

Subtask rules — important:
- At most 5. Aim for 4-5 for a real project, fewer for something simple, and an empty array [] if the task is a single atomic action.
- Each subtask is one short line describing a milestone, NOT a fine-grained step-by-step instruction.
- Do not pad the list to reach 5.`;

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
          .slice(0, 5)
      : [];

    const data = {
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'New task',
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
