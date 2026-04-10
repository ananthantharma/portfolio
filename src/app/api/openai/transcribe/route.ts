export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).openAiApiEnabled) {
      return NextResponse.json({error: 'Access Denied: Audio features restricted.'}, {status: 403});
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({error: 'No audio file provided'}, {status: 400});
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({error: 'OpenAI API key not configured'}, {status: 500});
    }

    const transcriptionFormData = new FormData();
    transcriptionFormData.append('file', file, 'audio.webm');
    transcriptionFormData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: transcriptionFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({error: errorData.error?.message || 'Whisper API Error'}, {status: response.status});
    }

    const data = await response.json();
    return NextResponse.json({text: data.text});
  } catch (error: any) {
    console.error('Transcription API Route Error:', error);
    return NextResponse.json({error: 'Failed to transcribe audio', details: error.message}, {status: 500});
  }
}
