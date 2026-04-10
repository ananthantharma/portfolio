import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next';

import dbConnect from '@/lib/dbConnect';
import RiskAlert from '@/models/RiskAlert';
import Supplier from '@/models/Supplier';
import {authOptions} from '@/lib/auth';

const DEMO_SUPPLIERS = [
  {
    name: 'Apex Electronics Co.',
    country: 'China',
    category: 'Electronics',
    contactName: 'Wei Zhang',
    contactEmail: 'wei.zhang@apexelec.cn',
    website: 'https://apexelec.cn',
    annualSpend: 4200000,
    status: 'Active',
    financialRisk: {score: 28, notes: 'Strong revenue growth, low debt'},
    operationalRisk: {score: 35, notes: 'Single manufacturing site, good on-time record'},
    complianceRisk: {score: 20, notes: 'ISO 9001 certified, no violations'},
    esgRisk: {score: 45, notes: 'No formal environmental policy'},
    tags: ['Tier 1', 'Strategic'],
  },
  {
    name: 'Vistara Textiles Ltd.',
    country: 'India',
    category: 'Raw Materials',
    contactName: 'Priya Sharma',
    contactEmail: 'priya@vistara.in',
    annualSpend: 1800000,
    status: 'Under Review',
    financialRisk: {score: 65, notes: 'Declining margins, recent credit downgrade'},
    operationalRisk: {score: 55, notes: 'Capacity constraints reported'},
    complianceRisk: {score: 40, notes: 'Labor audit pending'},
    esgRisk: {score: 70, notes: 'Wastewater violations reported in Q2'},
    tags: ['Tier 2'],
  },
  {
    name: 'Nordic Precision GmbH',
    country: 'Germany',
    category: 'Manufacturing',
    contactName: 'Hans Mueller',
    contactEmail: 'h.mueller@nordic-precision.de',
    website: 'https://nordic-precision.de',
    annualSpend: 6500000,
    status: 'Active',
    financialRisk: {score: 15, notes: 'AAA credit rating, 20yr track record'},
    operationalRisk: {score: 12, notes: 'ISO 9001 & 14001, 3 production sites'},
    complianceRisk: {score: 10, notes: 'Fully compliant, annual audits passed'},
    esgRisk: {score: 18, notes: 'Carbon neutral by 2025 target'},
    tags: ['Tier 1', 'Strategic', 'Preferred'],
  },
  {
    name: 'SunRise Logistics SA',
    country: 'Mexico',
    category: 'Logistics',
    contactName: 'Carlos Rivera',
    contactEmail: 'c.rivera@sunriselogistics.mx',
    annualSpend: 950000,
    status: 'Active',
    financialRisk: {score: 48, notes: 'Moderate leverage, stable revenue'},
    operationalRisk: {score: 62, notes: 'Port congestion impacting SLAs'},
    complianceRisk: {score: 30, notes: 'Customs compliance verified'},
    esgRisk: {score: 35, notes: 'Fleet electrification plan in place'},
    tags: ['Tier 2', 'Logistics'],
  },
  {
    name: 'Blackrock Minerals Corp.',
    country: 'South Africa',
    category: 'Raw Materials',
    contactName: 'Sipho Ndlovu',
    contactEmail: 'sipho@blackrockminerals.co.za',
    annualSpend: 3100000,
    status: 'Active',
    financialRisk: {score: 72, notes: 'High debt load, commodity price exposure'},
    operationalRisk: {score: 68, notes: 'Labour strikes disrupted operations Q3'},
    complianceRisk: {score: 55, notes: 'Mining license renewal under review'},
    esgRisk: {score: 80, notes: 'Environmental remediation order issued'},
    tags: ['Tier 1', 'Critical Supply'],
  },
  {
    name: 'ByteForge Software Inc.',
    country: 'USA',
    category: 'Software & IT',
    contactName: 'Rachel Kim',
    contactEmail: 'rkim@byteforge.io',
    website: 'https://byteforge.io',
    annualSpend: 720000,
    status: 'Active',
    financialRisk: {score: 22, notes: 'VC-backed, strong ARR growth'},
    operationalRisk: {score: 18, notes: '99.9% uptime SLA maintained'},
    complianceRisk: {score: 15, notes: 'SOC 2 Type II, GDPR compliant'},
    esgRisk: {score: 20, notes: 'Remote-first, low carbon footprint'},
    tags: ['Tier 2', 'Software'],
  },
  {
    name: 'AlphaChemical Vietnam',
    country: 'Vietnam',
    category: 'Chemicals',
    contactName: 'Nguyen Thi Lan',
    contactEmail: 'lan.nguyen@alphachem.vn',
    annualSpend: 2300000,
    status: 'Suspended',
    financialRisk: {score: 85, notes: 'Bankruptcy filing reported'},
    operationalRisk: {score: 90, notes: 'Factory fire destroyed 60% of capacity'},
    complianceRisk: {score: 78, notes: 'EPA equivalent violation — production halt'},
    esgRisk: {score: 88, notes: 'Chemical spill into local waterway'},
    tags: ['Tier 1', 'Critical Supply'],
  },
  {
    name: 'Meridian Packaging Co.',
    country: 'Canada',
    category: 'Packaging',
    contactName: 'Sophie Tremblay',
    contactEmail: 's.tremblay@meridianpack.ca',
    annualSpend: 580000,
    status: 'Onboarding',
    financialRisk: {score: 30, notes: 'Strong financials, family-owned'},
    operationalRisk: {score: 25, notes: 'New facility, capacity ramp underway'},
    complianceRisk: {score: 20, notes: 'All certifications in order'},
    esgRisk: {score: 22, notes: '100% recycled materials target'},
    tags: ['Tier 3', 'New'],
  },
];

