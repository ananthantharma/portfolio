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
import PEngLogo from '../images/logo-peo.png';
import porfolioImage1 from '../images/portfolio/portfolio-1.jpg';
import porfolioImage2 from '../images/portfolio/portfolio-2.jpg';
import porfolioImage3 from '../images/portfolio/portfolio-3.jpg';
import porfolioImage4 from '../images/portfolio/portfolio-4.jpg';
import porfolioImage5 from '../images/portfolio/portfolio-5.jpg';
import porfolioImage6 from '../images/portfolio/portfolio-6.jpg';
import porfolioImage7 from '../images/portfolio/portfolio-7.jpg';
import porfolioImage8 from '../images/portfolio/portfolio-8.jpg';
import porfolioImage9 from '../images/portfolio/portfolio-9.jpg';
import porfolioImage10 from '../images/portfolio/portfolio-10.jpg';
import porfolioImage11 from '../images/portfolio/portfolio-11.jpg';
import profilepic from '../images/profilepic.jpg';
import testimonialImage from '../images/testimonial.webp';
import {
  About,
  ContactSection,
  ContactType,
  Hero,
  HomepageMeta,
  PortfolioItem,
  SkillGroup,
  Social,
  TestimonialSection,
  TimelineItem,
} from './dataDef';

/**
 * Page meta data
 */
export const homePageMeta: HomepageMeta = {
  title: 'React Resume Template',
  description: "Example site built with Ananthan Tharmavelautham's react resume template",
};

/**
 * Section definition
 */
export const SectionId = {
  Hero: 'hero',
  About: 'about',
  Contact: 'contact',
  Portfolio: 'portfolio',
  Resume: 'resume',
  Skills: 'skills',
  Stats: 'stats',
  Testimonials: 'testimonials',
} as const;

export type SectionId = (typeof SectionId)[keyof typeof SectionId];

/**
 * Hero section
 */
export const heroData: Hero = {
  imageSrc: heroImage,
  name: `I'm Ananthan Tharmavelautham.`,
  description: (
    <>
      <p className="prose-sm text-stone-200 sm:prose-base lg:prose-lg">
        I'm a Toronto based <strong className="text-stone-100">Supply Chain Professional</strong>, currently working
        at <strong className="text-stone-100">Hydro One</strong> supporting construction and engineering procurement, supply chain management, project management, and category management.
      </p>
      <p className="prose-sm text-stone-200 sm:prose-base lg:prose-lg">
        In my free time time, you can catch me playing <strong className="text-stone-100">Chess</strong>,
        working on <strong className="text-stone-100">Coding Projects</strong>, or exploring beautiful{' '}
        <strong className="text-stone-100">Toronto</strong>.
      </p>
    </>
  ),
  actions: [
    {
      href: '/assets/resume.pdf',
      text: 'Resume',
      primary: true,
      Icon: ArrowDownTrayIcon,
    },
    {
      href: `#${SectionId.Contact}`,
      text: 'Contact',
      primary: false,
    },
  ],
};

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
 * Portfolio section
 */
export const portfolioItems: PortfolioItem[] = [
  {
    title: 'Procurement Efficiency Model',
    description: 'Developed an analytical model to optimize procurement processes, resulting in a 40% increase in efficiency.',
    url: 'https://procurementmodel.com',
    image: porfolioImage1,
  },
  {
    title: 'Multi-Million Dollar Contract Management',
    description: 'Administered and managed over 50 high-value contracts across various departments and organizations.',
    url: 'https://contractmanagement.com',
    image: porfolioImage2,
  },
  {
    title: 'Supply Chain Post-Pandemic',
    description: 'Successfully navigated post-pandemic supply chain constraints, negotiating optimal contract terms and conditions.',
    url: 'https://supplychainpostpandemic.com',
    image: porfolioImage3,
  },
  {
    title: 'Vendor Managed Inventory Program',
    description: 'Coordinated the procurement of technically complex engineering construction contracts and vendor managed inventory programs.',
    url: 'https://vendormanagedinventory.com',
    image: porfolioImage4,
  },
  {
    title: 'Stakeholder Engagement',
    description: 'Skilled in engaging multiple stakeholders across various departments to achieve common goals.',
    url: 'https://stakeholderengagement.com',
    image: porfolioImage5,
  },
  {
    title: 'Cost Optimization Strategy',
    description: 'Made data-driven recommendations that achieved up to 30% cost savings on individual projects.',
    url: 'https://costoptimization.com',
    image: porfolioImage6,
  },
  {
    title: 'Team Leadership & Guidance',
    description: 'Provided advice and guidance to Supply Chain staff on procurement strategies and risk management.',
    url: 'https://teamleadership.com',
    image: porfolioImage7,
  },
  {
    title: 'Commercial Contract Drafting',
    description: 'Developed, negotiated, and drafted complex commercial agreements, including amendments.',
    url: 'https://commercialcontractdrafting.com',
    image: porfolioImage8,
  },
  {
    title: 'Audit Support',
    description: 'Provided daily support to internal and external auditors to ensure transparency and efficiency.',
    url: 'https://auditsupport.com',
    image: porfolioImage9,
  },
  {
    title: 'Renewable Generation Supply Chain',
    description: 'Managed renewable generation supply chain, setting time-targeted tasks and ensuring program effectiveness.',
    url: 'https://renewablegeneration.com',
    image: porfolioImage10,
  },
  {
    title: 'Defective Work Management',
    description: 'Facilitated the defective work management process within the context of existing agreements.',
    url: 'https://defectiveworkmanagement.com',
    image: porfolioImage11,
  },
];
// Add this new array for Credentials
export const credentials: TimelineItem[] = [
  {
    date: '2023',
    location: 'Professional Engineers Ontario (PEO)',
    title: 'Professional Engineer (P.Eng)',
    content: (
      <>
        <img src={PEngLogo} alt="P.Eng Logo" style={{ width: '30px', marginRight: '10px' }} />
        <p>Obtained Professional Engineer (P.Eng) certification, demonstrating expertise in engineering principles and practices.</p>
      </>
    ),
  },
  {
    date: '2017', // Year you obtained the credential
    location: 'American Production and Inventory Control Society (APICS Toronto Chapter)',
    title: 'Certified Supply Chain Professional (CSCP)',
    content: <p>Achieved CSCP certification, validating my expertise in supply chain management and ability to streamline operations.</p>,
  },
  {
    date: '2017', // Year you obtained the credential
    location: 'Project Management Institute (PMI)',
    title: 'Project Management Professional (PMP)',
    content: <p>Received PMP certification, affirming my skills in project management, including planning, execution, and monitoring.</p>,
  },
];


