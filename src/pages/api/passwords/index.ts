/* eslint-disable object-curly-spacing */
import mongoose from 'mongoose';
import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next';

import Password from '../../../models/Password';
import {authOptions} from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({error: 'Not authenticated'});
  }

  // Ensure mongoose is connected (NextAuth adapter uses raw client, but we use Mongoose models)
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI as string);
  }

  if (req.method === 'GET') {
    try {
      const passwords = await Password.find({}).sort({createdAt: -1});
      return res.status(200).json(passwords);
    } catch (error) {
      return res.status(500).json({error: 'Failed to fetch passwords'});
    }
  } else if (req.method === 'POST') {
    try {
      const {title, site, username, password, notes} = req.body;
      if (!title) {
        return res.status(400).json({error: 'Title is required'});
      }

      const newPassword = await Password.create({
        userEmail: session.user.email,
        title,
        site,
        username,
        password, // In a real app, encrypt this!
        notes,
      });

      return res.status(201).json(newPassword);
    } catch (error) {
      return res.status(500).json({error: 'Failed to create password'});
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
