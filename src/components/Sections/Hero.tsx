/* eslint-disable react/jsx-sort-props */
import {ChevronDownIcon} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import {FC, memo, useEffect, useRef, useState} from 'react';

import {heroData, SectionId, socialLinks} from '../../data/data';
import Section from '../Layout/Section';

/* ─── Scramble Text ─────────────────────────────────────────────────── */
const ScrambledText = memo(({delay = 0, text, className = ''}: {delay?: number; text: string; className?: string}) => {
  const [displayText, setDisplayText] = useState('');
  const chars = '#.^{-!$_№:0+.@}-??4@%=.,^!?2%\\;1]?%:%|{f[4{4%0%1_0<{0%]>42';
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const iterationRef = useRef(0);

  useEffect(() => {
    iterationRef.current = 0;
    startTimeRef.current = null;

    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const progress = time - startTimeRef.current;
      if (progress > 45) {
        setDisplayText(
          text
            .split('')
            .map((l, i) =>
              i < iterationRef.current
                ? l
                : l === ' '
                  ? ' '
                  : chars[Math.floor(Math.random() * chars.length)],
            )
            .join(''),
        );
        iterationRef.current += 0.35;
        startTimeRef.current = time;
      }
      if (iterationRef.current < text.length) requestRef.current = requestAnimationFrame(animate);
    };

    const id = setTimeout(() => (requestRef.current = requestAnimationFrame(animate)), delay);
    return () => {
      clearTimeout(id);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [text, delay, chars]);

  return <span className={className}>{displayText}</span>;
});
ScrambledText.displayName = 'ScrambledText';

/* ─── Cycling word animation ─────────────────────────────────────────── */
const words = ['Build.', 'Design.', 'Deliver.', 'Iterate.', 'Ship.'];

const CyclingWord: FC = memo(() => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % words.length);
        setVisible(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="inline-block bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent transition-all duration-300"
      style={{opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)'}}>
      {words[index]}
    </span>
  );
});
CyclingWord.displayName = 'CyclingWord';

/* ─── Aurora background blobs ────────────────────────────────────────── */
const AuroraBackground: FC = memo(() => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {/* Blob 1 – cyan top-right */}
    <div
      className="absolute rounded-full opacity-20 blur-[120px]"
      style={{
        width: '55vw',
        height: '55vw',
        top: '-15vw',
        right: '-10vw',
        background: 'radial-gradient(circle, #00C9FF 0%, transparent 70%)',
        animation: 'blobDrift1 18s ease-in-out infinite',
      }}
    />
    {/* Blob 2 – violet bottom-left */}
    <div
      className="absolute rounded-full opacity-20 blur-[140px]"
      style={{
        width: '60vw',
        height: '60vw',
        bottom: '-20vw',
        left: '-15vw',
        background: 'radial-gradient(circle, #7928CA 0%, transparent 70%)',
        animation: 'blobDrift2 22s ease-in-out infinite',
      }}
    />
    {/* Blob 3 – indigo center-left accent */}
    <div
      className="absolute rounded-full opacity-10 blur-[100px]"
      style={{
        width: '40vw',
        height: '40vw',
        top: '30%',
        left: '10%',
        background: 'radial-gradient(circle, #4F46E5 0%, transparent 70%)',
        animation: 'blobDrift3 26s ease-in-out infinite',
      }}
    />
  </div>
));
AuroraBackground.displayName = 'AuroraBackground';

/* ─── Dot grid ───────────────────────────────────────────────────────── */
const DotGrid: FC = memo(() => (
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.07]"
    style={{
      backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
      backgroundSize: '32px 32px',
    }}
  />
));
DotGrid.displayName = 'DotGrid';

