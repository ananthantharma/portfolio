export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {getDb} from '@/lib/neon';
import {put} from '@vercel/blob';

// GET all documents for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();

  try {
    const docs = await sql`
      SELECT d.*, 
        (SELECT COUNT(*) FROM recipients r WHERE r.document_id = d.id) as recipient_count,
        (SELECT COUNT(*) FROM recipients r WHERE r.document_id = d.id AND r.status = 'SIGNED') as signed_count,
        (SELECT COUNT(*) FROM fields f WHERE f.document_id = d.id) as field_count
      FROM documents d
      WHERE d.owner_email = ${session.user.email}
      ORDER BY d.created_at DESC
    `;

    return NextResponse.json({success: true, data: docs});
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}

// POST create new document (with PDF upload)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();

  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const file = formData.get('file') as File;

    if (!title || !file) {
      return NextResponse.json({error: 'Title and PDF file are required'}, {status: 400});
    }

    // Upload PDF to Vercel Blob
    const blob = await put(`signing/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Create document record
    const result = await sql`
      INSERT INTO documents (title, owner_email, pdf_url, status)
      VALUES (${title}, ${session.user.email}, ${blob.url}, 'DRAFT')
      RETURNING *
    `;

    return NextResponse.json({success: true, data: result[0]}, {status: 201});
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
