import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next';

import dbConnect from '@/lib/dbConnect';
import RiskAlert from '@/models/RiskAlert';
import Supplier, {ISupplier} from '@/models/Supplier';
import {authOptions} from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'});

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({error: 'Unauthorized'});
  const userEmail = session.user.email;

  await dbConnect();

  const suppliersRaw = await Supplier.find({userEmail}).lean();
  const suppliers = suppliersRaw as unknown as ISupplier[];
  const alerts = await RiskAlert.find({userEmail, isResolved: false}).sort({createdAt: -1}).limit(10).lean();

  const total = suppliers.length;
  const byRisk = {
    Low: suppliers.filter(s => s.riskLevel === 'Low').length,
    Medium: suppliers.filter(s => s.riskLevel === 'Medium').length,
    High: suppliers.filter(s => s.riskLevel === 'High').length,
    Critical: suppliers.filter(s => s.riskLevel === 'Critical').length,
  };
  const byStatus = {
    Active: suppliers.filter(s => s.status === 'Active').length,
    Onboarding: suppliers.filter(s => s.status === 'Onboarding').length,
    'Under Review': suppliers.filter(s => s.status === 'Under Review').length,
    Suspended: suppliers.filter(s => s.status === 'Suspended').length,
    Inactive: suppliers.filter(s => s.status === 'Inactive').length,
  };

  const avgScore =
    total > 0 ? Math.round(suppliers.reduce((sum, s) => sum + (s.overallScore || 0), 0) / total) : 0;

  // Category breakdown
  const categoryMap: Record<string, {count: number; totalScore: number}> = {};
  for (const s of suppliers) {
    if (!categoryMap[s.category]) categoryMap[s.category] = {count: 0, totalScore: 0};
    categoryMap[s.category].count++;
    categoryMap[s.category].totalScore += s.overallScore || 0;
  }
  const byCategory = Object.entries(categoryMap).map(([name, val]) => ({
    name,
    count: val.count,
    avgScore: Math.round(val.totalScore / val.count),
  }));

  // Top risky suppliers
  const topRisky = [...suppliers]
    .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
    .slice(0, 5)
    .map(s => ({
      _id: s._id,
      name: s.name,
      country: s.country,
      category: s.category,
      overallScore: s.overallScore,
      riskLevel: s.riskLevel,
    }));

  const unreadAlerts = await RiskAlert.countDocuments({userEmail, isRead: false});
  const criticalAlerts = await RiskAlert.countDocuments({
    userEmail,
    severity: 'Critical',
    isResolved: false,
  });

  return res.status(200).json({
    total,
    byRisk,
    byStatus,
    avgScore,
    byCategory,
    topRisky,
    recentAlerts: alerts,
    unreadAlerts,
    criticalAlerts,
  });
}
