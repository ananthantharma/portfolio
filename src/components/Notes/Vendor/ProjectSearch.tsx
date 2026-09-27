/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {FileText, Gavel, Globe, ListTodo, NotebookPen, Siren} from 'lucide-react';
import React, {useMemo} from 'react';

import {INotePage} from '@/models/NotePage';

import {Task} from '../../Tasks/types';
import {AttentionItem, ProjectDecision, VendorDocument, VendorLink} from './vendorApi';
import {noteSnippet} from './VendorNotes';
import styles from './VendorPage.module.css';

export type SearchKind = 'note' | 'task' | 'decision' | 'attention' | 'document' | 'link';

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  excerpt: string;
}

const KIND_META: Record<SearchKind, {label: string; Icon: typeof FileText}> = {
  note: {label: 'Note', Icon: NotebookPen},
  task: {label: 'Task', Icon: ListTodo},
  decision: {label: 'Decision', Icon: Gavel},
  attention: {label: 'Attention', Icon: Siren},
  document: {label: 'Document', Icon: FileText},
  link: {label: 'Link', Icon: Globe},
};

const ORDER: SearchKind[] = ['note', 'task', 'decision', 'attention', 'document', 'link'];

interface Sources {
  notes: INotePage[];
  tasks: Task[];
  decisions: ProjectDecision[];
  attention: AttentionItem[];
  documents: VendorDocument[];
  links: VendorLink[];
}

/** Every word must appear somewhere in the record (so "SAP architecture" finds records with both). */
export function searchProject(query: string, src: Sources): SearchResult[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (!words.length) return [];
  const results: SearchResult[] = [];
  const consider = (kind: SearchKind, id: string, title: string, body: string) => {
    const hay = `${title}\n${body}`.toLowerCase();
    if (!words.every(w => hay.includes(w))) return;
    // Excerpt around the first matching word in the body, if the title alone doesn't explain the match
    const lower = body.toLowerCase();
    const at = Math.min(...words.map(w => lower.indexOf(w)).filter(i => i >= 0), Infinity);
    const excerpt =
      at === Infinity ? body.slice(0, 140) : `${at > 40 ? '…' : ''}${body.slice(Math.max(0, at - 40), at + 110).trim()}${at + 110 < body.length ? '…' : ''}`;
    results.push({kind, id, title: title || 'Untitled', excerpt});
  };
  src.notes.forEach(n => consider('note', String(n._id), n.title, noteSnippet(n, 20000)));
  src.tasks.forEach(t => consider('task', t._id, t.title, [t.notes, t.category, ...(t.tags || [])].filter(Boolean).join(' · ')));
  src.decisions.forEach(d => consider('decision', d._id, d.title, [d.details, d.reason].filter(Boolean).join(' · ')));
  src.attention.forEach(a => consider('attention', a._id, a.title, [a.type, a.description, a.resolution].filter(Boolean).join(' · ')));
  src.documents.forEach(d =>
    consider('document', String(d._id), d.title, [d.fileName, d.docType, d.notes].filter(Boolean).join(' · ')),
  );
  src.links.forEach(l => consider('link', String(l._id), l.title, l.url));
  return results;
}

function Highlight({text, words}: {text: string; words: string[]}) {
  if (!words.length || !text) return <>{text}</>;
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark className={styles.mark} key={i}>
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

export default function ProjectSearchResults({
  query,
  sources,
  onOpen,
}: {
  query: string;
  sources: Sources;
  onOpen: (result: SearchResult) => void;
}) {
  const results = useMemo(() => searchProject(query, sources), [query, sources]);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const grouped = ORDER.map(kind => ({kind, items: results.filter(r => r.kind === kind)})).filter(g => g.items.length);

  return (
    <section aria-label="Search results" className={`${styles.card} ${styles.wide}`}>
      <div className={styles.cardHead}>
        <h2>
          Results for “{query.trim()}”<small>{results.length}</small>
        </h2>
        <span className={styles.muted}>Press Esc to clear</span>
      </div>
      {!results.length ? (
        <div className={styles.empty}>Nothing in this project matches. Try fewer or different words.</div>
      ) : (
        grouped.map(({kind, items}) => {
          const {label, Icon} = KIND_META[kind];
          return (
            <div className={styles.searchGroup} key={kind}>
              <div className={styles.noteGroup}>
                <Icon size={12} /> {label === 'Attention' ? 'Attention' : `${label}s`} · {items.length}
              </div>
              {items.slice(0, 25).map(r => (
                <button className={styles.searchResult} key={`${r.kind}-${r.id}`} onClick={() => onOpen(r)} type="button">
                  <span className={styles.searchKind} data-kind={r.kind}>
                    <Icon size={11} /> {label}
                  </span>
                  <span className={styles.searchText}>
                    <strong>
                      <Highlight text={r.title} words={words} />
                    </strong>
                    {r.excerpt && (
                      <span>
                        <Highlight text={r.excerpt} words={words} />
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          );
        })
      )}
    </section>
  );
}
