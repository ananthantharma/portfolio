import {GoogleGenerativeAI} from '@google/generative-ai';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {ADMIN_EMAIL, authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = 'gemini-flash-latest';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

type Mode = 'create' | 'edit' | 'review';
type InTask = Record<string, unknown>;
export type CleanTask = {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  category: string;
  parentId?: string;
  type: 'task' | 'milestone';
  dependencies: string[];
  assignee: string;
  notes: string;
};

const TASK_SHAPE = `Each task: {"id": "short unique string", "name": "...", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "progress": 0-100,
"category": "one of the category names", "parentId": "id of its phase, or omit for a phase/top-level row",
"type": "task" | "milestone", "dependencies": ["ids that must finish first"], "assignee": "role or name, or empty", "notes": "optional one line"}
- A phase is a top-level task whose children point to it with parentId. Phase dates should span their children.
- A milestone has the same start and end date, progress 0 (or 100 if done), and no children.
- end is inclusive (a one-day task has start == end). Never end before start.
- Dependencies are finish-to-start: a dependent task starts on or after the day after its predecessor ends. Never create cycles.
- categoryColors maps each category name to a hex colour like "#6366f1".`;

function str(v: unknown, max = 300) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/** Keep only well-formed tasks: unique ids, valid dates, known parents and dependencies, no cycles. */
function cleanPlan(raw: {tasks?: unknown; categoryColors?: unknown}) {
  const input = Array.isArray(raw.tasks) ? (raw.tasks as InTask[]) : [];
  const seen = new Set<string>();
  const tasks: CleanTask[] = [];
  for (const t of input.slice(0, 400)) {
    let id = str(t.id, 40).replace(/[^\w-]/g, '') || Math.random().toString(36).slice(2, 10);
    while (seen.has(id)) id = `${id}-${Math.random().toString(36).slice(2, 5)}`;
    const start = str(t.start, 10);
    let end = str(t.end, 10);
    if (!DATE.test(start) || Number.isNaN(Date.parse(start))) continue;
    if (!DATE.test(end) || Number.isNaN(Date.parse(end)) || end < start) end = start;
    const type = t.type === 'milestone' ? 'milestone' : 'task';
    seen.add(id);
    tasks.push({
      id,
      name: str(t.name, 200) || 'Untitled task',
      start,
      end: type === 'milestone' ? start : end,
      progress: Math.max(0, Math.min(100, Math.round(Number(t.progress) || 0))),
      category: str(t.category, 60) || 'General',
      parentId: str(t.parentId, 40) || undefined,
      type,
      dependencies: Array.isArray(t.dependencies) ? (t.dependencies as unknown[]).map(d => str(d, 40)).filter(Boolean) : [],
      assignee: str(t.assignee, 80),
      notes: str(t.notes, 500),
    });
  }
  const ids = new Set(tasks.map(t => t.id));
  for (const t of tasks) {
    if (t.parentId && (!ids.has(t.parentId) || t.parentId === t.id)) t.parentId = undefined;
    t.dependencies = [...new Set(t.dependencies)].filter(d => ids.has(d) && d !== t.id);
  }
  // Break parent loops
  const byId = new Map(tasks.map(t => [t.id, t]));
  for (const t of tasks) {
    const chain = new Set([t.id]);
    let p = t.parentId;
    while (p) {
      if (chain.has(p)) {
        t.parentId = undefined;
        break;
      }
      chain.add(p);
      p = byId.get(p)?.parentId;
    }
  }
  // Break dependency cycles (drop the edge that closes a loop)
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (t: CleanTask) => {
    if (done.has(t.id)) return;
    visiting.add(t.id);
    t.dependencies = t.dependencies.filter(d => {
      if (visiting.has(d)) return false;
      const dt = byId.get(d);
      if (dt) visit(dt);
      return true;
    });
    visiting.delete(t.id);
    done.add(t.id);
  };
  tasks.forEach(visit);

  const colors: Record<string, string> = {};
  const rawColors = raw.categoryColors && typeof raw.categoryColors === 'object' ? (raw.categoryColors as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(rawColors)) if (typeof v === 'string' && HEX.test(v) && k.trim()) colors[k.trim().slice(0, 60)] = v;
  let i = Object.keys(colors).length;
  for (const t of tasks) if (!colors[t.category]) colors[t.category] = PALETTE[i++ % PALETTE.length];
  return {tasks, categoryColors: colors};
}

function parseJson(text: string) {
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) clean = match[0];
  return JSON.parse(clean) as Record<string, unknown>;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) return NextResponse.json({error: 'Admin only'}, {status: 403});
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return NextResponse.json({error: 'Missing API key configuration'}, {status: 500});

    const body = (await req.json()) as {mode?: Mode; prompt?: unknown; instruction?: unknown; startDate?: unknown; deadline?: unknown; name?: unknown; tasks?: unknown; categoryColors?: unknown};
    const mode: Mode = body.mode === 'create' || body.mode === 'review' ? body.mode : 'edit';
    const today = new Date().toISOString().slice(0, 10);
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: MODEL,
      generationConfig: {responseMimeType: 'application/json', temperature: mode === 'review' ? 0.4 : 0.6},
    });

    if (mode === 'create') {
      const prompt = str(body.prompt, 8000);
      if (!prompt) return NextResponse.json({error: 'Describe the project first.'}, {status: 400});
      const startDate = DATE.test(str(body.startDate, 10)) ? str(body.startDate, 10) : today;
      const deadline = DATE.test(str(body.deadline, 10)) ? str(body.deadline, 10) : '';
      const result = await model.generateContent(`You are a senior project manager building a realistic project schedule (a Gantt chart).
Today is ${today}. The project starts on ${startDate}${deadline ? ` and must finish by ${deadline}` : ''}.

Project description:
"""
${prompt}
"""

Build a complete, practical plan:
- 3 to 7 phases (top-level rows), each with 2 to 7 concrete tasks, plus key milestones (e.g. approvals, go-live).
- Realistic durations; schedule work on weekdays where sensible; keep the plan within the deadline if one is given.
- Link tasks with finish-to-start dependencies wherever the order matters (most tasks should have one).
- Use 3 to 6 categories that describe the kind of work (e.g. Planning, Design, Build, Testing, Launch) with distinct colours.
- All progress values 0 unless the description says work is already done.
- Suggest a short project name.

${TASK_SHAPE}

Return ONLY JSON: {"name": "project name", "description": "one sentence summary", "tasks": [...], "categoryColors": {...}}`);
      const raw = parseJson(result.response.text());
      const plan = cleanPlan(raw);
      if (!plan.tasks.length) throw new Error('The AI did not return a usable plan. Try describing the project in a bit more detail.');
      return NextResponse.json({name: str(raw.name, 200) || 'New project', description: str(raw.description, 500), ...plan});
    }

    const current = cleanPlan({tasks: body.tasks, categoryColors: body.categoryColors});
    const planText = JSON.stringify({name: str(body.name, 200), tasks: current.tasks, categoryColors: current.categoryColors});

    if (mode === 'review') {
      const result = await model.generateContent(`You are a senior project manager reviewing this Gantt plan. Today is ${today}.
Plan JSON: ${planText}

Give a short, practical review. Return ONLY JSON:
{"summary": "2 sentences on overall health", "risks": [{"title": "...", "detail": "one or two sentences", "severity": "high" | "medium" | "low", "taskIds": ["related ids"]}], "suggestions": ["concrete improvement", ...]}
Look for: tasks behind schedule (end before today and progress < 100), missing dependencies, unrealistic durations, overloaded assignees, a critical path with no slack, missing milestones or testing. At most 6 risks and 6 suggestions.`);
      const raw = parseJson(result.response.text());
      const ids = new Set(current.tasks.map(t => t.id));
      const risks = (Array.isArray(raw.risks) ? raw.risks : []).slice(0, 6).map(r => {
        const x = r as Record<string, unknown>;
        const severity = x.severity === 'high' || x.severity === 'low' ? x.severity : 'medium';
        return {title: str(x.title, 160), detail: str(x.detail, 600), severity, taskIds: Array.isArray(x.taskIds) ? (x.taskIds as unknown[]).map(v => str(v, 40)).filter(v => ids.has(v)) : []};
      });
      const suggestions = (Array.isArray(raw.suggestions) ? raw.suggestions : []).map(s => str(s, 400)).filter(Boolean).slice(0, 6);
      return NextResponse.json({summary: str(raw.summary, 600), risks, suggestions});
    }

    const instruction = str(body.instruction, 4000);
    if (!instruction) return NextResponse.json({error: 'Say what to change.'}, {status: 400});
    const result = await model.generateContent(`You are a senior project manager editing a Gantt plan. Today is ${today}.
Current plan JSON: ${planText}

Instruction: "${instruction}"

Apply the instruction and return the COMPLETE updated plan. Keep every existing task id that still exists; only add new ids for new tasks.
Keep dates, dependencies and progress unchanged unless the instruction affects them; when you move a task, move its dependents so no dependency is violated.

${TASK_SHAPE}

Return ONLY JSON: {"tasks": [...], "categoryColors": {...}, "summary": "one sentence describing what you changed"}`);
    const raw = parseJson(result.response.text());
    const plan = cleanPlan(raw);
    if (!plan.tasks.length && current.tasks.length) throw new Error('The AI returned an empty plan, so nothing was changed.');
    return NextResponse.json({...plan, summary: str(raw.summary, 400)});
  } catch (error) {
    console.error('Gantt AI error:', error);
    const message = error instanceof SyntaxError ? 'Could not read the AI response. Try again.' : error instanceof Error ? error.message : 'AI request failed';
    return NextResponse.json({error: message}, {status: 500});
  }
}
