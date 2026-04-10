export const dynamic = 'force-dynamic';

import {getDb} from '@/lib/neon';
import {NextResponse} from 'next/server';

async function ensureTable() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS pdf_templates (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      file_name   TEXT NOT NULL,
      pdf_base64  TEXT NOT NULL,
      page_count  INTEGER DEFAULT 1,
      fields      JSONB DEFAULT '[]',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// GET — list all templates (omit pdfBase64 for speed)
export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`
      SELECT id, name, description, file_name, page_count, fields, created_at, updated_at
      FROM pdf_templates
      ORDER BY created_at DESC
    `;
    // Normalise to camelCase for the frontend
    const templates = rows.map(r => ({
      _id: String(r.id),
      name: r.name,
      description: r.description,
      fileName: r.file_name,
      pageCount: r.page_count,
      fields: r.fields,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return NextResponse.json({templates});
  } catch (error) {
    console.error('Templates GET error:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}

// POST — create a new template
export async function POST(request: Request) {
  try {
    await ensureTable();
    const sql = getDb();
    const {name, description = '', fileName, pdfBase64, pageCount = 1, fields = []} = await request.json();

    if (!name || !pdfBase64) {
      return NextResponse.json({error: 'name and pdfBase64 are required'}, {status: 400});
    }

    const [row] = await sql`
      INSERT INTO pdf_templates (name, description, file_name, pdf_base64, page_count, fields)
      VALUES (${name}, ${description}, ${fileName}, ${pdfBase64}, ${pageCount}, ${JSON.stringify(fields)})
      RETURNING id, name, description, file_name, page_count, fields, created_at
    `;

    return NextResponse.json(
      {
        template: {
          _id: String(row.id),
          name: row.name,
          description: row.description,
          fileName: row.file_name,
          pageCount: row.page_count,
          fields: row.fields,
          createdAt: row.created_at,
        },
      },
      {status: 201},
    );
  } catch (error) {
    console.error('Templates POST error:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
