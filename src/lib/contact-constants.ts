export const CONTACT_POSITIONS = [
    'C-Suite / Executive',
    'Vice President (VP)',
    'Director',
    'Manager',
    'Senior / Lead',
    'Individual Contributor / Specialist',
    'Entry Level / Associate',
    'Intern / Trainee',
    'Consultant / Freelance'
];

export const CONTACT_DEPARTMENTS = [
    'Cloud & Platform Operations',
    'Commercial & Finance',
    'Cyber Security (IT/OT)',
    'Digital Systems / AI',
    'Enterprise Architecture',
    'Finance & Capital Accounting',
    'Governance & Legal',
    'Human Resources (Onboarding/Offboarding)',
    'Information Management (Data Privacy/Disposal)',
    'Infrastructure & Field Support',
    'Internal Audit',
    'IT & Technical Operations',
    'Legal & Contract Management',
    'Nuclear & Regulatory',
    'Nuclear (Operations)',
    'Nuclear Safety & Regulatory Compliance',
    'Original Equipment Manufacturers (OEMs)',
    'Privacy',
    'Project Management (Capital Projects)',
    'Reporting & Data Analytics',
    'Strategic Sourcing / Procurement',
    'Tax',
    'Value-Added Resellers (VARs)'
];

export const CONTACT_TYPES = ['Internal', 'External'];

// Defining a plain interface for frontend use to avoid Mongoose dependency there
export interface IContactBase {
    _id: string;
    name: string;
    company: string;
    phone?: string;
    email?: string;
    notes?: string;
    position?: string;
    department?: string;
    type?: 'Internal' | 'External';
    createdAt: Date;
    updatedAt: Date;
}
