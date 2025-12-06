/* eslint-disable object-curly-spacing */
/* eslint-disable simple-import-sort/imports */
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  FlagIcon,
  MapIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import GithubIcon from '../components/Icon/GithubIcon';
import InstagramIcon from '../components/Icon/InstagramIcon';
import LinkedInIcon from '../components/Icon/LinkedInIcon';
import TwitterIcon from '../components/Icon/TwitterIcon';
import heroImage from '../images/header-background.webp';
import profilepic from '../images/profilepic.jpg';
import testimonialImage from '../images/testimonial.webp';
import aeclLogo from '../images/Logo/AECL logo.png';
import apicsLogo from '../images/Logo/apics.png';
import carletonLogo from '../images/Logo/carleton.png';
import centennialLogo from '../images/Logo/centennial.png';
import cnlLogo from '../images/Logo/CNL Logo.png';
import hydroOneLogo from '../images/Logo/Hydro One logo.png';
import uoitLogo from '../images/Logo/Ontario University Logo.png';
import opgLogo from '../images/Logo/OPG logo.png';
import peoLogo from '../images/Logo/PEO.png';
import pmpLogo from '../images/Logo/PMP.png';
import {
  About,
  ContactSection,
  ContactType,
  Hero,
  HomepageMeta,
  SkillGroup,
  Social,
  TestimonialSection,
  TimelineItem,
} from './dataDef';

/**
 * Page meta data
 */
export const homePageMeta: HomepageMeta = {
  title: ' Resume Template',
  description: 'Ananthan Tharmavelautham',
};

/**
 * Section definition
 */
export const SectionId = {
  Hero: 'hero',
  About: 'about',
  Contact: 'contact',
  Stats: 'stats',
  Testimonials: 'testimonials',
} as const;

export type SectionId = (typeof SectionId)[keyof typeof SectionId];

const handleDownloadClick = () => {
  const userCode = window.prompt('Please enter the code:');

  if (userCode === '1992') {
    window.open('/assets/resume.pdf', '_blank');
  } else {
    alert('Incorrect code. Please try again.');
  }
};

/**
 * Hero section
 */
export const heroData: Hero = {
  imageSrc: heroImage,
  name: `I'm Ananthan Tharmavelautham.`,
  description: (
    <>
      <p className="prose-sm text-stone-200 sm:prose-base lg:prose-lg">
        I'm a Toronto based <strong className="text-stone-100">Supply Chain Professional</strong>, currently working at{' '}
        <strong className="text-stone-100">Hydro One</strong> supporting construction and engineering procurement,
        supply chain management, project management, and category management.
      </p>
      <p className="prose-sm text-stone-200 sm:prose-base lg:prose-lg">
        In my free time time, you can catch me playing <strong className="text-stone-100">Chess</strong>, working on{' '}
        <strong className="text-stone-100">Coding Projects</strong>, or exploring beautiful{' '}
        <strong className="text-stone-100">Toronto</strong>.
      </p>
    </>
  ),
  actions: [
    {
      text: 'Resume',
      primary: true,
      Icon: ArrowDownTrayIcon,
      onClick: handleDownloadClick,
    },
    {
      href: `#${SectionId.Contact}`,
      text: 'Contact',
      primary: false,
    },
  ],
};

/**
 * Hero Timeline (Work Experience)
 */
export const heroTimeline: TimelineItem[] = [
  {
    date: 'Dec 2025 - Present',
    location: 'Ontario Power Generation',
    title: 'Senior Manager, Supply Chain',
    image: opgLogo,
  },
  {
    date: 'July 2024 - Dec 2025',
    location: 'Hydro One',
    title: 'Manager, IT Procurement',
    image: hydroOneLogo,
  },
  {
    date: 'Sept 2022 - July 2023',
    location: 'Hydro One',
    title: 'Sourcing Category Lead',
    image: hydroOneLogo,
  },
  {
    date: 'October 2021 - Sept 2022',
    location: 'Ontario Power Generation',
    title: 'Senior Procurement Specialist',
    image: opgLogo,
  },
  {
    date: 'November 2018 - October 2021',
    location: 'Ontario Power Generation',
    title: 'First Line Manager',
    image: opgLogo,
  },
  {
    date: 'May 2017 - November 2018',
    location: 'Canadian Nuclear Laboratories',
    title: 'Contract Officer',
    image: cnlLogo,
  },
  {
    date: 'September 2014 - May 2017',
    location: 'Atomic Energy of Canada Ltd.',
    title: 'Contract Administrator',
    image: aeclLogo,
  },
];

