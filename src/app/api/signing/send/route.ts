export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {getDb} from '@/lib/neon';

// POST send document for signing (emails all recipients)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const sql = getDb();
  const body = await req.json();
  const {document_id} = body;

  if (!document_id) {
    return NextResponse.json({error: 'document_id is required'}, {status: 400});
  }

  try {
    // Verify ownership and get doc
    const docs = await sql`
      SELECT * FROM documents WHERE id = ${document_id} AND owner_email = ${session.user.email}
    `;
    if (!docs.length) {
      return NextResponse.json({error: 'Document not found'}, {status: 404});
    }

    const doc = docs[0];

    // Get recipients
    const recipients = await sql`
      SELECT * FROM recipients WHERE document_id = ${document_id} AND status = 'NOT_SENT'
    `;

    if (!recipients.length) {
      return NextResponse.json({error: 'No unsent recipients found'}, {status: 400});
    }

    // Check fields exist
    const fields = await sql`
      SELECT * FROM fields WHERE document_id = ${document_id}
    `;
    if (!fields.length) {
      return NextResponse.json({error: 'No signature fields placed. Add fields before sending.'}, {status: 400});
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://yoursite.com';
    const resendKey = process.env.RESEND_API_KEY;

    const sentRecipients = [];

    for (const recipient of recipients) {
      const signingUrl = `${baseUrl}/sign/${recipient.token}`;

      if (resendKey) {
        // Send real email via Resend
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: 'SignDocs <noreply@ananthan.org>',
              to: [recipient.email],
              subject: `Please sign: ${doc.title}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                      <span style="color: white; font-size: 20px; font-weight: 800;">S</span>
                    </div>
                    <h1 style="font-size: 20px; color: #111; margin: 0;">Document Signing Request</h1>
                  </div>
                  <p style="color: #444; font-size: 15px; line-height: 1.6;">
                    Hi <strong>${recipient.name}</strong>,
                  </p>
                  <p style="color: #444; font-size: 15px; line-height: 1.6;">
                    <strong>${session.user.name || session.user.email}</strong> has sent you 
                    "<strong>${doc.title}</strong>" for your signature.
                  </p>
                  ${doc.message ? `<p style="color: #666; font-size: 14px; background: #f5f5f5; padding: 16px; border-radius: 8px; border-left: 3px solid #6366f1;">${doc.message}</p>` : ''}
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${signingUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">
                      Review & Sign Document
                    </a>
                  </div>
                  <p style="color: #999; font-size: 12px; text-align: center;">
                    This link is unique to you. Do not forward it.
                  </p>
                </div>
              `,
            }),
          });

          if (!emailRes.ok) {
            console.error('Resend error:', await emailRes.text());
          }
        } catch (emailError) {
          console.error('Email send failed for', recipient.email, emailError);
        }
      } else {
        console.log(`[DEV] Signing link for ${recipient.email}: ${signingUrl}`);
      }

      // Update recipient status
      await sql`UPDATE recipients SET status = 'SENT' WHERE id = ${recipient.id}`;
      sentRecipients.push({...recipient, status: 'SENT', signingUrl});
    }

    // Update document status
    await sql`UPDATE documents SET status = 'PENDING', updated_at = NOW() WHERE id = ${document_id}`;

    return NextResponse.json({
      success: true,
      message: `Sent to ${sentRecipients.length} recipients`,
      data: sentRecipients,
    });
  } catch (error) {
    console.error('Error sending document:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
