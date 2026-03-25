'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Flag,
  Star,
  MoreHorizontal,
  Trash2,
  Edit3,
  Sparkles,
  Loader2,
  FileText,
  Check,
} from 'lucide-react';
import { Category, Section, Page, PageTab } from './OrganizationLayout';
import RichTextEditor from '../Notes/RichTextEditor';

interface OrgNotesViewProps {
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
  sections: Section[];
  setSections: (secs: Section[]) => void;
  pages: Page[];
  setPages: (pages: Page[]) => void;
  globalSearch: string;
  onPageContentChange?: (content: string) => void;
}

export default function OrgNotesView({
  categories,
  setCategories,
  selectedCategoryId,
  setSelectedCategoryId,
  selectedSectionId,
  setSelectedSectionId,
  selectedPageId,
  setSelectedPageId,
  sections,
  setSections,
  pages,
  setPages,
  globalSearch,
  onPageContentChange,
}: OrgNotesViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [pageSearch, setPageSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [editingContent, setEditingContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [newSecName, setNewSecName] = useState('');
  const [addingSec, setAddingSec] = useState<string | null>(null);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiAction, setAiAction] = useState<string>('');
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resizable panels
  const [leftWidth, setLeftWidth] = useState(200);
  const [middleWidth, setMiddleWidth] = useState(260);
  const resizing = useRef<'left' | 'middle' | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Load sections when category changes
  useEffect(() => {
    if (!selectedCategoryId) return;
    axios.get(`/api/notes/sections?categoryId=${selectedCategoryId}`).then(res => {
      if (res.data.success) setSections(res.data.data);
    });
  }, [selectedCategoryId]);

  // Load pages when section changes
  useEffect(() => {
    if (!selectedSectionId) return;
    axios.get(`/api/notes/pages?sectionId=${selectedSectionId}`).then(res => {
      if (res.data.success) setPages(res.data.data);
    });
  }, [selectedSectionId]);

  // Load selected page detail
  useEffect(() => {
    if (!selectedPageId) { setSelectedPage(null); return; }
    const found = pages.find(p => p._id === selectedPageId);
    if (found) {
      setSelectedPage(found);
      const firstTab = found.tabs?.[0];
      if (firstTab) {
        setActiveTabId(firstTab._id);
        setEditingContent(firstTab.content || '');
        onPageContentChange?.(firstTab.content || '');
      }
    }
  }, [selectedPageId, pages]);

  // Resizable panels mouse handling
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const delta = e.clientX - resizeStartX.current;
      if (resizing.current === 'left') {
        setLeftWidth(Math.max(150, Math.min(400, resizeStartWidth.current + delta)));
      } else {
        setMiddleWidth(Math.max(160, Math.min(500, resizeStartWidth.current + delta)));
      }
    };
    const onMouseUp = () => {
      if (!resizing.current) return;
      resizing.current = null;
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleContentChange = (val: string) => {
    setEditingContent(val);
    setSaveStatus('unsaved');
    onPageContentChange?.(val);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => autoSave(val), 1000);
  };

  const autoSave = async (content: string) => {
    if (!selectedPage || !activeTabId) return;
    setSaveStatus('saving');
    try {
      const updatedTabs = selectedPage.tabs.map(t =>
        t._id === activeTabId ? { ...t, content } : t
      );
      await axios.put(`/api/notes/pages/${selectedPage._id}`, { tabs: updatedTabs });
      setSelectedPage(prev => prev ? { ...prev, tabs: updatedTabs } : prev);
      setPages(pages.map((p: Page) => p._id === selectedPage._id ? { ...p, tabs: updatedTabs } : p));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unsaved');
    }
  };

  const handleTabChange = (tab: PageTab) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    autoSave(editingContent);
    setActiveTabId(tab._id);
    setEditingContent(tab.content || '');
    onPageContentChange?.(tab.content || '');
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectedCategoryId(id);
  };

  const handleSelectSection = (sec: Section) => {
    setSelectedSectionId(sec._id);
    setSelectedPageId(null);
    setSelectedPage(null);
  };

  const handleSelectPage = (page: Page) => {
    setSelectedPageId(page._id);
  };

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await axios.post('/api/notes/categories', { name: newCatName.trim() });
      if (res.data.success) {
        setCategories([...categories, res.data.data]);
        setNewCatName('');
        setAddingCat(false);
      }
    } catch (err) { console.error(err); }
  };

  const createSection = async (categoryId: string) => {
    if (!newSecName.trim()) return;
    try {
      const res = await axios.post('/api/notes/sections', { name: newSecName.trim(), categoryId });
      if (res.data.success) {
        setSections([...sections, res.data.data]);
        setNewSecName('');
        setAddingSec(null);
      }
    } catch (err) { console.error(err); }
  };

  const createPage = async () => {
    if (!selectedSectionId) return;
    try {
      const res = await axios.post('/api/notes/pages', {
        title: 'Untitled',
        sectionId: selectedSectionId,
        tabs: [{ title: 'Main', content: '', order: 0 }],
      });
      if (res.data.success) {
        const newPage = res.data.data;
        setPages([...pages, newPage]);
        setSelectedPageId(newPage._id);
      }
    } catch (err) { console.error(err); }
  };

  const deletePage = async (id: string) => {
    try {
      await axios.delete(`/api/notes/pages/${id}`);
      setPages(pages.filter(p => p._id !== id));
      if (selectedPageId === id) { setSelectedPageId(null); setSelectedPage(null); }
    } catch (err) { console.error(err); }
  };

  const renamePage = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await axios.put(`/api/notes/pages/${id}`, { title: renameValue.trim() });
      setPages(pages.map(p => p._id === id ? { ...p, title: renameValue.trim() } : p));
      if (selectedPage?._id === id) setSelectedPage(prev => prev ? { ...prev, title: renameValue.trim() } : prev);
      setRenamingPageId(null);
    } catch (err) { console.error(err); }
  };

  const toggleFlag = async (page: Page) => {
    const newVal = !page.isFlagged;
    await axios.put(`/api/notes/pages/${page._id}`, { isFlagged: newVal });
    setPages(pages.map(p => p._id === page._id ? { ...p, isFlagged: newVal } : p));
    if (selectedPage?._id === page._id) setSelectedPage(prev => prev ? { ...prev, isFlagged: newVal } : prev);
  };

  const toggleImportant = async (page: Page) => {
    const newVal = !page.isImportant;
    await axios.put(`/api/notes/pages/${page._id}`, { isImportant: newVal });
    setPages(pages.map(p => p._id === page._id ? { ...p, isImportant: newVal } : p));
    if (selectedPage?._id === page._id) setSelectedPage(prev => prev ? { ...prev, isImportant: newVal } : prev);
  };

  const runAiAction = async (action: string) => {
    if (!editingContent.trim()) return;
    setAiLoading(true);
    setAiAction(action);
    setShowAiDropdown(false);
    let promptText = '';
    if (action === 'rewrite') {
      promptText = `Rewrite this text to be clear and professional, no corporate fluff, short sentences:\n\n${editingContent}`;
    } else if (action === 'summarize') {
      promptText = `Summarize this note concisely, capturing the key points:\n\n${editingContent}`;
    } else {
      promptText = `Give 3-5 actionable suggestions or improvements for this note:\n\n${editingContent}`;
    }
    try {
      const res = await axios.post('/api/gemini/generate', {
        apiKey: 'GEMINI_SCOPED',
        prompt: promptText,
        model: 'gemini-flash-latest',
      });
      setAiPreview(res.data.text || '');
    } catch (err) {
      console.error('AI error', err);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiPreview = () => {
    if (!aiPreview) return;
    handleContentChange(aiPreview);
    setAiPreview(null);
  };

  const filteredPages = pages.filter(p =>
    p.title.toLowerCase().includes(pageSearch.toLowerCase()) ||
    (globalSearch && p.title.toLowerCase().includes(globalSearch.toLowerCase()))
  );

  void selectedPage?.tabs.find(t => t._id === activeTabId); // kept for potential future use

  return (
    <div className="flex h-full">
      {/* Left panel: categories + sections */}
      <div className="shrink-0 bg-white flex flex-col overflow-y-auto" style={{ width: leftWidth }}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notebooks</span>
          <button
            onClick={() => setAddingCat(v => !v)}
            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
            title="Add category"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {addingCat && (
          <div className="px-2 py-2 border-b border-slate-100 flex gap-1">
            <input
              autoFocus
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createCategory(); if (e.key === 'Escape') setAddingCat(false); }}
              placeholder="Category name"
              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button onClick={createCategory} className="text-indigo-600 hover:text-indigo-700">
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1">
          {categories.map(cat => (
            <div key={cat._id}>
              <button
                onClick={() => toggleCategory(cat._id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  selectedCategoryId === cat._id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color || '#6366f1' }}
                />
                <span className="flex-1 text-left truncate font-medium">{cat.name}</span>
                {expandedCategories.has(cat._id) ? (
                  <ChevronDown className="w-3 h-3 shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 shrink-0" />
                )}
              </button>

              {expandedCategories.has(cat._id) && (
                <div className="pl-4">
                  {sections
                    .filter(s => s.categoryId === cat._id)
                    .map(sec => (
                      <button
                        key={sec._id}
                        onClick={() => handleSelectSection(sec)}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                          selectedSectionId === sec._id
                            ? 'bg-indigo-100 text-indigo-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {sec.name}
                      </button>
                    ))}

                  {addingSec === cat._id ? (
                    <div className="px-2 py-1.5 flex gap-1">
                      <input
                        autoFocus
                        value={newSecName}
                        onChange={e => setNewSecName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') createSection(cat._id);
                          if (e.key === 'Escape') setAddingSec(null);
                        }}
                        placeholder="Section name"
                        className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button onClick={() => createSection(cat._id)} className="text-indigo-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingSec(cat._id); setNewSecName(''); }}
                      className="w-full flex items-center gap-1 px-3 py-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Section
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Resize handle: left | middle */}
      <div
        className="w-1 shrink-0 cursor-col-resize hover:bg-indigo-400 bg-slate-200 transition-colors"
        onMouseDown={e => {
          resizing.current = 'left';
          resizeStartX.current = e.clientX;
          resizeStartWidth.current = leftWidth;
          document.body.style.cursor = 'col-resize';
          e.preventDefault();
        }}
      />

      {/* Middle panel: pages list */}
      <div className="shrink-0 bg-slate-50 flex flex-col" style={{ width: middleWidth }}>
        <div className="p-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 mb-2">
            <input
              type="text"
              placeholder="Search pages..."
              value={pageSearch}
              onChange={e => setPageSearch(e.target.value)}
              className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 placeholder-slate-400"
            />
          </div>
          {selectedSectionId && (
            <button
              onClick={createPage}
              className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg py-1.5 transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              New Page
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!selectedSectionId ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Select a section to view pages
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No pages yet
            </div>
          ) : (
            filteredPages.map(page => (
              <div
                key={page._id}
                className={`relative group rounded-lg p-2.5 cursor-pointer transition-all duration-200 border ${
                  selectedPageId === page._id
                    ? 'bg-white border-indigo-200 shadow-sm'
                    : 'bg-white border-transparent hover:border-slate-200 hover:shadow-sm'
                }`}
                onClick={() => handleSelectPage(page)}
              >
                {renamingPageId === page._id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') renamePage(page._id);
                      if (e.key === 'Escape') setRenamingPageId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    className="w-full text-xs border border-indigo-300 rounded px-1.5 py-0.5 focus:outline-none"
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium text-slate-800 truncate flex-1">{page.title}</p>
                      <div className="flex items-center gap-0.5">
                        {page.isFlagged && <Flag className="w-3 h-3 text-amber-400" />}
                        {page.isImportant && <Star className="w-3 h-3 text-rose-400" />}
                        <button
                          onClick={e => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === page._id ? null : page._id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {page.updatedAt && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(page.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </>
                )}

                {menuOpenFor === page._id && (
                  <div
                    className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => { setRenamingPageId(page._id); setRenameValue(page.title); setMenuOpenFor(null); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="w-3 h-3" /> Rename
                    </button>
                    <button
                      onClick={() => { toggleFlag(page); setMenuOpenFor(null); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Flag className="w-3 h-3" /> {page.isFlagged ? 'Unflag' : 'Flag'}
                    </button>
                    <button
                      onClick={() => { toggleImportant(page); setMenuOpenFor(null); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Star className="w-3 h-3" /> {page.isImportant ? 'Unmark' : 'Important'}
                    </button>
                    <hr className="my-1 border-slate-100" />
                    <button
                      onClick={() => { deletePage(page._id); setMenuOpenFor(null); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resize handle: middle | right */}
      <div
        className="w-1 shrink-0 cursor-col-resize hover:bg-indigo-400 bg-slate-200 transition-colors"
        onMouseDown={e => {
          resizing.current = 'middle';
          resizeStartX.current = e.clientX;
          resizeStartWidth.current = middleWidth;
          document.body.style.cursor = 'col-resize';
          e.preventDefault();
        }}
      />

      {/* Right panel: editor */}
      <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
        {!selectedPage ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Select or create a note</p>
            </div>
          </div>
        ) : (
          <>
            {/* Editor header */}
            <div className="border-b border-slate-200 px-6 pt-4 pb-0">
              <div className="flex items-center justify-between mb-2">
                <input
                  value={selectedPage.title}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedPage(prev => prev ? { ...prev, title: val } : prev);
                    setPages(pages.map((p: Page) => p._id === selectedPage._id ? { ...p, title: val } : p));
                    clearTimeout(saveTimerRef.current!);
                    saveTimerRef.current = setTimeout(async () => {
                      try {
                        await axios.put(`/api/notes/pages/${selectedPage._id}`, { title: val });
                        setSaveStatus('saved');
                      } catch { setSaveStatus('unsaved'); }
                    }, 800);
                  }}
                  className="text-2xl font-semibold text-slate-900 bg-transparent focus:outline-none w-full placeholder-slate-300"
                  placeholder="Untitled"
                />
                <span className={`text-xs ml-4 shrink-0 ${
                  saveStatus === 'saved' ? 'text-emerald-500' :
                  saveStatus === 'saving' ? 'text-indigo-400' : 'text-amber-400'
                }`}>
                  {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
                </span>
              </div>

              {/* Tabs bar */}
              {selectedPage.tabs.length > 0 && (
                <div className="flex gap-1 overflow-x-auto">
                  {selectedPage.tabs.map(tab => (
                    <button
                      key={tab._id}
                      onClick={() => handleTabChange(tab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                        activeTabId === tab._id
                          ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {tab.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Preview */}
            {aiPreview && (
              <div className="mx-6 mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> AI {aiAction} preview
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={applyAiPreview}
                      className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-md hover:bg-indigo-700"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setAiPreview(null)}
                      className="text-xs bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md hover:bg-slate-50"
                    >
                      Discard
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto">{aiPreview}</p>
              </div>
            )}

            {/* Rich Editor */}
            <div className="flex-1 overflow-hidden">
              <RichTextEditor
                key={`${selectedPage._id}-${activeTabId}`}
                value={editingContent}
                onChange={(html: string) => handleContentChange(html)}
                placeholder="Start writing... (supports bold, tables, images, and more)"
              />
            </div>

            {/* Bottom toolbar */}
            <div className="border-t border-slate-100 px-6 py-2.5 flex items-center gap-3 bg-white">
              <button
                onClick={() => selectedPage && toggleFlag(selectedPage)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedPage?.isFlagged
                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                    : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                {selectedPage?.isFlagged ? 'Flagged' : 'Flag'}
              </button>

              <button
                onClick={() => selectedPage && toggleImportant(selectedPage)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedPage?.isImportant
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                {selectedPage?.isImportant ? 'Important' : 'Mark Important'}
              </button>

              <div className="relative ml-auto">
                <button
                  onClick={() => setShowAiDropdown(v => !v)}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-200 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                  AI Actions
                </button>
                {showAiDropdown && (
                  <div className="absolute bottom-8 right-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-40">
                    <button
                      onClick={() => runAiAction('rewrite')}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      ✨ Rewrite
                    </button>
                    <button
                      onClick={() => runAiAction('summarize')}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      📋 Summarize
                    </button>
                    <button
                      onClick={() => runAiAction('suggestions')}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      💡 Suggestions
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
