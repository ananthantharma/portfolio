import {FC, memo} from 'react';

import {socialLinks as defaultSocialLinks} from '../data/data';
import GithubIcon from './Icon/GithubIcon';
import InstagramIcon from './Icon/InstagramIcon';
import LinkedInIcon from './Icon/LinkedInIcon';
import TwitterIcon from './Icon/TwitterIcon';

const ICON_MAP: Record<string, React.FC<{className?: string}>> = {
  Github: GithubIcon,
  LinkedIn: LinkedInIcon,
  Instagram: InstagramIcon,
  Twitter: TwitterIcon,
};

interface SocialLink {
  label: string;
  iconKey: string;
  href: string;
}

interface SocialsProps {
  links?: SocialLink[];
}

const Socials: FC<SocialsProps> = memo(({links}) => {
  const resolvedLinks = links && links.length > 0
    ? links
    : defaultSocialLinks.map(s => ({label: s.label, iconKey: s.label, href: s.href}));

  return (
    <>
      {resolvedLinks.map(({label, iconKey, href}) => {
        const Icon = ICON_MAP[iconKey];
        if (!Icon) return null;
        return (
          <a
            aria-label={label}
            className="-m-1.5 rounded-md p-1.5 transition-all duration-300 hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:-m-3 sm:p-3"
            href={href}
            key={label}>
            <Icon className="h-5 w-5 align-baseline sm:h-6 sm:w-6" />
          </a>
        );
      })}
    </>
  );
});

Socials.displayName = 'Socials';
export default Socials;
