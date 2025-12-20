import {NextResponse} from 'next/server';

export async function POST(req: Request) {
  try {
    const {apiKey, messages, model} = await req.json();

    if (!apiKey) {
      return NextResponse.json({error: 'Missing API Key'}, {status: 400});
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({error: 'Messages are required and must be an array'}, {status: 400});
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({error: errorData.error?.message || 'OpenAI API Error'}, {status: response.status});
    }

    const data = await response.json();
    return NextResponse.json({text: data.choices[0].message.content});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('OpenAI API Route Error:', error);
    return NextResponse.json({error: 'Failed to generate content', details: error.message}, {status: 500});
  }
}
