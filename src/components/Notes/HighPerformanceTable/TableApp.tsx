/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    PlusIcon,
    TrashIcon,
    ChevronRightIcon,
    ChevronDownIcon,

    ClipboardDocumentIcon,
    ArrowDownTrayIcon,
    CloudArrowUpIcon,
    SparklesIcon,
    ArrowUpTrayIcon,
    CheckIcon,
    XMarkIcon,
    TableCellsIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ColumnDefinition, ColumnType, TableRow, StatusOption } from './types';

// ============ Color Palette ============

const STATUS_COLORS: StatusOption[] = [
    { id: 'green', label: 'Active', color: '#22c55e' },
    { id: 'blue', label: 'In Progress', color: '#3b82f6' },
    { id: 'amber', label: 'Pending', color: '#f59e0b' },
    { id: 'red', label: 'Blocked', color: '#ef4444' },
    { id: 'violet', label: 'Review', color: '#8b5cf6' },
    { id: 'slate', label: 'Done', color: '#64748b' },
];

const DEFAULT_COLUMNS: ColumnDefinition[] = [
    { id: 'name', label: 'Name', type: 'text', width: 280, align: 'left' },
    { id: 'status', label: 'Status', type: 'status', width: 140, options: STATUS_COLORS, align: 'center' },
    { id: 'col3', label: 'Category', type: 'text', width: 160, align: 'left' },
    { id: 'col4', label: 'Value', type: 'currency', width: 120, align: 'right' },
    { id: 'col5', label: 'Date', type: 'date', width: 140, align: 'center' },
    { id: 'notes', label: 'Notes', type: 'text', width: 220, align: 'left' },
];

const EMPTY_ROWS: TableRow[] = [];

// ============ Inline Sortable Header ============

