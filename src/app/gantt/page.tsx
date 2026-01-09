'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Calendar, ChevronLeft, X, Edit2, CheckSquare, Settings, Maximize, Save, GripVertical, Sparkles, FolderOpen, RotateCcw, ZoomIn, ZoomOut, CornerDownRight } from 'lucide-react';
import Header from '../../components/Sections/Header';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


// --- Utility Functions ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const formatDate = (date: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

const getDaysDiff = (start: Date, end: Date) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((end.getTime() - start.getTime()) / oneDay);
};

const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// --- Mock Data (Placeholder) ---
const INITIAL_TASKS = [
    { id: '1', name: 'Project Kickoff', start: new Date(2023, 9, 1), end: new Date(2023, 9, 3), progress: 100, category: 'Planning' },
    { id: '2', name: 'Requirements Gathering', start: new Date(2023, 9, 4), end: new Date(2023, 9, 10), progress: 60, category: 'Planning' },
    { id: '3', name: 'Design Phase', start: new Date(2023, 9, 11), end: new Date(2023, 9, 25), progress: 20, category: 'Design' },
    { id: '4', name: 'Development Sprint 1', start: new Date(2023, 9, 20), end: new Date(2023, 10, 5), progress: 0, category: 'Development' },
    { id: '5', name: 'Client Review', start: new Date(2023, 10, 6), end: new Date(2023, 10, 8), progress: 0, category: 'Review' },
];

// Hex codes for defaults to support dynamic style injection
const INITIAL_CATEGORIES: Record<string, string> = {
    'Planning': '#6FBE44', // Sushi Green
    'Design': '#a855f7',    // Purple
    'Development': '#10b981', // Emerald
    'Review': '#f59e0b',    // Amber
    'default': '#404040'    // Tundora
};