const DEMO_ALERTS = [
  {
    severity: 'Critical' as const,
    category: 'Financial' as const,
    title: 'Bankruptcy Filing Reported',
    description:
      'AlphaChemical Vietnam has filed for bankruptcy protection under local insolvency law. Immediate escalation required.',
    source: 'Reuters',
  },
  {
    severity: 'Critical' as const,
    category: 'Operational' as const,
    title: 'Factory Fire — Production Halt',
    description:
      "A fire at AlphaChemical Vietnam's main facility has destroyed approximately 60% of production capacity. ETA for recovery: unknown.",
    source: 'Internal Report',
  },
  {
    severity: 'High' as const,
    category: 'ESG' as const,
    title: 'Environmental Remediation Order',
    description:
      'Blackrock Minerals Corp. has received a government remediation order for environmental damage at its Limpopo mine site.',
    source: 'Government DB',
  },
  {
    severity: 'High' as const,
    category: 'Operational' as const,
    title: 'Labour Strike — 3rd Week',
    description:
      'Ongoing labour strike at Blackrock Minerals Corp. entering its third week. Shipments delayed by 4–6 weeks.',
    source: 'News Feed',
  },
  {
    severity: 'Warning' as const,
    category: 'Financial' as const,
    title: 'Credit Rating Downgrade',
    description:
      'Vistara Textiles Ltd. has been downgraded from BB+ to BB- by S&P. Increased probability of payment default.',
    source: 'S&P Global',
  },
  {
    severity: 'Warning' as const,
    category: 'Compliance' as const,
    title: 'Labor Audit Scheduled',
    description:
      'A third-party labor audit has been scheduled for Vistara Textiles Ltd. following worker welfare complaints.',
    source: 'Internal Compliance',
  },
  {
    severity: 'Warning' as const,
    category: 'Operational' as const,
    title: 'Port Congestion Delays',
    description:
      'SunRise Logistics SA reports significant port congestion in Manzanillo affecting 12 active shipments.',
    source: 'Supplier Update',
  },
  {
    severity: 'Info' as const,
    category: 'Compliance' as const,
    title: 'Mining License Renewal Pending',
    description:
      'Blackrock Minerals Corp. mining license for the Limpopo site is up for renewal. Decision expected within 60 days.',
    source: 'Government DB',
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({error: 'Unauthorized'});
  const userEmail = session.user.email;

  await dbConnect();

  // Clear existing demo data
  await Supplier.deleteMany({userEmail});
  await RiskAlert.deleteMany({userEmail});

  // Create suppliers
  const supplierDocs = await Promise.all(
    DEMO_SUPPLIERS.map(async data => {
      const doc = new Supplier({
        ...data,
        userEmail,
        lastAssessed: new Date(),
        currency: 'USD',
      });
      await doc.save();
      return doc;
    }),
  );

  // Build name → id map for alerts
  const nameMap: Record<string, (typeof supplierDocs)[0]> = {};
  for (const s of supplierDocs) nameMap[s.name] = s;

  // Assign alerts to correct suppliers
  const alertAssignments: Array<{name: string; alertIdx: number}> = [
    {name: 'AlphaChemical Vietnam', alertIdx: 0},
    {name: 'AlphaChemical Vietnam', alertIdx: 1},
    {name: 'Blackrock Minerals Corp.', alertIdx: 2},
    {name: 'Blackrock Minerals Corp.', alertIdx: 3},
    {name: 'Vistara Textiles Ltd.', alertIdx: 4},
    {name: 'Vistara Textiles Ltd.', alertIdx: 5},
    {name: 'SunRise Logistics SA', alertIdx: 6},
    {name: 'Blackrock Minerals Corp.', alertIdx: 7},
  ];

  const alerts = await Promise.all(
    alertAssignments.map(({name, alertIdx}) => {
      const supplier = nameMap[name];
      const alertData = DEMO_ALERTS[alertIdx];
      return RiskAlert.create({
        ...alertData,
        userEmail,
        supplierId: supplier._id,
        supplierName: supplier.name,
        isRead: false,
        isResolved: false,
      });
    }),
  );

  return res.status(200).json({
    suppliers: supplierDocs.length,
    alerts: alerts.length,
    message: 'Demo data seeded successfully',
  });
}
