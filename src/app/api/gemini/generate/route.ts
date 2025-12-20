import {GoogleGenerativeAI} from '@google/generative-ai';
import {NextResponse} from 'next/server';

// Initialize Gemini
// Ensure GOOGLE_API_KEY is set in your .env.local file
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {prompt, model: requestedModel} = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({error: 'Missing API Key configuration'}, {status: 500});
    }

    if (!prompt) {
      return NextResponse.json({error: 'Prompt is required'}, {status: 400});
    }

    // Use requested model or fallback to gemini-3-pro-preview
    // Using gemini-3-pro-preview as default as requested by user
    const modelToUse = requestedModel || 'gemini-3-pro-preview';
    console.log(`Using Gemini model: ${modelToUse}`);

    const model = genAI.getGenerativeModel({model: modelToUse});

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({text});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: error.message || error.toString(),
      },
      {status: 500},
    );
  }
}
