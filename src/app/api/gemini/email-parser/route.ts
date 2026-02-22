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

    const {emailText} = await req.json();
    const model = genAI.getGenerativeModel({model: 'gemini-flash-latest'});

    const prompt = `
      Act as a personal assistant for Ananthan.
      Analyze the following email chain and extract a actionable task for Ananthan.
      
      Email Chain:
      """
      ${emailText}
      """
      
      Return a JSON object with the following fields:
      - title: A concise, action-oriented title.
      - notes: A summary of the request and key details.
      - priority: "High" | "Medium" | "Low" | "None" (inferred from urgency).
      - dueDate: ISO Date string (if mentioned, otherwise null).
      - category: Suggested category (e.g., "Projects!", "Admin!").
      
      Return ONLY valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let cleanText = response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    const objectMatch = cleanText.match(/\{.*\}/s);
    if (objectMatch) cleanText = objectMatch[0];

    const taskData = JSON.parse(cleanText);
    return NextResponse.json({success: true, data: taskData});
  } catch (error) {
    console.error('Email Analysis Error:', error);
    return NextResponse.json({success: false, error: 'Failed to analyze email'}, {status: 500});
  }
}