// --- Sortable Item Component ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SortableTaskItem({ task, categoryColors, onClick, onAddSubtask, onDelete }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
        position: 'relative' as const,
    };

    const isSubtask = !!task.parentId;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center justify-between px-4 h-[50px] border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors ${isSubtask ? 'pl-10' : ''}`}
        >
            <div className="flex items-center space-x-3 overflow-hidden flex-1">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab hover:text-[#6FBE44] text-slate-300 flex-shrink-0"
                >
                    <GripVertical className="w-4 h-4" />
                </div>

                {isSubtask && <CornerDownRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}

                <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ring-2 ring-white"
                    style={{ backgroundColor: categoryColors[task.category] || categoryColors['default'] }}
                ></div>
                <span
                    onClick={() => onClick(task)}
                    className="text-sm font-semibold text-[#404040] truncate group-hover:text-[#6FBE44] transition-colors cursor-pointer flex-1"
                >
                    {task.name}
                </span>
            </div>

            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-200 pl-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onAddSubtask(task.id); }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-[#6FBE44]"
                    title="Add Subtask"
                >
                    <CornerDownRight className="w-3.5 h-3.5" />
                </button>
                <div
                    onClick={() => onClick(task)}
                    className="cursor-pointer p-1 hover:bg-slate-200 rounded"
                >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400 hover:text-[#6FBE44]" />
                </div>
                <div
                    onClick={() => onDelete(task.id)}
                    className="cursor-pointer p-1 hover:bg-red-100 rounded"
                    title="Delete Task"
                >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                </div>
            </div>
        </div>
    );
}

export default function GanttPage() {
    // --- State ---
    const [tasks, setTasks] = useState(INITIAL_TASKS);
    const [categoryColors, setCategoryColors] = useState(INITIAL_CATEGORIES);
    const [activeId, setActiveId] = useState<string | null>(null); // For drag overlay

    // Multi-Chart State
    const [chartId, setChartId] = useState<string | null>(null);
    const [chartName, setChartName] = useState('Untitled Project');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [savedCharts, setSavedCharts] = useState<any[]>([]);

    // View State
    const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month' | 'Fit' | 'Custom'>('Day');
    const [columnWidth, setColumnWidth] = useState(50); // State for actual width
    const [fitColumnWidth, setFitColumnWidth] = useState(50); // Dynamic width for 'Fit' mode
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [newChartNameInput, setNewChartNameInput] = useState('');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentTask, setCurrentTask] = useState<any>(null);

    // New Category State
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('#6FBE44');

    // AI State
    const [aiInstruction, setAIInstruction] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // --- Persistence ---

    // --- Persistence ---

    useEffect(() => {
        // Load default list on mount
        loadChartsList();

        // Check URL for ID? (Optional deep linking support later)
    }, []);

    const loadChartsList = async () => {
        try {
            const res = await fetch('/api/gantt');
            const data = await res.json();
            if (data.charts) {
                setSavedCharts(data.charts);
                // If we have saved charts but no current chart, maybe load the most recent?
                // Or just start with clean slate. for now, clean slate unless loaded.
            }
        } catch (e) {
            console.error("Failed to load charts list:", e);
        }
    };

    const handleLoadChart = async (id: string) => {
        try {
            const res = await fetch(`/api/gantt?id=${id}`);
            const data = await res.json();
            if (data.chart) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const loadedTasks = data.chart.tasks.map((t: any) => ({
                    ...t,
                    start: new Date(t.start),
                    end: new Date(t.end)
                }));
                setTasks(loadedTasks);
                if (data.chart.categoryColors) {
                    setCategoryColors(data.chart.categoryColors);
                }
                setChartId(data.chart._id);
                setChartName(data.chart.name);
                setIsLoadModalOpen(false);
            }
        } catch (e) {
            console.error("Failed to load chart:", e);
            alert("Failed to load chart.");
        }
    };

    const handleSaveChart = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/gantt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: chartId,
                    name: chartName,
                    tasks,
                    categoryColors
                })
            });
            const data = await res.json();
            if (data.success && data.chart) {
                setChartId(data.chart._id);
                alert('Chart saved!');
                loadChartsList(); // Refresh list
            }
        } catch (e) {
            console.error("Failed to save:", e);
            alert('Failed to save chart.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAs = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/gantt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newChartNameInput, // New Name means New Chart
                    tasks,
                    categoryColors
                })
            });
            const data = await res.json();
            if (data.success && data.chart) {
                setChartId(data.chart._id);
                setChartName(data.chart.name);
                alert('Project saved as new chart!');
                loadChartsList();
                setIsSaveAsModalOpen(false);
                setNewChartNameInput('');
            } else {
                alert(data.error || 'Failed to save copy.');
            }
        } catch (e) {
            console.error("Failed to save copy:", e);
            alert('Failed to save copy. See console for details.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteChart = async (id: string) => {
        if (!confirm("Are you sure you want to delete this project permanently?")) return;
        try {
            const res = await fetch(`/api/gantt?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSavedCharts(prev => prev.filter(c => c._id !== id));
                if (chartId === id) {
                    handleClearChart(); // Reset if deleted current
                }
            }
        } catch (e) {
            console.error("Failed to delete:", e);
            alert("Failed to delete chart.");
        }
    };

    const handleClearChart = () => {
        if (tasks.length > 0 && !confirm("Clear current chart? Unsaved changes will be lost.")) return;

        setTasks([]);
        setCategoryColors(INITIAL_CATEGORIES);
        setChartId(null);
        setChartName('Untitled Project');
    };

    const handleRunAI = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiInstruction.trim()) return;

        setIsGeneratingAI(true);
        try {
            const res = await fetch('/api/gantt/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tasks,
                    categoryColors,
                    instruction: aiInstruction,
                    apiKey: 'MANAGED' // Use managed key
                })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);
            if (data.tasks) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newTasks = data.tasks.map((t: any) => ({
                    ...t,
                    start: new Date(t.start),
                    end: new Date(t.end)
                }));
                setTasks(newTasks);
            }
            if (data.categoryColors) {
                setCategoryColors(data.categoryColors);
            }
            setIsAIModalOpen(false);
            setAIInstruction('');
        } catch (err) {
            console.error("AI Error:", err);
            alert("Failed to update chart with AI.");
        } finally {
            setIsGeneratingAI(false);
        }
    };


    // --- Computed Properties ---

    const totalDays = useMemo(() => {
        if (tasks.length === 0) return 30;
        const starts = tasks.map(t => new Date(t.start).getTime());
        const ends = tasks.map(t => new Date(t.end).getTime());
        const minStart = new Date(Math.min(...starts));
        const maxEnd = new Date(Math.max(...ends));

        const startPadding = 5;
        const endPadding = 15;

        const range = getDaysDiff(minStart, maxEnd) + startPadding + endPadding;
        return Math.max(range, 30);
    }, [tasks]);

    const gridStartDate = useMemo(() => {
        if (tasks.length === 0) return new Date();
        const starts = tasks.map(t => new Date(t.start).getTime());
        const minStart = new Date(Math.min(...starts));
        return addDays(minStart, -5);
    }, [tasks]);

    // Determine Column Width based on view mode
    const getColumnWidth = () => {
        switch (viewMode) {
            case 'Day': return 50;
            case 'Week': return 30;
            case 'Month': return 15;
            case 'Fit': return fitColumnWidth;
            case 'Custom': return columnWidth;
            default: return 50;
        }
    };

    const COLUMN_WIDTH = getColumnWidth();
    const ROW_HEIGHT = 50;

    // --- Effects ---

    // Handle "Fit to Screen" calculation
    useEffect(() => {
        if (viewMode === 'Fit' && containerRef.current) {
            const availableWidth = containerRef.current.offsetWidth;
            const newWidth = Math.max((availableWidth / totalDays), 1); // Minimum 1px
            setFitColumnWidth(newWidth);
        }
    }, [viewMode, totalDays, containerRef.current?.offsetWidth]);

    // Re-calculate fit on window resize
    useEffect(() => {
        const handleResize = () => {
            if (viewMode === 'Fit' && containerRef.current) {
                const availableWidth = containerRef.current.offsetWidth;
                const newWidth = Math.max((availableWidth / totalDays), 1);
                setFitColumnWidth(newWidth);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [viewMode, totalDays]);


    // --- Handlers ---

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (active.id !== over.id) {
            setTasks((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleAddSubtask = (parentId: string) => {
        const parentTask = tasks.find(t => t.id === parentId);
        if (!parentTask) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newTask: any = {
            id: generateId(),
            name: 'New Subtask',
            start: new Date(parentTask.start),
            end: addDays(new Date(parentTask.start), 2),
            progress: 0,
            category: parentTask.category,
            parentId: parentId
        };

        // Find insert index: after parent and its current subtasks (simplistic: just after parent for now, reorder handles the rest)
        // Better: Find the last task that has this parentId, or the parent itself
        let insertIndex = tasks.findIndex(t => t.id === parentId);

        // simple approach: insert immediately after parent
        const newTasks = [...tasks];
        newTasks.splice(insertIndex + 1, 0, newTask);
        setTasks(newTasks);
    };

    const handleAddTask = () => {
        const newTask = {
            id: generateId(),
            name: 'New Task',
            start: new Date(),
            end: addDays(new Date(), 3),
            progress: 0,
            category: Object.keys(categoryColors)[0] || 'default'
        };
        setCurrentTask(newTask);
        setIsModalOpen(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditTask = (task: any) => {
        setCurrentTask({
            ...task,
            startStr: formatDate(task.start),
            endStr: formatDate(task.end)
        });
        setIsModalOpen(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSaveTask = (e: any) => {
        e.preventDefault();
        const start = new Date(currentTask.startStr || currentTask.start);
        const end = new Date(currentTask.endStr || currentTask.end);

        if (end < start) {
            alert("End date cannot be before start date");
            return;
        }

        const taskToSave = {
            ...currentTask,
            start,
            end,
            progress: Math.min(100, Math.max(0, parseInt(currentTask.progress) || 0))
        };

        setTasks(prev => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const exists = prev.find((t: any) => t.id === taskToSave.id);
            if (exists) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return prev.map((t: any) => t.id === taskToSave.id ? taskToSave : t);
            } else {
                return [...prev, taskToSave];
            }
        });
        setIsModalOpen(false);
    };

    const handleDeleteTask = (taskId?: string) => {
        const idToDelete = typeof taskId === 'string' ? taskId : currentTask?.id;

        if (!confirm("Delete this task?")) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTasks(prev => prev.filter((t: any) => t.id !== idToDelete && t.parentId !== idToDelete));
        setIsModalOpen(false);
    };

    // --- Category Handlers ---

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddCategory = (e: any) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        if (categoryColors[newCatName]) {
            alert('Category already exists!');
            return;
        }
        setCategoryColors(prev => ({
            ...prev,
            [newCatName]: newCatColor
        }));
        setNewCatName('');
    };

    const handleDeleteCategory = (catName: string) => {
        if (catName === 'default') {
            alert("Cannot delete default category");
            return;
        }
        const newColors = { ...categoryColors };
        delete newColors[catName];
        setCategoryColors(newColors);

        // Reset tasks with this category to default
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTasks(prev => prev.map((t: any) => t.category === catName ? { ...t, category: 'default' } : t));
    };


    // --- Render Helpers ---

    const renderTimeScale = () => {
        const headers = [];
        const numCols = totalDays;

        // Determine scale based on column width
        // Very tight (< 5px) -> Years
        // Tight (< 15px) -> Months
        // Normal -> Days

        const showYearsOnly = COLUMN_WIDTH < 5;
        const showMonthsOnly = COLUMN_WIDTH >= 5 && COLUMN_WIDTH < 20;
        const showDays = COLUMN_WIDTH >= 20;

        let lastMonth = -1;
        let lastYear = -1;

        for (let i = 0; i < numCols; i++) {
            const date = addDays(gridStartDate, i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();

            const isNewYear = year !== lastYear;
            const isNewMonth = month !== lastMonth;

            if (isNewYear) lastYear = year;
            if (isNewMonth) lastMonth = month;

            // Base Styles
            const cellStyle = { width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH };
            const borderClass = `flex flex-col items-center justify-end border-r border-slate-200 h-full text-xs ${isWeekend && showDays ? 'bg-slate-50' : 'bg-white'}`;

            let content = null;

            if (showYearsOnly) {
                // Only show label on Jan 1st
                if (isNewYear || i === 0) {
                    content = (
                        <span className="absolute top-1/2 -translate-y-1/2 left-1 font-bold text-[#404040] z-10 text-xs whitespace-nowrap">
                            {year}
                        </span>
                    );
                }
            }
            else if (showMonthsOnly) {
                // Show Month Year on new month
                if (isNewMonth || i === 0) {
                    const monthName = date.toLocaleString('default', { month: 'short' });
                    const label = isNewYear || i === 0 ? `${monthName} ${year}` : monthName;
                    content = (
                        <span className="absolute top-1/2 -translate-y-1/2 left-1 font-bold text-[#404040] z-10 text-[10px] whitespace-nowrap overflow-visible">
                            {label}
                        </span>
                    );
                }
            }
            else {
                // Day Mode (Existing Logic)
                const subLabel = date.toLocaleString('default', { weekday: 'narrow' });
                const monthLabel = day === 1 || i === 0 ? date.toLocaleString('default', { month: 'short' }) : '';

                content = (
                    <>
                        {monthLabel && <span className="absolute top-1 font-bold text-[#404040] z-10">{monthLabel}</span>}
                        <span className="text-slate-400 mb-1">{subLabel}</span>
                        <span className="font-medium mb-1 text-[#404040]">{day}</span>
                    </>
                );
            }

            headers.push(
                <div key={i} className={`relative ${borderClass}`} style={cellStyle}>
                    {content}
                </div>
            );
        }
        return headers;
    };

    const renderGrid = () => {
        const cols = [];
        for (let i = 0; i < totalDays; i++) {
            const date = addDays(gridStartDate, i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            cols.push(
                <div key={i} className={`border-r border-slate-100 h-full ${isWeekend ? 'bg-slate-50/50' : ''}`} style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH }}></div>
            );
        }
        return cols;
    };

    const renderBars = () => {
        return tasks.map(task => {
            const dayOffset = getDaysDiff(gridStartDate, new Date(task.start));
            const duration = getDaysDiff(new Date(task.start), new Date(task.end)) + 1;

            const left = dayOffset * COLUMN_WIDTH;
            const width = Math.max(duration * COLUMN_WIDTH, COLUMN_WIDTH);

            // Get color dynamically
            const barColor = categoryColors[task.category] || categoryColors['default'];
            const isDragging = activeId === task.id;

            return (
                <div
                    key={task.id}
                    className={`relative group transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
                    style={{ height: ROW_HEIGHT }}
                >
                    {/* Bar */}
                    <div
                        onClick={() => handleEditTask(task)}
                        className={`absolute top-2 h-8 rounded-full shadow-sm cursor-pointer hover:brightness-110 transition-all flex items-center overflow-hidden`}
                        style={{
                            left: `${left}px`,
                            width: `${width - 4}px`,
                            backgroundColor: barColor
                        }}
                    >
                        {/* Progress Fill */}
                        <div className="h-full bg-white/20" style={{ width: `${task.progress}%` }}></div>

                        {/* Label inside bar if wide enough */}
                        {width > 60 && <span className="text-white text-xs font-medium px-2 whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-md">{task.name}</span>}
                    </div>

                    {/* Label outside if narrow */}
                    {width <= 60 && (
                        <div
                            className="absolute top-3 text-xs text-[#404040] whitespace-nowrap"
                            style={{ left: `${left + width + 4}px` }}
                        >
                            {task.name}
                        </div>
                    )}
                </div>
            );
        });
    };

    // Sortable Overlay Item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
        >
            <Header />
            <div className="flex flex-col h-screen bg-slate-50 font-sans text-[#404040] pt-[72px]">
                {/* Top Navigation */}
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
                    <div className="flex items-center space-x-3">
                        <div className="bg-[#6FBE44] p-2 rounded-lg shadow-green-100 shadow-lg">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-[#404040] tracking-tight">{chartName}</h1>
                            <p className="text-xs text-slate-500 font-medium">Project Timeline</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* AI Update Button */}
                        <button
                            onClick={() => setIsAIModalOpen(true)}
                            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-bold"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden md:inline">AI Update</span>
                        </button>

                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        {/* Load Button */}
                        <button
                            onClick={() => {
                                loadChartsList();
                                setIsLoadModalOpen(true);
                            }}
                            className="flex items-center space-x-2 text-slate-600 hover:text-[#6FBE44] px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-semibold"
                            title="Load Project"
                        >
                            <FolderOpen className="w-4 h-4" />
                            <span className="hidden md:inline">Load</span>
                        </button>

                        {/* Save Button */}
                        <button
                            onClick={handleSaveChart}
                            className="flex items-center space-x-2 text-slate-600 hover:text-[#6FBE44] px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-semibold"
                            disabled={isSaving}
                            title="Save Project"
                        >
                            {isSaving ? (
                                <span className="w-4 h-4 border-2 border-[#6FBE44] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span className="hidden md:inline">{isSaving ? 'Saving...' : 'Save'}</span>
                        </button>

                        {/* Save As Button */}
                        <button
                            onClick={() => setIsSaveAsModalOpen(true)}
                            className="flex items-center space-x-2 text-slate-600 hover:text-[#6FBE44] px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-semibold"
                            title="Save As..."
                        >
                            <Save className="w-4 h-4" />
                            <span className="hidden md:inline">Save As</span>
                        </button>

                        {/* Clear Button */}
                        <button
                            onClick={handleClearChart}
                            className="flex items-center space-x-2 text-slate-400 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-semibold"
                            title="Clear Chart"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>

                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        {/* Zoom Controls */}
                        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <ZoomOut
                                className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600"
                                onClick={() => {
                                    setColumnWidth(prev => {
                                        if (prev <= 20) return Math.max(1, prev - 1);
                                        return Math.max(1, prev - 5);
                                    });
                                    setViewMode('Custom');
                                }}
                            />

                            {/* Slider */}
                            <input
                                type="range"
                                min="1"
                                max="200"
                                value={viewMode === 'Custom' ? columnWidth : (viewMode === 'Day' ? 50 : viewMode === 'Week' ? 30 : viewMode === 'Month' ? 15 : fitColumnWidth)}
                                onChange={(e) => {
                                    setColumnWidth(Number(e.target.value));
                                    setViewMode('Custom');
                                }}
                                className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#6FBE44]"
                                title="Zoom Level"
                            />

                            {/* Number Input */}
                            <input
                                type="number"
                                min="1"
                                max="200"
                                value={viewMode === 'Custom' ? columnWidth : Math.round(viewMode === 'Day' ? 50 : viewMode === 'Week' ? 30 : viewMode === 'Month' ? 15 : fitColumnWidth)}
                                onChange={(e) => {
                                    const val = Math.max(1, Math.min(200, Number(e.target.value)));
                                    setColumnWidth(val);
                                    setViewMode('Custom');
                                }}
                                className="w-12 h-6 text-xs text-center border border-slate-200 rounded focus:border-[#6FBE44] focus:outline-none text-[#404040]"
                                title="Precise Zoom"
                            />

                            <ZoomIn
                                className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600"
                                onClick={() => {
                                    setColumnWidth(prev => {
                                        if (prev < 20) return Math.min(200, prev + 1);
                                        return Math.min(200, prev + 5);
                                    });
                                    setViewMode('Custom');
                                }}
                            />
                        </div>

                        {/* Category Manager Button */}
                        <button
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="flex items-center space-x-2 text-slate-500 hover:text-[#404040] px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="hidden md:inline">Categories</span>
                        </button>

                        {/* View Mode Switcher */}
                        <div className="bg-slate-100 p-1 rounded-lg flex text-sm shadow-inner hidden md:flex">
                            <button
                                onClick={() => setViewMode('Day')}
                                className={`px-3 py-1 rounded-md transition-all duration-200 ${viewMode === 'Day' ? 'bg-white shadow-sm text-[#6FBE44] font-bold' : 'text-slate-500 hover:text-[#404040]'}`}
                            >
                                Day
                            </button>
                            <button
                                onClick={() => setViewMode('Week')}
                                className={`px-3 py-1 rounded-md transition-all duration-200 ${viewMode === 'Week' ? 'bg-white shadow-sm text-[#6FBE44] font-bold' : 'text-slate-500 hover:text-[#404040]'}`}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => setViewMode('Fit')}
                                className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-all duration-200 ${viewMode === 'Fit' ? 'bg-white shadow-sm text-[#6FBE44] font-bold' : 'text-slate-500 hover:text-[#404040]'}`}
                            >
                                <Maximize className="w-3 h-3" />
                                <span>Fit</span>
                            </button>
                        </div>

                        <button
                            onClick={handleAddTask}
                            className="flex items-center space-x-2 bg-[#6FBE44] hover:bg-[#5da33a] text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-bold"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline">Add Task</span>
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Sidebar (Task List) */}
                    <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                        <div className="h-[50px] border-b border-slate-200 bg-slate-50/50 flex items-center px-4 text-xs font-bold text-slate-400 uppercase tracking-wider backdrop-blur-sm justify-between">
                            <span>Task Name</span>
                            {/* Label removed as requested */}
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <SortableContext
                                items={tasks.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {tasks.map(task => (
                                    <SortableTaskItem
                                        key={task.id}
                                        task={task}
                                        categoryColors={categoryColors}
                                        onClick={handleEditTask}
                                        onAddSubtask={handleAddSubtask}
                                        onDelete={handleDeleteTask}
                                    />
                                ))}
                            </SortableContext>
                        </div>
                    </div>

                    {/* Timeline Area */}
                    <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50" ref={containerRef}>
                        {/* Timeline Header (Dates) */}
                        <div className="h-[50px] bg-white border-b border-slate-200 overflow-hidden flex flex-shrink-0 relative shadow-sm z-10">
                            <div className="flex absolute left-0 top-0 h-full" style={{ transform: `translateX(0px)` }}>
                                {renderTimeScale()}
                            </div>
                        </div>

                        {/* Timeline Grid & Bars */}
                        <div className="flex-1 overflow-auto relative custom-scrollbar">
                            <div className="relative min-h-full" style={{ width: `${totalDays * COLUMN_WIDTH}px` }}>
                                {/* Background Grid */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {renderGrid()}
                                </div>

                                {/* Bars Container */}
                                <div className="absolute top-0 left-0 w-full pt-[0px]">
                                    {renderBars()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drag Overlay for Sidebar */}
                <DragOverlay>
                    {activeTask ? (
                        <div className="group flex items-center justify-between px-4 h-[50px] bg-white border border-slate-200 shadow-xl opacity-90 rounded-lg">
                            <div className="flex items-center space-x-3 overflow-hidden flex-1">
                                <GripVertical className="w-4 h-4 text-[#6FBE44]" />
                                <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ring-2 ring-white"
                                    style={{ backgroundColor: categoryColors[activeTask.category] || categoryColors['default'] }}
                                ></div>
                                <span className="text-sm font-semibold text-[#404040]">{activeTask.name}</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>


                {/* Task Edit Modal */}
                {isModalOpen && currentTask && (
                    <div className="fixed inset-0 bg-[#404040]/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-[#404040] flex items-center gap-2">
                                    {currentTask.id && tasks.find(t => t.id === currentTask.id) ? (
                                        <>
                                            <Edit2 className="w-4 h-4 text-[#6FBE44]" />
                                            Edit Task
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 text-[#6FBE44]" />
                                            New Task
                                        </>
                                    )}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-[#404040] transition-colors hover:rotate-90 duration-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveTask} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Task Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={currentTask.name}
                                        onChange={e => setCurrentTask({ ...currentTask, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6FBE44]/20 focus:border-[#6FBE44] transition-all text-sm text-[#404040] font-medium placeholder-slate-400"
                                        placeholder="Enter task name..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={currentTask.startStr || formatDate(currentTask.start)}
                                            onChange={e => setCurrentTask({ ...currentTask, startStr: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6FBE44]/20 focus:border-[#6FBE44] transition-all text-sm text-[#404040] font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={currentTask.endStr || formatDate(currentTask.end)}
                                            onChange={e => setCurrentTask({ ...currentTask, endStr: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6FBE44]/20 focus:border-[#6FBE44] transition-all text-sm text-[#404040] font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                                        <div className="relative">
                                            <select
                                                value={currentTask.category}
                                                onChange={e => setCurrentTask({ ...currentTask, category: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6FBE44]/20 focus:border-[#6FBE44] transition-all text-sm text-[#404040] font-medium appearance-none"
                                            >
                                                {Object.keys(categoryColors).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <ChevronLeft className="w-4 h-4 text-slate-400 -rotate-90" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Progress ({currentTask.progress}%)</label>
                                        <div className="flex items-center h-[42px]">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={currentTask.progress || 0}
                                                onChange={e => setCurrentTask({ ...currentTask, progress: e.target.value })}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#6FBE44]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    {currentTask.id && tasks.find(t => t.id === currentTask.id) ? (
                                        <button
                                            type="button"
                                            onClick={handleDeleteTask}
                                            className="flex items-center space-x-2 text-red-500 hover:text-red-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors uppercase tracking-wider"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span>Delete</span>
                                        </button>
                                    ) : <div></div>}

                                    <div className="flex space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-[#404040] hover:bg-slate-100 rounded-xl transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 text-sm font-bold text-white bg-[#6FBE44] hover:bg-[#5da33a] rounded-xl shadow-lg shadow-green-200 hover:shadow-xl transition-all flex items-center gap-2"
                                        >
                                            <CheckSquare className="w-4 h-4" />
                                            Save Task
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* AI Modal */}
                {isAIModalOpen && (
                    <div className="fixed inset-0 bg-[#404040]/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-all border border-indigo-100">
                            <div className="px-6 py-4 border-b border-indigo-50 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                                <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-600" />
                                    AI Project Assistant
                                </h3>
                                <button onClick={() => setIsAIModalOpen(false)} className="text-slate-400 hover:text-indigo-600 transition-colors hover:rotate-90 duration-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleRunAI} className="p-6">
                                <p className="text-sm text-slate-600 mb-4">
                                    Describe how you want to modify your Gantt chart. You can add tasks, shift dates, or change categories.
                                </p>

                                <textarea
                                    value={aiInstruction}
                                    onChange={e => setAIInstruction(e.target.value)}
                                    placeholder="e.g., 'Add a QA phase after development', 'Push the deadline by 1 week', 'Make all Review tasks urgent (red)'"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-[#404040] font-medium placeholder-slate-400 h-32 resize-none mb-6"
                                    autoFocus
                                />

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAIModalOpen(false)}
                                        className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-indigo-900 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isGeneratingAI || !aiInstruction.trim()}
                                        className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isGeneratingAI ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Generate Updates
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Load Chart Modal */}
                {isLoadModalOpen && (
                    <div className="fixed inset-0 bg-[#404040]/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-[#404040] flex items-center gap-2">
                                    <FolderOpen className="w-5 h-5 text-[#6FBE44]" />
                                    Load Project
                                </h3>
                                <button onClick={() => setIsLoadModalOpen(false)} className="text-slate-400 hover:text-[#404040] transition-colors hover:rotate-90 duration-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6">
                                {savedCharts.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        No saved projects found.
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                        {savedCharts.map((chart) => (
                                            <div key={chart._id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-[#6FBE44]/30 transition-all group cursor-pointer" onClick={() => handleLoadChart(chart._id)}>
                                                <div>
                                                    <div className="font-bold text-[#404040] group-hover:text-[#6FBE44] transition-colors">{chart.name}</div>
                                                    <div className="text-xs text-slate-400">Last updated: {new Date(chart.lastUpdated).toLocaleDateString()}</div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteChart(chart._id); }}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Save As Modal */}
                {isSaveAsModalOpen && (
                    <div className="fixed inset-0 bg-[#404040]/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-[#404040]">Save As New Project</h3>
                                <button onClick={() => setIsSaveAsModalOpen(false)} className="text-slate-400 hover:text-[#404040] transition-colors hover:rotate-90 duration-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveAs} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Project Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newChartNameInput}
                                        onChange={(e) => setNewChartNameInput(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6FBE44]/20 focus:border-[#6FBE44] transition-all text-sm text-[#404040] font-medium placeholder-slate-400"
                                        placeholder="e.g. Website Redesign"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsSaveAsModalOpen(false)}
                                        className="px-4 py-2 text-slate-500 hover:text-[#404040] font-medium text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-[#6FBE44] hover:bg-[#5da33a] text-white rounded-xl shadow-md hover:shadow-lg transition-all text-sm font-bold"
                                    >
                                        Save Project
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Category Manager Modal */}
                {isCategoryModalOpen && (
                    <div className="fixed inset-0 bg-[#404040]/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-[#404040] flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-[#6FBE44]" />
                                    Manage Categories
                                </h3>
                                <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-[#404040] transition-colors hover:rotate-90 duration-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Add New */}
                                <form onSubmit={handleAddCategory} className="flex gap-2 mb-6 p-1.5 bg-slate-50 rounded-xl border border-slate-100 focus-within:ring-2 focus-within:ring-[#6FBE44]/20 focus-within:border-[#6FBE44] transition-all">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="New Category Name"
                                            value={newCatName}
                                            onChange={e => setNewCatName(e.target.value)}
                                            className="w-full px-3 py-2 bg-transparent border-none rounded-lg text-sm focus:outline-none focus:ring-0 text-[#404040] font-medium placeholder-slate-400"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pr-1">
                                        <input
                                            type="color"
                                            value={newCatColor}
                                            onChange={e => setNewCatColor(e.target.value)}
                                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0 hover:scale-110 transition-transform"
                                        />
                                        <button
                                            type="submit"
                                            className="bg-[#6FBE44] text-white p-2 rounded-lg hover:bg-[#5da33a] transition-colors shadow-md"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>

                                {/* List Existing */}
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                    {Object.entries(categoryColors).map(([name, color]) => (
                                        <div key={name} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white" style={{ backgroundColor: color }}></div>
                                                <span className="font-semibold text-slate-700 text-sm">{name}</span>
                                            </div>
                                            {name !== 'default' && (
                                                <button
                                                    onClick={() => handleDeleteCategory(name)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #94a3b8;
          }
        `}</style>
            </div>
        </DndContext>
    );
}
