export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {getDb} from '@/lib/neon';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();

  try {
    // Documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        owner_email TEXT NOT NULL,
        pdf_url TEXT,
        signed_pdf_url TEXT,
        message TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `;

    // Recipients table
    await sql`
      CREATE TABLE IF NOT EXISTS recipients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT DEFAULT 'SIGNER',
        status TEXT DEFAULT 'NOT_SENT',
        token TEXT UNIQUE,
        signed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Fields placed on the document
    await sql`
      CREATE TABLE IF NOT EXISTS fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'SIGNATURE',
        page INT NOT NULL DEFAULT 1,
        pos_x FLOAT NOT NULL DEFAULT 100,
        pos_y FLOAT NOT NULL DEFAULT 100,
        width FLOAT NOT NULL DEFAULT 200,
        height FLOAT NOT NULL DEFAULT 60,
        value TEXT,
        inserted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    return NextResponse.json({success: true, message: 'Database migrated successfully'});
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
