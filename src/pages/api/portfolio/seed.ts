import type {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import {authOptions} from '@/lib/auth';
import PortfolioEducation from '@/models/PortfolioEducation';
import PortfolioExperience from '@/models/PortfolioExperience';
import PortfolioProfile from '@/models/PortfolioProfile';
import PortfolioSkillGroup from '@/models/PortfolioSkillGroup';

const SEED_PROFILE = {
  name: 'Ananthan Tharmavelautham',
  metaTitle: "Ananthan's Site",
  metaDescription: 'Ananthan Tharmavelautham',
  heroDescription1:
    "I'm a Toronto based Supply Chain Professional, currently working at Ontario Power Generation supporting construction and engineering procurement, supply chain management, project management, and category management.",
  heroDescription2:
    "In my free time, you can catch me playing Chess, working on Coding Projects, or exploring beautiful Toronto.",
  contactHeaderText: 'Get in touch.',
  contactDescription:
    "Hey there! Thanks for stopping by. If you'd like to get in touch, the best way to reach me is through the contact form below. I'm looking forward to hearing from you!",
  contactItems: [
    {type: 'Email', text: 'ananthan.tharm@gmail.com', href: 'mailto:ananthan.tharm@gmail.com'},
    {
      type: 'Location',
      text: 'Toronto, ON, Canada',
      href: 'https://www.google.ca/maps/place/Toronto,+ON/@43.7182639,-79.7076927,10z',
    },
    {type: 'Instagram', text: '@ananthan.tharma', href: 'https://www.instagram.com/ananthan.tharma/'},
    {type: 'Github', text: 'ananthantharma', href: 'https://github.com/ananthantharma'},
  ],
  socialLinks: [
    {label: 'Github', iconKey: 'Github', href: 'https://github.com/ananthantharma', order: 0},
    {
      label: 'LinkedIn',
      iconKey: 'LinkedIn',
      href: 'https://www.linkedin.com/in/ananthan-tharmavelautham-p-eng-mba-pmp-cscp-26218493/',
      order: 1,
    },
    {label: 'Instagram', iconKey: 'Instagram', href: 'https://www.instagram.com/ananthan.tharma/', order: 2},
    {label: 'Twitter', iconKey: 'Twitter', href: 'https://twitter.com/bloodripp', order: 3},
  ],
};

const SEED_EXPERIENCES = [
  {
    date: 'Dec 2025 - Present',
    location: 'Ontario Power Generation',
    title: 'Senior Manager, Supply Chain',
    imageKey: 'opg',
    order: 0,
    showInHeroTimeline: true,
    content: 'Leading supply chain strategy and operations at Ontario Power Generation.',
  },
  {
    date: 'July 2024 - Dec 2025',
    location: 'Hydro One',
    title: 'Manager, IT Procurement',
    imageKey: 'hydroone',
    order: 1,
    showInHeroTimeline: true,
    content: 'Managed IT procurement and vendor relationships at Hydro One.',
  },
  {
    date: 'Sept 2022 - July 2024',
    location: 'Hydro One',
    title: 'Sourcing Category Lead',
    imageKey: 'hydroone',
    order: 2,
    showInHeroTimeline: true,
    content:
      'Specialize in contract administration and procurement strategy. Successfully navigated post-pandemic supply chain constraints, achieving optimal contract terms and conditions.',
  },
  {
    date: 'October 2021 - Sept 2022',
    location: 'Ontario Power Generation',
    title: 'Senior Procurement Specialist',
    imageKey: 'opg',
    order: 3,
    showInHeroTimeline: true,
    content:
      'Responsible for planning and coordinating the procurement of technically complex engineering construction contracts. Developed procurement strategies that considered market conditions and end-user needs.',
  },
  {
    date: 'November 2018 - October 2021',
    location: 'Ontario Power Generation',
    title: 'First Line Manager',
    imageKey: 'opg',
    order: 4,
    showInHeroTimeline: true,
    content:
      'Supervised subordinates and ensured programs were implemented effectively. Provided advice and guidance on procurement strategies and risk management. Offered analytical and strategic supply planning support for complex projects.',
  },
  {
    date: 'May 2017 - November 2018',
    location: 'Canadian Nuclear Laboratories',
    title: 'Contract Officer',
    imageKey: 'cnl',
    order: 5,
    showInHeroTimeline: true,
    content:
      'Managed the tendering process, including drafting of contractual documents and evaluation of bids. Offered strategic recommendations on pricing and contract strategy for high-value, complex projects.',
  },
  {
    date: 'September 2014 - May 2017',
    location: 'Atomic Energy of Canada Ltd.',
    title: 'Contract Administrator',
    imageKey: 'aecl',
    order: 6,
    showInHeroTimeline: true,
    content:
      'Developed and led the implementation of a unique reporting tool for project managers. Managed post-award contract administration, ensuring compliance and drafting change orders as needed.',
  },
];

const SEED_EDUCATION = [
  {date: '2023', location: 'Carleton University', title: 'Master of Business Administration (MBA)', imageKey: 'carleton', order: 0},
  {date: '2022', location: 'Professional Engineers Ontario', title: 'Professional Engineer (P.Eng.)', imageKey: 'peo', order: 1},
  {date: '2022', location: 'Centennial College', title: 'Software Engineering Technology', imageKey: 'centennial', order: 2},
  {date: '2021', location: 'Osgoode Hall Law School', title: 'Certificate in Public Procurement Law', imageKey: '', order: 3},
  {date: '2019', location: 'APICS', title: 'Certified Supply Chain Professional (CSCP)', imageKey: 'apics', order: 4},
  {date: '2019', location: 'Project Management Institute', title: 'Project Management Professional (PMP)', imageKey: 'pmp', order: 5},
  {
    date: '2017',
    location: 'Ontario Tech University',
    title: 'Bachelor of Engineering (B.Eng), Nuclear Engineering',
    imageKey: 'uoit',
    order: 6,
  },
];

const SEED_SKILL_GROUPS = [
  {
    name: 'Contract & Procurement Management',
    order: 0,
    skills: [
      {name: 'Contract Administration', level: 9},
      {name: 'Procurement Strategy', level: 9},
      {name: 'Stakeholder Management', level: 8},
      {name: 'Cost Optimization', level: 8},
    ],
  },
  {
    name: 'Project Management',
    order: 1,
    skills: [
      {name: 'Project Coordination', level: 9},
      {name: 'Risk Management', level: 8},
      {name: 'Budgeting & Scheduling', level: 8},
    ],
  },
  {
    name: 'Software Engineering',
    order: 2,
    skills: [
      {name: 'Data Analysis', level: 7},
      {name: 'Process Automation', level: 6},
    ],
  },
  {
    name: 'Languages',
    order: 3,
    skills: [
      {name: 'English', level: 10},
      {name: 'Tamil', level: 7},
    ],
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({error: 'Unauthorized'});

  try {
    await dbConnect();

    await Promise.all([
      PortfolioProfile.deleteMany({}),
      PortfolioExperience.deleteMany({}),
      PortfolioEducation.deleteMany({}),
      PortfolioSkillGroup.deleteMany({}),
    ]);

    await Promise.all([
      PortfolioProfile.create(SEED_PROFILE),
      PortfolioExperience.insertMany(SEED_EXPERIENCES),
      PortfolioEducation.insertMany(SEED_EDUCATION),
      PortfolioSkillGroup.insertMany(SEED_SKILL_GROUPS),
    ]);

    return res.json({
      success: true,
      message: 'Portfolio data seeded successfully',
      counts: {
        experiences: SEED_EXPERIENCES.length,
        education: SEED_EDUCATION.length,
        skillGroups: SEED_SKILL_GROUPS.length,
      },
    });
  } catch (error) {
    console.error('Portfolio seed error:', error);
    return res.status(500).json({error: 'Failed to seed portfolio data'});
  }
}
