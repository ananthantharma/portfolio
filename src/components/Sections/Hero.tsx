/* eslint-disable react/jsx-sort-props */
'use client';
import {Award, Compass, Mail, Network, Shield, Target} from 'lucide-react';
import {FC, memo, useEffect, useRef, useState} from 'react';

import {heroData, SectionId, socialLinks} from '../../data/data';
import Section from '../Layout/Section';

/* ─── Credential badges ───────────────────────────────────────────────── */
const BADGES = [
  {Icon: Shield,  text: 'P.ENG'},
  {Icon: Target,  text: 'PMP'},
  {Icon: Network, text: 'CSCP'},
  {Icon: Award,   text: 'MBA'},
] as const;

/* ─── Hero ───────────────────────────────────────────────────────────── */
const Hero: FC = memo(() => {
  const {actions} = heroData;

  const [isLoaded, setIsLoaded] = useState(false);

  // Use a ref so the canvas loop reads fresh values without recreating
  const mousePosRef = useRef({x: 0, y: 0});
  const canvasRef   = useRef<HTMLCanvasElement>(null);

  /* mouse tracking */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mousePosRef.current = {
        x: (e.clientX / window.innerWidth)  * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener('mousemove', onMove);
    const t = setTimeout(() => setIsLoaded(true), 200);
    return () => {
      window.removeEventListener('mousemove', onMove);
      clearTimeout(t);
    };
  }, []);

  /* 3D tilt values — we derive inline from a state that only updates on raf */
  const [tilt, setTilt] = useState({x: 0, y: 0});
  useEffect(() => {
    let rafId: number;
    const loop = () => {
      setTilt(prev => {
        const tx = mousePosRef.current.y * 5;
        const ty = mousePosRef.current.x * 5;
        // Lerp for smoothness
        return {
          x: prev.x + (tx - prev.x) * 0.05,
          y: prev.y + (ty - prev.y) * 0.05,
        };
      });
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  /* galaxy canvas — runs once, reads mousePosRef each frame */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let globalRotation = 0;
    const maxDepth = 2500;
    const numStars  = 1200;

    type Star  = {x: number; y: number; z: number; color: string; baseSize: number};
    type Comet = {x: number; y: number; length: number; speed: number; angle: number; opacity: number};

    const stars: Star[]  = [];
    const comets: Comet[] = [];

    for (let i = 0; i < numStars; i++) {
      const t = Math.random();
      const color = t > 0.85 ? '192,132,252' : t > 0.7 ? '147,197,253' : '255,255,255';
      stars.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        z: Math.random() * maxDepth,
        color,
        baseSize: Math.random() * 2 + 0.5,
      });
    }

    const render = () => {
      const {x: mx, y: my} = mousePosRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;

      if (canvas.width !== W || canvas.height !== H) {
        canvas.width  = W;
        canvas.height = H;
      }

      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;

      globalRotation += 0.0003;

      const driftX = mx * 10;
      const driftY = -my * 10;
      const cosR   = Math.cos(globalRotation);
      const sinR   = Math.sin(globalRotation);
      const fov    = 600;
      const now    = Date.now();

      for (const star of stars) {
        star.z -= 0.5;
        if (star.z < 1) {
          star.z = maxDepth;
          star.x = (Math.random() - 0.5) * 4000;
          star.y = (Math.random() - 0.5) * 4000;
        }

        const rx = star.x * cosR - star.y * sinR;
        const ry = star.y * cosR + star.x * sinR;
        const sc = fov / star.z;

        const x2d = cx + (rx + driftX * star.z * 0.05) * sc;
        const y2d = cy + (ry + driftY * star.z * 0.05) * sc;

        const distAlpha = Math.min(1, (maxDepth - star.z) / 1000);
        const twinkle   = 0.5 + Math.sin(now * 0.002 + star.x) * 0.5;
        const alpha     = distAlpha * (0.4 + twinkle * 0.6);
        const r         = Math.max(0.1, star.baseSize * sc);

        ctx.beginPath();
        ctx.arc(x2d, y2d, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color},${alpha})`;
        ctx.fill();

        if (star.baseSize > 2 && alpha > 0.5) {
          ctx.shadowBlur  = 15;
          ctx.shadowColor = `rgba(${star.color},${alpha})`;
          ctx.fill();
          ctx.shadowBlur  = 0;
        }
      }

      /* comets */
      if (Math.random() < 0.005) {
        comets.push({
          x:       (Math.random() - 0.5) * W * 2,
          y:       (Math.random() - 0.5) * H * 2,
          length:  Math.random() * 150 + 50,
          speed:   Math.random() * 5 + 5,
          angle:   Math.PI / 4 + (Math.random() * 0.2 - 0.1),
          opacity: 1,
        });
      }

      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x       += Math.cos(c.angle) * c.speed;
        c.y       += Math.sin(c.angle) * c.speed;
        c.opacity -= 0.005;

        if (c.opacity <= 0) { comets.splice(i, 1); continue; }

        const grad = ctx.createLinearGradient(
          c.x, c.y,
          c.x - Math.cos(c.angle) * c.length,
          c.y - Math.sin(c.angle) * c.length,
        );
        grad.addColorStop(0, `rgba(255,255,255,${c.opacity})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x - Math.cos(c.angle) * c.length, c.y - Math.sin(c.angle) * c.length);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }

      rafId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(rafId);
  }, []); // runs once — reads mouse via ref

  const linkedIn = socialLinks.find(s => s.label === 'LinkedIn')?.href ?? '#';

  return (
    <Section noPadding sectionId={SectionId.Hero}>
      <div className="relative min-h-screen overflow-hidden bg-[#020106] font-sans text-white selection:bg-purple-500/30 selection:text-white">

        {/* Galaxy canvas */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 z-0 transition-opacity duration-[3000ms] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Nebula blobs */}
        <div className="pointer-events-none absolute -left-[10%] -top-[10%] z-0 h-[60vw] w-[60vw] rounded-full bg-indigo-900/15 blur-[150px] mix-blend-screen animate-nebula-breathe" />
        <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] z-0 h-[60vw] w-[60vw] rounded-full bg-purple-900/15 blur-[150px] mix-blend-screen animate-nebula-breathe-delayed" />

        {/* 3-D container */}
        <div
          className="relative z-30 mx-auto flex min-h-screen w-full max-w-[100rem] flex-col justify-between px-6 sm:px-12 lg:px-24"
          style={{perspective: '2000px'}}>

          {/* Spacer to push content down from top */}
          <div className="py-12" />

          {/* Main — 3D tilt */}
          <main
            className="flex flex-grow flex-col items-start justify-center w-full max-w-5xl transition-transform duration-1000 ease-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            }}>

            {/* Glass monolith */}
            <div
              className="group relative w-full overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-md transition-all duration-1000 sm:p-12 md:p-16"
              style={{transformStyle: 'preserve-3d', transform: 'translateZ(30px)'}}>

              {/* Glare on hover */}
              <div
                className="pointer-events-none absolute inset-0 z-0 opacity-0 mix-blend-screen transition-opacity duration-700 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at ${50 + mousePosRef.current.x * 50}% ${50 - mousePosRef.current.y * 50}%, rgba(255,255,255,0.06), transparent 50%)`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-gradient-to-br from-white/[0.05] to-transparent" />

              {/* Name */}
              <div
                className={`relative z-10 transition-all duration-[1500ms] delay-300 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{transform: 'translateZ(60px)'}}>
                <h1 className="mb-2 text-[10vw] font-bold leading-[0.85] tracking-tighter text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] sm:text-[8vw] md:text-7xl lg:text-8xl">
                  ANANTHAN
                </h1>
                <h1 className="bg-gradient-to-r from-neutral-100 via-neutral-300 to-neutral-600 bg-clip-text text-[8vw] font-light leading-[0.85] tracking-tight text-transparent drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] sm:text-[6vw] md:text-6xl lg:text-7xl">
                  THARMAVELAUTHAM.
                </h1>
              </div>

              {/* Credential badges */}
              <div
                className={`relative z-10 mt-12 flex flex-wrap gap-4 transition-all duration-[1500ms] delay-500 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{transform: 'translateZ(45px)'}}>
                {BADGES.map(({Icon, text}) => (
                  <div
                    className="group/badge relative flex cursor-default items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-6 py-2.5 shadow-lg transition-all duration-500 hover:-translate-y-1 hover:border-purple-400/60 hover:bg-white/[0.1] hover:shadow-[0_0_20px_rgba(192,132,252,0.2)]"
                    key={text}>
                    <Icon className="text-neutral-500 transition-colors duration-500 group-hover/badge:text-purple-300" size={14} />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-300 transition-colors duration-500 group-hover/badge:text-white">
                      {text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div
                className={`relative z-10 mt-16 flex flex-col gap-6 sm:flex-row transition-all duration-[1500ms] delay-700 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{transform: 'translateZ(55px)'}}>

                {/* Primary — wire to first action if exists, else contact anchor */}
                {actions.length > 0 ? (
                  actions.map(({href, text, primary, onClick}, i) =>
                    primary ? (
                      <a
                        className="group flex w-max items-center justify-between gap-6 rounded-full bg-white px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-500 hover:scale-105 hover:bg-neutral-100 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)]"
                        href={href}
                        key={i}
                        onClick={onClick}>
                        <span>{text}</span>
                        <Compass className="transition-transform duration-500 group-hover:rotate-45" size={16} />
                      </a>
                    ) : (
                      <a
                        className="group flex w-max items-center justify-between gap-6 rounded-full border border-white/20 bg-transparent px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-neutral-300 transition-all duration-500 hover:border-white/40 hover:bg-white/5 hover:text-white"
                        href={href}
                        key={i}
                        onClick={onClick}>
                        <span>{text}</span>
                        <Mail className="text-neutral-500 transition-colors duration-500 group-hover:text-white" size={16} />
                      </a>
                    ),
                  )
                ) : (
                  <>
                    <a
                      className="group flex w-max items-center justify-between gap-6 rounded-full bg-white px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-500 hover:scale-105 hover:bg-neutral-100 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)]"
                      href={`/#${SectionId.Contact}`}>
                      <span>Get in Touch</span>
                      <Mail className="transition-transform duration-500 group-hover:translate-x-0.5" size={16} />
                    </a>
                    <a
                      className="group flex w-max items-center justify-between gap-6 rounded-full border border-white/20 bg-transparent px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-neutral-300 transition-all duration-500 hover:border-white/40 hover:bg-white/5 hover:text-white"
                      href={linkedIn}
                      rel="noreferrer"
                      target="_blank">
                      <span>LinkedIn Profile</span>
                      <Compass className="text-neutral-500 transition-transform duration-500 group-hover:rotate-45 group-hover:text-white" size={16} />
                    </a>
                  </>
                )}
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer
            className={`flex flex-col items-center justify-between border-t border-white/5 py-8 sm:flex-row transition-all duration-[1500ms] delay-1000 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              © {new Date().getFullYear()} Ananthan Tharmavelautham
            </p>
            <div className="mt-4 flex gap-8 sm:mt-0">
              {socialLinks.map(({label, href}) => (
                <a
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition-all duration-300 hover:text-purple-400"
                  href={href}
                  key={label}
                  rel="noreferrer"
                  target="_blank">
                  {label}
                </a>
              ))}
            </div>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1);   opacity: 0.5; }
          50%       { transform: scale(1.1); opacity: 0.8; }
        }
        .animate-nebula-breathe {
          animation: breathe 15s ease-in-out infinite;
        }
        .animate-nebula-breathe-delayed {
          animation: breathe 18s ease-in-out infinite;
          animation-delay: 5s;
        }
      `}</style>
    </Section>
  );
});

Hero.displayName = 'Hero';
export default Hero;
