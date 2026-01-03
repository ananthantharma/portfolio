/* eslint-disable simple-import-sort/imports */
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {analyzeInvoice} from '@/lib/gemini';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const ALLOWED_EMAILS = ['lankanprinze@gmail.com', 'saikantha@gmail.com'];
    if (!ALLOWED_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        {
          error: 'AI feature restricted: Your account is not authorized to use the scanner.',
        },
        {status: 403},
      );
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({error: 'Content-type must be multipart/form-data'}, {status: 400});
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({error: 'No file uploaded'}, {status: 400});
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({error: 'Server configuration error: Missing API Key'}, {status: 500});
    }

    // Call Gemini to analyze the image
    const analysisText = await analyzeInvoice(apiKey, base64, mimeType);

    // Clean up markdown block if present (e.g. ```json ... ```)
    const jsonString = analysisText.replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonString);

    return NextResponse.json({success: true, data});
  } catch (error) {
    console.error('Invoice Scan Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
