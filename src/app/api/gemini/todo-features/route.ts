import {GoogleGenerativeAI} from '@google/generative-ai';
import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {authOptions} from '@/lib/auth';

export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {action, text, context} = await req.json();
    const model = genAI.getGenerativeModel({model: 'gemini-flash-latest'});

    if (action === 'breakdown') {
      const prompt = `
        You are a helpful task manager assistant.
        Break down the following task into 3-5 subtasks.
        Task: "${text}"
        ${context ? `Context: ${context}` : ''}
        
        Return ONLY a JSON array of strings. Example: ["Step 1", "Step 2"]
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let cleanText = response
        .text()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      // Try to find array within text if extra text exists
      const arrayMatch = cleanText.match(/\[.*\]/s);
      if (arrayMatch) cleanText = arrayMatch[0];

      const subtasks = JSON.parse(cleanText);
      return NextResponse.json({success: true, data: subtasks});
    }

    if (action === 'priority') {
      const prompt = `
        Determine the priority (High, Medium, Low, None) for this task.
        Task: "${text}"
        return ONLY the word.
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const priority = response
        .text()
        .trim()
        .replace(/[^a-zA-Z]/g, '');
      return NextResponse.json({success: true, data: priority});
    }

    return NextResponse.json({error: 'Invalid action'}, {status: 400});
  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json({success: false, error: 'AI processing failed'}, {status: 500});
  }
}
