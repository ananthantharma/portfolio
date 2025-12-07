import React, { memo } from 'react';

const CircuitBoardLoader: React.FC = memo(() => {
    // The name to be displayed and glitched
    const name = "Ananthan Tharmavelautham";
    const [firstName, lastName] = name.split(' ');
    const textX = "400";
    const line1Y = "232";
    const line2Y = "252";

    // The SVG structure remains mostly the same, but the text group is now glitched
    return (
        <div className="main-container">
            <div className="loader">
                {/* Tighter viewBox to reduce empty vertical space and zoom in on the circuit */}
                <svg height="100%" viewBox="0 50 800 350" width="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* ... (Gradients unchanged) ... */}
                        <linearGradient id="chipGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#2d2d2d"></stop>
                            <stop offset="100%" stopColor="#0f0f0f"></stop>
                        </linearGradient>
                        <linearGradient id="textGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#eeeeee"></stop>
                            <stop offset="100%" stopColor="#888888"></stop>
                        </linearGradient>
                        <linearGradient id="pinGradient" x1="1" x2="0" y1="0" y2="0">
                            <stop offset="0%" stopColor="#bbbbbb"></stop>
                            <stop offset="50%" stopColor="#888888"></stop>
                            <stop offset="100%" stopColor="#555555"></stop>
                        </linearGradient>
                    </defs>

                    <g id="traces">
                        {/* ... (Traces unchanged) ... */}
                        <path className="trace-bg" d="M100 100 H200 V210 H326"></path>
                        <path className="trace-flow purple" d="M100 100 H200 V210 H326"></path>
                        <path className="trace-bg" d="M80 180 H180 V230 H326"></path>
                        <path className="trace-flow blue" d="M80 180 H180 V230 H326"></path>
                        <path className="trace-bg" d="M60 260 H150 V250 H326"></path>
                        <path className="trace-flow yellow" d="M60 260 H150 V250 H326"></path>
                        <path className="trace-bg" d="M100 350 H200 V270 H326"></path>
                        <path className="trace-flow green" d="M100 350 H200 V270 H326"></path>
                        <path className="trace-bg" d="M700 90 H560 V210 H474"></path>
                        <path className="trace-flow blue" d="M700 90 H560 V210 H474"></path>
                        <path className="trace-bg" d="M740 160 H580 V230 H474"></path>
                        <path className="trace-flow green" d="M740 160 H580 V230 H474"></path>
                        <path className="trace-bg" d="M720 250 H590 V250 H474"></path>
                        <path className="trace-flow red" d="M720 250 H590 V250 H474"></path>
                        <path className="trace-bg" d="M680 340 H570 V270 H474"></path>
                        <path className="trace-flow yellow" d="M680 340 H570 V270 H474"></path>
                    </g>

                    <rect
                        fill="url(#chipGradient)"
                        filter="drop-shadow(0 0 6px rgba(0,0,0,0.8))"
                        height="100"
                        rx="20"
                        ry="20"
                        stroke="#222"
                        strokeWidth="3"
                        width="140"
                        x="330"
                        y="190"
                    ></rect>

                    {/* ... (Pins unchanged) ... */}
                    <g>
                        <rect fill="url(#pinGradient)" height="10" rx="2" width="8" x="322" y="205"></rect>
                        <rect fill="url(#pinGradient)" height="10" rx="2" width="8" x="322" y="225"></rect>
                        <rect fill="url(#pinGradient)" height="10" rx="2" width="8" x="322" y="245"></rect>
                        <rect fill="url(#pinGradient)" height="10" rx="2" width="8" x="322" y="265"></rect>
                    </g>
                    <g>
                        <rect fill="url(#pinGradient)" height="10" rx="2" width="8" x="470" y="205"></rect>
                        <rect fill="url(#pinGradient)" height="10" rx="2" width="8" x="470" y="225"></rect>
                        <rect fill="url(#pinGradient)" height="10" rx="2" width="8" x="470" y="245"></rect>
                        <rect fill="url(#pinGradient)" height="10" rx="2" width="8" x="470" y="265"></rect>
                    </g>

                    {/* --- GLITCH TEXT IMPLEMENTATION --- */}
                    {/* The outer group is necessary to apply the `shift` animation (transform: skewX) to all layers */}
                    <g
                        className="glitch-container"
                        fontFamily="Arial, sans-serif"
                        fontSize="14"
                        fontWeight="bold"
                        textAnchor="middle"
                        x={textX}
                        y="240"
                    >
                        {/* 1. Base Text Layer (Replaces original text) */}
                        <text className="glitch-base">
                            <tspan x={textX} y={line1Y}>{firstName}</tspan>
                            <tspan x={textX} y={line2Y}>{lastName}</tspan>
                        </text>

                        {/* 2. Glitch Copy 1 (Replaces ::before) */}
                        <text className="glitch-copy-1">
                            <tspan x={textX} y={line1Y}>{firstName}</tspan>
                            <tspan x={textX} y={line2Y}>{lastName}</tspan>
                        </text>

                        {/* 3. Glitch Copy 2 (Replaces ::after) */}
                        <text className="glitch-copy-2">
                            <tspan x={textX} y={line1Y}>{firstName}</tspan>
                            <tspan x={textX} y={line2Y}>{lastName}</tspan>
                        </text>
                    </g>
                    {/* --- END GLITCH TEXT IMPLEMENTATION --- */}

                    {/* ... (Circles unchanged) ... */}
                    <circle cx="100" cy="100" fill="black" r="5"></circle>
                    <circle cx="80" cy="180" fill="black" r="5"></circle>
                    <circle cx="60" cy="260" fill="black" r="5"></circle>
                    <circle cx="100" cy="350" fill="black" r="5"></circle>
                    <circle cx="700" cy="90" fill="black" r="5"></circle>
                    <circle cx="740" cy="160" fill="black" r="5"></circle>
                    <circle cx="720" cy="250" fill="black" r="5"></circle>
                    <circle cx="680" cy="340" fill="black" r="5"></circle>
                </svg>
            </div>

            <style jsx>{`
                /* ... (Other styles remain the same) ... */
                .main-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    width: 100%;
                }

                .loader {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                /* --- GLITCH STYLES --- */
                .glitch-container {
                    /* Applies the 'shift' animation (skew) to the whole text block */
                    animation: shift 1s ease-in-out infinite alternate;
                }

                /* Base text layer */
                .glitch-base {
                    fill: #fff;
                }
                
                /* Copies that create the ghost/glitch effect */
                .glitch-copy-1,
                .glitch-copy-2 {
                    /* Inherit position on the SVG */
                    alignment-baseline: middle;
                    text-anchor: middle;
                    fill: currentColor; /* Allows color class to control fill/stroke */
                    opacity: 0.8;
                }

                .glitch-copy-1 {
                    /* Analogous to ::before */
                    animation: glitch 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite;
                    color: #ff8b00; /* Orange color from your CSS */
                }

                .glitch-copy-2 {
                    /* Analogous to ::after */
                    animation: glitch 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse both infinite;
                    color: #57e500; /* Green color from your CSS */
                }

                @keyframes glitch {
                    0% {
                        transform: translate(0);
                    }
                    20% {
                        transform: translate(-3px, 3px);
                    }
                    40% {
                        transform: translate(-3px, -3px);
                    }
                    60% {
                        transform: translate(3px, 3px);
                    }
                    80% {
                        transform: translate(3px, -3px);
                    }
                    to {
                        transform: translate(0);
                    }
                }

                @keyframes shift {
                    0%, 40%, 44%, 58%, 61%, 65%, 69%, 73%, 100% {
                        transform: skewX(0deg);
                    }
                    41% {
                        transform: skewX(10deg);
                    }
                    42% {
                        transform: skewX(-10deg);
                    }
                    59% {
                        transform: skewX(40deg) skewY(10deg);
                    }
                    60% {
                        transform: skewX(-40deg) skewY(-10deg);
                    }
                    63% {
                        transform: skewX(10deg) skewY(-5deg);
                    }
                    70% {
                        transform: skewX(-50deg) skewY(-20deg);
                    }
                    71% {
                        transform: skewX(10deg) skewY(-10deg);
                    }
                }
                /* --- END GLITCH STYLES --- */


                .trace-bg {
                    stroke: #333;
                    stroke-width: 2;
                    fill: none;
                }

                .trace-flow {
                    stroke-width: 2;
                    fill: none;
                    stroke-dasharray: 40 400;
                    stroke-dashoffset: 438;
                    filter: drop-shadow(0 0 6px currentColor);
                    animation: flow 3s cubic-bezier(0.5, 0, 0.9, 1) infinite;
                }

                .yellow { stroke: #ffea00; color: #ffea00; }
                .blue { stroke: #00ccff; color: #00ccff; }
                .green { stroke: #00ff15; color: #00ff15; }
                .purple { stroke: #9900ff; color: #9900ff; }
                .red { stroke: #ff3300; color: #ff3300; }

                @keyframes flow {
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
        </div>
    );
});

CircuitBoardLoader.displayName = 'CircuitBoardLoader';

export default CircuitBoardLoader;