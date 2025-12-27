import React, { memo, useEffect, useState } from 'react';

interface Star {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
}

const StarField: React.FC = memo(() => {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [stars, setStars] = useState<{ layer1: Star[]; layer2: Star[]; layer3: Star[] }>({
        layer1: [],
        layer2: [],
        layer3: [],
    });

    useEffect(() => {
        // Generate stars only on client side to avoid hydration mismatch
        const generateStars = (count: number) => {
            return Array.from({ length: count }).map((_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.7 + 0.3,
            }));
        };

        setStars({
            layer1: generateStars(50), // Back layer (slow)
            layer2: generateStars(30), // Mid layer
            layer3: generateStars(20), // Front layer (fast)
        });

        const handleMouseMove = (e: MouseEvent) => {
            setOffset({
                x: (e.clientX - window.innerWidth / 2) / 50, // Divide to control sensitivity
                y: (e.clientY - window.innerHeight / 2) / 50,
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Back Layer - Slowest */}
            <div
                className="absolute inset-0 transition-transform duration-75 ease-out"
                style={{ transform: `translate(${offset.x * -1}px, ${offset.y * -1}px)` }}
            >
                {stars.layer1.map((star) => (
                    <div
                        className="absolute bg-white rounded-full"
                        key={`l1-${star.id}`}
                        style={{
                            height: `${star.size}px`,
                            left: `${star.x}%`,
                            opacity: star.opacity * 0.4,
                            top: `${star.y}%`,
                            width: `${star.size}px`,
                        }}
                    />
                ))}
            </div>

            {/* Mid Layer */}
            <div
                className="absolute inset-0 transition-transform duration-75 ease-out"
                style={{ transform: `translate(${offset.x * -2}px, ${offset.y * -2}px)` }}
            >
                {stars.layer2.map((star) => (
                    <div
                        className="absolute bg-white rounded-full"
                        key={`l2-${star.id}`}
                        style={{
                            height: `${star.size * 1.5}px`,
                            left: `${star.x}%`,
                            opacity: star.opacity * 0.6,
                            top: `${star.y}%`,
                            width: `${star.size * 1.5}px`,
                        }}
                    />
                ))}
            </div>

            {/* Front Layer - Fastest */}
            <div
                className="absolute inset-0 transition-transform duration-75 ease-out"
                style={{ transform: `translate(${offset.x * -4}px, ${offset.y * -4}px)` }}
            >
                {stars.layer3.map((star) => (
                    <div
                        className="absolute bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        key={`l3-${star.id}`}
                        style={{
                            height: `${star.size * 2}px`,
                            left: `${star.x}%`,
                            opacity: star.opacity,
                            top: `${star.y}%`,
                            width: `${star.size * 2}px`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
});

StarField.displayName = 'StarField';
export default StarField;
