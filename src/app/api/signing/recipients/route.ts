export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {getDb} from '@/lib/neon';

// POST add recipient to a document
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();
  const body = await req.json();
  const {document_id, name, email, role = 'SIGNER'} = body;

  if (!document_id || !name || !email) {
    return NextResponse.json({error: 'document_id, name, and email are required'}, {status: 400});
  }

  try {
    // Verify doc ownership
    const docs = await sql`SELECT id FROM documents WHERE id = ${document_id} AND owner_email = ${session.user.email}`;
    if (!docs.length) {
      return NextResponse.json({error: 'Document not found'}, {status: 404});
    }

    const result = await sql`
      INSERT INTO recipients (document_id, name, email, role)
      VALUES (${document_id}, ${name}, ${email}, ${role})
      RETURNING *
    `;

    return NextResponse.json({success: true, data: result[0]}, {status: 201});
  } catch (error) {
    console.error('Error adding recipient:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}

// DELETE recipient
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();
  const {searchParams} = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({error: 'id is required'}, {status: 400});
  }

  try {
    await sql`
      DELETE FROM recipients 
      WHERE id = ${id} 
      AND document_id IN (SELECT id FROM documents WHERE owner_email = ${session.user.email})
    `;
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting recipient:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
