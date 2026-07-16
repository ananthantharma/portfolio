/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {BookOpen, CornerDownLeft, FileText, Loader2, Notebook as NotebookIcon, Search} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {api} from './api';
import {idOf, nameOf, Page, stripHtml} from './types';

const MODE_KEY = 'ANOMALY_SEARCH_TITLES_ONLY';

/** A raw hit can be a real page, or — in titles-only mode — a matched section/notebook name. */
type Hit = Page & {type?: 'page' | 'section'};

function kindOf(hit: Hit): 'page' | 'section' | 'notebook' {
  if (hit.type !== 'section') return 'page';
  return hit.title.startsWith('[Notebook]') ? 'notebook' : 'section';
}

function displayTitle(hit: Hit): string {
  return hit.title.replace(/^\[(Section|Notebook)\]\s*/, '');
}

interface CommandPaletteProps {
  onClose: () => void;
  onOpenPage: (page: Page) => void;
  onOpenSection: (notebookId: string, sectionId: string | null) => void;
}

export default function CommandPalette({onClose, onOpenPage, onOpenSection}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [titlesOnly, setTitlesOnly] = useState(false);
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      setTitlesOnly(localStorage.getItem(MODE_KEY) === 'true');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = () => {
    setTitlesOnly(prev => {
      const next = !prev;
      try {
        localStorage.setItem(MODE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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
        const hits = titlesOnly ? await api.pages.searchTitles(q) : await api.pages.search(q);
        setResults((hits as Hit[]).slice(0, 20));
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
  }, [query, titlesOnly]);

  const select = (hit: Hit) => {
    const kind = kindOf(hit);
    if (kind === 'page') {
      onOpenPage(hit);
    } else {
      const categoryId = idOf((hit.sectionId as Record<string, unknown> | undefined)?.categoryId) || hit._id;
      onOpenSection(categoryId, kind === 'section' ? hit._id : null);
    }
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
            placeholder={titlesOnly ? 'Search titles…' : 'Search titles, content, notebooks, sections…'}
            ref={inputRef}
            value={query}
          />
          <kbd className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-white/35">
            ESC
          </kbd>
        </div>

        {/* Scope toggle */}
        <div className="flex items-center gap-1 border-b border-white/[0.07] px-3 py-2">
          <button
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
              !titlesOnly ? 'bg-violet-500/20 text-violet-200' : 'text-white/35 hover:text-white/60'
            }`}
            onClick={() => titlesOnly && toggleMode()}>
            Everywhere
          </button>
          <button
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
              titlesOnly ? 'bg-violet-500/20 text-violet-200' : 'text-white/35 hover:text-white/60'
            }`}
            onClick={() => !titlesOnly && toggleMode()}>
            Titles only
          </button>
          <span className="ml-auto text-[10px] text-white/20">
            {titlesOnly ? 'Notebooks, sections & page titles' : 'Also searches inside page content'}
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[46vh] overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-[12px] text-white/25">
              Type at least two characters to search your workspace.
            </p>
          ) : !loading && results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-white/25">No matches for “{query.trim()}”.</p>
          ) : (
            results.map((hit, i) => {
              const kind = kindOf(hit);
              const active = i === highlighted;
              const title = displayTitle(hit);
              const path = kind === 'page' ? nameOf(hit.sectionId) || nameOf(hit.categoryId) || '' : '';
              const snippet = kind === 'page' ? stripHtml(hit.tabs?.[0]?.content || hit.content || '').slice(0, 80) : '';
              const Icon = kind === 'notebook' ? NotebookIcon : kind === 'section' ? BookOpen : FileText;
              return (
                <button
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-violet-500/15 ring-1 ring-inset ring-violet-400/25' : ''
                  }`}
                  key={`${kind}-${hit._id}`}
                  onClick={() => select(hit)}
                  onMouseEnter={() => setHighlighted(i)}>
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-violet-300' : 'text-white/25'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13px] font-medium ${active ? 'text-white' : 'text-white/75'}`}>
                      {title || 'Untitled'}
                    </p>
                    {snippet && <p className="truncate text-[11px] text-white/30">{snippet}</p>}
                  </div>
                  {kind !== 'page' && (
                    <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/40">
                      {kind === 'notebook' ? 'Notebook' : 'Section'}
                    </span>
                  )}
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
