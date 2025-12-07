
import React, { memo } from 'react';

const CircuitBoardLoader: React.FC = memo(() => {
    return (
        <div className="main-container">
            <div className="loader">
                {/* Tighter viewBox to reduce empty vertical space and zoom in on the circuit */}
                <svg height="100%" viewBox="0 50 800 350" width="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
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

                    <g>
                        <rect
                            fill="url(#pinGradient)"
                            height="10"
                            rx="2"
                            width="8"
                            x="322"
                            y="205"
                        ></rect>
                        <rect
                            fill="url(#pinGradient)"
                            height="10"
                            rx="2"
                            width="8"
                            x="322"
                            y="225"
                        ></rect>
                        <rect
                            fill="url(#pinGradient)"
                            height="10"
                            rx="2"
                            width="8"
                            x="322"
                            y="245"
                        ></rect>
                        <rect
                            fill="url(#pinGradient)"
                            height="10"
                            rx="2"
                            width="8"
                            x="322"
                            y="265"
                        ></rect>
                    </g>

                    <g>
                        <rect
                            fill="url(#pinGradient)"
                            height="10"
                            rx="2"
                            width="8"
                            x="470"
                            y="205"
                        ></rect>
                        <rect
                            fill="url(#pinGradient)"
                            height="10"
                            rx="2"
                            width="8"
                            x="470"
                            y="225"
                        ></rect>
                        <rect
                            fill="url(#pinGradient)"
                            height="10"
                            rx="2"
                            width="8"
                            x="470"
                            y="245"
                        ></rect>
                        <rect
                            fill="url(#pinGradient)"
                            height="10"
                            rx="2"
                            width="8"
                            x="470"
                            y="265"
                        ></rect>
                    </g>

                    <text
                        alignmentBaseline="middle"
                        className="neon-text"
                        fontFamily="Arial, sans-serif"
                        fontSize="14"
                        fontWeight="bold"
                        textAnchor="middle"
                        x="400"
                        y="240"
                    >
                        <tspan x="400" y="232">Ananthan</tspan>
                        <tspan x="400" y="252">Tharmavelautham</tspan>
                    </text>

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

        .neon-text {
          fill: #fff;
          text-shadow: 0 0 5px #ff005e, 0 0 10px #ff005e, 0 0 20px #ff005e, 0 0 40px #ff005e, 0 0 80px #ff005e;
          animation: glow 1.5s infinite alternate;
        }

        @keyframes glow {
          0% {
            text-shadow: 0 0 5px #ff005e, 0 0 10px #ff005e, 0 0 20px #ff005e, 0 0 40px #ff005e, 0 0 80px #ff005e;
          }
          100% {
            text-shadow: 0 0 10px #00d4ff, 0 0 20px #00d4ff, 0 0 40px #00d4ff, 0 0 80px #00d4ff, 0 0 160px #00d4ff;
          }
        }

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
