import React, { useState, useCallback, useEffect } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ColumnDefinition, TableRow, StatusOption } from './types';
import { PlusIcon, TrashIcon, ChevronRightIcon, ChevronDownIcon, Bars3Icon, PencilIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import axios from 'axios';
import { ArrowDownTrayIcon, CloudArrowUpIcon, ViewColumnsIcon, ArrowUpTrayIcon, SparklesIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableHeader } from './SortableHeader';
import AddColumnModal from './AddColumnModal';
import AIImportModal from './AIImportModal';
import EditRowModal from './EditRowModal';

// --- Mock Initial Data ---
const DEFAULT_OPTIONS: StatusOption[] = [
    { id: 'on-track', label: 'On Track', color: 'bg-green-500' },
    { id: 'at-risk', label: 'At Risk', color: 'bg-red-500' },
    { id: 'delayed', label: 'Delayed', color: 'bg-yellow-500' },
    { id: 'completed', label: 'Completed', color: 'bg-blue-500' },
    { id: 'draft', label: 'Draft', color: 'bg-gray-400' },
];

const INITIAL_COLUMNS: ColumnDefinition[] = [
    { id: 'name', label: 'Activity / Task', type: 'text', width: 350 },
    { id: 'status', label: 'Status', type: 'status', width: 100, options: DEFAULT_OPTIONS },
    {
        id: 'risk', label: 'Risk', type: 'risk', width: 100, options: [
            { id: 'low', label: 'Low', color: 'bg-gray-400' },
            { id: 'medium', label: 'Medium', color: 'bg-orange-500' },
            { id: 'high', label: 'High', color: 'bg-red-500' },
        ]
    },
    { id: 'dueDate', label: 'Due Date', type: 'date', width: 140 },
    { id: 'owner', label: 'Owner', type: 'text', width: 160 },
    { id: 'notes', label: 'Notes', type: 'text', width: 250 },
];

const INITIAL_DATA: TableRow[] = [
    {
        id: 'stream-1',
        type: 'stream',
        isExpanded: true,
        data: { name: 'Q1 Product Launch', status: 'on-track', dueDate: '2024-03-31', owner: 'Product Team' },
        children: [
            { id: 'task-1-1', type: 'task', isExpanded: false, data: { name: 'Finalize Specs', status: 'completed', dueDate: '2024-01-15', owner: 'Alice', risk: 'low' } },
            { id: 'task-1-2', type: 'task', isExpanded: false, data: { name: 'Design Mockups', status: 'on-track', dueDate: '2024-02-01', owner: 'Bob', risk: 'medium' } },
        ]
    },
    {
        id: 'stream-2',
        type: 'stream',
        isExpanded: true,
        data: { name: 'Marketing Campaign', status: 'at-risk', dueDate: '2024-04-15', owner: 'Marketing' },
        children: [
            { id: 'task-2-1', type: 'task', isExpanded: false, data: { name: 'Social Media Plan', status: 'delayed', dueDate: '2024-02-20', owner: 'Charlie', risk: 'high' } },
        ]
    }
];

export default function TableApp() {
    const [columns, setColumns] = useState<ColumnDefinition[]>(INITIAL_COLUMNS);
    const [rows, setRows] = useState<TableRow[]>(INITIAL_DATA);
    const [resizingColId, setResizingColId] = useState<string | null>(null);
    const [savedTables, setSavedTables] = useState<any[]>([]);
    const [currentTableId, setCurrentTableId] = useState<string | null>(null);
    const [currentTableName, setCurrentTableName] = useState<string>('New Product Roadmap');
    const [isLoadMenuOpen, setIsLoadMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<TableRow | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require movement before drag starts prevents accidental clicks
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchSavedTables();
    }, []);

    const fetchSavedTables = async () => {
        try {
            const res = await axios.get('/api/tables');
            if (res.data.success) {
                setSavedTables(res.data.data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            if (currentTableId) {
                // Update
                const res = await axios.put(`/api/tables/${currentTableId}`, {
                    name: currentTableName,
                    columns,
                    rows
                });
                if (res.data.success) {
                    alert('Saved successfully!');
                    fetchSavedTables();
                }
            } else {
                // Create
                const promptName = prompt("Enter table name:", currentTableName);
                if (!promptName) {
                    setLoading(false);
                    return;
                }
                const res = await axios.post('/api/tables', {
                    name: promptName,
                    columns,
                    rows
                });
                if (res.data.success) {
                    setCurrentTableId(res.data.data._id);
                    setCurrentTableName(res.data.data.name);
                    alert('Created successfully!');
                    fetchSavedTables();
                }
            }
        } catch (e) {
            alert('Error saving table');
            console.error(e);
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

                // Handle legacy or structure changes if needed, but for now direct set
                if (table.columns) setColumns(table.columns);
                if (table.rows) setRows(table.rows);
                setIsLoadMenuOpen(false);
            }
        } catch (e) {
            alert('Error loading table');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSavedTable = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this saved table?')) return;

        try {
            const res = await axios.delete(`/api/tables/${id}`);
            if (res.data.success) {
                fetchSavedTables();
                if (currentTableId === id) {
                    // Reset if deleting current
                    setCurrentTableId(null);
                    setCurrentTableName("New Product Roadmap");
                    setRows([]);
                    setColumns(INITIAL_COLUMNS);
                }
            }
        } catch (e) {
            alert("Failed to delete table");
        }
    };

    // --- Column Management ---
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setColumns((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addColumn = () => {
        setIsAddColumnModalOpen(true);
    };

    const handleAddColumn = (newCol: ColumnDefinition) => {
        setColumns([...columns, newCol]);
    };

    const removeColumn = (id: string) => {
        if (confirm("Are you sure you want to remove this column? Data in this column will be lost.")) {
            setColumns(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleExport = () => {
        // Flatten data for export
        const exportData: any[] = [];

        const processRow = (row: TableRow, depth: number) => {
            const rowData: any = {};

            columns.forEach(col => {
                let val = row.data[col.id] || '';

                // Add indentation visualisation for Name column
                if (col.id === 'name') {
                    val = '  '.repeat(depth) + val;
                }

                // Resolve Status/Risk labels if applicable
                if (col.type === 'status' || col.type === 'risk') {
                    const opt = col.options?.find(o => o.id === val);
                    if (opt) val = opt.label;
                }

                rowData[col.label] = val;
            });

            exportData.push(rowData);

            if (row.children && row.isExpanded) {
                row.children.forEach(child => processRow(child, depth + 1));
            } else if (row.children && !row.isExpanded) {
                // Optionally export hidden children? Let's export visible only for 'What you see is what you get', 
                // OR export all. Usually getting all data is better. Let's export ALL data regardless of expansion.
                row.children.forEach(child => processRow(child, depth + 1));
            }
        };

        rows.forEach(row => processRow(row, 0));

        const wc = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wc, "Roadmap");
        XLSX.writeFile(wb, `${currentTableName}.xlsx`);
    };

    const handleAIImport = (data: { columns: ColumnDefinition[], rows: TableRow[] }) => {
        if (data.columns && data.rows) {
            setColumns(data.columns);
            setRows(data.rows);
            alert("Table generated successfully!");
        }
    };

    // --- Resizing Logic ---
    const startResizing = (id: string) => {
        setResizingColId(id);
    };

    const stopResizing = () => {
        setResizingColId(null);
    };

    const handleResize = useCallback((e: MouseEvent) => {
        if (!resizingColId) return;

        // Find the header element to calculate offset - simplified for now using movementX
        setColumns(prev => prev.map(col => {
            if (col.id === resizingColId) {
                return { ...col, width: Math.max(50, col.width + e.movementX) };
            }
            return col;
        }));
    }, [resizingColId]);

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


    // --- Data Manipulation ---
    const toggleRow = (rowId: string) => {
        const toggleRecursive = (items: TableRow[]): TableRow[] => {
            return items.map(row => {
                if (row.id === rowId) return { ...row, isExpanded: !row.isExpanded };
                if (row.children) return { ...row, children: toggleRecursive(row.children) };
                return row;
            });
        };
        setRows(prev => toggleRecursive(prev));
    };

    const updateCell = (rowId: string, colId: string, value: any) => {
        const updateRecursive = (items: TableRow[]): TableRow[] => {
            return items.map(row => {
                if (row.id === rowId) {
                    return { ...row, data: { ...row.data, [colId]: value } };
                }
                if (row.children) return { ...row, children: updateRecursive(row.children) };
                return row;
            });
        };
        setRows(prev => updateRecursive(prev));
    };

    const handleEditRow = (row: TableRow) => {
        setEditingRow(row);
    };

    const handleSaveRow = (rowId: string, newData: Record<string, any>) => {
        const updateRecursive = (items: TableRow[]): TableRow[] => {
            return items.map(row => {
                if (row.id === rowId) {
                    return { ...row, data: newData };
                }
                if (row.children) return { ...row, children: updateRecursive(row.children) };
                return row;
            });
        };
        setRows(prev => updateRecursive(prev));
        setEditingRow(null);
    };

    const addStream = () => {
        const newStream: TableRow = {
            id: `stream-${Date.now()}`,
            type: 'stream',
            isExpanded: true,
            data: { name: 'New Activity Stream' },
            children: []
        };
        setRows([...rows, newStream]);
    };

    const addTask = (parentId: string) => {
        const addRecursive = (items: TableRow[]): TableRow[] => {
            return items.map(row => {
                if (row.id === parentId) {
                    const newTask: TableRow = {
                        id: `task-${Date.now()}`,
                        type: 'task',
                        isExpanded: false,
                        data: { name: 'New Task' }
                    };
                    return { ...row, children: [...(row.children || []), newTask], isExpanded: true };
                }
                if (row.children) return { ...row, children: addRecursive(row.children) };
                return row;
            });
        };
        setRows(prev => addRecursive(prev));
    };

    const deleteRow = (rowId: string) => {
        const deleteRecursive = (items: TableRow[]): TableRow[] => {
            return items
                .filter(row => row.id !== rowId)
                .map(row => {
                    if (row.children) {
                        return { ...row, children: deleteRecursive(row.children) };
                    }
                    return row;
                });
        };
        setRows(prev => deleteRecursive(prev));
    };

    const indentRow = (id: string) => {
        setRows(prev => {
            const newRows = JSON.parse(JSON.stringify(prev)); // Deep clone

            const findAndIndent = (items: TableRow[]): boolean => {
                const idx = items.findIndex(r => r.id === id);
                if (idx !== -1) {
                    if (idx === 0) return true; // Can't indent first item

                    const item = items[idx];
                    const newParent = items[idx - 1];

                    // Remove from current
                    items.splice(idx, 1);

                    // Add to new parent
                    if (!newParent.children) newParent.children = [];
                    newParent.children.push(item);

                    // Force expansion to show the newly added child
                    newParent.isExpanded = true;

                    return true;
                }

                for (const item of items) {
                    if (item.children && findAndIndent(item.children)) return true;
                }
                return false;
            };

            findAndIndent(newRows);
            return newRows;
        });
    };

    const outdentRow = (id: string) => {
        setRows(prev => {
            const newRows = JSON.parse(JSON.stringify(prev));

            const findParentAndOutdent = (items: TableRow[]): boolean => {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];

                    // Check children
                    if (item.children) {
                        const childIdx = item.children.findIndex(r => r.id === id);
                        if (childIdx !== -1) {
                            // Found it. 
                            const child = item.children[childIdx];

                            // Remove from parent
                            item.children.splice(childIdx, 1);

                            // Insert into *current* items list after *item*
                            items.splice(i + 1, 0, child);
                            return true;
                        }

                        // Recurse
                        if (findParentAndOutdent(item.children)) return true;
                    }
                }
                return false;
            };

            findParentAndOutdent(newRows);
            return newRows;
        });
    };

    // --- Render Helpers ---

    const renderCellContent = (row: TableRow, col: ColumnDefinition) => {
        const value = row.data[col.id];

        if (col.id === 'name') {
            return (
                <div className="flex items-center gap-2">
                    {(row.children && row.children.length > 0) || row.type === 'stream' ? (
                        <button onClick={() => toggleRow(row.id)} className="p-1 hover:bg-gray-200 rounded">
                            {row.isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                        </button>
                    ) : (
                        <div className="w-6" />
                    )}
                    <input
                        className="bg-transparent border-none focus:ring-0 w-full font-medium text-gray-900"
                        value={value || ''}
                        onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                    />
                </div>
            );
        }

        if (col.type === 'status' || col.type === 'risk') {
            const selectedOption = col.options?.find(opt => opt.id === value);

            return (
                <Popover className="relative w-full h-full flex items-center justify-center">
                    <Popover.Button className="focus:outline-none w-full h-full flex items-center justify-center">
                        {selectedOption ? (
                            <div
                                className={clsx("w-6 h-6 rounded-full shadow-sm border border-gray-200", selectedOption.color)}
                                title={selectedOption.label}
                            />
                        ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400" />
                        )}
                    </Popover.Button>

                    <Transition
                        as={React.Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Popover.Panel className="absolute z-50 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none p-2">
                            <div className="grid grid-cols-4 gap-2">
                                {col.options?.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => updateCell(row.id, col.id, opt.id)}
                                        className={clsx(
                                            "w-8 h-8 rounded-full shadow-sm border border-gray-100 hover:scale-110 transition-transform",
                                            opt.color
                                        )}
                                        title={opt.label}
                                    />
                                ))}
                                <button
                                    onClick={() => updateCell(row.id, col.id, null)}
                                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-400"
                                    title="None"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </Popover.Panel>
                    </Transition>
                </Popover>
            );
        }

        if (col.type === 'date') {
            return (
                <input
                    type="date"
                    className="block w-full border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 text-xs"
                    value={value || ''}
                    onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                />
            )
        }

        if (col.type === 'currency') {
            return (
                <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1">
                        <span className="text-gray-500 sm:text-xs">$</span>
                    </div>
                    <input
                        type="text"
                        className="block w-full border-0 bg-transparent py-0 pl-4 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 text-xs"
                        placeholder="0.00"
                        value={value || ''}
                        onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                    />
                </div>
            )
        }

        // Default Text & Notes
        return (
            <textarea
                className="block w-full border-0 bg-transparent p-0 text-gray-900 focus:ring-0 text-xs resize-none overflow-hidden leading-relaxed"
                rows={1}
                value={value || ''}
                placeholder={col.id === 'notes' ? 'Add notes...' : ''}
                onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                onInput={(e) => {
                    // Auto-grow
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                }}
            />
        );
    };

    const renderRow = (row: TableRow, depth = 0) => {
        return (
            <React.Fragment key={row.id}>
                <div className="flex border-b border-gray-200 hover:bg-gray-50 group transition-colors">
                    {columns.map((col, index) => (
                        <div
                            key={col.id}
                            className={clsx(
                                "relative flex items-center px-3 py-2 text-sm border-r border-gray-100 last:border-r-0",
                                index === 0 && "sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]", // Sticky first col
                            )}
                            style={{ width: col.width, minWidth: col.width }}
                        >
                            {col.id === 'name' && (
                                <div style={{ width: depth * 24 }} className="flex-shrink-0" />
                            )}
                            {renderCellContent(row, col)}

                            {/* Add Task & Delete Buttons in First Column */}
                            {index === 0 && (
                                <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded">
                                    <button
                                        onClick={() => addTask(row.id)}
                                        className="p-1 text-gray-400 hover:text-indigo-600"
                                        title="Add Sub-Task"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleEditRow(row)}
                                        className="p-1 text-gray-400 hover:text-indigo-600"
                                        title="Edit Row"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => outdentRow(row.id)}
                                        className="p-1 text-gray-400 hover:text-indigo-600"
                                        title="Outdent (Make Parent)"
                                    >
                                        <ArrowLeftIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => indentRow(row.id)}
                                        className="p-1 text-gray-400 hover:text-indigo-600"
                                        title="Indent (Make Child)"
                                    >
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => deleteRow(row.id)}
                                        className="p-1 text-gray-400 hover:text-red-600"
                                        title="Delete"
                                    >
                                        <TrashIcon className="w-4 h-4" />
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

    return (
        <div className="flex flex-col h-full bg-white text-gray-900">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50 backdrop-blur relative z-50">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Bars3Icon className="w-5 h-5 text-indigo-600" />
                    {currentTableName}
                    {loading && <span className="text-xs font-normal text-gray-400 ml-2">Saving/Loading...</span>}
                </h2>
                <div className="flex gap-2">
                    <div className="relative">
                        <button
                            onClick={() => setIsLoadMenuOpen(!isLoadMenuOpen)}
                            className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                            <ArrowDownTrayIcon className="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                            Load Table
                        </button>
                        {isLoadMenuOpen && (
                            <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                    {savedTables.length === 0 && (
                                        <div className="px-4 py-2 text-sm text-gray-500">No saved tables</div>
                                    )}
                                    {savedTables.map(table => (
                                        <div key={table._id} className="relative group">
                                            <button
                                                onClick={() => handleLoad(table._id)}
                                                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                {table.name}
                                                <span className="block text-xs text-gray-400">
                                                    {new Date(table.updatedAt).toLocaleDateString()}
                                                </span>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteSavedTable(e, table._id)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete Table"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                        <CloudArrowUpIcon className="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                        Save
                    </button>
                    <button
                        onClick={() => setIsAIModalOpen(true)}
                        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-purple-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        title="Generate Table from Text/Image"
                    >
                        <SparklesIcon className="-ml-0.5 h-5 w-5 text-purple-600" aria-hidden="true" />
                        Smart Import
                    </button>
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        title="Export to Excel"
                    >
                        <ArrowUpTrayIcon className="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                        Export
                    </button>
                    <button
                        onClick={addColumn}
                        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        title="Add New Column"
                    >
                        <ViewColumnsIcon className="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                        Add Col
                    </button>
                    <button
                        onClick={addStream}
                        className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                        New Activity Stream
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto relative">
                {/* Header */}
                <div className="flex sticky top-0 z-20 shadow-sm bg-gray-100 border-b border-gray-200">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={columns.map(c => c.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {columns.map((col) => (
                                <SortableHeader
                                    key={col.id}
                                    column={col}
                                    onResizeStart={startResizing}
                                    onRemove={removeColumn}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Body */}
                <div className="min-w-full">
                    {rows.map(row => renderRow(row))}
                </div>

                {/* Simple empty state if no rows */}
                {/* Simple empty state if no rows */}
                {rows.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No data. Click "New Activity Stream" to start.
                    </div>
                )}

                <AddColumnModal
                    isOpen={isAddColumnModalOpen}
                    onClose={() => setIsAddColumnModalOpen(false)}
                    onAdd={handleAddColumn}
                />
                <AIImportModal
                    isOpen={isAIModalOpen}
                    onClose={() => setIsAIModalOpen(false)}
                    onImport={handleAIImport}
                />
                <EditRowModal
                    isOpen={!!editingRow}
                    row={editingRow}
                    columns={columns}
                    onClose={() => setEditingRow(null)}
                    onSave={handleSaveRow}
                />
            </div>
        </div>
    );
}
