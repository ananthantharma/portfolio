/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {CheckCircle2, FileText, Filter, Flag, Pin, Plus, Star, Trash2} from 'lucide-react';
import React, {useMemo, useState} from 'react';

import {accentOf, Page, stripHtml, timeAgo} from './types';

interface PageListProps {
  title: string;
  subtitle?: string;
  pages: Page[];
  loading: boolean;
  selectedPageId: string | null;
  canCreate: boolean;
  onSelect: (page: Page) => void;
  onCreate: () => void;
  onTogglePin: (page: Page) => void;
  onDelete: (page: Page) => void;
}

function snippetOf(page: Page): string {
  const source = page.tabs?.length ? page.tabs[0].content : page.content || '';
  return stripHtml(source).slice(0, 110);
}

export default function PageList({
  title,
  subtitle,
  pages,
  loading,
  selectedPageId,
  canCreate,
  onSelect,
  onCreate,
  onTogglePin,
  onDelete,
}: PageListProps) {
  const [filter, setFilter] = useState('');

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q ? pages.filter(p => p.title.toLowerCase().includes(q)) : pages;
    // Pinned first, keep server order within groups
    return [...filtered].sort((a, b) => Number(b.isPinned || false) - Number(a.isPinned || false));
  }, [pages, filter]);

  return (
    <section className="flex h-full w-[312px] shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.015]">
      {/* Header */}
      <div className="px-4 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold tracking-tight text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-white/35">{subtitle}</p>}
          </div>
          {canCreate && (
            <button
              className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-500/90 px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-glow-violet transition-all hover:bg-violet-400"
              onClick={onCreate}
              title="New page">
              <Plus className="h-3.5 w-3.5" /> Page
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 focus-within:border-violet-400/40">
          <Filter className="h-3 w-3 text-white/25" />
          <input
            className="w-full bg-transparent text-[12px] text-white/80 placeholder-white/25 outline-none"
            onChange={e => setFilter(e.target.value)}
            placeholder={`Filter ${pages.length} page${pages.length === 1 ? '' : 's'}…`}
            value={filter}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
        {loading ? (
          <div className="space-y-2 pt-1">
            {[...Array(5)].map((_, i) => (
              <div className="h-[74px] animate-pulse-soft rounded-xl bg-white/[0.04]" key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
              <FileText className="h-5 w-5 text-white/20" />
            </div>
            <p className="text-[12px] text-white/30">
              {filter ? 'Nothing matches that filter.' : 'No pages here yet.'}
            </p>
            {canCreate && !filter && (
              <button
                className="rounded-lg border border-violet-400/30 px-3 py-1.5 text-[12px] font-medium text-violet-300 transition-colors hover:bg-violet-500/10"
                onClick={onCreate}>
                Create the first page
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 pt-1">
            {visible.map(page => {
              const active = page._id === selectedPageId;
              const snippet = snippetOf(page);
              return (
                <div
                  className={`group relative cursor-pointer rounded-xl border p-3 transition-all ${
                    active
                      ? 'border-violet-400/30 bg-violet-500/[0.12] shadow-glow-violet'
                      : 'border-transparent bg-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.05]'
                  }`}
                  key={page._id}
                  onClick={() => onSelect(page)}>
                  <div className="flex items-center gap-2">
                    {page.isPinned && <Pin className="h-3 w-3 shrink-0 rotate-45 text-cyan-300" />}
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{backgroundColor: accentOf(page.color)}}
                    />
                    <p
                      className={`truncate text-[13px] font-semibold ${
                        active ? 'text-white' : 'text-white/80 group-hover:text-white'
                      }`}>
                      {page.title || 'Untitled'}
                    </p>
                  </div>
                  {snippet && <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-white/35">{snippet}</p>}
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-white/30">
                    <span>{timeAgo(page.updatedAt)}</span>
                    {(page.todoCount || 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-cyan-300/80">
                        <CheckCircle2 className="h-3 w-3" /> {page.todoCount}
                      </span>
                    )}
                    {page.isImportant && <Star className="h-3 w-3 fill-amber-400/70 text-amber-400/70" />}
                    {page.isFlagged && <Flag className="h-3 w-3 fill-rose-400/60 text-rose-400/60" />}
                    {page.tabs?.length > 1 && (
                      <span className="rounded bg-white/[0.06] px-1 py-px font-medium">{page.tabs.length} tabs</span>
                    )}
                  </div>

                  {/* Hover actions */}
                  <div className="absolute right-2 top-2 hidden items-center gap-0.5 rounded-lg border border-white/[0.08] bg-[#151823] p-0.5 shadow-float group-hover:flex">
                    <button
                      className={`rounded-md p-1 transition-colors hover:bg-white/[0.08] ${
                        page.isPinned ? 'text-cyan-300' : 'text-white/40 hover:text-cyan-300'
                      }`}
                      onClick={e => {
                        e.stopPropagation();
                        onTogglePin(page);
                      }}
                      title={page.isPinned ? 'Unpin' : 'Pin to top'}>
                      <Pin className="h-3 w-3" />
                    </button>
                    <button
                      className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-rose-400"
                      onClick={e => {
                        e.stopPropagation();
                        onDelete(page);
                      }}
                      title="Delete page">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
