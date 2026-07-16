/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import React, {useEffect, useRef} from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  divider?: boolean; // render a divider above this item
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/** Generic right-click menu, positioned at the cursor and clamped to the viewport. */
export default function ContextMenu({x, y, items, onClose}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('contextmenu', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('contextmenu', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - 200);
  const top = Math.min(y, window.innerHeight - items.length * 34 - 16);

  return (
    <div
      className="fixed z-[260] w-48 animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl"
      ref={ref}
      style={{left, top}}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {item.divider && i > 0 && <div className="my-1 h-px bg-slate-100" />}
          <button
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium transition-colors ${
              item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => {
              item.onSelect();
              onClose();
            }}>
            {item.icon}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
