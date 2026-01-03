/* eslint-disable object-curly-spacing */
import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next';

import dbConnect from '../../../lib/dbConnect';
import Password from '../../../models/Password';
import {authOptions} from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({error: 'Not authenticated'});
  }

  const {id} = req.query;

  // Connect to the database
  await dbConnect();

  if (req.method === 'PUT') {
    try {
      const {title, site, username, password, notes} = req.body;
      const updatedPassword = await Password.findOneAndUpdate(
        {_id: id},
        {title, site, username, password, notes},
        {new: true},
      );

      if (!updatedPassword) {
        return res.status(404).json({error: 'Password not found'});
      }

      return res.status(200).json(updatedPassword);
    } catch (error) {
      return res.status(500).json({error: 'Failed to update password'});
    }
  } else if (req.method === 'DELETE') {
    try {
      const deletedPassword = await Password.findOneAndDelete({_id: id});

      if (!deletedPassword) {
        return res.status(404).json({error: 'Password not found'});
      }

      return res.status(200).json({message: 'Password deleted'});
    } catch (error) {
      return res.status(500).json({error: 'Failed to delete password'});
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
