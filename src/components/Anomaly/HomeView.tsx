/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {ArrowRight, BookOpen, FileText, Flag, Search, Star} from 'lucide-react';
import {useSession} from 'next-auth/react';
import React, {useEffect, useMemo, useState} from 'react';

import {api} from './api';
import {accentOf, nameOf, Notebook, Page, stripHtml, timeAgo} from './types';

interface HomeViewProps {
  notebooks: Notebook[];
  onOpenPage: (page: Page) => void;
  onOpenPalette: () => void;
  onSelectImportant: () => void;
  onSelectFlagged: () => void;
}

export default function HomeView({
  notebooks,
  onOpenPage,
  onOpenPalette,
  onSelectImportant,
  onSelectFlagged,
}: HomeViewProps) {
  const {data: session} = useSession();
  const [allPages, setAllPages] = useState<Page[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.pages
      .all()
      .then(pages => !cancelled && setAllPages(pages))
      .catch(() => !cancelled && setAllPages([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = useMemo(
    () =>
      [...(allPages || [])]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8),
    [allPages],
  );

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (session?.user?.name || 'Ananthan').split(' ')[0];
  const today = new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});

  const importantCount = (allPages || []).filter(p => p.isImportant).length;
  const flaggedCount = (allPages || []).filter(p => p.isFlagged).length;

  const stats = [
    {label: 'Notebooks', value: notebooks.length, icon: <BookOpen className="h-4 w-4" />, tone: 'text-violet-300 bg-violet-400/10', onClick: undefined},
    {label: 'Pages', value: allPages?.length ?? '—', icon: <FileText className="h-4 w-4" />, tone: 'text-cyan-300 bg-cyan-400/10', onClick: undefined},
    {label: 'Important', value: importantCount, icon: <Star className="h-4 w-4" />, tone: 'text-amber-300 bg-amber-400/10', onClick: onSelectImportant},
    {label: 'Flagged', value: flaggedCount, icon: <Flag className="h-4 w-4" />, tone: 'text-rose-300 bg-rose-400/10', onClick: onSelectFlagged},
  ];

  return (
    <div className="h-full overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
      <div className="mx-auto max-w-4xl px-8 py-12">
        {/* Greeting */}
        <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-white/30">{today}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          {greeting},{' '}
          <span className="bg-gradient-to-r from-violet-300 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
            {firstName}
          </span>
          .
        </h1>
        <p className="mt-2 text-[14px] text-white/40">Your workspace is ready. Pick up where you left off.</p>

        {/* Search CTA */}
        <button
          className="mt-8 flex w-full max-w-lg items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 text-left shadow-glass-sm transition-all hover:border-violet-400/30 hover:bg-white/[0.06]"
          onClick={onOpenPalette}>
          <Search className="h-4 w-4 text-violet-300" />
          <span className="flex-1 text-[13.5px] text-white/40">Jump to any page, section, or notebook…</span>
          <kbd className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-white/40">
            Ctrl K
          </kbd>
        </button>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(s => (
            <button
              className={`rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-left transition-all ${
                s.onClick ? 'cursor-pointer hover:border-white/[0.15] hover:bg-white/[0.05]' : 'cursor-default'
              }`}
              disabled={!s.onClick}
              key={s.label}
              onClick={s.onClick}>
              <span className={`inline-flex items-center justify-center rounded-lg p-1.5 ${s.tone}`}>{s.icon}</span>
              <p className="mt-3 text-2xl font-bold tabular-nums text-white">{s.value}</p>
              <p className="text-[11px] font-medium text-white/35">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Recent pages */}
        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-white/40">Recently edited</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {allPages === null &&
            [...Array(4)].map((_, i) => <div className="h-28 animate-pulse-soft rounded-2xl bg-white/[0.04]" key={i} />)}

          {allPages !== null && recent.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-[13px] text-white/30">
              No pages yet — create a notebook in the sidebar to get started.
            </div>
          )}

          {recent.map(page => {
            const path = nameOf(page.sectionId) || nameOf(page.categoryId) || '';
            const snippet = stripHtml(page.tabs?.[0]?.content || page.content || '').slice(0, 120);
            return (
              <button
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-violet-400/25 hover:bg-white/[0.05] hover:shadow-glow-violet"
                key={page._id}
                onClick={() => onOpenPage(page)}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor: accentOf(page.color)}} />
                  <p className="truncate text-[14px] font-semibold text-white/90 group-hover:text-white">
                    {page.title || 'Untitled'}
                  </p>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/0 transition-all group-hover:text-violet-300" />
                </div>
                {snippet && <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-white/35">{snippet}</p>}
                <div className="mt-2.5 flex items-center gap-2 text-[10.5px] text-white/30">
                  {path && <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-medium">{path}</span>}
                  <span>{timeAgo(page.updatedAt)}</span>
                  {page.isImportant && <Star className="h-3 w-3 fill-amber-400/70 text-amber-400/70" />}
                  {page.isFlagged && <Flag className="h-3 w-3 fill-rose-400/60 text-rose-400/60" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
