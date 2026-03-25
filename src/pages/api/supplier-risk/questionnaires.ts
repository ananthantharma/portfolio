import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next';

import dbConnect from '@/lib/dbConnect';
import RiskQuestionnaire from '@/models/RiskQuestionnaire';
import Supplier from '@/models/Supplier';
import {authOptions} from '@/lib/auth';

// Standard due-diligence questions
export const STANDARD_QUESTIONS = [
  {id: 'fin_1', section: 'Financial', question: 'Do you have audited financial statements for the past 3 years?'},
  {id: 'fin_2', section: 'Financial', question: 'What is your current debt-to-equity ratio?'},
  {id: 'fin_3', section: 'Financial', question: 'Have you filed for bankruptcy in the last 10 years?'},
  {id: 'ops_1', section: 'Operational', question: 'Do you have a documented Business Continuity Plan (BCP)?'},
  {id: 'ops_2', section: 'Operational', question: 'What is your on-time delivery rate over the last 12 months?'},
  {id: 'ops_3', section: 'Operational', question: 'Do you have backup/alternate manufacturing sites?'},
  {id: 'ops_4', section: 'Operational', question: 'What quality certifications do you hold (ISO 9001, etc.)?'},
  {id: 'cmp_1', section: 'Compliance', question: 'Are you compliant with all applicable export control regulations?'},
  {id: 'cmp_2', section: 'Compliance', question: 'Do you have an Anti-Bribery and Corruption (ABC) policy?'},
  {id: 'cmp_3', section: 'Compliance', question: 'Have you faced regulatory sanctions or fines in the last 5 years?'},
  {id: 'esg_1', section: 'ESG', question: 'Do you have a documented Environmental Policy?'},
  {id: 'esg_2', section: 'ESG', question: 'Do you prohibit child and forced labor in your supply chain?'},
  {id: 'esg_3', section: 'ESG', question: 'Have you set any greenhouse gas reduction targets?'},
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({error: 'Unauthorized'});
  const userEmail = session.user.email;

  await dbConnect();

  if (req.method === 'GET') {
    const {supplierId} = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {userEmail};
    if (supplierId) filter.supplierId = supplierId;
    const questionnaires = await RiskQuestionnaire.find(filter).sort({createdAt: -1}).lean();
    return res.status(200).json(questionnaires);
  }

  if (req.method === 'POST') {
    const {supplierId, dueDate, notes} = req.body;
    const supplier = await Supplier.findOne({_id: supplierId, userEmail});
    if (!supplier) return res.status(404).json({error: 'Supplier not found'});

    const answers = STANDARD_QUESTIONS.map(q => ({
      questionId: q.id,
      question: q.question,
      answer: '',
    }));

    const questionnaire = new RiskQuestionnaire({
      userEmail,
      supplierId,
      supplierName: supplier.name,
      status: 'Sent',
      answers,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
    });
    await questionnaire.save();
    return res.status(201).json(questionnaire);
  }

  if (req.method === 'PUT') {
    const {questionnaireId, answers, status, notes} = req.body;
    const q = await RiskQuestionnaire.findOne({_id: questionnaireId, userEmail});
    if (!q) return res.status(404).json({error: 'Questionnaire not found'});

    if (answers) q.answers = answers;
    if (status) q.status = status;
    if (notes) q.notes = notes;
    if (status === 'Completed') q.completedAt = new Date();

    await q.save();
    return res.status(200).json(q);
  }

  return res.status(405).json({error: 'Method not allowed'});
}
