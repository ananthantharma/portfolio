export const dynamic = "force-dynamic";
import {GoogleGenerativeAI} from '@google/generative-ai';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Optional: Check permissions if needed

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await req.json();
    const {tasks, categoryColors, instruction} = body;
    let {apiKey} = body;

    if (apiKey === 'MANAGED') {
      if (!session || !(session.user as any).googleApiEnabled) {
        return NextResponse.json({error: 'Access Denied: Managed Key'}, {status: 403});
      }
      apiKey = process.env.GOOGLE_API_KEY;
    } else if (apiKey === 'GEMINI_SCOPED') {
      apiKey = process.env.Gemini_Key;
    }

    if (!apiKey) {
      return NextResponse.json({error: 'Missing API Key'}, {status: 400});
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: `You are an expert Project Manager and Scheduler.
        Your task is to UPDATE the provided Gantt Chart data based on the USER INSTRUCTION.
        
        Input Data:
        - Tasks: Array of objects { id, name, start (ISO string), end (ISO string), progress (0-100), category }
        - CategoryColors: Object mapping category names to hex codes.

        Rules:
        1. Parse the user's instruction to understand what changes are needed (e.g., "Delay all tasks by 2 days", "Add a Deployment task at the end", "Make Planning green").
        2. Modify the 'tasks' array and 'categoryColors' object accordingly.
        3. If adding a task, generate a unique random ID (string).
        4. Ensure dates are valid ISO 8601 strings (YYYY-MM-DD).
        5. Return ONLY the JSON object with the structure: { "tasks": [...], "categoryColors": {...} }.
        6. Do NOT include markdown formatting or explanations. Just the raw JSON.
        `,
    });

    const prompt = `
    Current Tasks: ${JSON.stringify(tasks)}
    Current Categories: ${JSON.stringify(categoryColors)}
    
    User Instruction: "${instruction}"
    
    Update the chart data as requested.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Cleanup potential markdown
    text = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    try {
      const jsonResponse = JSON.parse(text);
      return NextResponse.json(jsonResponse);
    } catch (e) {
      console.error('JSON Parse Error:', e, 'Text:', text);
      return NextResponse.json({error: 'Failed to parse AI response', raw: text}, {status: 500});
    }
  } catch (error: any) {
    console.error('Gantt AI Error:', error);
    return NextResponse.json({error: 'Failed to process request', details: error.message}, {status: 500});
  }
}
