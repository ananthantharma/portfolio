/* eslint-disable object-curly-spacing */
/* eslint-disable react/jsx-sort-props */
/* eslint-disable simple-import-sort/imports */
import {ChevronDownIcon} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import Image from 'next/image';
import {FC, memo} from 'react';

import CircuitBoardLoader from '../CircuitBoardLoader';
import {heroData, SectionId} from '../../data/data';
import Section from '../Layout/Section';

const Hero: FC = memo(() => {
  const {imageSrc, name, actions} = heroData;

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

        <div className="z-10 h-full w-full">
          <div className="flex h-full w-full items-center justify-center">
            {/* Main Hero Content - Full Width */}
            <div className="flex h-full w-full flex-col items-center justify-center">
              <div className="flex w-full flex-col items-center gap-y-8 text-center">
                {/* Circuit Board Loader replacing the name */}
                <div className="flex w-full items-center justify-center">
                  <div className="flex w-full items-center justify-center">
                    <CircuitBoardLoader />
                  </div>
                </div>

                {/* Actions & Socials - Clean Layout */}
                <div
                  className="flex animate-fade-in-up flex-col items-center gap-y-8"
                  style={{animationDelay: '200ms'}}>
                  {/* Buttons */}
                  <div className="flex w-full justify-center gap-x-6">
                    {actions.map(({href, text, primary, Icon, onClick}) => (
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
                        {Icon && (
                          <Icon className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-6 flex justify-center animate-bounce">
          <a
            className="rounded-full bg-white/10 p-2 ring-white ring-offset-2 ring-offset-gray-900/80 backdrop-blur-sm transition-all hover:bg-white/20 focus:outline-none focus:ring-2"
            href={`/#${SectionId.Contact}`}>
            <ChevronDownIcon className="h-6 w-6 text-white" />
          </a>
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
