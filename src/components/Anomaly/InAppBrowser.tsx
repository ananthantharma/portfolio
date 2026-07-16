/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {ExternalLink, RefreshCw, X} from 'lucide-react';
import React, {useEffect, useState} from 'react';

interface InAppBrowserProps {
  url: string;
  title: string;
  onClose: () => void;
}

function normalizeUrl(url: string): string {
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
}

export default function InAppBrowser({url, title, onClose}: InAppBrowserProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const href = normalizeUrl(url);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[260] flex flex-col bg-[#0a0c12]">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] bg-white/[0.03] px-3 py-2">
        <button
          className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white"
          onClick={onClose}
          title="Close">
          <X className="h-4 w-4" />
        </button>
        <button
          className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white"
          onClick={() => setReloadKey(k => k + 1)}
          title="Reload">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[12px]">
          <span className="shrink-0 truncate font-medium text-white/70">{title}</span>
          <span className="truncate text-white/25">{href}</span>
        </div>
        <a
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-violet-300 transition-colors hover:bg-violet-500/15"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
          title="Open in a real browser tab (use this if the page below stays blank)">
          <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
        </a>
      </div>
      <iframe
        className="h-full w-full flex-1 border-0 bg-white"
        key={reloadKey}
        referrerPolicy="no-referrer"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        src={href}
        title={title}
      />
    </div>
  );
}
