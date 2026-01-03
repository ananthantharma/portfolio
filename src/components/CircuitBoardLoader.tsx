import React, {memo, useEffect, useRef, useState} from 'react';

import {heroEducation, heroTimeline, socialLinks} from '../data/data';
import {TimelineItem} from '../data/dataDef';

/* eslint-disable react/jsx-sort-props */
/* --- 2. HELPERS --- */

// The "Hacker" Text Effect
const ScrambledText = memo(({delay = 0, text}: {delay?: number; text: string}) => {
  const [displayText, setDisplayText] = useState('');
  const chars = "#.^^{-!#$_№:0#{+.@}-??{4@%=.,^!?2@%\\;1}]?{%:%|{f[4{4%0%'1_0<{0%]>'42";
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const iterationRef = useRef(0);

  useEffect(() => {
    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const progress = time - startTimeRef.current;
      if (progress > 50) {
        setDisplayText(
          text
            .split('')
            .map((l, i) => (i < iterationRef.current ? l : chars[Math.floor(Math.random() * chars.length)]))
            .join(''),
        );
        iterationRef.current += 1 / 4;
        startTimeRef.current = time;
      }
      if (iterationRef.current < text.length) requestRef.current = requestAnimationFrame(animate);
    };
    const timeoutId = setTimeout(() => (requestRef.current = requestAnimationFrame(animate)), delay);
    return () => {
      clearTimeout(timeoutId);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [text, delay]);
  return <span>{displayText}</span>;
});
ScrambledText.displayName = 'ScrambledText';

// The Card rendered inside SVG
const SvgCard = memo(
  ({align = 'left', item, x, y}: {align?: 'left' | 'right'; item: TimelineItem; x: number; y: number}) => {
    const isLeft = align === 'left';

    // Handle StaticImageData or string path for image
    const imageSrc =
      item.image && typeof item.image === 'object' && 'src' in item.image ? item.image.src : (item.image as string);

    return (
      // Reduced height to 80px for tighter packing
      <foreignObject height="80" style={{overflow: 'visible'}} width="500" x={isLeft ? x - 500 : x} y={y - 40}>
        <div className={`flex w-full h-full items-center ${isLeft ? 'justify-end pr-6' : 'justify-start pl-6'}`}>
          {/* THE CARD 
                   Reduced Scale
                */}
          <div
            className={`group relative flex w-full max-w-[480px] items-center gap-x-3 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-3 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-cyan-400/50 hover:bg-[rgba(255,255,255,0.08)] hover:shadow-[0_0_30px_rgba(0,201,255,0.3)]
                    ${isLeft ? 'flex-row-reverse text-right' : 'flex-row text-left'}
                `}>
            {/* Logo - Medium Size (h-12) */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white p-2 shadow-inner">
              {imageSrc ? (
                <div className="relative w-full h-full">
                  <img alt="logo" className="h-full w-full object-contain" src={imageSrc} />
                </div>
              ) : (
                <span className="text-[10px] font-bold text-black">NO IMG</span>
              )}
            </div>

            {/* Text Content - Smaller Fonts */}
            <div className="flex-1 min-w-0">
              <div className="mb-0.5 text-xs font-medium uppercase tracking-wider text-slate-400">{item.date}</div>
              <h3 className="truncate bg-gradient-to-r from-[#00C9FF] to-[#92FE9D] bg-clip-text text-base font-bold text-transparent">
                {item.title}
              </h3>
              <div className="text-xs font-medium text-slate-300">{item.location as React.ReactNode}</div>
            </div>
          </div>

          {/* Connector Dot on the card edge */}
          <div
            className={`absolute top-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_15px_cyan] transform -translate-y-1/2 
                    ${isLeft ? 'right-3' : 'left-3'}
                `}
          />
        </div>
      </foreignObject>
    );
  },
);
SvgCard.displayName = 'SvgCard';

/* --- 3. MAIN COMPONENT --- */
const UnifiedCircuitSection = memo(() => {
  // State for interactive "High Bandwidth" connection
  const [activeId, setActiveId] = useState<string | null>(null);

  // Dynamic Layout Calculations
  const ITEM_HEIGHT = 110; // Tighter vertical spacing
  const TOP_OFFSET = 60;

  // Map data to local variables for clarity
  const workItems = heroTimeline;
  const eduItems = heroEducation;

  // Determine height based on the longest list
  const maxItems = Math.max(workItems.length, eduItems.length);
  const svgHeight = maxItems * ITEM_HEIGHT + TOP_OFFSET * 2;

  // WIDENED COORDINATE SYSTEM
  const svgWidth = 1920;

  // Center positions
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  // Larger Chip (UNCHANGED)
  const chipWidth = 320;
  const chipHeight = 260; // Increased to fit the 250px space card

  // Pin logic
  const pinSpacing = 25; // More space between pins on the chip

  // Colors for the "Flow" animation
  const colors = ['#9900ff', '#00ccff', '#ffea00', '#00ff15', '#ff3300'];

  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent overflow-hidden">
      <svg className="w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <defs>
          <linearGradient id="chipGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2d2d2d" />
            <stop offset="100%" stopColor="#0f0f0f" />
          </linearGradient>
          <linearGradient id="pinGradient" x1="1" x2="0" y1="0" y2="0">
            <stop offset="0%" stopColor="#bbbbbb" />
            <stop offset="100%" stopColor="#555555" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Turbulence Filter for "Liquid/Wiggle" Effect */}
          <filter id="wiggle">
            <feTurbulence baseFrequency="0.01" numOctaves="3" result="noise" type="fractalNoise">
              <animate attributeName="baseFrequency" dur="10s" repeatCount="indefinite" values="0.01;0.015;0.01" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* --- 1. LEFT SIDE (WORK) --- */}
        <g id="left-traces">
          {workItems.map((item, i) => {
            const cardY = TOP_OFFSET + i * ITEM_HEIGHT;
            // Calculate pin Y position based on new spacing
            const totalPinsHeight = workItems.length * pinSpacing;
            const startPinY = centerY - totalPinsHeight / 2;
            const pinY = startPinY + i * pinSpacing;

            // Layout Coordinates for WIDE screen - Pushed to Edges
            const cardEdgeX = 550; // Position cards at the far left edge (50px margin + 500px width)
            const pinX = centerX - chipWidth / 2; // Left side of chip

            // Dynamic elbow bend
            const midX = centerX - 300;

            const isActive = activeId === `work-${i}`;
            const strokeColor = isActive ? '#FFFFFF' : colors[i % colors.length];

            return (
              <g
                key={`work-${i}`}
                onClick={() => setActiveId(isActive ? null : `work-${i}`)}
                style={{cursor: 'pointer'}}>
                {/* The Trace Line (Background) */}
                <path
                  d={`M${pinX} ${pinY} H${midX} V${cardY} H${cardEdgeX}`}
                  fill="none"
                  filter="url(#wiggle)" // Apply wiggle to the wire structure
                  stroke="#333"
                  strokeWidth={isActive ? 4 : 3}
                  style={{transition: 'stroke-width 0.3s ease'}}
                />
                {/* The Trace Line (Active Flow) */}
                <path
                  className="animate-flow"
                  d={`M${pinX} ${pinY} H${midX} V${cardY} H${cardEdgeX}`}
                  fill="none"
                  filter="url(#glow)"
                  stroke={strokeColor} // White when active
                  strokeLinecap="round"
                  strokeWidth={isActive ? 5 : 3} // Thicker when active
                  style={{
                    animationDuration: isActive ? '1s' : '3s', // Fast pulse when active
                    animationDelay: `${i * 0.5}s`, // Staggered start
                  }}
                />
                {/* The Pin on the Chip */}
                <rect fill="url(#pinGradient)" height="12" rx="2" width="10" x={pinX - 10} y={pinY - 6} />

                {/* The Card */}
                <SvgCard align="left" item={item} x={cardEdgeX} y={cardY} />
              </g>
            );
          })}
        </g>

        {/* --- 2. RIGHT SIDE (EDUCATION) --- */}
        <g id="right-traces">
          {eduItems.map((item, i) => {
            const cardY = TOP_OFFSET + i * ITEM_HEIGHT;
            const totalPinsHeight = eduItems.length * pinSpacing;
            const startPinY = centerY - totalPinsHeight / 2;
            const pinY = startPinY + i * pinSpacing;

            const cardEdgeX = svgWidth - 550; // Position cards at far right edge (50px margin + 500px width)
            const pinX = centerX + chipWidth / 2; // Right side of chip
            const midX = centerX + 300; // Elbow bend X

            const isActive = activeId === `edu-${i}`;
            const strokeColor = isActive ? '#FFFFFF' : colors[i % colors.length];

            return (
              <g key={`edu-${i}`} onClick={() => setActiveId(isActive ? null : `edu-${i}`)} style={{cursor: 'pointer'}}>
                {/* The Trace Line (Background) */}
                <path
                  d={`M${pinX} ${pinY} H${midX} V${cardY} H${cardEdgeX}`}
                  fill="none"
                  filter="url(#wiggle)"
                  stroke="#333"
                  strokeWidth={isActive ? 4 : 3}
                  style={{transition: 'stroke-width 0.3s ease'}}
                />
                {/* The Trace Line (Active Flow) */}
                <path
                  className="animate-flow" // Same animation class because we reversed the path manually
                  d={`M${pinX} ${pinY} H${midX} V${cardY} H${cardEdgeX}`}
                  fill="none"
                  filter="url(#glow)"
                  stroke={strokeColor}
                  strokeLinecap="round"
                  strokeWidth={isActive ? 5 : 3}
                  style={{
                    animationDuration: isActive ? '1s' : '3s',
                    animationDelay: `${i * 0.7}s`, // Different stagger for variety
                  }}
                />
                <rect fill="url(#pinGradient)" height="12" rx="2" width="10" x={pinX} y={pinY - 6} />
                <SvgCard align="right" item={item} x={cardEdgeX} y={cardY} />
              </g>
            );
          })}
        </g>

        {/* --- 3. CENTER CHIP (Replaced with Glassmorphism) --- */}
        <g transform={`translate(${centerX - chipWidth / 2}, ${centerY - chipHeight / 2})`}>
          {/* REMOVED: SVG Rect Background 
              <rect fill="url(#chipGradient)" filter="drop-shadow(0 0 20px rgba(0,0,0,0.8))" height={chipHeight} rx="30" stroke="#222" strokeWidth="4" width={chipWidth} />
          */}

          <foreignObject height={chipHeight} style={{overflow: 'visible'}} width={chipWidth} x="0" y="0">
            {/* Space Card Structure */}
            <div className="outer">
              <div className="dot"></div>
              <div className="card">
                <div className="ray"></div>
                <div className="text text-center">
                  <ScrambledText delay={200} text="Ananthan" />
                  <br />
                  <ScrambledText delay={800} text="Tharmavelautham" />
                </div>

                {/* Social Icons within Card */}
                <div className="flex gap-x-4 mt-4 z-10">
                  {socialLinks.map(({label, Icon, href}) => (
                    <a
                      aria-label={label}
                      className="text-gray-400 transition-all duration-300 hover:text-white hover:scale-110"
                      href={href}
                      key={label}
                      rel="noopener noreferrer"
                      target="_blank">
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>

                <div className="line topl"></div>
                <div className="line leftl"></div>
                <div className="line bottoml"></div>
                <div className="line rightl"></div>
              </div>
            </div>
          </foreignObject>
        </g>
      </svg>

      <style jsx>{`
        .outer {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          padding: 1px;
          background: radial-gradient(circle 230px at 0% 0%, #ffffff, #0c0d0d);
          position: relative;
        }

        .dot {
          width: 5px;
          aspect-ratio: 1;
          position: absolute;
          background-color: #fff;
          box-shadow: 0 0 10px #ffffff;
          border-radius: 100px;
          z-index: 2;
          right: 10%;
          top: 10%;
          animation: moveDot 6s linear infinite;
        }

        @keyframes moveDot {
          0%,
          100% {
            top: 10%;
            right: 10%;
          }
          25% {
            top: 10%;
            right: calc(100% - 35px);
          }
          50% {
            top: calc(100% - 30px);
            right: calc(100% - 35px);
          }
          75% {
            top: calc(100% - 30px);
            right: 10%;
          }
        }

        .card {
          z-index: 1;
          width: 100%;
          height: 100%;
          border-radius: 9px;
          border: solid 1px #202222;
          background-size: 20px 20px;
          background: radial-gradient(circle 280px at 0% 0%, #444444, #0c0d0d);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          flex-direction: column;
          color: #fff;
        }

        .ray {
          width: 220px;
          height: 45px;
          border-radius: 100px;
          position: absolute;
          background-color: #c7c7c7;
          opacity: 0.4;
          box-shadow: 0 0 50px #fff;
          filter: blur(10px);
          transform-origin: 10%;
          top: 0%;
          left: 0;
          transform: rotate(40deg);
        }

        .text {
          font-weight: bolder;
          font-size: 1.8rem; /* Adjusted from 4rem for long name */
          background: linear-gradient(45deg, #ffffff 0%, #bbbbbb 50%, #ffffff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          line-height: 1.2;
        }

        .line {
          width: 100%;
          height: 1px;
          position: absolute;
          background-color: #2c2c2c;
        }
        .topl {
          top: 10%;
          background: linear-gradient(90deg, #888888 30%, #1d1f1f 70%);
        }
        .bottoml {
          bottom: 10%;
        }
        .leftl {
          left: 10%;
          width: 1px;
          height: 100%;
          background: linear-gradient(180deg, #747474 30%, #222424 70%);
        }
        .rightl {
          right: 10%;
          width: 1px;
          height: 100%;
        }

        .animate-flow {
          stroke-dasharray: 40 400;
          stroke-dashoffset: 440;
          animation: flow 2s linear infinite;
        }
        @keyframes flow {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
});

UnifiedCircuitSection.displayName = 'UnifiedCircuitSection';
export default UnifiedCircuitSection;
