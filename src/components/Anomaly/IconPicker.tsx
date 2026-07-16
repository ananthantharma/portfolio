/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import React, {useEffect, useRef, useState} from 'react';

import {ICON_KEYS, iconFor, PAGE_COLORS} from './icons';

interface IconPickerProps {
  icon?: string;
  color?: string;
  onChange: (patch: {icon?: string; color?: string}) => void;
}

export default function IconPicker({icon, color, onChange}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const Icon = iconFor(icon);
  const swatch = color && color !== '#000000' && color !== '#ffffff' ? color : '#8b5cf6';

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] transition-transform hover:scale-105"
        onClick={() => setOpen(o => !o)}
        style={{backgroundColor: `${swatch}20`, color: swatch}}
        title="Change icon & color">
        <Icon className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 w-64 rounded-2xl border border-white/[0.1] bg-[#12141d] p-3 shadow-float">
          <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">Color</p>
          <div className="flex flex-wrap gap-1.5 px-1 pb-3">
            {PAGE_COLORS.map(c => (
              <button
                className={`h-5 w-5 shrink-0 rounded-full transition-transform hover:scale-110 ${
                  swatch.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-[#12141d]' : ''
                }`}
                key={c}
                onClick={() => onChange({color: c})}
                style={{backgroundColor: c}}
                title={c}
              />
            ))}
          </div>
          <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">Icon</p>
          <div className="grid max-h-40 grid-cols-7 gap-1 overflow-y-auto px-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
            {ICON_KEYS.map(key => {
              const OptIcon = iconFor(key);
              const active = (icon || 'FileText') === key;
              return (
                <button
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    active ? 'bg-violet-500/25 text-violet-200' : 'text-white/40 hover:bg-white/[0.08] hover:text-white/80'
                  }`}
                  key={key}
                  onClick={() => onChange({icon: key})}
                  title={key}>
                  <OptIcon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
