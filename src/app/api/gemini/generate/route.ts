import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await req.json();
    let { apiKey } = body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { prompt, history, model: requestedModel, systemInstruction, image, mimeType } = body;
    if (apiKey === 'MANAGED') {
      const session = await getServerSession(authOptions);
      if (!session || !(session.user as any).googleApiEnabled) {
        return NextResponse.json({ error: 'Access Denied: You do not have permission to use the managed Google API key.' }, { status: 403 });
      }
      apiKey = process.env.GOOGLE_API_KEY;
    } else if (apiKey === 'GEMINI_SCOPED') {
      const session = await getServerSession(authOptions);
      if (!session || !(session.user as any).googleApiEnabled) {
        return NextResponse.json({ error: 'Access Denied: You do not have permission to use the managed Gemini API key.' }, { status: 403 });
      }
      apiKey = process.env.Gemini_Key;
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API Key configuration' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Use requested model or fallback to gemini-flash-latest (updated default as per recent usage)
    const modelToUse = requestedModel || 'gemini-flash-latest';
    console.log(`Using Gemini model: ${modelToUse}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelParams: any = { model: modelToUse };
    if (systemInstruction) {
      modelParams.systemInstruction = systemInstruction;
    }

    const model = genAI.getGenerativeModel(modelParams);

    // Check if we have history to start a chat session
    if (history && Array.isArray(history)) {
      const chat = model.startChat({
        history: history.map((msg: any) => ({
          role: msg.role,
          parts: [{ text: msg.parts }], // Adjust based on how history is passed (string vs parts)
        })),
      });

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const text = response.text();
      return NextResponse.json({ text });
    }

    // Default to single-turn generation (legacy behavior or image input)
    // NOTE: Image input with chat history is trickier. For now, prioritize text chat history.
    // If image is present, we likely want to use generateContent or add it to the chat message?
    // Let's keep existing image logic for single turn if image exists, OR handle image in chat.
    // Given the previous code, image logic was single turn.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parts: any[] = [prompt];

    // Handle Image Input
    if (image && mimeType) {
      parts = [
        prompt,
        {
          inlineData: {
            data: image,
            mimeType: mimeType,
          },
        },
      ];
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: error.message || error.toString(),
      },
      { status: 500 },
    );
  }
}


