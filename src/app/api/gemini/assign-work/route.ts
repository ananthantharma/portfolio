import {GoogleGenerativeAI} from '@google/generative-ai';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Room for a long email chain
export const maxDuration = 60;

const MODEL = 'gemini-flash-latest';
const PRIORITIES = ['High', 'Medium', 'Low', 'None'] as const;
const FOLLOW_UP_PREFIX = /^\s*follow[\s-]*up\s*[:\-–—]\s*/i;
const REPLY_PREFIX = /^(\s*(re|fw|fwd|aw|wg|tr)\s*(\[\d+\])?\s*:\s*)+/i;

const buildPrompt = ({manager, staff, text, note, today}: {manager: string; staff: {name: string; role?: string}; text: string; note: string; today: string}) => `You are helping ${manager}, a manager, hand a piece of work to a member of staff.
Today is ${today}.

The staff member is ${staff.name}${staff.role ? ` (${staff.role})` : ''}.

${manager} pasted the following (an email chain, a request, or rough notes):
"""
${text}
"""
${note ? `\nExtra direction from ${manager}: ${note}\n` : ''}
Write TWO things.

1. A SHORT email from ${manager} to ${staff.name} asking if they can take this on.
   - Address ${staff.name} by first name. Friendly, plain, direct. 3-6 short sentences in total.
   - Say in one or two sentences what is needed and why, and any deadline that is stated or clearly implied.
   - Ask simply whether they can take it on.
   - Do NOT ask when they can get it done, when they can respond, or for a timeline or ETA, and do not set a reply-by date. End right after asking if they can take it on (then the sign-off).
   - If the paste is an email chain, assume ${manager} will forward the chain with this email, so say "see the email below" rather than repeating it.
   - Sign off with "${manager}". No subject prefix like "Request:"; no lengthy pleasantries; no bullet lists unless truly needed.

2. A follow-up task for ${manager} so they remember to check that ${staff.name} gets it done.
   - "title": who owes what, WITHOUT any "Follow Up" prefix, e.g. "${staff.name.split(' ')[0]} to send the revised SOW".
   - "notes": 1-3 sentences of the key context (names, amounts, dates) ${manager} needs when following up.
   - "subtasks": high-level checkpoints only, at most 3 (e.g. "${staff.name.split(' ')[0]} confirmed they can take it", "Draft received"). Use [] if it's a single simple ask.
   - "dueDate": the deadline as YYYY-MM-DD if one is stated or clearly implied, otherwise null.

Return ONLY valid JSON in this exact shape:
{
  "email": {"subject": "short subject line", "body": "the email text with line breaks as \\n"},
  "sourceSubject": "the Subject line of the pasted email chain, exactly as written, or null if it isn't an email",
  "task": {"title": "...", "notes": "...", "priority": "High" | "Medium" | "Low" | "None", "dueDate": "YYYY-MM-DD" | null, "subtasks": ["..."]}
}`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    // Same rule as the other managed-key Gemini routes
    if (!(session.user as {googleApiEnabled?: boolean}).googleApiEnabled) {
      return NextResponse.json({success: false, error: 'Your account does not have access to the managed Google AI key.'}, {status: 403});
    }
    if (!process.env.GOOGLE_API_KEY) return NextResponse.json({success: false, error: 'Missing API key configuration'}, {status: 500});

    const body = (await req.json()) as {text?: unknown; note?: unknown; staff?: {name?: unknown; role?: unknown}};
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 60000) : '';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '';
    const staffName = typeof body.staff?.name === 'string' ? body.staff.name.trim() : '';
    const staffRole = typeof body.staff?.role === 'string' ? body.staff.role.trim() : '';
    if (!staffName) return NextResponse.json({success: false, error: 'Choose who to assign it to.'}, {status: 400});
    if (!text) return NextResponse.json({success: false, error: 'Paste the email chain or describe the ask first.'}, {status: 400});

    const manager = (session.user.name || '').trim().split(/\s+/)[0] || 'Ananthan';
    const today = new Date().toISOString().slice(0, 10);

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({model: MODEL, generationConfig: {responseMimeType: 'application/json'}});
    const result = await model.generateContent(buildPrompt({manager, staff: {name: staffName, role: staffRole}, text, note, today}));

    let clean = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const objectMatch = clean.match(/\{[\s\S]*\}/);
    if (objectMatch) clean = objectMatch[0];
    const raw = JSON.parse(clean) as {
      email?: {subject?: unknown; body?: unknown};
      sourceSubject?: unknown;
      task?: {title?: unknown; notes?: unknown; priority?: unknown; dueDate?: unknown; subtasks?: unknown};
    };

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const sourceSubject = str(raw.sourceSubject).replace(REPLY_PREFIX, '').trim();
    const emailSubject = str(raw.email?.subject) || sourceSubject || 'Can you take this on?';
    const emailBody = str(raw.email?.body);
    if (!emailBody) throw new Error('The AI did not return an email. Try again.');

    const firstName = staffName.split(/\s+/)[0];
    const baseTitle = str(raw.task?.title).replace(FOLLOW_UP_PREFIX, '').trim() || `${firstName} to pick up the request`;
    const priority = PRIORITIES.includes(raw.task?.priority as (typeof PRIORITIES)[number]) ? (raw.task!.priority as (typeof PRIORITIES)[number]) : 'None';
    const dueDate = typeof raw.task?.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw.task.dueDate) ? raw.task.dueDate.slice(0, 10) : null;
    const subtasks = Array.isArray(raw.task?.subtasks)
      ? raw.task!.subtasks.filter((s): s is string => typeof s === 'string' && !!s.trim()).map(s => s.trim()).slice(0, 3)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        email: {subject: emailSubject, body: emailBody},
        // The original chain's subject finds the whole thread in Outlook; otherwise use the new email's
        searchSubject: sourceSubject || emailSubject,
        task: {title: `Follow Up: ${baseTitle}`, notes: str(raw.task?.notes), priority, dueDate, subtasks},
        model: MODEL,
      },
    });
  } catch (error) {
    console.error('Assign work error:', error);
    const message = error instanceof SyntaxError ? 'Could not read the AI response. Try again.' : error instanceof Error ? error.message : 'Could not draft the email.';
    return NextResponse.json({success: false, error: message}, {status: 500});
  }
}
