/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {Undo2, X} from 'lucide-react';
import React, {useEffect, useState} from 'react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

/** Bottom-left snackbar with an Undo action and a shrinking progress bar. */
export default function UndoToast({message, onUndo, onDismiss, durationMs = 5000}: UndoToastProps) {
  const [remaining, setRemaining] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / durationMs) * 100);
      setRemaining(pct);
      if (pct <= 0) clearInterval(tick);
    }, 50);
    const timeout = setTimeout(onDismiss, durationMs);
    return () => {
      clearInterval(tick);
      clearTimeout(timeout);
    };
  }, [durationMs, onDismiss]);

  return (
    <div className="fixed bottom-5 left-5 z-[250] w-[280px] animate-slide-up overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl">
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{message}</p>
        <button
          className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-orange-300 transition-colors hover:bg-white/20"
          onClick={onUndo}>
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </button>
        <button className="shrink-0 text-white/40 hover:text-white" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-0.5 bg-white/10">
        <div className="h-full bg-orange-400 transition-[width]" style={{width: `${remaining}%`}} />
      </div>
    </div>
  );
}
