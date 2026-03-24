export const dynamic = "force-dynamic";
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import SavedPrompt from '@/models/SavedPrompt';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  await dbConnect();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prompt = await SavedPrompt.findOne({
      userId: session.user?.email,
      promptType: 'organize',
    });

    // Default prompt if none exists
    const defaultPrompt =
      'Analyze the text below and organize it into a structured format. Use headings, bullet points, and clear sections. If there are dates or tasks, highlight them.';

    return NextResponse.json({
      prompt: prompt ? prompt.content : defaultPrompt,
    });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json({error: 'Failed to fetch prompt'}, {status: 500});
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const {prompt} = await req.json();
  if (!prompt) return NextResponse.json({error: 'Prompt is required'}, {status: 400});

  await dbConnect();
  try {
    await SavedPrompt.findOneAndUpdate(
      {userId: session.user?.email, promptType: 'organize'},
      {content: prompt, lastUpdated: new Date()},
      {upsert: true, new: true},
    );
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error saving prompt:', error);
    return NextResponse.json({error: 'Failed to save prompt'}, {status: 500});
  }
}
