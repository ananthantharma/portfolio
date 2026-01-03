import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  // 1. Verify Authentication & Admin Status
  if (!session || !session.user?.email || session.user.email.toLowerCase() !== 'lankanprinze@gmail.com') {
    return res.status(403).json({error: 'Unauthorized. Admin access required.'});
  }

  const {id} = req.query;

  await dbConnect();

  // 2. Handle PUT Request (Update Permissions)
  if (req.method === 'PUT') {
    try {
      const {googleApiEnabled, openAiApiEnabled, notesEnabled, secureLoginEnabled, financeEnabled, invoiceEnabled} =
        req.body;

      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          $set: {
            googleApiEnabled,
            openAiApiEnabled,
            notesEnabled,
            secureLoginEnabled,
            financeEnabled,
            invoiceEnabled,
          },
        },
        {new: true}, // Return updated document
      );

      if (!updatedUser) {
        return res.status(404).json({error: 'User not found'});
      }

      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Error updating permissions:', error);
      return res.status(500).json({error: 'Internal Server Error'});
    }
  }

  return res.status(405).json({error: 'Method Not Allowed'});
}
