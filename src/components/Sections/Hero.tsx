/* eslint-disable react/jsx-sort-props */
'use client';
import {ArrowRight, GraduationCap, Layers, Mail, Network, Shield} from 'lucide-react';
import {FC, memo} from 'react';

import {SectionId, socialLinks} from '../../data/data';
import Section from '../Layout/Section';
import SpaceBackground from './SpaceBackground';

/* ─── Credential badges ───────────────────────────────────────────────── */
const BADGES = [
  {Icon: Shield, text: 'P.ENG'},
  {Icon: Layers, text: 'PMP'},
  {Icon: Network, text: 'CSCP'},
  {Icon: GraduationCap, text: 'MBA'},
] as const;

const DISCIPLINES = ['Engineering', 'Operations', 'Supply Chain', 'Leadership'];

/* ─── Hero ───────────────────────────────────────────────────────────── */
const Hero: FC = memo(() => {
  const linkedIn = socialLinks.find(s => s.label === 'LinkedIn');
  const LinkedInIcon = linkedIn?.Icon;

  return (
    <Section noPadding sectionId={SectionId.Hero}>
      <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#03020a] font-sans text-white selection:bg-indigo-500/30 selection:text-white">
        {/* Animated space scene */}
        <SpaceBackground className="hero-fade absolute inset-0 z-0 h-full w-full" />
        {/* Keeps the name readable over the brightest parts of the scene */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#03020a]/85 via-[#03020a]/35 to-transparent md:from-[#03020a]/70 md:via-[#03020a]/20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[#03020a]/80 to-transparent" />

        <div className="relative z-20 mx-auto flex w-full max-w-[86rem] flex-1 flex-col px-6 sm:px-10 lg:px-16">
          <main className="flex flex-1 flex-col justify-center pb-16 pt-32 sm:pt-36 lg:pl-[6%]">
            {/* Name */}
            <h1 className="hero-rise leading-[0.92]" style={{animationDelay: '0.15s'}}>
              <span className="block text-[clamp(3rem,9vw,6.75rem)] font-bold tracking-[-0.03em] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
                ANANTHAN
              </span>
              <span className="mt-1 block text-[clamp(1.6rem,5.6vw,4.6rem)] font-light tracking-[-0.01em] text-white/80">
                <span className="hero-sheen bg-gradient-to-r from-white via-indigo-100 to-white/60 bg-clip-text text-transparent">
                  THARMAVELAUTHAM
                </span>
                <span className="hero-dot ml-1 inline-block h-[0.16em] w-[0.16em] rounded-full bg-indigo-400 align-baseline" />
              </span>
            </h1>

            {/* Credential badges */}
            <div className="hero-rise mt-9 flex flex-wrap gap-3" style={{animationDelay: '0.35s'}}>
              {BADGES.map(({Icon, text}) => (
                <span
                  className="group flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-[11px] font-semibold tracking-[0.18em] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-300/40 hover:bg-white/[0.08] hover:shadow-[0_0_24px_rgba(129,140,248,0.25)]"
                  key={text}>
                  <Icon className="text-white/70 transition-colors group-hover:text-indigo-200" size={15} strokeWidth={1.8} />
                  {text}
                </span>
              ))}
            </div>

            {/* Disciplines */}
            <p
              className="hero-rise mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 border-l border-indigo-400/60 pl-4 text-[10.5px] font-medium uppercase tracking-[0.28em] text-white/45"
              style={{animationDelay: '0.5s'}}>
              {DISCIPLINES.map((d, i) => (
                <span className="flex items-center gap-3" key={d}>
                  {i > 0 && <span className="text-white/25">×</span>}
                  {d}
                </span>
              ))}
            </p>

            {/* Calls to action */}
            <div className="hero-rise mt-10 flex flex-col gap-4 sm:flex-row" style={{animationDelay: '0.65s'}}>
              <a
                className="group flex w-max items-center gap-4 rounded-full bg-white px-7 py-4 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#0b0b1a] shadow-[0_0_40px_rgba(255,255,255,0.12)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(165,180,252,0.35)]"
                href={`/#${SectionId.Contact}`}>
                <Mail size={17} strokeWidth={1.8} />
                <span>Get in touch</span>
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" size={17} />
              </a>
              {linkedIn && (
                <a
                  className="group flex w-max items-center gap-4 rounded-full border border-white/15 bg-white/[0.04] px-7 py-4 text-[11.5px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-md transition-all duration-300 hover:border-indigo-300/40 hover:bg-white/[0.08]"
                  href={linkedIn.href}
                  rel="noreferrer"
                  target="_blank">
                  {LinkedInIcon && <LinkedInIcon className="h-[18px] w-[18px] fill-current text-[#4f8fe8]" />}
                  <span>LinkedIn profile</span>
                  <ArrowRight
                    className="text-white/50 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white"
                    size={17}
                  />
                </a>
              )}
            </div>
          </main>

          {/* Footer strip */}
          <footer
            className="hero-rise flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] py-7 sm:flex-row"
            style={{animationDelay: '0.9s'}}>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
              © {new Date().getFullYear()} Ananthan Tharmavelautham. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
              {socialLinks.map(({label, href}) => (
                <a
                  className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45 transition-colors duration-300 hover:text-indigo-200"
                  href={href}
                  key={label}
                  rel="noreferrer"
                  target="_blank">
                  {label}
                </a>
              ))}
              <span className="hidden h-5 w-px bg-white/10 sm:block" />
              <span className="hidden items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-300/30 text-[11px] font-bold tracking-normal text-white">
                  A
                </span>
                Ananthan
              </span>
            </div>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        @keyframes hero-rise {
          from {
            opacity: 0;
            transform: translateY(18px);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: none;
            filter: none;
          }
        }
        @keyframes hero-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes hero-sheen {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes hero-dot {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.6);
          }
          50% {
            box-shadow: 0 0 18px 4px rgba(129, 140, 248, 0.55);
          }
        }
        .hero-rise {
          opacity: 0;
          animation: hero-rise 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
        }
        .hero-fade {
          animation: hero-fade 2.4s ease-out both;
        }
        .hero-sheen {
          background-size: 220% 100%;
          animation: hero-sheen 9s ease-in-out infinite;
        }
        .hero-dot {
          animation: hero-dot 3.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-rise,
          .hero-fade,
          .hero-sheen,
          .hero-dot {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </Section>
  );
});

Hero.displayName = 'Hero';
export default Hero;
