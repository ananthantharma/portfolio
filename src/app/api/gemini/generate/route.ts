import {GoogleGenerativeAI} from '@google/generative-ai';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await req.json();
    let {apiKey} = body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {prompt, history, model: requestedModel, systemInstruction, attachments} = body;

    if (apiKey === 'MANAGED') {
      const session = await getServerSession(authOptions);
      if (!session || !(session.user as any).googleApiEnabled) {
        return NextResponse.json(
          {error: 'Access Denied: You do not have permission to use the managed Google API key.'},
          {status: 403},
        );
      }
      apiKey = process.env.GOOGLE_API_KEY;
    } else if (apiKey === 'GEMINI_SCOPED') {
      const session = await getServerSession(authOptions);
      if (!session || !(session.user as any).googleApiEnabled) {
        return NextResponse.json(
          {error: 'Access Denied: You do not have permission to use the managed Gemini API key.'},
          {status: 403},
        );
      }
      apiKey = process.env.Gemini_Key;
    }

    if (!apiKey) {
      return NextResponse.json({error: 'Missing API Key configuration'}, {status: 400});
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    if (!prompt && (!attachments || attachments.length === 0)) {
      return NextResponse.json({error: 'Prompt or attachment is required'}, {status: 400});
    }

    // Use requested model or fallback
    const modelToUse = requestedModel || 'gemini-flash-latest';
    console.log(`Using Gemini model: ${modelToUse}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelParams: any = {model: modelToUse};
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
          parts: [{text: msg.parts}], // Basic text history for now
        })),
      });
    } else {
      chat = model.startChat({history: []});
    }

    // Construct the current message parts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentMessageParts: any[] = [];

    // Add text part if prompt exists
    if (prompt) {
      currentMessageParts.push({text: prompt});
    }

    // Add attachment parts
    if (attachments && Array.isArray(attachments)) {
      attachments.forEach((att: any) => {
        if (att.type === 'image' || att.type === 'pdf') {
          // att.content is base64 Data URL
          const match = att.content.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1]; // Use extracted mime or att.mimeType
            const data = match[2];
            currentMessageParts.push({
              inlineData: {
                data: data,
                mimeType: mimeType,
              },
            });
          }
        } else if (att.type === 'text') {
          // Add as text part with filename context
          currentMessageParts.push({
            text: `\n\n--- Start of attached file: ${att.name} ---\n${att.content}\n--- End of attached file ---\n\n`,
          });
        }
      });
    }

    // Send message (multimodal if images present)
    const result = await chat.sendMessage(currentMessageParts);
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
