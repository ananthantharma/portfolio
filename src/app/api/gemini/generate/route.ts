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
    const { prompt, history, model: requestedModel, systemInstruction, images } = body;

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

    if (!prompt && (!images || images.length === 0)) {
      return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 });
    }

    // Use requested model or fallback
    const modelToUse = requestedModel || 'gemini-flash-latest';
    console.log(`Using Gemini model: ${modelToUse}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelParams: any = { model: modelToUse };
    if (systemInstruction) {
      modelParams.systemInstruction = systemInstruction;
    }

    const model = genAI.getGenerativeModel(modelParams);

    // Initialize chat with history if available
    let chat;
    if (history && Array.isArray(history)) {
      chat = model.startChat({
        history: history.map((msg: any) => ({
          role: msg.role,
          parts: [{ text: msg.parts }], // Basic text history for now
        })),
      });
    } else {
      chat = model.startChat({ history: [] });
    }

    // Construct the current message parts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentMessageParts: any[] = [];

    // Add text part if prompt exists
    if (prompt) {
      currentMessageParts.push({ text: prompt });
    }

    // Add image parts if images exist
    if (images && Array.isArray(images)) {
      images.forEach((img: string) => {
        // img is expected to be a base64 Data URL: "data:image/png;base64,..."
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const data = match[2];
          currentMessageParts.push({
            inlineData: {
              data: data,
              mimeType: mimeType,
            },
          });
        }
      });
    }

    // Send message (multimodal if images present)
    const result = await chat.sendMessage(currentMessageParts);
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


