import React, { useState, useCallback, useEffect } from 'react';
import { ColumnDefinition, TableRow, StatusOption } from './types';
import { PlusIcon, TrashIcon, ChevronRightIcon, ChevronDownIcon, Bars3Icon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import axios from 'axios';
import { ArrowDownTrayIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

// --- Mock Initial Data ---
const DEFAULT_OPTIONS: StatusOption[] = [
    { id: 'on-track', label: 'On Track', color: 'bg-green-100 text-green-800' },
    { id: 'at-risk', label: 'At Risk', color: 'bg-red-100 text-red-800' },
    { id: 'delayed', label: 'Delayed', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
];

const INITIAL_COLUMNS: ColumnDefinition[] = [
    { id: 'name', label: 'Activity / Task', type: 'text', width: 300 },
    { id: 'status', label: 'Status', type: 'status', width: 150, options: DEFAULT_OPTIONS },
    { id: 'dueDate', label: 'Due Date', type: 'date', width: 140 },
    { id: 'owner', label: 'Owner', type: 'text', width: 160 },
    {
        id: 'risk', label: 'Risk Level', type: 'risk', width: 140, options: [
            { id: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
            { id: 'medium', label: 'Medium', color: 'bg-orange-100 text-orange-800' },
            { id: 'high', label: 'High', color: 'bg-red-200 text-red-900 border border-red-300' },
        ]
    },
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
                    return { ...row, children: [...(row.children || []), newTask] };
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

    // --- Render Helpers ---

    const renderCellContent = (row: TableRow, col: ColumnDefinition) => {
        const value = row.data[col.id];

        if (col.id === 'name') {
            return (
                <div className="flex items-center gap-2">
                    {row.type === 'stream' && (
                        <button onClick={() => toggleRow(row.id)} className="p-1 hover:bg-gray-200 rounded">
                            {row.isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                        </button>
                    )}
                    {row.type === 'task' && <div className="w-6" />} {/* Indent for task */}
                    <input
                        className="bg-transparent border-none focus:ring-0 w-full font-medium text-gray-900"
                        value={value || ''}
                        onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                    />
                </div>
            );
        }

        if (col.type === 'status' || col.type === 'risk') {
            const selectedOption = col.options?.find(opt => opt.id === value) || col.options?.[0]; // Default or found
            // Dropdown implementation simplified for this pass
            return (
                <select
                    className={clsx(
                        "block w-full border-0 py-1 pl-2 pr-8 rounded-full text-xs font-semibold shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 cursor-pointer",
                        selectedOption?.color || "bg-gray-50 text-gray-500 ring-gray-200"
                    )}
                    value={value || ''}
                    onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                >
                    <option value="">Select...</option>
                    {col.options?.map(opt => (
                        <option key={opt.id} value={opt.id} className="bg-white text-gray-900">
                            {opt.label}
                        </option>
                    ))}
                </select>
            );
        }

        if (col.type === 'date') {
            return (
                <input
                    type="date"
                    className="block w-full border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                    value={value || ''}
                    onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                />
            )
        }

        // Default Text
        return (
            <textarea
                className="block w-full border-0 bg-transparent p-0 text-gray-900 focus:ring-0 sm:text-sm sm:leading-6 resize-none overflow-hidden"
                rows={1}
                value={value || ''}
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
                                "relative flex items-center px-4 py-2 text-sm border-r border-gray-100 last:border-r-0",
                                index === 0 && "sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]", // Sticky first col
                            )}
                            style={{ width: col.width, minWidth: col.width }}
                        >
                            {renderCellContent(row, col)}

                            {/* Add Task & Delete Buttons in First Column */}
                            {index === 0 && (
                                <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded">
                                    {row.type === 'stream' && (
                                        <button
                                            onClick={() => addTask(row.id)}
                                            className="p-1 text-gray-400 hover:text-indigo-600"
                                            title="Add Task"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                    )}
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
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50 backdrop-blur">
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
                            <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                    {savedTables.length === 0 && (
                                        <div className="px-4 py-2 text-sm text-gray-500">No saved tables</div>
                                    )}
                                    {savedTables.map(table => (
                                        <button
                                            key={table._id}
                                            onClick={() => handleLoad(table._id)}
                                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            {table.name}
                                            <span className="block text-xs text-gray-400">
                                                {new Date(table.updatedAt).toLocaleDateString()}
                                            </span>
                                        </button>
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
                    {columns.map((col, index) => (
                        <div
                            key={col.id}
                            className={clsx(
                                "relative px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100",
                                index === 0 && "sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                            )}
                            style={{ width: col.width, minWidth: col.width }}
                        >
                            <div className="flex items-center justify-between">
                                {col.label}
                                {/* Resizer Handle */}
                                <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 transition-colors"
                                    onMouseDown={() => startResizing(col.id)}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="min-w-full">
                    {rows.map(row => renderRow(row))}
                </div>

                {/* Simple empty state if no rows */}
                {rows.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No data. Click "New Activity Stream" to start.
                    </div>
                )}
            </div>
        </div>
    );
}
