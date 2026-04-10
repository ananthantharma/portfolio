'use client';

import React, {useState, useEffect, useCallback, useRef} from 'react';
import axios from 'axios';
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  Code,
  Download,
  ChevronRight,
  ChevronDown,
  Paperclip,
  Loader2,
} from 'lucide-react';
import {Category, Section, Page} from './OrganizationLayout';

interface Attachment {
  _id: string;
  name: string;
  url?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  pageId?: string;
  storageType?: string;
}

type FileFilter = 'all' | 'images' | 'pdfs' | 'documents' | 'other';

interface OrgFilesViewProps {
  categories: Category[];
  sections: Section[];
  pages: Page[];
  currentPageId?: string | null;
}

function getFileIcon(mimeType?: string) {
  if (!mimeType) return <File className="w-5 h-5 text-slate-400" />;
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-indigo-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('xml')
  ) {
    return <Code className="w-5 h-5 text-emerald-500" />;
  }
  return <File className="w-5 h-5 text-slate-400" />;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function matchesFilter(att: Attachment, filter: FileFilter): boolean {
  const mime = att.mimeType || '';
  if (filter === 'all') return true;
  if (filter === 'images') return mime.startsWith('image/');
  if (filter === 'pdfs') return mime === 'application/pdf';
  if (filter === 'documents')
    return (
      mime.includes('word') ||
      mime.includes('spreadsheet') ||
      mime.includes('presentation') ||
      mime.includes('text/plain') ||
      mime.includes('opendocument')
    );
  // other
  return (
    !mime.startsWith('image/') &&
    mime !== 'application/pdf' &&
    !mime.includes('word') &&
    !mime.includes('spreadsheet') &&
    !mime.includes('presentation')
  );
}

