import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CategoryList from './CategoryList';
import PageList from './PageList';
import NoteEditor from './NoteEditor';
import { INoteCategory } from '@/models/NoteCategory';
import { INotePage } from '@/models/NotePage';

const NotesLayout: React.FC = () => {
    const [categories, setCategories] = useState<INoteCategory[]>([]);
    const [pages, setPages] = useState<INotePage[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [loadingPages, setLoadingPages] = useState(false);

    // Fetch categories on mount
    useEffect(() => {
        fetchCategories();
    }, []);

    // Fetch pages when category changes
    useEffect(() => {
        if (selectedCategoryId) {
            fetchPages(selectedCategoryId);
            setSelectedPageId(null);
        } else {
            setPages([]);
            setSelectedPageId(null);
        }
    }, [selectedCategoryId]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/notes/categories');
            setCategories(response.data.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchPages = async (categoryId: string) => {
        setLoadingPages(true);
        try {
            const response = await axios.get(`/api/notes/pages?categoryId=${categoryId}`);
            setPages(response.data.data);
        } catch (error) {
            console.error('Error fetching pages:', error);
        } finally {
            setLoadingPages(false);
        }
    };

    // Category Operations
    const handleAddCategory = async (name: string) => {
        try {
            const response = await axios.post('/api/notes/categories', { name });
            setCategories([...categories, response.data.data]);
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const handleRenameCategory = async (id: string, name: string) => {
        try {
            const response = await axios.put(`/api/notes/categories/${id}`, { name });
            setCategories(
                categories.map((cat) =>
                    cat._id === id ? response.data.data : cat
                )
            );
        } catch (error) {
            console.error('Error renaming category:', error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        try {
            await axios.delete(`/api/notes/categories/${id}`);
            setCategories(categories.filter((cat) => cat._id !== id));
            if (selectedCategoryId === id) {
                setSelectedCategoryId(null);
            }
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    // Page Operations
    const handleAddPage = async (title: string) => {
        if (!selectedCategoryId) return;
        try {
            const response = await axios.post('/api/notes/pages', {
                title,
                categoryId: selectedCategoryId,
            });
            setPages([response.data.data, ...pages]);
            setSelectedPageId(response.data.data._id as string);
        } catch (error) {
            console.error('Error adding page:', error);
        }
    };

    const handleRenamePage = async (id: string, title: string) => {
        try {
            const response = await axios.put(`/api/notes/pages/${id}`, { title });
            setPages(
                pages.map((page) =>
                    page._id === id ? response.data.data : page
                )
            );
        } catch (error) {
            console.error('Error renaming page:', error);
        }
    };

    const handleDeletePage = async (id: string) => {
        try {
            await axios.delete(`/api/notes/pages/${id}`);
            setPages(pages.filter((page) => page._id !== id));
            if (selectedPageId === id) {
                setSelectedPageId(null);
            }
        } catch (error) {
            console.error('Error deleting page:', error);
        }
    };

    const handleSavePageContent = async (id: string, content: string) => {
        try {
            const response = await axios.put(`/api/notes/pages/${id}`, { content });
            setPages(
                pages.map((page) =>
                    page._id === id ? response.data.data : page
                )
            );
        } catch (error) {
            console.error('Error saving page content:', error);
        }
    };

    const selectedPage = pages.find((p) => p._id === selectedPageId) || null;

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white shadow-xl">
            {/* Column 1: Categories */}
            <div className="w-64 flex-shrink-0">
                <CategoryList
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                    onAddCategory={handleAddCategory}
                    onRenameCategory={handleRenameCategory}
                    onDeleteCategory={handleDeleteCategory}
                />
            </div>

            {/* Column 2: Pages */}
            <div className="w-64 flex-shrink-0">
                <PageList
                    pages={pages}
                    selectedPageId={selectedPageId}
                    onSelectPage={setSelectedPageId}
                    onAddPage={handleAddPage}
                    onRenamePage={handleRenamePage}
                    onDeletePage={handleDeletePage}
                    loading={loadingPages}
                />
            </div>

            {/* Column 3: Editor */}
            <div className="flex-1 overflow-hidden">
                <NoteEditor page={selectedPage} onSave={handleSavePageContent} />
            </div>
        </div>
    );
};

export default NotesLayout;
