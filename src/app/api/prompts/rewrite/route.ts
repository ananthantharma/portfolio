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
      promptType: 'rewrite_system',
    });

    // Default System Instruction for Rewrite
    const defaultPrompt =
      "You are an expert editor. Rewrite the text to match the requested tone, style, and audience. Improve clarity, grammar, and flow while strictly adhering to the user's constraints.";

    return NextResponse.json({
      prompt: prompt ? prompt.content : defaultPrompt,
    });
  } catch (error) {
    console.error('Error fetching rewrite prompt:', error);
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
      {userId: session.user?.email, promptType: 'rewrite_system'},
      {content: prompt, lastUpdated: new Date()},
      {upsert: true, new: true},
    );
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error saving rewrite prompt:', error);
    return NextResponse.json({error: 'Failed to save prompt'}, {status: 500});
  }
}
