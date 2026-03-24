import type {NextApiRequest, NextApiResponse} from 'next';

import dbConnect from '@/lib/dbConnect';
import {resolveImageSrc} from '@/lib/imageMap';
import PortfolioEducation from '@/models/PortfolioEducation';
import PortfolioExperience from '@/models/PortfolioExperience';
import PortfolioProfile from '@/models/PortfolioProfile';
import PortfolioSkillGroup from '@/models/PortfolioSkillGroup';

export interface PortfolioTimelineItem {
  _id: string;
  date: string;
  location: string;
  title: string;
  content?: string;
  imageSrc?: string;
  order: number;
}

export interface PortfolioContactItem {
  type: string;
  text: string;
  href?: string;
}

export interface PortfolioSocialLink {
  label: string;
  iconKey: string;
  href: string;
  order: number;
}

export interface PortfolioData {
  profile: {
    name: string;
    metaTitle: string;
    metaDescription: string;
    heroDescription1: string;
    heroDescription2: string;
    contactHeaderText: string;
    contactDescription: string;
    contactItems: PortfolioContactItem[];
    socialLinks: PortfolioSocialLink[];
  } | null;
  experiences: PortfolioTimelineItem[];
  heroTimeline: PortfolioTimelineItem[];
  education: PortfolioTimelineItem[];
  skillGroups: {name: string; skills: {name: string; level: number}[]; order: number}[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    await dbConnect();

    const [profileDoc, experienceDocs, educationDocs, skillGroupDocs] = await Promise.all([
      PortfolioProfile.findOne().lean(),
      PortfolioExperience.find().sort({order: 1}).lean(),
      PortfolioEducation.find().sort({order: 1}).lean(),
      PortfolioSkillGroup.find().sort({order: 1}).lean(),
    ]);

    // Serialize and resolve image keys
    const experiences: PortfolioTimelineItem[] = experienceDocs.map(e => ({
      _id: String((e as any)._id),
      date: e.date ?? '',
      location: e.location ?? '',
      title: e.title ?? '',
      content: e.content ?? '',
      imageSrc: resolveImageSrc(e.imageKey),
      order: e.order ?? 0,
    }));

    const heroTimeline = experiences.filter(e => {
      const doc = experienceDocs.find(d => String((d as any)._id) === e._id);
      return doc && (doc as any).showInHeroTimeline !== false;
    });

    const education: PortfolioTimelineItem[] = educationDocs.map(e => ({
      _id: String((e as any)._id),
      date: e.date ?? '',
      location: e.location ?? '',
      title: e.title ?? '',
      imageSrc: resolveImageSrc(e.imageKey),
      order: e.order ?? 0,
    }));

    const skillGroups = skillGroupDocs.map(sg => ({
      _id: String((sg as any)._id),
      name: sg.name ?? '',
      skills: (sg.skills ?? []).map((s: any) => ({name: s.name ?? '', level: s.level ?? 0})),
      order: sg.order ?? 0,
    }));

    let profile = null;
    if (profileDoc) {
      const p = profileDoc as any;
      profile = {
        name: p.name ?? '',
        metaTitle: p.metaTitle ?? '',
        metaDescription: p.metaDescription ?? '',
        heroDescription1: p.heroDescription1 ?? '',
        heroDescription2: p.heroDescription2 ?? '',
        contactHeaderText: p.contactHeaderText ?? '',
        contactDescription: p.contactDescription ?? '',
        contactItems: (p.contactItems ?? []).map((c: any) => ({
          type: c.type ?? '',
          text: c.text ?? '',
          href: c.href ?? '',
        })),
        socialLinks: (p.socialLinks ?? [])
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .map((s: any) => ({
            label: s.label ?? '',
            iconKey: s.iconKey ?? '',
            href: s.href ?? '',
            order: s.order ?? 0,
          })),
      };
    }

    const data: PortfolioData = {profile, experiences, heroTimeline, education, skillGroups};
    return res.json(data);
  } catch (error) {
    console.error('Portfolio API error:', error);
    return res.status(500).json({error: 'Failed to fetch portfolio data'});
  }
}