/**
 * Resume section -- TODO: Standardize resume contact format or offer MDX
 */
export const education: TimelineItem[] = [
  {
    date: '2012',
    location: 'University of Ontario Institute of Technology (UOIT)',
    title: 'Bachelor of Mechanical Engineering with Honors (B.Eng.)',
    content: <p>Specialized in mechanical engineering with a focus on project management and team collaboration.</p>,
  },
  {
    date: '2022',
    location: 'Centennial College of Applied Arts and Technology',
    title: 'Software Engineering Technology (Diploma)',
    content: <p>Acquired practical skills in software engineering, including coding, data structures, and algorithms.</p>,
  },
  {
    date: '2020',
    location: 'Osgoode Hall Law School of York University',
    title: 'Certificates in Public Procurement Law & Practice, Contract Management and Negotiation',
    content: <p>Received specialized training in public procurement law, contract management, and negotiation techniques.</p>,
  },
];

export const experience: TimelineItem[] = [
  {
    date: 'Sept 2022 - Present',
    location: 'Hydro One, Toronto, ON',
    title: 'Sourcing Category Lead, Category Management',
    content: (
      <p>
        Specialize in contract administration and procurement strategy. Successfully navigated post-pandemic supply chain constraints, achieving optimal contract terms and conditions.
      </p>
    ),
  },
  {
    date: 'Mar 2021 – Sept 2022',
    location: 'Ontario Power Generation, Courtice, ON',
    title: 'Senior Procurement Specialist- Supply Chain',
    content: (
      <p>
        Responsible for planning and coordinating the procurement of technically complex engineering construction contracts. Developed procurement strategies that considered market conditions and end-user needs.
      </p>
    ),
  },
  {
    date: 'Feb 2019 - Mar 2021',
    location: 'Ontario Power Generation, Etobicoke, ON',
    title: 'First Line Manager, Renewable Generation - Supply Chain',
    content: (
      <p>
        Supervised subordinates and ensured programs were implemented effectively. Provided advice and guidance on procurement strategies and risk management. Offered analytical and strategic supply planning support for complex projects.
      </p>
    ),
  },
  {
    date: 'Oct 2013 - Oct 2015',
    location: 'Canadian Nuclear Laboratories Ltd., Port Hope, ON',
    title: 'Contract Officer',
    content: (
      <p>
        Managed the tendering process, including drafting of contractual documents and evaluation of bids. Offered strategic recommendations on pricing and contract strategy for high-value, complex projects.
      </p>
    ),
  },
  {
    date: 'Jan 2012 - Oct 2013',
    location: 'Atomic Energy of Canada Ltd., Chalk River, ON',
    title: 'Contract Administrator',
    content: (
      <p>
        Developed and led the implementation of a unique reporting tool for project managers. Managed post-award contract administration, ensuring compliance and drafting change orders as needed.
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
      text: 'Ananthan is a procurement wizard. His strategic approach to contract management saved our department millions and increased efficiency by 40%. He\'s not just a team player; he\'s a team leader.',
      image: 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/169.jpg',
    },
    {
      name: 'Michael Smith',
      text: 'I had the pleasure of working with Ananthan on several high-stakes projects. His ability to negotiate and manage complex contracts is unparalleled. He has a knack for balancing diverse stakeholder interests for optimal results.',
      image: 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/14.jpg',
    },
    {
      name: 'Sarah Williams',
      text: 'Ananthan\'s contributions to our supply chain strategies were invaluable. His data-driven recommendations led to cost savings of up to 30% on individual projects. He\'s a true asset to any team.',
      image: 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/69.jpg',
    },
  ],
};


/**
 * Contact section
 */

export const contact: ContactSection = {
  headerText: 'Get in touch.',
  description: 'Here is a good spot for a message to your readers to let them know how best to reach out to you.',
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
  {label: 'LinkedIn', Icon: LinkedInIcon, href: 'https://www.linkedin.com/in/ananthan/'},
  {label: 'Instagram', Icon: InstagramIcon, href: 'https://www.instagram.com/ananthan.tharma/'},
  {label: 'Twitter', Icon: TwitterIcon, href: 'https://twitter.com/bloodripp'},
];
