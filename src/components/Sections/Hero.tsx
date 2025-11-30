/* eslint-disable object-curly-spacing */
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import Image from 'next/image';
import { FC, memo, useEffect, useState } from 'react';

import { heroData, heroEducation, heroTimeline, SectionId } from '../../data/data';
import Section from '../Layout/Section';
import Socials from '../Socials';
import TimelineBox from '../TimelineBox';

const Hero: FC = memo(() => {
  const { imageSrc, name, actions } = heroData;
  const [text, setText] = useState('');
  const fullText = "I'm a Toronto based Supply Chain Professional, currently working at Hydro One supporting construction and engineering procurement, supply chain management, project management, and category management.";

  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        setText(fullText.substring(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 30); // Adjust speed here

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <Section noPadding sectionId={SectionId.Hero}>
      <div className="relative flex h-screen w-full items-center justify-center overflow-hidden">
        <Image
          alt={`${name}-image`}
          className="absolute z-0 h-full w-full object-cover opacity-80"
          placeholder="blur"
          priority
          src={imageSrc}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60" />

        <div className="z-10 h-full w-full px-4 lg:px-8">
          <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Work Experience - Left Side (25%) */}
            <div className="hidden h-full items-center lg:col-span-3 lg:flex">
              <div className="h-[80vh] w-full">
                <TimelineBox items={heroTimeline} title="Work Experience" />
              </div>
            </div>

            {/* Main Hero Content - Center (50%) */}
            <div className="col-span-1 flex h-full items-center justify-center lg:col-span-6">
              <div className="flex flex-col items-center gap-y-8 rounded-[20px] border border-white/10 bg-white/5 p-8 text-center shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-[16px]">
                <h1 className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl lg:text-7xl xl:text-8xl">
                  {name}
                </h1>
                <div className="max-w-[600px] text-lg font-light leading-relaxed text-gray-200 sm:text-xl">
                  {text}
                  <span className="animate-pulse text-neon-cyan">|</span>
                </div>
                <div className="flex gap-x-6 text-white">
                  <Socials />
                </div>
                <div className="flex w-full justify-center gap-x-6">
                  {actions.map(({ href, text, primary, Icon, onClick }) => (
                    <a
                      className={classNames(
                        'group relative flex items-center gap-x-2 overflow-hidden rounded-full px-8 py-3 text-base font-bold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2',
                        primary
                          ? 'bg-electric-amber text-black ring-electric-amber hover:shadow-[0_0_20px_#FFAE00]'
                          : 'border-2 border-white text-white ring-white hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]',
                      )}
                      href={href}
                      key={text}
                      onClick={onClick}>
                      <span className="relative z-10">{text}</span>
                      {Icon && <Icon className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />}
                      {primary && <div className="absolute inset-0 -z-0 translate-y-full bg-white transition-transform duration-300 group-hover:translate-y-0 opacity-20" />}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Education & Credentials - Right Side (25%) */}
            <div className="hidden h-full items-center lg:col-span-3 lg:flex">
              <div className="h-[80vh] w-full">
                <TimelineBox items={heroEducation} title="Education & Credentials" />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-6 flex justify-center animate-bounce">
          <a
            className="rounded-full bg-white/10 p-2 ring-white ring-offset-2 ring-offset-gray-900/80 backdrop-blur-sm transition-all hover:bg-white/20 focus:outline-none focus:ring-2"
            href={`/#${SectionId.About}`}>
            <ChevronDownIcon className="h-6 w-6 text-white" />
          </a>
        </div>
      </div>
    </Section>
  );
});

Hero.displayName = 'Hero';
export default Hero;
