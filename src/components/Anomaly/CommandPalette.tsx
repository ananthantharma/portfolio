/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {CornerDownLeft, FileText, Loader2, Search} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {api} from './api';
import {nameOf, Page, stripHtml} from './types';

interface CommandPaletteProps {
  onClose: () => void;
  onOpenPage: (page: Page) => void;
}

export default function CommandPalette({onClose, onOpenPage}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const pages = await api.pages.search(q);
        setResults(pages.slice(0, 20));
        setHighlighted(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const select = (page: Page) => {
    onOpenPage(page);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    }
    if (e.key === 'Enter' && results[highlighted]) {
      select(results[highlighted]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 pt-[14vh] backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141d] shadow-float"
        onKeyDown={onKeyDown}>
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
          ) : (
            <Search className="h-4 w-4 text-white/30" />
          )}
          <input
            className="flex-1 bg-transparent text-[14px] text-white placeholder-white/25 outline-none"
            onChange={e => setQuery(e.target.value)}
            placeholder="Search titles, content, notebooks, sections…"
            ref={inputRef}
            value={query}
          />
          <kbd className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-white/35">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[46vh] overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-[12px] text-white/25">
              Type at least two characters to search your entire workspace.
            </p>
          ) : !loading && results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-white/25">No matches for “{query.trim()}”.</p>
          ) : (
            results.map((page, i) => {
              const path = nameOf(page.sectionId) || nameOf(page.categoryId) || '';
              const snippet = stripHtml(page.tabs?.[0]?.content || page.content || '').slice(0, 80);
              const active = i === highlighted;
              return (
                <button
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-violet-500/15 ring-1 ring-inset ring-violet-400/25' : ''
                  }`}
                  key={page._id}
                  onClick={() => select(page)}
                  onMouseEnter={() => setHighlighted(i)}>
                  <FileText className={`h-4 w-4 shrink-0 ${active ? 'text-violet-300' : 'text-white/25'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13px] font-medium ${active ? 'text-white' : 'text-white/75'}`}>
                      {page.title || 'Untitled'}
                    </p>
                    {snippet && <p className="truncate text-[11px] text-white/30">{snippet}</p>}
                  </div>
                  {path && (
                    <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/40">
                      {path}
                    </span>
                  )}
                  {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-violet-300/70" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
