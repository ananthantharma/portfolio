export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {getDb} from '@/lib/neon';

// GET single document with recipients and fields
export async function GET(_req: Request, {params}: {params: {id: string}}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();
  const {id} = params;

  try {
    const docs = await sql`SELECT * FROM documents WHERE id = ${id}`;
    if (!docs.length) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    const doc = docs[0];

    // Verify ownership OR allow public access for signing (tokens checked in sign route)
    if (doc.owner_email !== session.user.email) {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }

    const recipients = await sql`
      SELECT * FROM recipients WHERE document_id = ${id} ORDER BY created_at
    `;

    const fields = await sql`
      SELECT * FROM fields WHERE document_id = ${id} ORDER BY page, created_at
    `;

    return NextResponse.json({
      success: true,
      data: {...doc, recipients, fields},
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}

// PUT update document
export async function PUT(req: Request, {params}: {params: {id: string}}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();
  const {id} = params;
  const body = await req.json();

  try {
    const {title, status, message} = body;

    const result = await sql`
      UPDATE documents 
      SET 
        title = COALESCE(${title || null}, title),
        status = COALESCE(${status || null}, status),
        message = COALESCE(${message || null}, message),
        updated_at = NOW(),
        completed_at = CASE WHEN ${status || ''} = 'COMPLETED' THEN NOW() ELSE completed_at END
      WHERE id = ${id} AND owner_email = ${session.user.email}
      RETURNING *
    `;

    if (!result.length) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    return NextResponse.json({success: true, data: result[0]});
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}

// DELETE document
export async function DELETE(_req: Request, {params}: {params: {id: string}}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();
  const {id} = params;

  try {
    await sql`DELETE FROM documents WHERE id = ${id} AND owner_email = ${session.user.email}`;
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
