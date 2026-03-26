import type {NextApiRequest, NextApiResponse} from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  const {name, email, message} = req.body as {name?: string; email?: string; message?: string};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({error: 'All fields are required'});
  }

  const user = process.env.CONTACT_EMAIL_USER;
  const pass = process.env.CONTACT_EMAIL_PASS;

  if (!user || !pass) {
    console.error('Missing CONTACT_EMAIL_USER or CONTACT_EMAIL_PASS env vars');
    return res.status(500).json({error: 'Email service not configured'});
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {user, pass},
    tls: {ciphers: 'SSLv3'},
  });

  try {
    await transporter.sendMail({
      from: `"Portfolio Contact" <${user}>`,
      to: 'ananthan@hotmail.ca',
      replyTo: email,
      subject: `New message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#333">New Portfolio Message</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;color:#666">Name</td><td style="padding:8px">${name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#666">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
          </table>
          <div style="margin-top:16px;padding:16px;background:#f5f5f5;border-radius:8px;white-space:pre-wrap">${message}</div>
        </div>
      `,
    });

    return res.status(200).json({success: true});
  } catch (err) {
    console.error('Failed to send email:', err);
    return res.status(500).json({error: 'Failed to send email'});
  }
}