/**
 * About section
 */
export const aboutData: About = {
  profileImageSrc: profilepic,
  description: `Certified as a P.Eng, PMP, and CSCP, I bring a unique blend of software engineering and procurement expertise to the table. With a track record of achieving over $75 million in procurement savings and a 40% increase in operational efficiency, I excel in contract management and stakeholder negotiations`,
  aboutItems: [
    {label: 'Location', text: 'Toronto, ON', Icon: MapIcon},
    {label: 'Age', text: '35', Icon: CalendarIcon},
    {label: 'Nationality', text: 'Canadian / Tamil', Icon: FlagIcon},
    {label: 'Interests', text: 'Chess, Coding, Photography, Gaming, Golf', Icon: SparklesIcon},
    {label: 'Study', text: 'University of Ontario I.T. ', Icon: AcademicCapIcon},
    {label: 'Employment', text: 'Hydro One', Icon: BuildingOffice2Icon},
  ],
};

/**
 * Skills section
 */
export const skills: SkillGroup[] = [
  {
    name: 'Contract & Procurement Management',
    skills: [
      {
        name: 'Contract Administration',
        level: 9,
      },
      {
        name: 'Procurement Strategy',
        level: 9,
      },
      {
        name: 'Stakeholder Management',
        level: 8,
      },
      {
        name: 'Cost Optimization',
        level: 8,
      },
    ],
  },
  {
    name: 'Project Management',
    skills: [
      {
        name: 'Project Coordination',
        level: 9,
      },
      {
        name: 'Risk Management',
        level: 8,
      },
      {
        name: 'Budgeting & Scheduling',
        level: 8,
      },
    ],
  },
  {
    name: 'Software Engineering',
    skills: [
      {
        name: 'Data Analysis',
        level: 7,
      },
      {
        name: 'Process Automation',
        level: 6,
      },
    ],
  },
  {
    name: 'Languages',
    skills: [
      {
        name: 'English',
        level: 10,
      },
      {
        name: 'Tamil',
        level: 7,
      },
    ],
  },
];

/**
 * Education & Credentials (Hero)
 */
export const heroEducation: TimelineItem[] = [
  {
    date: '2023',
    location: 'Carleton University',
    title: 'Master of Business Administration (MBA)',
    image: carletonLogo,
  },
  {
    date: '2022',
    location: 'Professional Engineers Ontario',
    title: 'Professional Engineer (P.Eng.)',
    image: peoLogo,
  },
  {
    date: '2022',
    location: 'Centennial College',
    title: 'Software Engineering Technology',
    image: centennialLogo,
  },
  {
    date: '2021',
    location: 'Osgoode Hall Law School',
    title: 'Certificate in Public Procurement Law',
  },
  {
    date: '2019',
    location: 'APICS',
    title: 'Certified Supply Chain Professional (CSCP)',
    image: apicsLogo,
  },
  {
    date: '2019',
    location: 'Project Management Institute',
    title: 'Project Management Professional (PMP)',
    image: pmpLogo,
  },
  {
    date: '2017',
    location: 'Ontario Tech University',
    title: 'Bachelor of Engineering (B.Eng), Nuclear Engineering',
    image: uoitLogo,
  },
];

