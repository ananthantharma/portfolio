/* eslint-disable react/jsx-sort-props, react-memo/require-usememo */
'use client';
import {ArrowRight, GraduationCap, Layers, Mail, Network, Shield} from 'lucide-react';
import {FC, memo, useEffect, useRef, useState} from 'react';

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
const FIRST = 'ANANTHAN';
const LAST = 'THARMAVELAUTHAM';
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=<>/';

/* ─── Hero ───────────────────────────────────────────────────────────── */
const Hero: FC = memo(() => {
  const linkedIn = socialLinks.find(s => s.label === 'LinkedIn');
  const LinkedInIcon = linkedIn?.Icon;
  const rootRef = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(0);
  const [surname, setSurname] = useState(LAST);
  const scrambleRaf = useRef(0);

  // Pointer → smoothed CSS variables (spotlight + depth parallax)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = {x: window.innerWidth / 2, y: window.innerHeight / 2};
    const cur = {...target};
    let raf = 0;
    let running = false;
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      root.style.setProperty('--mx', `${cur.x}px`);
      root.style.setProperty('--my', `${cur.y}px`);
      root.style.setProperty('--nx', `${(cur.x / window.innerWidth - 0.5) * 2}`);
      root.style.setProperty('--ny', `${(cur.y / window.innerHeight - 0.5) * 2}`);
      if (Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.5) raf = requestAnimationFrame(tick);
      else running = false;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || reduce) return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    window.addEventListener('pointermove', onMove, {passive: true});
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  // Living tagline: each discipline lights up in turn
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setLit(i => (i + 1) % DISCIPLINES.length), 1700);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => cancelAnimationFrame(scrambleRaf.current), []);

  // Decode on hover: the surname scrambles, then resolves left to right
  const scramble = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cancelAnimationFrame(scrambleRaf.current);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 700);
      const settled = Math.floor(p * LAST.length);
      setSurname(LAST.split('').map((c, i) => (i < settled ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(''));
      if (p < 1) scrambleRaf.current = requestAnimationFrame(tick);
      else setSurname(LAST);
    };
    scrambleRaf.current = requestAnimationFrame(tick);
  };

  return (
    <Section noPadding sectionId={SectionId.Hero}>
      <div className="hero-root relative flex min-h-[100svh] flex-col overflow-hidden bg-[#03020a] font-sans text-white selection:bg-indigo-500/30 selection:text-white" ref={rootRef}>
        {/* Animated space scene */}
        <div className="absolute inset-0 z-0">
          <SpaceBackground className="hero-fade absolute inset-0 h-full w-full" />
        </div>
        {/* Soft light that follows the cursor */}
        <div className="hero-spotlight pointer-events-none absolute inset-0 z-[5]" />
        {/* Keeps the name readable over the brightest parts of the scene */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#03020a]/85 via-[#03020a]/35 to-transparent md:from-[#03020a]/70 md:via-[#03020a]/20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[#03020a]/80 to-transparent" />

        <div className="relative z-20 mx-auto flex w-full max-w-[86rem] flex-1 flex-col px-6 sm:px-10 lg:px-16">
          <main className="hero-depth flex flex-1 flex-col justify-center pb-16 pt-32 sm:pt-36 lg:pl-[6%]">
            {/* Name */}
            <h1 className="hero-layer-1 leading-[0.92]">
              <span aria-label={FIRST} className="block text-[clamp(3rem,9vw,6.75rem)] font-bold tracking-[-0.03em] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
                {FIRST.split('').map((ch, i) => (
                  <span aria-hidden className="hero-letter inline-block" key={i} style={{animationDelay: `${0.15 + i * 0.055}s`}}>
                    {ch}
                  </span>
                ))}
              </span>
              <span className="mt-1 block text-[clamp(1.6rem,5.6vw,4.6rem)] font-light tracking-[-0.01em] text-white/80">
                <span aria-label={LAST} className="hero-wipe inline-block cursor-default" onMouseEnter={scramble}>
                  <span aria-hidden className="hero-sheen bg-gradient-to-r from-white via-indigo-100 to-white/60 bg-clip-text text-transparent">
                    {surname}
                  </span>
                </span>
                <span className="hero-dot ml-1 inline-block h-[0.16em] w-[0.16em] rounded-full bg-indigo-400 align-baseline" />
              </span>
            </h1>

            {/* Credential badges */}
            <div className="hero-layer-2 mt-9 flex flex-wrap gap-3">
              {BADGES.map(({Icon, text}, i) => (
                <span className="hero-rise inline-block" key={text} style={{animationDelay: `${0.9 + i * 0.08}s`}}>
                  <span
                    className="hero-chip hero-float group relative flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-[11px] font-semibold tracking-[0.18em] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-colors duration-300 hover:bg-white/[0.08]"
                    style={{animationDelay: `${i * -1.4}s`}}>
                    <Icon className="text-white/70 transition-colors group-hover:text-indigo-200" size={15} strokeWidth={1.8} />
                    {text}
                  </span>
                </span>
              ))}
            </div>

            {/* Disciplines (each lights up in turn) */}
            <p className="hero-layer-2 hero-rise mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 border-l border-indigo-400/60 pl-4 text-[10.5px] font-medium uppercase tracking-[0.28em]" style={{animationDelay: '1.25s'}}>
              {DISCIPLINES.map((d, i) => (
                <span className="flex items-center gap-3" key={d}>
                  {i > 0 && <span className="text-white/25">×</span>}
                  <span className={`transition-all duration-700 ${lit === i ? 'text-white [text-shadow:0_0_14px_rgba(165,180,252,0.9)]' : 'text-white/45'}`}>{d}</span>
                </span>
              ))}
            </p>

            {/* Calls to action */}
            <div className="hero-layer-3 hero-rise mt-10 flex flex-col gap-4 sm:flex-row" style={{animationDelay: '1.4s'}}>
              <a
                className="group flex w-max items-center gap-4 rounded-full bg-white px-7 py-4 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#0b0b1a] shadow-[0_0_40px_rgba(255,255,255,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_50px_rgba(165,180,252,0.35)]"
                href={`/#${SectionId.Contact}`}>
                <Mail size={17} strokeWidth={1.8} />
                <span>Get in touch</span>
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" size={17} />
              </a>
              {linkedIn && (
                <a
                  className="group flex w-max items-center gap-4 rounded-full border border-white/15 bg-white/[0.04] px-7 py-4 text-[11.5px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-300/40 hover:bg-white/[0.08]"
                  href={linkedIn.href}
                  rel="noreferrer"
                  target="_blank">
                  {LinkedInIcon && <LinkedInIcon className="h-[18px] w-[18px] fill-current text-[#4f8fe8]" />}
                  <span>LinkedIn profile</span>
                  <ArrowRight className="text-white/50 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" size={17} />
                </a>
              )}
            </div>
          </main>

          {/* Footer strip */}
          <footer className="hero-rise flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] py-7 sm:flex-row" style={{animationDelay: '1.7s'}}>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">© {new Date().getFullYear()} Ananthan Tharmavelautham. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
              {socialLinks.map(({label, href}) => (
                <a className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45 transition-colors duration-300 hover:text-indigo-200" href={href} key={label} rel="noreferrer" target="_blank">
                  {label}
                </a>
              ))}
              <span className="hidden h-5 w-px bg-white/10 sm:block" />
              <span className="hidden items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-300/30 text-[11px] font-bold tracking-normal text-white">A</span>
                Ananthan
              </span>
            </div>
          </footer>
        </div>
      </div>

      <style global jsx>{`
        @property --hero-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes hero-letter {
          from { opacity: 0; transform: translateY(0.55em) rotateX(-70deg); filter: blur(10px); }
          to { opacity: 1; transform: none; filter: none; }
        }
        @keyframes hero-wipe {
          from { clip-path: inset(0 100% 0 0); opacity: 0.4; }
          to { clip-path: inset(0 0 0 0); opacity: 1; }
        }
        @keyframes hero-pop {
          0% { transform: scale(0); }
          70% { transform: scale(1.6); }
          100% { transform: scale(1); }
        }
        @keyframes hero-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.5); }
          50% { box-shadow: 0 0 18px 4px rgba(129, 140, 248, 0.55); }
        }
        @keyframes hero-rise {
          from { opacity: 0; transform: translateY(18px); filter: blur(6px); }
          to { opacity: 1; transform: none; filter: none; }
        }
        @keyframes hero-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes hero-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes hero-sheen {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes hero-spin { to { --hero-angle: 360deg; } }

        .hero-letter { opacity: 0; transform-origin: 50% 100%; animation: hero-letter 0.9s cubic-bezier(0.2, 0.75, 0.2, 1) forwards; }
        .hero-wipe { animation: hero-wipe 1.2s cubic-bezier(0.65, 0, 0.2, 1) 0.6s both; }
        .hero-dot { animation: hero-pop 0.6s cubic-bezier(0.3, 1.6, 0.5, 1) 1.6s both, hero-glow 3.2s ease-in-out 2.2s infinite; }
        .hero-rise { opacity: 0; animation: hero-rise 1s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
        .hero-fade { animation: hero-fade 2.4s ease-out both; }
        .hero-float { animation: hero-float 6s ease-in-out infinite; }
        .hero-sheen { background-size: 220% 100%; animation: hero-sheen 9s ease-in-out infinite; font-variant-numeric: tabular-nums; }

        /* Glowing border that traces round a badge on hover */
        .hero-chip::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          opacity: 0;
          transition: opacity 0.3s;
          background: conic-gradient(from var(--hero-angle), transparent 0 70%, #a5b4fc 85%, #f0abfc 92%, transparent);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: hero-spin 2.4s linear infinite;
          pointer-events: none;
        }
        .hero-chip:hover::before { opacity: 1; }

        /* Cursor spotlight + depth parallax (mouse only) */
        .hero-spotlight { background: radial-gradient(520px circle at var(--mx, 50%) var(--my, 50%), rgba(129, 140, 248, 0.16), transparent 45%); mix-blend-mode: screen; }
        .hero-depth .hero-layer-1 { transform: translate3d(calc(var(--nx, 0) * -16px), calc(var(--ny, 0) * -10px), 0); }
        .hero-depth .hero-layer-2 { transform: translate3d(calc(var(--nx, 0) * -9px), calc(var(--ny, 0) * -6px), 0); }
        .hero-depth .hero-layer-3 { transform: translate3d(calc(var(--nx, 0) * -5px), calc(var(--ny, 0) * -3px), 0); }
        @media (hover: none) {
          .hero-spotlight { display: none; }
          .hero-depth .hero-layer-1, .hero-depth .hero-layer-2, .hero-depth .hero-layer-3 { transform: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-letter, .hero-wipe, .hero-dot, .hero-rise, .hero-fade, .hero-float, .hero-sheen, .hero-chip::before {
            animation: none !important;
            opacity: 1 !important;
            clip-path: none !important;
            filter: none !important;
          }
        }
      `}</style>
    </Section>
  );
});

Hero.displayName = 'Hero';
export default Hero;
