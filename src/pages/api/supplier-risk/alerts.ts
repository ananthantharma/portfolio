import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next';

import dbConnect from '@/lib/dbConnect';
import RiskAlert from '@/models/RiskAlert';
import {authOptions} from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({error: 'Unauthorized'});
  const userEmail = session.user.email;

  await dbConnect();

  if (req.method === 'GET') {
    const {supplierId, severity, category, isResolved, isRead, limit = '50'} = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {userEmail};
    if (supplierId) filter.supplierId = supplierId;
    if (severity) filter.severity = severity;
    if (category) filter.category = category;
    if (isResolved !== undefined) filter.isResolved = isResolved === 'true';
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const alerts = await RiskAlert.find(filter)
      .sort({createdAt: -1})
      .limit(Number(limit))
      .lean();
    return res.status(200).json(alerts);
  }

  if (req.method === 'POST') {
    const alert = new RiskAlert({...req.body, userEmail});
    await alert.save();
    return res.status(201).json(alert);
  }

  if (req.method === 'PATCH') {
    // Bulk mark as read
    const {ids, action} = req.body;
    if (action === 'markRead') {
      await RiskAlert.updateMany({_id: {$in: ids}, userEmail}, {isRead: true});
    } else if (action === 'resolve') {
      await RiskAlert.updateMany(
        {_id: {$in: ids}, userEmail},
        {isResolved: true, resolvedAt: new Date()},
      );
    }
    return res.status(200).json({success: true});
  }

  return res.status(405).json({error: 'Method not allowed'});
}
