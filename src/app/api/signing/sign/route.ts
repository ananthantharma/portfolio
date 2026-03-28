export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {getDb} from '@/lib/neon';

// GET document info by signing token (public - no auth required)
export async function GET(req: Request) {
  const {searchParams} = new URL(req.url);
  const rawToken = searchParams.get('token');
  const token = rawToken?.trim();

  if (!token) {
    return NextResponse.json({error: 'Token required'}, {status: 400});
  }

  const sql = getDb();

  try {
    // Find recipient by token
    const recipients = await sql`
      SELECT r.*, d.title, d.pdf_url, d.status as doc_status, d.owner_email, d.message
      FROM recipients r
      JOIN documents d ON d.id = r.document_id
      WHERE r.token = ${token}
    `;

    if (!recipients.length) {
      console.log('Invalid token attempt:', token);
      return NextResponse.json({error: `Invalid or expired signing link (Token: ${token.substring(0, 10)}...)`}, {status: 404});
    }

    const recipient = recipients[0];

    // Get fields for this recipient
    const fields = await sql`
      SELECT * FROM fields WHERE recipient_id = ${recipient.id} ORDER BY page, created_at
    `;

    // Mark as viewed
    if (recipient.status === 'SENT') {
      await sql`UPDATE recipients SET status = 'VIEWED' WHERE id = ${recipient.id}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        recipient: {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          status: recipient.status,
          signed_at: recipient.signed_at,
        },
        document: {
          id: recipient.document_id,
          title: recipient.title,
          pdf_url: recipient.pdf_url,
          status: recipient.doc_status,
          message: recipient.message,
          owner_email: recipient.owner_email,
        },
        fields,
      },
    });
  } catch (error) {
    console.error('Error fetching signing data:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}

// POST submit signature (public - token-based auth)
export async function POST(req: Request) {
  const sql = getDb();
  const body = await req.json();
  const {token: rawToken, signatures} = body;
  const token = rawToken?.trim();
  // signatures: [{field_id, value}]

  if (!token || !signatures || !signatures.length) {
    return NextResponse.json({error: 'Token and signatures required'}, {status: 400});
  }

  try {
    // Verify token
    const recipients = await sql`
      SELECT r.*, d.id as doc_id
      FROM recipients r
      JOIN documents d ON d.id = r.document_id
      WHERE r.token = ${token} AND r.status != 'SIGNED'
    `;

    if (!recipients.length) {
      return NextResponse.json({error: 'Invalid token or already signed'}, {status: 400});
    }

    const recipient = recipients[0];

    // Apply each signature
    for (const sig of signatures) {
      await sql`
        UPDATE fields SET value = ${sig.value}, inserted = true
        WHERE id = ${sig.field_id} AND recipient_id = ${recipient.id}
      `;
    }

    // Mark recipient as signed
    await sql`UPDATE recipients SET status = 'SIGNED', signed_at = NOW() WHERE id = ${recipient.id}`;

    // Check if all recipients have signed
    const pending = await sql`
      SELECT COUNT(*) as count FROM recipients 
      WHERE document_id = ${recipient.doc_id} AND status != 'SIGNED'
    `;

    if (parseInt(pending[0].count) === 0) {
      // All signed — mark document as completed
      await sql`UPDATE documents SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = ${recipient.doc_id}`;
    }

    return NextResponse.json({success: true, message: 'Document signed successfully'});
  } catch (error) {
    console.error('Error submitting signature:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
