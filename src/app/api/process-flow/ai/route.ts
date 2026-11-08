import {GoogleGenerativeAI} from '@google/generative-ai';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const ICONS = 'folder, list, bag, hammer, banknote, wifi, text, star, flag, user, users, lightbulb, target, rocket, calendar, check, alert, heart, zap, bookmark, code, chart, mail, phone, globe, megaphone, settings, file, layers, clock';

const FLOW_PROMPT = `You turn a description into a clear business process flowchart.
Return ONLY valid JSON in this exact shape:
{
  "title": "short name for the flow",
  "summary": "one sentence describing what you built",
  "lanes": ["optional: the roles/teams if the text says who does what, else []"],
  "steps": [{"id": "s1", "label": "short step text (max ~8 words)", "type": "start" | "end" | "step" | "decision" | "data" | "document" | "note", "lane": "one of lanes, or \\"\\""}],
  "links": [{"from": "s1", "to": "s2", "label": "optional, e.g. Yes / No for decisions"}]
}
Rules:
- Begin with one "start" step and finish with at least one "end" step.
- Every decision has 2+ outgoing links, labelled (e.g. "Yes"/"No").
- Use "data" for inputs/outputs or systems, "document" for forms/reports, "note" only for side remarks.
- Labels are short verb phrases ("Review invoice"), not sentences.
- Use lanes only when the text clearly names who does each step; then every step has a lane.
- Keep it readable: at most 30 steps.`;

const MIND_PROMPT = `You turn a description into a mind map.
Return ONLY valid JSON in this exact shape:
{
  "title": "short name",
  "summary": "one sentence describing what you built",
  "root": {"label": "central topic", "icon": "optional", "children": [{"label": "...", "icon": "optional", "children": [...]}]}
}
Rules:
- 3-8 main branches; go 2-3 levels deep where the text supports it; at most 60 nodes in total.
- Labels are short (1-5 words).
- "icon" is optional and must be one of: ${ICONS}. Give main branches a fitting icon.`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});

    const {text, kind, context} = (await req.json()) as {text?: string; kind?: string; context?: string};
    const input = typeof text === 'string' ? text.trim() : '';
    if (!input) return NextResponse.json({success: false, error: 'Describe what to build first.'}, {status: 400});
    if (input.length > 30000) return NextResponse.json({success: false, error: 'That text is too long. Trim it to the key points.'}, {status: 413});
    const isMind = kind === 'mindmap';

    const model = genAI.getGenerativeModel({model: 'gemini-flash-latest', generationConfig: {responseMimeType: 'application/json', temperature: 0.4}});
    const existing = typeof context === 'string' && context.trim() ? `\n\nThe board already contains (build something that fits alongside it; do not repeat it):\n"""\n${context.slice(0, 6000)}\n"""` : '';
    const result = await model.generateContent(`${isMind ? MIND_PROMPT : FLOW_PROMPT}${existing}\n\nDescription:\n"""\n${input}\n"""`);
    const raw = result.response.text().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('The AI reply was not readable. Try again.');
      parsed = JSON.parse(match[0]);
    }

    if (isMind) {
      const root = parsed.root as {label?: unknown} | undefined;
      if (!root || typeof root.label !== 'string') throw new Error('The AI did not return a mind map. Try rewording.');
      return NextResponse.json({success: true, data: {kind: 'mindmap', title: String(parsed.title || root.label), summary: String(parsed.summary || ''), tree: root}});
    }
    const steps = Array.isArray(parsed.steps) ? parsed.steps.slice(0, 40) : [];
    if (!steps.length) throw new Error('The AI did not return any steps. Try adding more detail.');
    return NextResponse.json({
      success: true,
      data: {
        kind: 'whiteboard',
        title: String(parsed.title || 'Process'),
        summary: String(parsed.summary || ''),
        flow: {lanes: Array.isArray(parsed.lanes) ? parsed.lanes.map(String).slice(0, 8) : [], steps, links: Array.isArray(parsed.links) ? parsed.links.slice(0, 80) : []},
      },
    });
  } catch (error) {
    console.error('Process flow AI error:', error);
    return NextResponse.json({success: false, error: error instanceof Error ? error.message : 'The AI could not build that.'}, {status: 500});
  }
}