export default function OrgFilesView({
  categories,
  sections: propSections,
  pages: propPages,
  currentPageId,
}: OrgFilesViewProps) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [localSections, setLocalSections] = useState<Section[]>(propSections);
  const [localPages, setLocalPages] = useState<Page[]>(propPages);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(currentPageId || null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAtts, setLoadingAtts] = useState(false);
  const [filter, setFilter] = useState<FileFilter>('all');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSections(propSections);
  }, [propSections]);
  useEffect(() => {
    setLocalPages(propPages);
  }, [propPages]);

  // Load sections for a category when expanded
  const loadSections = useCallback(async (categoryId: string) => {
    try {
      const res = await axios.get(`/api/notes/sections?categoryId=${categoryId}`);
      if (res.data.success) {
        setLocalSections(prev => {
          const existing = new Set(prev.map(s => s._id));
          const newOnes = res.data.data.filter((s: Section) => !existing.has(s._id));
          return [...prev, ...newOnes];
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Load pages for a section
  const loadPages = useCallback(async (sectionId: string) => {
    try {
      const res = await axios.get(`/api/notes/pages?sectionId=${sectionId}`);
      if (res.data.success) {
        setLocalPages(prev => {
          const existing = new Set(prev.map(p => p._id));
          const newOnes = res.data.data.filter((p: Page) => !existing.has(p._id));
          return [...prev, ...newOnes];
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const toggleCat = async (catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
    await loadSections(catId);
  };

  const loadAttachments = useCallback(async (pageId: string) => {
    setLoadingAtts(true);
    try {
      const res = await axios.get(`/api/notes/pages/${pageId}/attachments`);
      if (res.data.success) setAttachments(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAtts(false);
    }
  }, []);

  const handleSelectPage = async (pageId: string) => {
    setSelectedPageId(pageId);
    await loadSections(
      (() => {
        const p = localPages.find(pg => pg._id === pageId);
        if (!p) return '';
        const sec = p.sectionId;
        return typeof sec === 'string' ? sec : (sec as any)?._id || '';
      })(),
    );
    await loadAttachments(pageId);
  };

  const handleSectionClick = async (secId: string) => {
    await loadPages(secId);
  };

  const uploadFiles = async (files: File[]) => {
    if (!selectedPageId) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        // Upload to blob storage
        const uploadRes = await axios.post('/api/upload', formData, {
          headers: {'Content-Type': 'multipart/form-data'},
        });
        const url = uploadRes.data?.url || uploadRes.data?.data?.url;
        if (url) {
          // Save attachment reference
          await axios.post(`/api/notes/pages/${selectedPageId}/attachments`, {
            name: file.name,
            url,
            mimeType: file.type,
            size: file.size,
          });
        }
      }
      await loadAttachments(selectedPageId);
    } catch (err: any) {
      console.error('Upload failed', err);
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!selectedPageId) {
      alert('Select a note first to attach files.');
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    if (files.length) uploadFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPageId) {
      alert('Select a note first to attach files.');
      return;
    }
    const files = Array.from(e.target.files || []);
    if (files.length) uploadFiles(files);
  };

  const filteredAtts = attachments.filter(a => matchesFilter(a, filter));
  const selectedPageTitle = localPages.find(p => p._id === selectedPageId)?.title || 'No note selected';

  const FILTERS: {id: FileFilter; label: string}[] = [
    {id: 'all', label: 'All'},
    {id: 'images', label: 'Images'},
    {id: 'pdfs', label: 'PDFs'},
    {id: 'documents', label: 'Documents'},
    {id: 'other', label: 'Other'},
  ];

  return (
    <div className="flex h-full">
      {/* Left panel: page browser */}
      <div className="w-[220px] shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
        <div className="px-3 py-2.5 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Browse Notes</span>
        </div>
        <div className="flex-1">
          {categories.map(cat => (
            <div key={cat._id}>
              <button
                onClick={() => toggleCat(cat._id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <span className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: cat.color || '#6366f1'}} />
                <span className="flex-1 text-left truncate font-medium">{cat.name}</span>
                {expandedCats.has(cat._id) ? (
                  <ChevronDown className="w-3 h-3 shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 shrink-0" />
                )}
              </button>

              {expandedCats.has(cat._id) && (
                <div className="pl-4">
                  {localSections
                    .filter(s => s.categoryId === cat._id)
                    .map(sec => (
                      <div key={sec._id}>
                        <button
                          onClick={() => handleSectionClick(sec._id)}
                          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 transition-colors font-medium">
                          <ChevronRight className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate">{sec.name}</span>
                        </button>
                        {localPages
                          .filter(p => {
                            const s = p.sectionId;
                            return typeof s === 'string' ? s === sec._id : (s as any)?._id === sec._id;
                          })
                          .map(page => (
                            <button
                              key={page._id}
                              onClick={() => handleSelectPage(page._id)}
                              className={`w-full text-left pl-7 pr-3 py-1 text-xs rounded transition-colors truncate ${
                                selectedPageId === page._id
                                  ? 'bg-indigo-100 text-indigo-700 font-semibold'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}>
                              {page.title}
                            </button>
                          ))}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: attachments */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Upload drop zone */}
        <div
          onDragEnter={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={e => e.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mx-6 mt-6 rounded-xl border-2 border-dashed transition-all p-6 text-center ${
            isDragging
              ? 'border-indigo-400 bg-indigo-50'
              : selectedPageId
              ? 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
              : 'border-slate-200 bg-white opacity-60'
          }`}
          onClick={() => selectedPageId && fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-indigo-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </div>
          ) : (
            <>
              <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-indigo-500' : 'text-slate-300'}`} />
              <p className="text-sm font-medium text-slate-600">
                {selectedPageId
                  ? `Drop files to attach to "${selectedPageTitle}"`
                  : 'Select a note first to attach files'}
              </p>
              {selectedPageId && <p className="text-xs text-slate-400 mt-1">or click to browse</p>}
            </>
          )}
        </div>

        {/* Filter tabs & content */}
        {selectedPageId && (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {/* Filter bar */}
            <div className="flex items-center justify-between mt-4 mb-3">
              <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      filter === f.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">
                {filteredAtts.length} file{filteredAtts.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingAtts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : filteredAtts.length === 0 ? (
              <div className="text-center py-12">
                <Paperclip className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No files attached to this note</p>
                <p className="text-slate-300 text-xs mt-1">Drop files above to attach them</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredAtts.map(att => (
                  <div
                    key={att._id}
                    className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-indigo-200 transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-2">
                      {getFileIcon(att.mimeType)}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {att.url && (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.name}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Download">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-800 truncate" title={att.name}>
                      {att.name}
                    </p>
                    {att.size && <p className="text-xs text-slate-400 mt-0.5">{formatSize(att.size)}</p>}
                    {att.createdAt && (
                      <p className="text-xs text-slate-300 mt-0.5">
                        {new Date(att.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                      </p>
                    )}
                    {att.mimeType?.startsWith('image/') && att.url && (
                      <div className="mt-2 rounded-lg overflow-hidden">
                        <img src={att.url} alt={att.name} className="w-full h-16 object-cover" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedPageId && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Paperclip className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Select a note to manage its files</p>
              <p className="text-slate-300 text-xs mt-1">Browse the notebook tree on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
