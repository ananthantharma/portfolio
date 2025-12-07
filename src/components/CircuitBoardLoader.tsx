import React, { memo, useEffect, useRef, useState } from 'react';

import { heroEducation, heroTimeline, socialLinks } from '../data/data';
import { TimelineItem } from '../data/dataDef';

/* --- 2. HELPERS --- */

// The "Hacker" Text Effect
const ScrambledText = memo(({ delay = 0, text }: { delay?: number; text: string }) => {
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
                setDisplayText(text.split("").map((l, i) => i < iterationRef.current ? l : chars[Math.floor(Math.random() * chars.length)]).join(""));
                iterationRef.current += 1 / 4;
                startTimeRef.current = time;
            }
            if (iterationRef.current < text.length) requestRef.current = requestAnimationFrame(animate);
        };
        const timeoutId = setTimeout(() => requestRef.current = requestAnimationFrame(animate), delay);
        return () => {
            clearTimeout(timeoutId);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [text, delay]);
    return <span>{displayText}</span>;
});
ScrambledText.displayName = 'ScrambledText';

// The Card rendered inside SVG
const SvgCard = memo(({ align = 'left', item, x, y }: { align?: 'left' | 'right'; item: TimelineItem; x: number; y: number }) => {
    const isLeft = align === 'left';

    // Handle StaticImageData or string path for image
    const imageSrc = item.image && typeof item.image === 'object' && 'src' in item.image ? item.image.src : item.image as string;

    return (
        // Reduced height to 80px for tighter packing
        <foreignObject height="80" style={{ overflow: 'visible' }} width="500" x={isLeft ? x - 500 : x} y={y - 40}>
            <div className={`flex w-full h-full items-center ${isLeft ? 'justify-end pr-6' : 'justify-start pl-6'}`}>

                {/* THE CARD 
                   Reduced Scale
                */}
                <div className={`group relative flex w-full max-w-[480px] items-center gap-x-3 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-3 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-cyan-400/50 hover:bg-[rgba(255,255,255,0.08)] hover:shadow-[0_0_30px_rgba(0,201,255,0.3)]
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
                        <div className="mb-0.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                            {item.date}
                        </div>
                        <h3 className="truncate bg-gradient-to-r from-[#00C9FF] to-[#92FE9D] bg-clip-text text-base font-bold text-transparent">
                            {item.title}
                        </h3>
                        <div className="text-xs font-medium text-slate-300">
                            {item.location as React.ReactNode}
                        </div>
                    </div>
                </div>

                {/* Connector Dot on the card edge */}
                <div className={`absolute top-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_15px_cyan] transform -translate-y-1/2 
                    ${isLeft ? 'right-3' : 'left-3'}
                `} />
            </div>
        </foreignObject>
    );
});
SvgCard.displayName = 'SvgCard';

/* --- 3. MAIN COMPONENT --- */
const UnifiedCircuitSection = memo(() => {
    // Dynamic Layout Calculations
    const ITEM_HEIGHT = 110; // Tighter vertical spacing
    const TOP_OFFSET = 60;

    // Map data to local variables for clarity
    const workItems = heroTimeline;
    const eduItems = heroEducation;

    // Determine height based on the longest list
    const maxItems = Math.max(workItems.length, eduItems.length);
    const svgHeight = (maxItems * ITEM_HEIGHT) + (TOP_OFFSET * 2);

    // WIDENED COORDINATE SYSTEM
    const svgWidth = 1920;

    // Center positions
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    // Larger Chip (UNCHANGED)
    const chipWidth = 320;
    const chipHeight = 200;

    // Pin logic
    const pinSpacing = 25; // More space between pins on the chip

    // Colors for the "Flow" animation
    const colors = ["#9900ff", "#00ccff", "#ffea00", "#00ff15", "#ff3300"];

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
                </defs>

                {/* --- 1. LEFT SIDE (WORK) --- */}
                <g id="left-traces">
                    {workItems.map((item, i) => {
                        const cardY = TOP_OFFSET + (i * ITEM_HEIGHT);
                        // Calculate pin Y position based on new spacing
                        const totalPinsHeight = workItems.length * pinSpacing;
                        const startPinY = centerY - (totalPinsHeight / 2);
                        const pinY = startPinY + (i * pinSpacing);

                        // Layout Coordinates for WIDE screen - Pushed to Edges
                        const cardEdgeX = 550; // Position cards at the far left edge (50px margin + 500px width)
                        const pinX = centerX - (chipWidth / 2); // Left side of chip

                        // Dynamic elbow bend 
                        const midX = centerX - 300;

                        return (
                            <g key={`work-${i}`}>
                                {/* The Trace Line */}
                                <path
                                    d={`M${cardEdgeX} ${cardY} H${midX} V${pinY} H${pinX}`}
                                    fill="none"
                                    stroke="#333"
                                    strokeWidth="3"
                                />
                                <path
                                    className="animate-flow"
                                    d={`M${cardEdgeX} ${cardY} H${midX} V${pinY} H${pinX}`}
                                    fill="none"
                                    stroke={colors[i % colors.length]}
                                    strokeWidth="3"
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
                        const cardY = TOP_OFFSET + (i * ITEM_HEIGHT);
                        const totalPinsHeight = eduItems.length * pinSpacing;
                        const startPinY = centerY - (totalPinsHeight / 2);
                        const pinY = startPinY + (i * pinSpacing);

                        const cardEdgeX = svgWidth - 550; // Position cards at far right edge (50px margin + 500px width)
                        const pinX = centerX + (chipWidth / 2); // Right side of chip
                        const midX = centerX + 300; // Elbow bend X

                        return (
                            <g key={`edu-${i}`}>
                                <path
                                    d={`M${cardEdgeX} ${cardY} H${midX} V${pinY} H${pinX}`}
                                    fill="none"
                                    stroke="#333"
                                    strokeWidth="3"
                                />
                                <path
                                    className="animate-flow-reverse"
                                    d={`M${cardEdgeX} ${cardY} H${midX} V${pinY} H${pinX}`}
                                    fill="none"
                                    stroke={colors[i % colors.length]}
                                    strokeWidth="3"
                                />
                                <rect fill="url(#pinGradient)" height="12" rx="2" width="10" x={pinX} y={pinY - 6} />
                                <SvgCard align="right" item={item} x={cardEdgeX} y={cardY} />
                            </g>
                        );
                    })}
                </g>

                {/* --- 3. CENTER CHIP --- */}
                <g transform={`translate(${centerX - (chipWidth / 2)}, ${centerY - (chipHeight / 2)})`}>
                    <rect fill="url(#chipGradient)" filter="drop-shadow(0 0 20px rgba(0,0,0,0.8))" height={chipHeight} rx="30" stroke="#222" strokeWidth="4" width={chipWidth} />

                    <foreignObject height={chipHeight} width={chipWidth} x="0" y="0">
                        <div className="w-full h-full flex flex-col items-center justify-center gap-y-4">
                            <div className="text-2xl font-mono font-bold text-[#00FF41] text-center leading-tight drop-shadow-[0_0_10px_rgba(0,255,65,0.8)]">
                                <ScrambledText delay={200} text="Ananthan" /><br />
                                <ScrambledText delay={800} text="Tharmavelautham" />
                            </div>

                            {/* Social Icons moved inside the chip */}
                            <div className="flex gap-x-4">
                                {socialLinks.map(({ label, Icon, href }) => (
                                    <a
                                        aria-label={label}
                                        className="text-gray-400 transition-all duration-300 hover:text-[#00FF41] hover:scale-110"
                                        href={href}
                                        key={label}
                                        rel="noopener noreferrer"
                                        target="_blank"
                                    >
                                        <Icon className="h-6 w-6" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </foreignObject>
                </g>

            </svg>

            <style jsx>{`
                .animate-flow {
                    stroke-dasharray: 40 400;
                    stroke-dashoffset: 440;
                    animation: flow 3s linear infinite;
                }
                .animate-flow-reverse {
                    stroke-dasharray: 40 400;
                    stroke-dashoffset: 440;
                    animation: flowReverse 3s linear infinite;
                }
                @keyframes flow {
                    to { stroke-dashoffset: 0; }
                }
                @keyframes flowReverse {
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
        </div>
    );
});

UnifiedCircuitSection.displayName = 'UnifiedCircuitSection';
export default UnifiedCircuitSection;