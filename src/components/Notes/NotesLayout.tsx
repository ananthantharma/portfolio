'use client';

import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';

import { INoteCategory } from '@/models/NoteCategory';
import { INotePage } from '@/models/NotePage';
import { INoteSection } from '@/models/NoteSection';

import CategoryList from './CategoryList';
import NoteEditor from './NoteEditor';
import PageList from './PageList';
import SectionList from './SectionList';

const NotesLayout: React.FC = React.memo(() => {
  const [categories, setCategories] = useState<INoteCategory[]>([]);
  const [sections, setSections] = useState<INoteSection[]>([]);
  const [pages, setPages] = useState<INotePage[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch sections when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      fetchSections(selectedCategoryId);
      setSelectedSectionId(null);
      setSelectedPageId(null);
      setPages([]);
    } else {
      setSections([]);
      setPages([]);
      setSelectedSectionId(null);
      setSelectedPageId(null);
    }
  }, [selectedCategoryId]);

  // Fetch pages when section changes
  useEffect(() => {
    if (selectedSectionId) {
      fetchPages(selectedSectionId);
      setSelectedPageId(null);
    } else {
      setPages([]);
      setSelectedPageId(null);
    }
  }, [selectedSectionId]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/notes/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSections = async (categoryId: string) => {
    setLoadingSections(true);
    try {
      const response = await axios.get(`/api/notes/sections?categoryId=${categoryId}`);
      setSections(response.data.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoadingSections(false);
    }
  };

  const fetchPages = async (sectionId: string) => {
    setLoadingPages(true);
    try {
      const response = await axios.get(`/api/notes/pages?sectionId=${sectionId}`);
      setPages(response.data.data);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  // Category Operations
  const handleAddCategory = useCallback(async (name: string) => {
    try {
      const response = await axios.post('/api/notes/categories', { name });
      setCategories(prev => [...prev, response.data.data]);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }, []);

  const handleRenameCategory = useCallback(async (id: string, name: string) => {
    try {
      const response = await axios.put(`/api/notes/categories/${id}`, { name });
      setCategories(prev => prev.map(cat => (cat._id === id ? response.data.data : cat)));
    } catch (error) {
      console.error('Error renaming category:', error);
    }
  }, []);

  const handleDeleteCategory = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/notes/categories/${id}`);
      setCategories(prev => prev.filter(cat => cat._id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId(null);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }, [selectedCategoryId]);

  // Section Operations
  const handleAddSection = useCallback(async (name: string) => {
    if (!selectedCategoryId) return;
    try {
      const response = await axios.post('/api/notes/sections', {
        name,
        categoryId: selectedCategoryId,
      });
      setSections(prev => [...prev, response.data.data]);
      setSelectedSectionId(response.data.data._id);
    } catch (error) {
      console.error('Error adding section:', error);
    }
  }, [selectedCategoryId]);

  const handleRenameSection = useCallback(async (id: string, name: string) => {
    try {
      const response = await axios.put(`/api/notes/sections/${id}`, { name });
      setSections(prev => prev.map(sec => (sec._id === id ? response.data.data : sec)));
    } catch (error) {
      console.error('Error renaming section:', error);
    }
  }, []);

  const handleDeleteSection = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/notes/sections/${id}`);
      setSections(prev => prev.filter(sec => sec._id !== id));
      if (selectedSectionId === id) setSelectedSectionId(null);
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  }, [selectedSectionId]);

  // Page Operations
  const handleAddPage = useCallback(
    async (title: string) => {
      if (!selectedSectionId) return;
      try {
        const response = await axios.post('/api/notes/pages', {
          title,
          sectionId: selectedSectionId,
        });
        setPages(prev => [response.data.data, ...prev]);
        setSelectedPageId(response.data.data._id as string);
      } catch (error) {
        console.error('Error adding page:', error);
      }
    },
    [selectedSectionId],
  );

  const handleRenamePage = useCallback(async (id: string, title: string) => {
    try {
      const response = await axios.put(`/api/notes/pages/${id}`, { title });
      setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
    } catch (error) {
      console.error('Error renaming page:', error);
    }
  }, []);

  const handleDeletePage = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/notes/pages/${id}`);
      setPages(prev => prev.filter(page => page._id !== id));
      if (selectedPageId === id) setSelectedPageId(null);
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  }, [selectedPageId]);

  const handleSavePageContent = useCallback(async (id: string, content: string) => {
    try {
      const response = await axios.put(`/api/notes/pages/${id}`, { content });
      setPages(prev => prev.map(page => (page._id === id ? response.data.data : page)));
    } catch (error) {
      console.error('Error saving page content:', error);
    }
  }, []);

  const selectedPage = pages.find(p => p._id === selectedPageId) || null;

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white shadow-xl">
      {/* Column 1: Categories */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200">
        <CategoryList
          categories={categories}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onRenameCategory={handleRenameCategory}
          onSelectCategory={setSelectedCategoryId}
          selectedCategoryId={selectedCategoryId}
        />
      </div>

      {/* Column 2: Sections */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200">
        <SectionList
          sections={sections}
          loading={loadingSections}
          onAddSection={handleAddSection}
          onDeleteSection={handleDeleteSection}
          onRenameSection={handleRenameSection}
          onSelectSection={setSelectedSectionId}
          selectedSectionId={selectedSectionId}
        />
      </div>

      {/* Column 3: Pages */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200">
        <PageList
          loading={loadingPages}
          onAddPage={handleAddPage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
          onSelectPage={setSelectedPageId}
          pages={pages}
          selectedPageId={selectedPageId}
        />
      </div>

      {/* Column 4: Editor */}
      <div className="flex-1 overflow-hidden">
        <NoteEditor onSave={handleSavePageContent} page={selectedPage} />
      </div>
    </div>
  );
});

NotesLayout.displayName = 'NotesLayout';

export default NotesLayout;
