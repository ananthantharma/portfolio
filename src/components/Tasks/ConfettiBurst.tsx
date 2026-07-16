/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import React, {useEffect, useMemo, useState} from 'react';

const COLORS = ['#f97316', '#f43f5e', '#f59e0b', '#10b981', '#6366f1', '#0ea5e9'];

interface ConfettiBurstProps {
  originX: number; // viewport px
  originY: number;
  onDone: () => void;
  pieceCount?: number;
}

/** A tiny, dependency-free confetti burst — celebrates finishing a task or clearing the day. */
export default function ConfettiBurst({originX, originY, onDone, pieceCount = 20}: ConfettiBurstProps) {
  const [visible, setVisible] = useState(true);

  const pieces = useMemo(
    () =>
      Array.from({length: pieceCount}).map((_, i) => ({
        id: i,
        color: COLORS[i % COLORS.length],
        dx: (Math.random() - 0.5) * 160,
        dy: 140 + Math.random() * 120,
        rot: 360 + Math.random() * 540,
        delay: Math.random() * 80,
        size: 5 + Math.random() * 4,
      })),
    [pieceCount],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 950);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[300]" style={{left: 0, top: 0}}>
      {pieces.map(p => (
        <span
          className="absolute animate-confetti-fall rounded-sm"
          key={p.id}
          style={{
            left: originX + p.dx * 0.2,
            top: originY,
            width: p.size,
            height: p.size * 2.4,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            transform: `translateX(${p.dx}px)`,
            ['--confetti-y' as string]: `${p.dy}px`,
            ['--confetti-r' as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
