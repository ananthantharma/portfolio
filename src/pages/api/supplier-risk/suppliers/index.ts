import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next';

import dbConnect from '@/lib/dbConnect';
import Supplier from '@/models/Supplier';
import {authOptions} from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({error: 'Unauthorized'});
  const userEmail = session.user.email;

  await dbConnect();

  if (req.method === 'GET') {
    const {search, riskLevel, status, category, sort = 'overallScore', order = 'desc'} = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {userEmail};
    if (riskLevel) filter.riskLevel = riskLevel;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.name = {$regex: search, $options: 'i'};

    const sortObj: Record<string, 1 | -1> = {[sort as string]: order === 'desc' ? -1 : 1};
    const suppliers = await Supplier.find(filter).sort(sortObj).lean();
    return res.status(200).json(suppliers);
  }

  if (req.method === 'POST') {
    const doc = new Supplier({...req.body, userEmail});
    await doc.save();
    return res.status(201).json(doc);
  }

  return res.status(405).json({error: 'Method not allowed'});
}