export const experience: TimelineItem[] = [
  {
    date: 'Sept 2022 - Present',
    location: 'Hydro One, Toronto, ON',
    title: 'Sourcing Category Lead, Category Management',
    content: (
      <p>
        Specialize in contract administration and procurement strategy. Successfully navigated post-pandemic supply
        chain constraints, achieving optimal contract terms and conditions.
      </p>
    ),
  },
  {
    date: 'Mar 2021 – Sept 2022',
    location: 'Ontario Power Generation, Courtice, ON',
    title: 'Senior Procurement Specialist- Supply Chain',
    content: (
      <p>
        Responsible for planning and coordinating the procurement of technically complex engineering construction
        contracts. Developed procurement strategies that considered market conditions and end-user needs.
      </p>
    ),
  },
  {
    date: 'Feb 2019 - Mar 2021',
    location: 'Ontario Power Generation, Etobicoke, ON',
    title: 'First Line Manager, Renewable Generation - Supply Chain',
    content: (
      <p>
        Supervised subordinates and ensured programs were implemented effectively. Provided advice and guidance on
        procurement strategies and risk management. Offered analytical and strategic supply planning support for complex
        projects.
      </p>
    ),
  },
  {
    date: 'Oct 2013 - Oct 2015',
    location: 'Canadian Nuclear Laboratories Ltd., Port Hope, ON',
    title: 'Contract Officer',
    content: (
      <p>
        Managed the tendering process, including drafting of contractual documents and evaluation of bids. Offered
        strategic recommendations on pricing and contract strategy for high-value, complex projects.
      </p>
    ),
  },
  {
    date: 'Jan 2012 - Oct 2013',
    location: 'Atomic Energy of Canada Ltd., Chalk River, ON',
    title: 'Contract Administrator',
    content: (
      <p>
        Developed and led the implementation of a unique reporting tool for project managers. Managed post-award
        contract administration, ensuring compliance and drafting change orders as needed.
      </p>
    ),
  },
];

/**
 * Testimonial section
 */
export const testimonial: TestimonialSection = {
  imageSrc: testimonialImage,
  testimonials: [
    {
      name: 'Emily Johnson',
      text: "Ananthan is a procurement wizard. His strategic approach to contract management saved our department millions and increased efficiency by 40%. He's not just a team player; he's a team leader.",
      image: 'https://ui-avatars.com/api/?name=John+Doe&background=random',
    },
    {
      name: 'Jane Doe',
      text: 'Here you should write some nice things that someone has said about you. Encourage them to be specific and include important details. Notes about your leadership skills and performance are also great.',
      image: 'https://ui-avatars.com/api/?name=Jane+Doe&background=random',
    },
    {
      name: 'Someone else',
      text: 'Add several of these, and keep them as fresh as possible, but be sure to focus on quality testimonials with specific details, not just generic praise.',
      image: 'https://ui-avatars.com/api/?name=Someone+Else&background=random',
    },
  ],
};

/**
 * Contact section
 */

export const contact: ContactSection = {
  headerText: 'Get in touch.',
  description:
    "Hey there! Thanks for stopping by. If you'd like to get in touch, the best way to reach me is through the contact form below. I'm looking forward to hearing from you!",
  items: [
    {
      type: ContactType.Email,
      text: 'ananthan.tharm@gmail.com',
      href: 'mailto:ananthan.tharm@gmail.com',
    },
    {
      type: ContactType.Location,
      text: 'Toronto, ON, Canada',
      href: 'https://www.google.ca/maps/place/Toronto,+ON/@43.7182639,-79.7076927,10z/data=!3m1!4b1!4m6!3m5!1s0x89d4cb90d7c63ba5:0x323555502ab4c477!8m2!3d43.653226!4d-79.3831843!16zL20vMGg3aDY?entry=ttu',
    },
    {
      type: ContactType.Instagram,
      text: '@ananthan.tharma',
      href: 'https://www.instagram.com/ananthan.tharma/',
    },
    {
      type: ContactType.Github,
      text: 'ananthantharma',
      href: 'https://github.com/ananthantharma',
    },
  ],
};

/**
 * Social items
 */
export const socialLinks: Social[] = [
  {label: 'Github', Icon: GithubIcon, href: 'https://github.com/ananthantharma'},
  {
    label: 'LinkedIn',
    Icon: LinkedInIcon,
    href: 'https://www.linkedin.com/in/ananthan-tharmavelautham-p-eng-mba-pmp-cscp-26218493/',
  },
  {label: 'Instagram', Icon: InstagramIcon, href: 'https://www.instagram.com/ananthan.tharma/'},
  {label: 'Twitter', Icon: TwitterIcon, href: 'https://twitter.com/bloodripp'},
];
