import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth';
import {ObjectId} from 'mongodb';

import {authOptions} from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

const ADMIN_EMAIL = 'lankanprinze@gmail.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({error: 'Method not allowed'});

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || session.user.email.toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({error: 'Admin access required'});
  }

  const {id} = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({error: 'Missing user id'});

  try {
    const client = await clientPromise;
    const db = client.db('qt_portfolio');

    const user = await db.collection('users').findOne({_id: new ObjectId(id)});
    if (!user) return res.status(404).json({error: 'User not found'});

    // Safety: never delete the admin account
    if (user.email?.toLowerCase() === ADMIN_EMAIL) {
      return res.status(403).json({error: 'Cannot delete the admin account'});
    }

    // Delete user doc, their accounts, and sessions
    await Promise.all([
      db.collection('users').deleteOne({_id: new ObjectId(id)}),
      db.collection('accounts').deleteMany({userId: new ObjectId(id)}),
      db.collection('sessions').deleteMany({userId: new ObjectId(id)}),
    ]);

    return res.status(200).json({success: true});
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({error: 'Internal server error'});
  }
}
