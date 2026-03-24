/* eslint-disable object-curly-spacing */
import dynamic from 'next/dynamic';
import {GetServerSideProps, FC, memo} from 'react';

import Page from '../components/Layout/Page';
import Contact from '../components/Sections/Contact';
import Footer from '../components/Sections/Footer';
import Hero from '../components/Sections/Hero';
import {contact as defaultContact, homePageMeta as defaultMeta, socialLinks as defaultSocialLinks} from '../data/data';
import dbConnect from '../lib/dbConnect';
import {resolveImageSrc} from '../lib/imageMap';
import PortfolioEducation from '../models/PortfolioEducation';
import PortfolioExperience from '../models/PortfolioExperience';
import PortfolioProfile from '../models/PortfolioProfile';

// eslint-disable-next-line react-memo/require-memo
const Header = dynamic(() => import('../components/Sections/Header'), {ssr: false});

export interface PortfolioTimelineItem {
  date: string;
  location: string;
  title: string;
  content?: string;
  imageSrc?: string;
}

export interface PortfolioSocialLink {
  label: string;
  iconKey: string;
  href: string;
}

export interface PortfolioContactItem {
  type: string;
  text: string;
  href?: string;
}

export interface HomePageProps {
  metaTitle: string;
  metaDescription: string;
  heroTimeline: PortfolioTimelineItem[];
  education: PortfolioTimelineItem[];
  contactHeaderText: string;
  contactDescription: string;
  contactItems: PortfolioContactItem[];
  socialLinks: PortfolioSocialLink[];
}

const Home: FC<HomePageProps> = memo(props => {
  const {metaTitle, metaDescription, heroTimeline, education, contactHeaderText, contactDescription, contactItems, socialLinks} = props;

  return (
    <Page description={metaDescription} title={metaTitle}>
      <Header />
      <Hero heroTimeline={heroTimeline} education={education} socialLinks={socialLinks} />
      <Contact
        headerText={contactHeaderText}
        description={contactDescription}
        items={contactItems}
      />
      <Footer socialLinks={socialLinks} />
    </Page>
  );
});

Home.displayName = 'Home';
export default Home;

export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  try {
    await dbConnect();

    const [profileDoc, experienceDocs, educationDocs] = await Promise.all([
      PortfolioProfile.findOne().lean(),
      PortfolioExperience.find().sort({order: 1}).lean(),
      PortfolioEducation.find().sort({order: 1}).lean(),
    ]);

    // If no DB data, fall back to hardcoded defaults
    if (!profileDoc && experienceDocs.length === 0) {
      return {
        props: buildFallbackProps(),
      };
    }

    const heroTimeline: PortfolioTimelineItem[] = experienceDocs
      .filter((e: any) => e.showInHeroTimeline !== false)
      .map((e: any) => ({
        date: e.date ?? '',
        location: e.location ?? '',
        title: e.title ?? '',
        content: e.content ?? '',
        imageSrc: resolveImageSrc(e.imageKey) ?? null,
      }))
      .filter((_: PortfolioTimelineItem, i: number) => i < 10); // cap at 10

    const education: PortfolioTimelineItem[] = educationDocs.map((e: any) => ({
      date: e.date ?? '',
      location: e.location ?? '',
      title: e.title ?? '',
      imageSrc: resolveImageSrc(e.imageKey) ?? null,
    }));

    const p = profileDoc as any;

    const props: HomePageProps = {
      metaTitle: p?.metaTitle || defaultMeta.title,
      metaDescription: p?.metaDescription || defaultMeta.description,
      heroTimeline,
      education,
      contactHeaderText: p?.contactHeaderText || defaultContact.headerText || 'Get in touch.',
      contactDescription: p?.contactDescription || defaultContact.description,
      contactItems: (p?.contactItems ?? []).map((c: any) => ({
        type: c.type ?? '',
        text: c.text ?? '',
        href: c.href ?? '',
      })),
      socialLinks: (p?.socialLinks ?? [])
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((s: any) => ({label: s.label ?? '', iconKey: s.iconKey ?? '', href: s.href ?? ''})),
    };

    // Use fallback contact/social if DB has none
    if (!props.contactItems.length) {
      props.contactItems = defaultContact.items.map(i => ({type: i.type, text: i.text, href: i.href}));
    }
    if (!props.socialLinks.length) {
      props.socialLinks = defaultSocialLinks.map(s => ({label: s.label, iconKey: s.label, href: s.href}));
    }

    return {props: JSON.parse(JSON.stringify(props))};
  } catch (error) {
    console.error('getServerSideProps error:', error);
    return {props: buildFallbackProps()};
  }
};

function buildFallbackProps(): HomePageProps {
  return {
    metaTitle: defaultMeta.title,
    metaDescription: defaultMeta.description,
    heroTimeline: [],
    education: [],
    contactHeaderText: defaultContact.headerText || 'Get in touch.',
    contactDescription: defaultContact.description,
    contactItems: defaultContact.items.map(i => ({type: i.type, text: i.text, href: i.href})),
    socialLinks: defaultSocialLinks.map(s => ({label: s.label, iconKey: s.label, href: s.href})),
  };
}
