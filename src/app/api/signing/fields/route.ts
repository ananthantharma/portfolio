export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {getDb} from '@/lib/neon';

// POST add/update fields for a document
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();
  const body = await req.json();
  const {document_id, recipient_id, type = 'SIGNATURE', page = 1, pos_x, pos_y, width = 200, height = 60} = body;

  if (!document_id || !recipient_id) {
    return NextResponse.json({error: 'document_id and recipient_id are required'}, {status: 400});
  }

  try {
    const result = await sql`
      INSERT INTO fields (document_id, recipient_id, type, page, pos_x, pos_y, width, height)
      VALUES (${document_id}, ${recipient_id}, ${type}, ${page}, ${pos_x}, ${pos_y}, ${width}, ${height})
      RETURNING *
    `;

    return NextResponse.json({success: true, data: result[0]}, {status: 201});
  } catch (error) {
    console.error('Error adding field:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}

// PUT update field position/value
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();
  const body = await req.json();
  const {id, pos_x, pos_y, width, height, value, inserted, page} = body;

  if (!id) {
    return NextResponse.json({error: 'Field id is required'}, {status: 400});
  }

  try {
    const result = await sql`
      UPDATE fields SET
        pos_x = COALESCE(${pos_x ?? null}, pos_x),
        pos_y = COALESCE(${pos_y ?? null}, pos_y),
        width = COALESCE(${width ?? null}, width),
        height = COALESCE(${height ?? null}, height),
        page = COALESCE(${page ?? null}, page),
        value = COALESCE(${value ?? null}, value),
        inserted = COALESCE(${inserted ?? null}, inserted)
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({success: true, data: result[0]});
  } catch (error) {
    console.error('Error updating field:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}

// DELETE field
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
    await sql`DELETE FROM fields WHERE id = ${id}`;
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting field:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
