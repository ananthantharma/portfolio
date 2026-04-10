export const dynamic = 'force-dynamic';

import {getDb} from '@/lib/neon';
import {NextResponse} from 'next/server';

// GET — full template including pdfBase64
export async function GET(_req: Request, {params}: {params: {id: string}}) {
  try {
    const sql = getDb();
    const [row] = await sql`SELECT * FROM pdf_templates WHERE id = ${Number(params.id)}`;
    if (!row) return NextResponse.json({error: 'Not found'}, {status: 404});

    return NextResponse.json({
      template: {
        _id: String(row.id),
        name: row.name,
        description: row.description,
        fileName: row.file_name,
        pdfBase64: row.pdf_base64,
        pageCount: row.page_count,
        fields: row.fields,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}

// PUT — update name / description / fields
export async function PUT(request: Request, {params}: {params: {id: string}}) {
  try {
    const sql = getDb();
    const {name, description, fields} = await request.json();

    const [row] = await sql`
      UPDATE pdf_templates
      SET
        name        = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        fields      = COALESCE(${fields ? JSON.stringify(fields) : null}::jsonb, fields),
        updated_at  = NOW()
      WHERE id = ${Number(params.id)}
      RETURNING id, name, description, file_name, page_count, fields, updated_at
    `;
    if (!row) return NextResponse.json({error: 'Not found'}, {status: 404});

    return NextResponse.json({
      template: {
        _id: String(row.id),
        name: row.name,
        description: row.description,
        fileName: row.file_name,
        pageCount: row.page_count,
        fields: row.fields,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}

// DELETE
export async function DELETE(_req: Request, {params}: {params: {id: string}}) {
  try {
    const sql = getDb();
    await sql`DELETE FROM pdf_templates WHERE id = ${Number(params.id)}`;
    return NextResponse.json({success: true});
  } catch (error) {
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
