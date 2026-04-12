'use client';
/**
 * NotesSkeleton — skeleton placeholders that match the exact geometry of the
 * notes sidebar panels to prevent layout shift while data loads.
 *
 * Usage:
 *   <SidebarSkeleton rows={6} />
 *   <PageSkeleton rows={8} />
 *   <EditorSkeleton />
 */
import React from 'react';

// ─── Primitive ─────────────────────────────────────────────────────────────────
function Bone({className = '', style}: {className?: string; style?: React.CSSProperties}) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden />;
}

// ─── Sidebar skeleton (category / section columns) ────────────────────────────
export function SidebarSkeleton({rows = 6}: {rows?: number}) {
  return (
    <div className="flex flex-col gap-1 px-2 pt-3 pb-4 w-full" role="status" aria-label="Loading…">
      {/* Header row */}
      <Bone className="h-4 w-3/5 mb-3 opacity-70" />

      {Array.from({length: rows}).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-1 py-1.5">
          <Bone className="h-3.5 w-3.5 rounded-md flex-shrink-0 opacity-60" />
          <Bone className="h-3 flex-1 opacity-70" style={{width: `${55 + Math.sin(i * 2.3) * 25}%`}} />
        </div>
      ))}
    </div>
  );
}

// ─── Page list skeleton ────────────────────────────────────────────────────────
export function PageListSkeleton({rows = 8}: {rows?: number}) {
  return (
    <div className="flex flex-col gap-0.5 px-2 pt-3 w-full" role="status" aria-label="Loading pages…">
      <Bone className="h-4 w-2/3 mb-3 opacity-70" />

      {Array.from({length: rows}).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-1 py-1.5">
          <Bone className="h-3 w-3 rounded flex-shrink-0 opacity-50" />
          <div className="flex-1 flex flex-col gap-1">
            <Bone className="h-2.5 opacity-65" style={{width: `${60 + Math.sin(i * 1.7) * 30}%`}} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Editor skeleton (content area) ────────────────────────────────────────────
export function EditorSkeleton() {
  return (
    <div className="flex flex-col h-full px-16 pt-16 pb-8 max-w-4xl mx-auto gap-4" role="status" aria-label="Loading note…">
      {/* Title */}
      <Bone className="h-8 w-3/5 mb-2 opacity-60" />
      {/* Meta line */}
      <Bone className="h-3 w-1/4 mb-6 opacity-40" />

      {/* Body lines */}
      {[1, 0.95, 0.9, 0, 1, 0.85, 0.92, 0, 0.88, 0.96, 0.78].map((w, i) =>
        w === 0 ? (
          <div key={i} className="h-4" />
        ) : (
          <Bone key={i} className="h-3.5 opacity-50" style={{width: `${w * 100}%`}} />
        ),
      )}

      {/* Code block stub */}
      <div className="mt-4 rounded-xl overflow-hidden">
        <Bone className="h-6 w-full rounded-b-none opacity-30" />
        {[0.9, 0.75, 0.85, 0.6].map((w, i) => (
          <Bone key={i} className="h-4 mt-1 opacity-25 rounded-none" style={{width: `${w * 100}%`}} />
        ))}
        <Bone className="h-6 w-full rounded-t-none mt-1 opacity-30" />
      </div>

      {/* More paragraphs */}
      <div className="mt-4 flex flex-col gap-3">
        {[1, 0.93, 0.87, 0.97, 0.8].map((w, i) => (
          <Bone key={i} className="h-3.5 opacity-40" style={{width: `${w * 100}%`}} />
        ))}
      </div>
    </div>
  );
}

// ─── Inline skeleton bar for counts / badges ──────────────────────────────────
export function BadgeSkeleton() {
  return <Bone className="h-4 w-6 rounded-full opacity-50 inline-block" />;
}

// ─── Full notes layout skeleton (initial page load) ────────────────────────────
export function NotesLayoutSkeleton() {
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-violet-50/20">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[15%] -left-[10%] h-[55%] w-[55%] rounded-full bg-violet-200/20 blur-[140px]" />
        <div className="absolute top-[30%] -right-[8%] h-[45%] w-[45%] rounded-full bg-blue-100/25 blur-[120px]" />
      </div>

      <div className="relative flex h-full w-full flex-col overflow-hidden p-2.5 gap-2">
        {/* Top nav skeleton */}
        <div className="flex-shrink-0 h-11 rounded-2xl glass-nav animate-pulse-soft" />

        <div className="flex flex-1 overflow-hidden gap-2 min-h-0">
          {/* Resource rail skeleton */}
          <div className="w-10 rounded-xl glass-panel animate-pulse-soft" />

          {/* Sidebar group skeleton */}
          <div className="flex h-full rounded-xl overflow-hidden shadow-sm flex-shrink-0">
            <div className="w-48 bg-[rgba(232,230,240,0.72)] backdrop-blur-sm border-r border-white/20">
              <SidebarSkeleton rows={7} />
            </div>
            <div className="w-48 bg-[rgba(240,239,247,0.72)] backdrop-blur-sm border-r border-white/20">
              <SidebarSkeleton rows={5} />
            </div>
            <div className="w-48 bg-[rgba(248,247,252,0.75)] backdrop-blur-sm">
              <PageListSkeleton rows={9} />
            </div>
          </div>

          {/* Content area skeleton */}
          <div className="flex-1 rounded-xl glass-content overflow-hidden">
            <EditorSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
