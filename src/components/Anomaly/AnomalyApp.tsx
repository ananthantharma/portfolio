/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {FileText, PanelLeftOpen} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {api} from './api';
import CommandPalette from './CommandPalette';
import EditorPanel from './EditorPanel';
import HomeView from './HomeView';
import MovePageModal from './MovePageModal';
import PageList from './PageList';
import Sidebar from './Sidebar';
import {idOf, Notebook, Page, Section, View} from './types';

const LS = {
  view: 'ANOMALY_VIEW',
  page: 'ANOMALY_PAGE',
  sidebar: 'ANOMALY_SIDEBAR',
  expanded: 'ANOMALY_EXPANDED',
};

export default function AnomalyApp() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [sectionsByNotebook, setSectionsByNotebook] = useState<Record<string, Section[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [view, setViewState] = useState<View>({kind: 'home'});
  const [pages, setPages] = useState<Page[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [movingPage, setMovingPage] = useState<Page | null>(null);
  const restored = useRef(false);

  // ── Persistence ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const savedView = localStorage.getItem(LS.view);
      if (savedView) setViewState(JSON.parse(savedView));
      const savedPage = localStorage.getItem(LS.page);
      if (savedPage) setSelectedPageId(savedPage);
      const savedSidebar = localStorage.getItem(LS.sidebar);
      if (savedSidebar !== null) setSidebarOpen(savedSidebar === 'true');
      const savedExpanded = localStorage.getItem(LS.expanded);
      if (savedExpanded) {
        const ids: string[] = JSON.parse(savedExpanded);
        setExpanded(new Set(ids));
        ids.forEach(id => loadSections(id));
      }
    } catch {
      /* corrupted localStorage — start fresh */
    }
    restored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    localStorage.setItem(LS.view, JSON.stringify(view));
    if (selectedPageId) localStorage.setItem(LS.page, selectedPageId);
    else localStorage.removeItem(LS.page);
    localStorage.setItem(LS.sidebar, String(sidebarOpen));
    localStorage.setItem(LS.expanded, JSON.stringify([...expanded]));
  }, [view, selectedPageId, sidebarOpen, expanded]);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadNotebooks = useCallback(async () => {
    try {
      setNotebooks(await api.notebooks.list());
    } catch (err) {
      console.error('Failed to load notebooks', err);
    }
  }, []);

  const loadSections = useCallback(async (notebookId: string) => {
    try {
      const sections = await api.sections.list(notebookId);
      setSectionsByNotebook(prev => ({...prev, [notebookId]: sections}));
    } catch (err) {
      console.error('Failed to load sections', err);
    }
  }, []);

  useEffect(() => {
    loadNotebooks();
  }, [loadNotebooks]);

  // Load pages whenever the active collection changes
  useEffect(() => {
    let cancelled = false;
    if (view.kind === 'home') {
      setPages([]);
      return;
    }
    setPagesLoading(true);
    const fetcher =
      view.kind === 'important'
        ? api.pages.important()
        : view.kind === 'flagged'
        ? api.pages.flagged()
        : view.kind === 'notebook'
        ? api.pages.byNotebookRoot(view.notebookId)
        : api.pages.bySection(view.sectionId);

    fetcher
      .then(data => {
        if (cancelled) return;
        setPages(data);
        // Drop a selection that doesn't belong to this collection
        setSelectedPageId(prev => (prev && data.some(p => p._id === prev) ? prev : null));
      })
      .catch(err => console.error('Failed to load pages', err))
      .finally(() => !cancelled && setPagesLoading(false));

    return () => {
      cancelled = true;
    };
  }, [view]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const setView = (next: View) => {
    setViewState(next);
    if (next.kind === 'home') setSelectedPageId(null);
  };

  const toggleExpand = (notebookId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(notebookId)) next.delete(notebookId);
      else {
        next.add(notebookId);
        if (!sectionsByNotebook[notebookId]) loadSections(notebookId);
      }
      return next;
    });
  };

  /** Open a page coming from search / recents — resolve its notebook/section first. */
  const openPage = (page: Page) => {
    const sectionId = idOf(page.sectionId);
    const sectionCategoryId =
      page.sectionId && typeof page.sectionId === 'object'
        ? idOf((page.sectionId as Record<string, unknown>).categoryId)
        : null;
    const categoryId = idOf(page.categoryId);

    if (sectionId && sectionCategoryId) {
      setViewState({kind: 'section', notebookId: sectionCategoryId, sectionId});
      setExpanded(prev => new Set(prev).add(sectionCategoryId));
      if (!sectionsByNotebook[sectionCategoryId]) loadSections(sectionCategoryId);
    } else if (categoryId) {
      setViewState({kind: 'notebook', notebookId: categoryId});
    }
    setSelectedPageId(page._id);
  };

  // ── Notebook / section CRUD ─────────────────────────────────────────────────
  const createNotebook = async (name: string) => {
    try {
      const nb = await api.notebooks.create(name);
      await loadNotebooks();
      setView({kind: 'notebook', notebookId: nb._id});
    } catch (err) {
      alert(`Could not create notebook: ${err instanceof Error ? err.message : err}`);
    }
  };

  const renameNotebook = async (id: string, name: string) => {
    await api.notebooks.update(id, {name}).catch(() => undefined);
    loadNotebooks();
  };

  const deleteNotebook = async (id: string) => {
    const nb = notebooks.find(n => n._id === id);
    if (!window.confirm(`Delete notebook "${nb?.name}" and all pages inside it? This cannot be undone.`)) return;
    try {
      await api.notebooks.remove(id);
      if ((view.kind === 'notebook' || view.kind === 'section') && view.notebookId === id) {
        setView({kind: 'home'});
      }
      loadNotebooks();
    } catch (err) {
      alert(`Could not delete notebook: ${err instanceof Error ? err.message : err}`);
    }
  };

  const reorderNotebooks = async (newOrder: Notebook[]) => {
    setNotebooks(newOrder);
    try {
      await api.notebooks.reorder(newOrder.map(n => n._id));
    } catch (err) {
      console.error('Failed to reorder notebooks', err);
      loadNotebooks();
    }
  };

  const reorderSections = async (notebookId: string, newOrder: Section[]) => {
    setSectionsByNotebook(prev => ({...prev, [notebookId]: newOrder}));
    try {
      await api.sections.reorder(newOrder.map(s => s._id));
    } catch (err) {
      console.error('Failed to reorder sections', err);
      loadSections(notebookId);
    }
  };

  const createSection = async (notebookId: string, name: string) => {
    try {
      const sec = await api.sections.create(notebookId, name);
      await loadSections(notebookId);
      setView({kind: 'section', notebookId, sectionId: sec._id});
    } catch (err) {
      alert(`Could not create section: ${err instanceof Error ? err.message : err}`);
    }
  };

  const renameSection = async (id: string, name: string) => {
    await api.sections.update(id, {name}).catch(() => undefined);
    const owner = Object.keys(sectionsByNotebook).find(nb => sectionsByNotebook[nb].some(s => s._id === id));
    if (owner) loadSections(owner);
  };

  const deleteSection = async (notebookId: string, id: string) => {
    const sec = sectionsByNotebook[notebookId]?.find(s => s._id === id);
    if (!window.confirm(`Delete section "${sec?.name}" and all pages inside it? This cannot be undone.`)) return;
    try {
      await api.sections.remove(id);
      if (view.kind === 'section' && view.sectionId === id) setView({kind: 'notebook', notebookId});
      loadSections(notebookId);
    } catch (err) {
      alert(`Could not delete section: ${err instanceof Error ? err.message : err}`);
    }
  };

  // ── Page CRUD ───────────────────────────────────────────────────────────────
  const createPage = async () => {
    if (view.kind !== 'notebook' && view.kind !== 'section') return;
    try {
      const payload =
        view.kind === 'section'
          ? {title: 'Untitled', sectionId: view.sectionId, tabs: [{title: 'Main', content: '', order: 0}]}
          : {title: 'Untitled', categoryId: view.notebookId, tabs: [{title: 'Main', content: '', order: 0}]};
      const page = await api.pages.create(payload);
      setPages(prev => [...prev, page]);
      setSelectedPageId(page._id);
    } catch (err) {
      alert(`Could not create page: ${err instanceof Error ? err.message : err}`);
    }
  };

  const togglePin = async (page: Page) => {
    try {
      const updated = await api.pages.update(page._id, {isPinned: !page.isPinned});
      setPages(prev => prev.map(p => (p._id === page._id ? {...p, isPinned: updated.isPinned} : p)));
    } catch (err) {
      console.error('Pin failed', err);
    }
  };

  const deletePageFromList = async (page: Page) => {
    if (!window.confirm(`Delete "${page.title || 'Untitled'}"? This cannot be undone.`)) return;
    try {
      await api.pages.remove(page._id);
      setPages(prev => prev.filter(p => p._id !== page._id));
      if (selectedPageId === page._id) setSelectedPageId(null);
    } catch (err) {
      alert(`Could not delete page: ${err instanceof Error ? err.message : err}`);
    }
  };

  const reorderPages = async (newOrder: Page[]) => {
    setPages(newOrder);
    try {
      await api.pages.reorder(newOrder.map(p => p._id));
    } catch (err) {
      console.error('Failed to reorder pages', err);
    }
  };

  const movePage = async (pageId: string, dest: {sectionId: string | null; categoryId: string}) => {
    try {
      await api.pages.update(pageId, {sectionId: dest.sectionId, categoryId: dest.sectionId ? null : dest.categoryId});
      const staysInView =
        (view.kind === 'section' && dest.sectionId === view.sectionId) ||
        (view.kind === 'notebook' && !dest.sectionId && dest.categoryId === view.notebookId);
      if (!staysInView) {
        setPages(prev => prev.filter(p => p._id !== pageId));
        if (selectedPageId === pageId) setSelectedPageId(null);
      }
      loadNotebooks();
      setMovingPage(null);
    } catch (err) {
      alert(`Could not move page: ${err instanceof Error ? err.message : err}`);
    }
  };

  const onPageMetaChange = useCallback(
    (updated: Page) => {
      setPages(prev => {
        const existing = prev.find(p => p._id === updated._id);
        // Refresh sidebar badge counts only when a flag actually flipped
        if (existing && (existing.isImportant !== updated.isImportant || existing.isFlagged !== updated.isFlagged)) {
          loadNotebooks();
        }
        return prev.map(p => (p._id === updated._id ? {...p, ...updated} : p));
      });
    },
    [loadNotebooks],
  );

  const onPageDeleted = (pageId: string) => {
    setPages(prev => prev.filter(p => p._id !== pageId));
    setSelectedPageId(null);
  };

  // ── Global shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Derived labels ──────────────────────────────────────────────────────────
  const listMeta = useMemo(() => {
    switch (view.kind) {
      case 'important':
        return {title: 'Important', subtitle: 'Everything marked important, across all notebooks', canCreate: false};
      case 'flagged':
        return {title: 'Flagged', subtitle: 'Everything flagged for follow-up', canCreate: false};
      case 'notebook': {
        const nb = notebooks.find(n => n._id === view.notebookId);
        return {title: nb?.name || 'Notebook', subtitle: 'Pages at the notebook root', canCreate: true};
      }
      case 'section': {
        const nb = notebooks.find(n => n._id === view.notebookId);
        const sec = sectionsByNotebook[view.notebookId]?.find(s => s._id === view.sectionId);
        return {title: sec?.name || 'Section', subtitle: nb?.name, canCreate: true};
      }
      default:
        return {title: '', subtitle: '', canCreate: false};
    }
  }, [view, notebooks, sectionsByNotebook]);

  const crumbs = useMemo(() => {
    const parts: string[] = [];
    if (view.kind === 'notebook' || view.kind === 'section') {
      parts.push(notebooks.find(n => n._id === view.notebookId)?.name || 'Notebook');
    }
    if (view.kind === 'section') {
      parts.push(sectionsByNotebook[view.notebookId]?.find(s => s._id === view.sectionId)?.name || 'Section');
    }
    if (view.kind === 'important') parts.push('Important');
    if (view.kind === 'flagged') parts.push('Flagged');
    return parts;
  }, [view, notebooks, sectionsByNotebook]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#0a0c12] font-sans text-slate-200 antialiased">
      {/* Ambient background accents */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-cyan-500/[0.05] blur-3xl" />

      {sidebarOpen ? (
        <Sidebar
          expanded={expanded}
          notebooks={notebooks}
          onCollapse={() => setSidebarOpen(false)}
          onCreateNotebook={createNotebook}
          onCreateSection={createSection}
          onDeleteNotebook={deleteNotebook}
          onDeleteSection={deleteSection}
          onOpenPalette={() => setPaletteOpen(true)}
          onRenameNotebook={renameNotebook}
          onRenameSection={renameSection}
          onReorderNotebooks={reorderNotebooks}
          onReorderSections={reorderSections}
          onSelectView={setView}
          onToggleExpand={toggleExpand}
          sectionsByNotebook={sectionsByNotebook}
          view={view}
        />
      ) : (
        <button
          className="absolute left-3 top-3 z-50 rounded-xl border border-white/[0.08] bg-white/[0.05] p-2 text-white/50 shadow-glass-sm backdrop-blur-md transition-colors hover:text-white"
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar">
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      {view.kind !== 'home' && (
        <PageList
          canCreate={listMeta.canCreate}
          loading={pagesLoading}
          onCreate={createPage}
          onDelete={deletePageFromList}
          onReorder={reorderPages}
          onRequestMove={setMovingPage}
          onSelect={p => setSelectedPageId(p._id)}
          onTogglePin={togglePin}
          pages={pages}
          selectedPageId={selectedPageId}
          showLocation={view.kind === 'important' || view.kind === 'flagged'}
          subtitle={listMeta.subtitle}
          title={listMeta.title}
        />
      )}

      <main className="relative min-w-0 flex-1">
        {view.kind === 'home' ? (
          <HomeView
            notebooks={notebooks}
            onOpenPage={openPage}
            onOpenPalette={() => setPaletteOpen(true)}
            onSelectFlagged={() => setView({kind: 'flagged'})}
            onSelectImportant={() => setView({kind: 'important'})}
          />
        ) : selectedPageId ? (
          <EditorPanel
            crumbs={crumbs}
            key={selectedPageId}
            onDeleted={onPageDeleted}
            onMetaChange={onPageMetaChange}
            onRequestMove={setMovingPage}
            pageId={selectedPageId}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.03]">
              <FileText className="h-7 w-7 text-white/15" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white/50">No page selected</p>
              <p className="mt-1 text-[12px] text-white/25">
                Pick a page from the list{listMeta.canCreate ? ', or create a new one' : ''}.
              </p>
            </div>
          </div>
        )}
      </main>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onOpenPage={openPage} />}
      {movingPage && (
        <MovePageModal notebooks={notebooks} onClose={() => setMovingPage(null)} onMove={movePage} page={movingPage} />
      )}
    </div>
  );
}