function SortableColumnHeader({
    column,
    onResizeStart,
    onRemove,
    onRename,
}: {
    column: ColumnDefinition;
    onResizeStart: (id: string) => void;
    onRemove: (id: string) => void;
    onRename: (id: string, label: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: column.id,
    });
    const [editing, setEditing] = useState(false);
    const [label, setLabel] = useState(column.label);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLabel(column.label);
    }, [column.label]);

    useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
    }, [editing]);

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        width: column.width,
        minWidth: column.width,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.7 : 1,
    };

    const commitRename = () => {
        setEditing(false);
        if (label.trim() && label.trim() !== column.label) {
            onRename(column.id, label.trim());
        } else {
            setLabel(column.label);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative flex items-center justify-between px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider select-none border-r border-white/[0.06] group
                ${column.id === 'name' ? 'sticky left-0 z-30' : ''}
                ${isDragging ? 'bg-zinc-700/80' : 'bg-zinc-800/60'}`}
        >
            <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
                {column.id !== 'name' && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab hover:text-zinc-300 text-zinc-500 shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                        </svg>
                    </div>
                )}

                {editing ? (
                    <input
                        ref={inputRef}
                        className="bg-zinc-700 text-zinc-100 text-[11px] font-semibold uppercase rounded px-1 py-0.5 border border-violet-500/50 outline-none w-full"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') {
                                setLabel(column.label);
                                setEditing(false);
                            }
                        }}
                    />
                ) : (
                    <span
                        className="truncate text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors"
                        onDoubleClick={() => setEditing(true)}
                        title="Double-click to rename"
                    >
                        {column.label}
                    </span>
                )}
            </div>

            {column.id !== 'name' && (
                <button
                    onClick={e => {
                        e.stopPropagation();
                        onRemove(column.id);
                    }}
                    className="p-0.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Remove column"
                >
                    <XMarkIcon className="w-3 h-3" />
                </button>
            )}

            {/* Resize handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-violet-500/60 active:bg-violet-500 transition-colors"
                onMouseDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    onResizeStart(column.id);
                }}
            />
        </div>
    );
}

// ============ Add Column Inline ============

function AddColumnInline({ onAdd }: { onAdd: (col: ColumnDefinition) => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState<ColumnType>('text');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const submit = () => {
        if (!name.trim()) return;
        const newCol: ColumnDefinition = {
            id: `col-${Date.now()}`,
            label: name.trim(),
            type,
            width: type === 'currency' || type === 'number' ? 120 : 180,
            align: type === 'currency' || type === 'number' ? 'right' : type === 'date' || type === 'status' ? 'center' : 'left',
        };
        if (type === 'status') {
            newCol.options = STATUS_COLORS;
        }
        onAdd(newCol);
        setName('');
        setType('text');
        setOpen(false);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="h-full px-4 py-2.5 text-zinc-500 hover:text-violet-400 hover:bg-zinc-800/50 transition-colors border-r border-white/[0.06]"
                title="Add column"
            >
                <PlusIcon className="w-4 h-4" />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl p-4 z-50 space-y-3">
                    <input
                        className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="Column name..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submit()}
                        autoFocus
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                        {(['text', 'number', 'date', 'status', 'currency'] as ColumnType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-all ${type === t
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-600'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={submit}
                        disabled={!name.trim()}
                        className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                    >
                        Add Column
                    </button>
                </div>
            )}
        </div>
    );
}

// ============ AI Smart Import Modal ============

function AISmartImportModal({
    isOpen,
    onClose,
    onImport,
}: {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: { columns: ColumnDefinition[]; rows: TableRow[] }) => void;
}) {
    const [input, setInput] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'text' | 'image'>('text');
    const fileRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setImagePreview(reader.result as string);
                    reader.readAsDataURL(file);
                    setMode('image');
                }
            }
        }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
            setMode('image');
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload: any = { prompt: input || 'Convert this data into a structured table.' };
            if (mode === 'image' && imagePreview) {
                const base64 = imagePreview.split(',')[1];
                const mimeType = imagePreview.split(',')[0].match(/:(.*?);/)?.[1];
                payload.image = { base64, mimeType };
            }
            const res = await axios.post('/api/tables/generate', payload);
            if (res.data.success) {
                onImport(res.data.data);
                onClose();
                setInput('');
                setImagePreview(null);
            }
        } catch {
            alert('Failed to generate table. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden"
                onPaste={handlePaste}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600">
                            <SparklesIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-100">AI Smart Import</h3>
                            <p className="text-[11px] text-zinc-500">Paste text or an image → AI creates the table</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800">
                    {(['text', 'image'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setMode(tab)}
                            className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${mode === tab
                                ? 'text-violet-400 border-b-2 border-violet-400 bg-zinc-800/30'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {tab === 'text' ? '📝 Paste Text / Data' : '🖼️ Image / Screenshot'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {mode === 'text' ? (
                        <textarea
                            className="w-full h-40 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                            placeholder={`Paste table data, CSV, or describe what table you want...\n\nExample:\nName, Role, Department\nAlice, Engineer, Product\nBob, Designer, UX`}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                        />
                    ) : (
                        <div className="space-y-3">
                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="max-h-48 mx-auto rounded-lg border border-zinc-700"
                                    />
                                    <button
                                        onClick={() => setImagePreview(null)}
                                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                                    >
                                        <XMarkIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-500/50 transition-colors cursor-pointer"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <TableCellsIcon className="w-10 h-10 text-zinc-600 mb-2" />
                                    <p className="text-sm text-zinc-400">
                                        Click to upload or <span className="text-violet-400">paste (Ctrl+V)</span>
                                    </p>
                                    <p className="text-[11px] text-zinc-600 mt-1">PNG, JPG, GIF</p>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFile}
                                    />
                                </div>
                            )}
                            <input
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500"
                                placeholder="Optional context (e.g. 'Extract only totals')"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-5 pb-5">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm font-medium hover:bg-zinc-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (!input.trim() && !imagePreview)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Generating...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4" />
                                Generate Table
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ Main Table App ============

export default function TableApp() {
    const [columns, setColumns] = useState<ColumnDefinition[]>(DEFAULT_COLUMNS);
    const [rows, setRows] = useState<TableRow[]>(EMPTY_ROWS);
    const [resizingColId, setResizingColId] = useState<string | null>(null);
    const [savedTables, setSavedTables] = useState<any[]>([]);
    const [currentTableId, setCurrentTableId] = useState<string | null>(null);
    const [currentTableName, setCurrentTableName] = useState('Untitled Table');
    const [isEditingName, setIsEditingName] = useState(false);
    const [isLoadMenuOpen, setIsLoadMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const loadMenuRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Close load menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (loadMenuRef.current && !loadMenuRef.current.contains(e.target as Node)) {
                setIsLoadMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        fetchSavedTables();
    }, []);

    useEffect(() => {
        if (isEditingName && nameInputRef.current) nameInputRef.current.focus();
    }, [isEditingName]);

    const fetchSavedTables = async () => {
        try {
            const res = await axios.get('/api/tables');
            if (res.data.success) setSavedTables(res.data.data);
        } catch (e) {
            console.error(e);
        }
    };

    // ========== Save / Load / Delete ==========

    const handleSave = async () => {
        setLoading(true);
        try {
            if (currentTableId) {
                const res = await axios.put(`/api/tables/${currentTableId}`, { name: currentTableName, columns, rows });
                if (res.data.success) fetchSavedTables();
            } else {
                const nameToUse = currentTableName === 'Untitled Table' ? prompt('Enter table name:', currentTableName) : currentTableName;
                if (!nameToUse) { setLoading(false); return; }
                const res = await axios.post('/api/tables', { name: nameToUse, columns, rows });
                if (res.data.success) {
                    setCurrentTableId(res.data.data._id);
                    setCurrentTableName(res.data.data.name);
                    fetchSavedTables();
                }
            }
        } catch {
            alert('Error saving table');
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = async (id: string) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/tables/${id}`);
            if (res.data.success) {
                const table = res.data.data;
                setCurrentTableId(table._id);
                setCurrentTableName(table.name);
                if (table.columns) setColumns(table.columns);
                if (table.rows) setRows(table.rows);
                setIsLoadMenuOpen(false);
            }
        } catch {
            alert('Error loading table');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSavedTable = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Delete this saved table?')) return;
        try {
            const res = await axios.delete(`/api/tables/${id}`);
            if (res.data.success) {
                fetchSavedTables();
                if (currentTableId === id) {
                    setCurrentTableId(null);
                    setCurrentTableName('Untitled Table');
                    setRows([]);
                    setColumns(DEFAULT_COLUMNS);
                }
            }
        } catch {
            alert('Failed to delete');
        }
    };

    const handleNew = () => {
        setCurrentTableId(null);
        setCurrentTableName('Untitled Table');
        setColumns(DEFAULT_COLUMNS);
        setRows([]);
    };

    // ========== Column Management ==========

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setColumns(items => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleAddColumn = (newCol: ColumnDefinition) => {
        setColumns(prev => [...prev, newCol]);
    };

    const removeColumn = (id: string) => {
        setColumns(prev => prev.filter(c => c.id !== id));
    };

    const renameColumn = (id: string, label: string) => {
        setColumns(prev => prev.map(c => (c.id === id ? { ...c, label } : c)));
    };

    // ========== Resizing ==========

    const startResizing = (id: string) => setResizingColId(id);
    const stopResizing = () => setResizingColId(null);

    const handleResize = useCallback(
        (e: MouseEvent) => {
            if (!resizingColId) return;
            setColumns(prev =>
                prev.map(col =>
                    col.id === resizingColId ? { ...col, width: Math.max(60, col.width + e.movementX) } : col
                )
            );
        },
        [resizingColId]
    );

    useEffect(() => {
        if (resizingColId) {
            window.addEventListener('mousemove', handleResize);
            window.addEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resizingColId, handleResize]);

    // ========== Row Operations ==========

    const updateCell = (rowId: string, colId: string, value: any) => {
        const updateRecursive = (items: TableRow[]): TableRow[] =>
            items.map(row => {
                if (row.id === rowId) return { ...row, data: { ...row.data, [colId]: value } };
                if (row.children) return { ...row, children: updateRecursive(row.children) };
                return row;
            });
        setRows(prev => updateRecursive(prev));
    };

    const toggleRow = (rowId: string) => {
        const toggle = (items: TableRow[]): TableRow[] =>
            items.map(row => {
                if (row.id === rowId) return { ...row, isExpanded: !row.isExpanded };
                if (row.children) return { ...row, children: toggle(row.children) };
                return row;
            });
        setRows(prev => toggle(prev));
    };

    const addRow = () => {
        const newRow: TableRow = {
            id: `row-${Date.now()}`,
            type: 'stream',
            isExpanded: true,
            data: {},
            children: [],
        };
        setRows(prev => [...prev, newRow]);
    };

    const addChildRow = (parentId: string) => {
        const addRecursive = (items: TableRow[]): TableRow[] =>
            items.map(row => {
                if (row.id === parentId) {
                    const child: TableRow = {
                        id: `row-${Date.now()}`,
                        type: 'task',
                        isExpanded: false,
                        data: {},
                    };
                    return { ...row, children: [...(row.children || []), child], isExpanded: true };
                }
                if (row.children) return { ...row, children: addRecursive(row.children) };
                return row;
            });
        setRows(prev => addRecursive(prev));
    };

    const deleteRow = (rowId: string) => {
        const deleteRecursive = (items: TableRow[]): TableRow[] =>
            items
                .filter(row => row.id !== rowId)
                .map(row =>
                    row.children ? { ...row, children: deleteRecursive(row.children) } : row
                );
        setRows(prev => deleteRecursive(prev));
    };

    const indentRow = (id: string) => {
        setRows(prev => {
            const data = JSON.parse(JSON.stringify(prev));
            const findAndIndent = (items: TableRow[]): boolean => {
                const idx = items.findIndex(r => r.id === id);
                if (idx > 0) {
                    const item = items.splice(idx, 1)[0];
                    const parent = items[idx - 1];
                    if (!parent.children) parent.children = [];
                    parent.children.push(item);
                    parent.isExpanded = true;
                    return true;
                }
                for (const item of items) {
                    if (item.children && findAndIndent(item.children)) return true;
                }
                return false;
            };
            findAndIndent(data);
            return data;
        });
    };

    const outdentRow = (id: string) => {
        setRows(prev => {
            const data = JSON.parse(JSON.stringify(prev));
            const findAndOutdent = (items: TableRow[]): boolean => {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].children) {
                        const childIdx = items[i].children!.findIndex(r => r.id === id);
                        if (childIdx !== -1) {
                            const child = items[i].children!.splice(childIdx, 1)[0];
                            items.splice(i + 1, 0, child);
                            return true;
                        }
                        if (findAndOutdent(items[i].children!)) return true;
                    }
                }
                return false;
            };
            findAndOutdent(data);
            return data;
        });
    };

    // ========== AI Import ==========

    const handleAIImport = (data: { columns: ColumnDefinition[]; rows: TableRow[] }) => {
        if (data.columns && data.rows) {
            setColumns(data.columns);
            setRows(data.rows);
        }
    };

    // ========== Export ==========

    const handleExportExcel = () => {
        const exportData: any[] = [];
        const processRow = (row: TableRow, depth: number) => {
            const rowData: any = {};
            columns.forEach(col => {
                let val = row.data[col.id] || '';
                if (col.id === 'name') val = '  '.repeat(depth) + val;
                if (col.type === 'status' && col.options) {
                    const opt = col.options.find(o => o.id === val);
                    if (opt) val = opt.label;
                }
                rowData[col.label] = val;
            });
            exportData.push(rowData);
            row.children?.forEach(child => processRow(child, depth + 1));
        };
        rows.forEach(row => processRow(row, 0));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Table');
        XLSX.writeFile(wb, `${currentTableName}.xlsx`);
    };

    // ========== Copy as Rich HTML ==========

    const copyAsHTML = async () => {
        const buildHTML = () => {
            let html = `<table style="border-collapse:collapse;font-family:'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;width:100%;border:1px solid #d1d5db;">`;

            // Header
            html += '<thead><tr>';
            columns.forEach(col => {
                html += `<th style="background:#f3f4f6;border:1px solid #d1d5db;padding:8px 14px;text-align:${col.align || 'left'};font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#374151;">${col.label}</th>`;
            });
            html += '</tr></thead>';

            // Body
            html += '<tbody>';
            const renderHTMLRow = (row: TableRow, depth: number) => {
                const isGroup = row.type === 'stream';
                html += '<tr>';
                columns.forEach(col => {
                    let val = row.data[col.id] || '';
                    const indent = col.id === 'name' ? depth * 20 : 0;
                    let cellStyle = `border:1px solid #e5e7eb;padding:6px 14px;text-align:${col.align || 'left'};`;

                    if (isGroup && col.id === 'name') {
                        cellStyle += 'font-weight:600;background:#f9fafb;';
                    }
                    if (indent > 0) cellStyle += `padding-left:${14 + indent}px;`;

                    if (col.type === 'status' && col.options) {
                        const opt = col.options.find(o => o.id === val);
                        if (opt) {
                            val = `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${opt.color}22;color:${opt.color};border:1px solid ${opt.color}44;">${opt.label}</span>`;
                        }
                    } else if (col.type === 'currency' && val) {
                        val = `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                    }

                    html += `<td style="${cellStyle}">${val}</td>`;
                });
                html += '</tr>';
                row.children?.forEach(child => renderHTMLRow(child, depth + 1));
            };
            rows.forEach(row => renderHTMLRow(row, 0));
            html += '</tbody></table>';
            return html;
        };

        const htmlContent = buildHTML();

        // Also build plain text for fallback
        let plainText = columns.map(c => c.label).join('\t') + '\n';
        const addPlainRow = (row: TableRow, depth: number) => {
            const cells = columns.map(col => {
                let v = row.data[col.id] || '';
                if (col.id === 'name') v = '  '.repeat(depth) + v;
                if (col.type === 'status' && col.options) {
                    const opt = col.options.find(o => o.id === v);
                    if (opt) v = opt.label;
                }
                return v;
            });
            plainText += cells.join('\t') + '\n';
            row.children?.forEach(child => addPlainRow(child, depth + 1));
        };
        rows.forEach(row => addPlainRow(row, 0));

        try {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const textBlob = new Blob([plainText], { type: 'text/plain' });

            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blob,
                    'text/plain': textBlob,
                }),
            ]);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = plainText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    // ========== Cell Rendering ==========

    const renderCell = (row: TableRow, col: ColumnDefinition, depth: number) => {
        const value = row.data[col.id];

        if (col.id === 'name') {
            return (
                <div className="flex items-center gap-1.5">
                    <div style={{ width: depth * 20 }} className="shrink-0" />
                    {(row.children && row.children.length > 0) || row.type === 'stream' ? (
                        <button
                            onClick={() => toggleRow(row.id)}
                            className="p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                        >
                            {row.isExpanded ? (
                                <ChevronDownIcon className="w-3.5 h-3.5" />
                            ) : (
                                <ChevronRightIcon className="w-3.5 h-3.5" />
                            )}
                        </button>
                    ) : (
                        <div className="w-[18px] shrink-0" />
                    )}
                    <input
                        className="bg-transparent text-zinc-100 text-sm outline-none w-full placeholder-zinc-600 font-medium"
                        value={value || ''}
                        placeholder="Enter name..."
                        onChange={e => updateCell(row.id, col.id, e.target.value)}
                    />
                </div>
            );
        }

        if (col.type === 'status') {
            const selected = col.options?.find(o => o.id === value);

            return (
                <div className="relative group/status w-full">
                    <button className="w-full text-center focus:outline-none">
                        {selected ? (
                            <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                                style={{
                                    background: `${selected.color}18`,
                                    color: selected.color,
                                    border: `1px solid ${selected.color}33`,
                                }}
                            >
                                <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: selected.color }}
                                />
                                {selected.label}
                            </span>
                        ) : (
                            <span className="text-zinc-600 text-[11px]">—</span>
                        )}
                    </button>
                    {/* Dropdown on hover */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover/status:flex flex-col bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 z-50 min-w-[130px]">
                        {col.options?.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => updateCell(row.id, col.id, opt.id)}
                                className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700 transition-colors"
                            >
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: opt.color }}
                                />
                                {opt.label}
                            </button>
                        ))}
                        <button
                            onClick={() => updateCell(row.id, col.id, null)}
                            className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-500 hover:bg-zinc-700 transition-colors border-t border-zinc-700"
                        >
                            <XMarkIcon className="w-3 h-3" />
                            Clear
                        </button>
                    </div>
                </div>
            );
        }

        if (col.type === 'date') {
            return (
                <input
                    type="date"
                    className="bg-transparent text-zinc-300 text-xs outline-none w-full [color-scheme:dark]"
                    value={value || ''}
                    onChange={e => updateCell(row.id, col.id, e.target.value)}
                />
            );
        }

        if (col.type === 'currency') {
            return (
                <div className="flex items-center gap-0.5">
                    <span className="text-zinc-500 text-xs">$</span>
                    <input
                        type="text"
                        className="bg-transparent text-zinc-200 text-sm outline-none w-full text-right"
                        placeholder="0.00"
                        value={value || ''}
                        onChange={e => updateCell(row.id, col.id, e.target.value)}
                    />
                </div>
            );
        }

        if (col.type === 'number') {
            return (
                <input
                    type="number"
                    className="bg-transparent text-zinc-200 text-sm outline-none w-full text-right"
                    value={value || ''}
                    onChange={e => updateCell(row.id, col.id, e.target.value)}
                />
            );
        }

        // Default: text
        return (
            <input
                className="bg-transparent text-zinc-300 text-sm outline-none w-full placeholder-zinc-600"
                value={value || ''}
                placeholder={col.label === 'Notes' ? 'Add notes...' : ''}
                onChange={e => updateCell(row.id, col.id, e.target.value)}
            />
        );
    };

    // ========== Row Rendering ==========

    const renderRow = (row: TableRow, depth: number = 0) => {
        const isGroup = row.type === 'stream';
        return (
            <React.Fragment key={row.id}>
                <div
                    className={`flex border-b border-white/[0.04] group transition-colors ${isGroup && depth === 0
                        ? 'bg-zinc-800/40 hover:bg-zinc-800/70'
                        : 'bg-zinc-900/20 hover:bg-zinc-800/30'
                        }`}
                >
                    {columns.map((col, idx) => (
                        <div
                            key={col.id}
                            className={`relative flex items-center px-3 py-2 text-sm border-r border-white/[0.04] last:border-r-0 ${idx === 0 ? 'sticky left-0 z-10 bg-inherit' : ''
                                }`}
                            style={{
                                width: col.width,
                                minWidth: col.width,
                                textAlign: col.align || 'left',
                            }}
                        >
                            {renderCell(row, col, depth)}

                            {/* Action buttons on first column */}
                            {idx === 0 && (
                                <div className="absolute right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800/90 rounded-md px-0.5">
                                    <button
                                        onClick={() => addChildRow(row.id)}
                                        className="p-1 text-zinc-500 hover:text-violet-400 transition-colors"
                                        title="Add child row"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => indentRow(row.id)}
                                        className="p-1 text-zinc-500 hover:text-violet-400 transition-colors"
                                        title="Indent"
                                    >
                                        <ArrowRightIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => outdentRow(row.id)}
                                        className="p-1 text-zinc-500 hover:text-violet-400 transition-colors"
                                        title="Outdent"
                                    >
                                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => deleteRow(row.id)}
                                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                        title="Delete row"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {row.isExpanded && row.children?.map(child => renderRow(child, depth + 1))}
            </React.Fragment>
        );
    };

    // ========== Main Render ==========

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
            {/* ---- Toolbar ---- */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl relative z-40">
                {/* Left: Title */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/20">
                        <TableCellsIcon className="w-4.5 h-4.5 text-white" />
                    </div>
                    {isEditingName ? (
                        <input
                            ref={nameInputRef}
                            className="bg-zinc-800 text-zinc-100 text-lg font-bold rounded-lg border border-violet-500/40 px-3 py-1 outline-none"
                            value={currentTableName}
                            onChange={e => setCurrentTableName(e.target.value)}
                            onBlur={() => setIsEditingName(false)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') setIsEditingName(false);
                            }}
                        />
                    ) : (
                        <h2
                            className="text-lg font-bold text-zinc-100 cursor-pointer hover:text-violet-300 transition-colors"
                            onClick={() => setIsEditingName(true)}
                            title="Click to rename"
                        >
                            {currentTableName}
                        </h2>
                    )}
                    {loading && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Saving...
                        </div>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5">
                    {/* New Table */}
                    <button
                        onClick={handleNew}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                        title="New blank table"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">New</span>
                    </button>

                    {/* Load */}
                    <div className="relative" ref={loadMenuRef}>
                        <button
                            onClick={() => setIsLoadMenuOpen(!isLoadMenuOpen)}
                            className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Load</span>
                        </button>
                        {isLoadMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-60 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="py-1">
                                    {savedTables.length === 0 ? (
                                        <div className="px-4 py-3 text-xs text-zinc-500 text-center">No saved tables</div>
                                    ) : (
                                        savedTables.map(table => (
                                            <div
                                                key={table._id}
                                                className="relative group flex items-center"
                                            >
                                                <button
                                                    onClick={() => handleLoad(table._id)}
                                                    className="flex-1 text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700/60 transition-colors"
                                                >
                                                    {table.name}
                                                    <span className="block text-[11px] text-zinc-500">
                                                        {new Date(table.updatedAt).toLocaleDateString()}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={e => handleDeleteSavedTable(e, table._id)}
                                                    className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save */}
                    <button
                        onClick={handleSave}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                    >
                        <CloudArrowUpIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Save</span>
                    </button>

                    <div className="w-px h-6 bg-zinc-800 mx-1" />

                    {/* AI Import */}
                    <button
                        onClick={() => setIsAIModalOpen(true)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all flex items-center gap-1.5"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">AI Import</span>
                    </button>

                    <div className="w-px h-6 bg-zinc-800 mx-1" />

                    {/* Copy as HTML */}
                    <button
                        onClick={copyAsHTML}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${copySuccess
                            ? 'text-green-400 bg-green-500/10'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                            }`}
                        title="Copy as formatted table (for email/docs)"
                    >
                        {copySuccess ? (
                            <>
                                <CheckIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Copied!</span>
                            </>
                        ) : (
                            <>
                                <ClipboardDocumentIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Copy</span>
                            </>
                        )}
                    </button>

                    {/* Export Excel */}
                    <button
                        onClick={handleExportExcel}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                        title="Export to Excel"
                    >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                </div>
            </div>

            {/* ---- Table ---- */}
            <div className="flex-1 overflow-auto relative">
                {/* Header */}
                <div className="flex sticky top-0 z-20 bg-zinc-800/80 backdrop-blur-md border-b border-white/[0.06]">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={columns.map(c => c.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {columns.map(col => (
                                <SortableColumnHeader
                                    key={col.id}
                                    column={col}
                                    onResizeStart={startResizing}
                                    onRemove={removeColumn}
                                    onRename={renameColumn}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {/* Add column button inline */}
                    <AddColumnInline onAdd={handleAddColumn} />
                </div>

                {/* Body */}
                <div className="min-w-full">
                    {rows.map(row => renderRow(row))}
                </div>

                {/* Empty State */}
                {rows.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                        <div className="p-4 rounded-2xl bg-zinc-800/50 mb-4">
                            <TableCellsIcon className="w-10 h-10 text-zinc-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-400 mb-1">
                            No data yet
                        </h3>
                        <p className="text-xs text-zinc-600 mb-4 max-w-xs">
                            Add rows manually, or use <span className="text-violet-400 font-medium"> AI Import</span> to paste text/images and auto-generate a table.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={addRow}
                                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add Row
                            </button>
                            <button
                                onClick={() => setIsAIModalOpen(true)}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center gap-1.5"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                AI Import
                            </button>
                        </div>
                    </div>
                )}

                {/* Add Row Footer */}
                {rows.length > 0 && (
                    <button
                        onClick={addRow}
                        className="w-full py-2.5 text-xs text-zinc-500 hover:text-violet-400 hover:bg-zinc-800/40 transition-all flex items-center justify-center gap-1.5 border-b border-white/[0.04]"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                        Add Row
                    </button>
                )}
            </div>

            {/* AI Modal */}
            <AISmartImportModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onImport={handleAIImport}
            />
        </div>
    );
}