/* ─── Main Hero ──────────────────────────────────────────────────────── */
const Hero: FC = memo(() => {
  const {actions} = heroData;

  return (
    <Section noPadding sectionId={SectionId.Hero}>
      {/* ── Canvas ── */}
      <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#05050a]">
        <AuroraBackground />
        <DotGrid />

        {/* subtle top vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col items-center gap-y-10 px-6 text-center">

          {/* eyebrow label */}
          <p
            className="animate-fade-in-down rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-cyan-400 backdrop-blur-sm"
            style={{animationDelay: '0ms'}}>
            Portfolio
          </p>

          {/* Name */}
          <div
            className="animate-fade-in-down flex flex-col items-center gap-y-1"
            style={{animationDelay: '100ms'}}>
            <h1 className="font-sans text-[clamp(2.8rem,9vw,8rem)] font-black leading-[0.9] tracking-tighter text-white">
              <ScrambledText text="ANANTHAN" delay={200} />
            </h1>
            <h1
              className="font-sans text-[clamp(1.1rem,3.5vw,3.2rem)] font-black leading-[1] tracking-tight"
              style={{
                background: 'linear-gradient(90deg,#00C9FF 0%,#92FE9D 50%,#a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
              <ScrambledText text="THARMAVELAUTHAM" delay={600} />
            </h1>
          </div>

          {/* Divider */}
          <div
            className="animate-fade-in-up h-px w-24 rounded-full"
            style={{
              animationDelay: '400ms',
              background: 'linear-gradient(90deg,transparent,#00C9FF,transparent)',
            }}
          />

          {/* Tagline */}
          <p
            className="animate-fade-in-up font-mono text-lg font-light tracking-widest text-white/60"
            style={{animationDelay: '500ms'}}>
            Think. <CyclingWord />
          </p>

          {/* Social icons */}
          <div
            className="animate-fade-in-up flex items-center gap-x-5"
            style={{animationDelay: '600ms'}}>
            {socialLinks.map(({label, Icon, href}) => (
              <a
                aria-label={label}
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/50 hover:bg-white/10 hover:text-cyan-400 hover:shadow-[0_0_20px_rgba(0,201,255,0.25)]"
                href={href}
                key={label}
                rel="noopener noreferrer"
                target="_blank">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div
            className="animate-fade-in-up flex flex-wrap items-center justify-center gap-4"
            style={{animationDelay: '700ms'}}>
            {actions.map(({href, text, primary, Icon, onClick}) => (
              <a
                className={classNames(
                  'group relative flex items-center gap-x-2 overflow-hidden rounded-full px-8 py-3 text-sm font-semibold tracking-wide transition-all duration-300 hover:scale-105 focus:outline-none',
                  primary
                    ? 'bg-gradient-to-r from-cyan-400 to-cyan-300 text-black shadow-[0_0_30px_rgba(0,201,255,0.35)] hover:shadow-[0_0_50px_rgba(0,201,255,0.6)]'
                    : 'border border-white/15 bg-white/5 text-white backdrop-blur-sm hover:border-white/30 hover:bg-white/10',
                )}
                href={href}
                key={text}
                onClick={onClick}>
                <span>{text}</span>
                {Icon && <Icon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />}
              </a>
            ))}
          </div>
        </div>

        {/* ── Scroll indicator ── */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <a
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 backdrop-blur-sm transition-all hover:border-white/20 hover:text-white/70 focus:outline-none"
            href={`/#${SectionId.Contact}`}>
            <ChevronDownIcon className="h-5 w-5" />
          </a>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          opacity: 0;
          animation: fadeInDown 0.9s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.9s cubic-bezier(0.16,1,0.3,1) forwards;
        }

        @keyframes blobDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(-5vw, 8vw) scale(1.1); }
          66%       { transform: translate(6vw, -4vw) scale(0.95); }
        }
        @keyframes blobDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(7vw, -6vw) scale(1.08); }
          66%       { transform: translate(-4vw, 5vw) scale(0.92); }
        }
        @keyframes blobDrift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(5vw, 8vw) scale(1.15); }
        }
      `}</style>
    </Section>
  );
});

Hero.displayName = 'Hero';
export default Hero;
