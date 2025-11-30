/* eslint-disable object-curly-spacing */
/* eslint-disable react/jsx-sort-props */
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import Image from 'next/image';
import { FC, memo } from 'react';

import { heroData, heroEducation, heroTimeline, SectionId } from '../../data/data';
import Section from '../Layout/Section';
import Socials from '../Socials';
import TimelineBox from '../TimelineBox';

const Hero: FC = memo(() => {
  const { imageSrc, name, actions } = heroData;

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
                <TimelineBox items={heroTimeline} side="right" title="Work Experience" />
              </div>
            </div>

            {/* Main Hero Content - Center (50%) */}
            <div className="col-span-1 flex h-full items-center justify-center lg:col-span-6">
              <div className="flex flex-col items-center gap-y-8 text-center">
                {/* Massive Name with Gradient */}
                <h1
                  className="animate-fade-in-down bg-gradient-to-r from-[#00C9FF] to-[#92FE9D] bg-clip-text text-6xl font-extrabold text-transparent sm:text-7xl lg:text-8xl xl:text-9xl"
                  style={{ textShadow: '0 0 40px rgba(0,201,255,0.3)' }}
                >
                  {name}
                  <span className="animate-pulse text-cyan-400">|</span>
                </h1>

                {/* Actions & Socials - Clean Layout */}
                <div className="flex animate-fade-in-up flex-col items-center gap-y-8" style={{ animationDelay: '200ms' }}>
                  {/* Social Icons - Larger & Glowing */}
                  <div className="flex gap-x-8 text-white">
                    <Socials />
                  </div>

                  {/* Buttons */}
                  <div className="flex w-full justify-center gap-x-6">
                    {actions.map(({ href, text, primary, Icon, onClick }) => (
                      <a
                        className={classNames(
                          'group relative flex items-center gap-x-2 overflow-hidden rounded-full px-8 py-3 text-base font-bold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2',
                          primary
                            ? 'bg-cyan-400 text-black ring-cyan-400 hover:shadow-[0_0_30px_#00C9FF]'
                            : 'border border-white/30 text-white ring-white hover:bg-white/10 hover:border-white',
                        )}
                        href={href}
                        key={text}
                        onClick={onClick}>
                        <span className="relative z-10">{text}</span>
                        {Icon && <Icon className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Education & Credentials - Right Side (25%) */}
            <div className="hidden h-full items-center lg:col-span-3 lg:flex">
              <div className="h-[80vh] w-full">
                <TimelineBox items={heroEducation} side="left" title="Education & Credentials" />
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
      <style jsx global>{`
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
            animation: fadeInDown 0.8s ease-out forwards;
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.8s ease-out forwards;
        }
      `}</style>
    </Section>
  );
});

Hero.displayName = 'Hero';
export default Hero;
