import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next';

import dbConnect from '@/lib/dbConnect';
import RiskAlert from '@/models/RiskAlert';
import Supplier from '@/models/Supplier';
import {authOptions} from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({error: 'Unauthorized'});
  const userEmail = session.user.email;

  const {id} = req.query;
  await dbConnect();

  const supplier = await Supplier.findOne({_id: id, userEmail});
  if (!supplier) return res.status(404).json({error: 'Not found'});

  if (req.method === 'GET') {
    return res.status(200).json(supplier);
  }

  if (req.method === 'PUT') {
    const {
      name,
      country,
      category,
      contactName,
      contactEmail,
      website,
      annualSpend,
      currency,
      status,
      financialRisk,
      operationalRisk,
      complianceRisk,
      esgRisk,
      mitigationPlan,
      tags,
    } = req.body;

    if (name !== undefined) supplier.name = name;
    if (country !== undefined) supplier.country = country;
    if (category !== undefined) supplier.category = category;
    if (contactName !== undefined) supplier.contactName = contactName;
    if (contactEmail !== undefined) supplier.contactEmail = contactEmail;
    if (website !== undefined) supplier.website = website;
    if (annualSpend !== undefined) supplier.annualSpend = annualSpend;
    if (currency !== undefined) supplier.currency = currency;
    if (status !== undefined) supplier.status = status;
    if (financialRisk !== undefined) supplier.financialRisk = financialRisk;
    if (operationalRisk !== undefined) supplier.operationalRisk = operationalRisk;
    if (complianceRisk !== undefined) supplier.complianceRisk = complianceRisk;
    if (esgRisk !== undefined) supplier.esgRisk = esgRisk;
    if (mitigationPlan !== undefined) supplier.mitigationPlan = mitigationPlan;
    if (tags !== undefined) supplier.tags = tags;
    supplier.lastAssessed = new Date();

    await supplier.save();
    return res.status(200).json(supplier);
  }

  if (req.method === 'DELETE') {
    await Supplier.deleteOne({_id: id, userEmail});
    await RiskAlert.deleteMany({supplierId: id, userEmail});
    return res.status(200).json({success: true});
  }

  return res.status(405).json({error: 'Method not allowed'});
}
