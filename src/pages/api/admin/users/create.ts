import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth';
import bcrypt from 'bcryptjs';

import {authOptions} from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

const ADMIN_EMAIL = 'lankanprinze@gmail.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || session.user.email.toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({error: 'Admin access required'});
  }

  const {name, email, password, permissions, expiresAt} = req.body;

  if (!email || !password) {
    return res.status(400).json({error: 'Email and password are required'});
  }
  if (password.length < 8) {
    return res.status(400).json({error: 'Password must be at least 8 characters'});
  }

  try {
    const client = await clientPromise;
    const db = client.db('qt_portfolio');

    // Check for duplicate
    const existing = await db.collection('users').findOne({email: email.toLowerCase()});
    if (existing) {
      return res.status(409).json({error: 'A user with that email already exists'});
    }

    const hash = await bcrypt.hash(password, 12);

    const doc = {
      name: name || email,
      email: email.toLowerCase(),
      username: email.toLowerCase(),
      password: hash,
      isCredentialsUser: true,
      emailVerified: new Date(),
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Permissions
      googleApiEnabled:  permissions?.googleApiEnabled  ?? true,
      openAiApiEnabled:  permissions?.openAiApiEnabled  ?? true,
      notesEnabled:      permissions?.notesEnabled      ?? true,
      secureLoginEnabled: permissions?.secureLoginEnabled ?? true,
      financeEnabled:    permissions?.financeEnabled    ?? true,
      invoiceEnabled:    permissions?.invoiceEnabled    ?? true,
      formFillEnabled:   permissions?.formFillEnabled   ?? true,
      // Optional expiry
      ...(expiresAt ? {expiresAt: new Date(expiresAt)} : {}),
    };

    const result = await db.collection('users').insertOne(doc);

    return res.status(201).json({
      success: true,
      userId: result.insertedId.toString(),
      email: doc.email,
      name: doc.name,
    });
  } catch (err) {
    console.error('Error creating credentials user:', err);
    return res.status(500).json({error: 'Internal server error'});
  }
}
