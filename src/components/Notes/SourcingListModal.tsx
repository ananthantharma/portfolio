import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilSquareIcon, TrashIcon, FunnelIcon, ChevronUpIcon, ChevronDownIcon, ArrowTopRightOnSquareIcon, PlusIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import SourcingEventModal from './SourcingEventModal';

interface SourcingListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigateToPage?: (pageId: string) => void;
}

export default function SourcingListModal({ isOpen, onClose, onNavigateToPage }: SourcingListModalProps) {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editEvent, setEditEvent] = useState<any>(null);

    // Inline Editing State
    const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
    const [editValue, setEditValue] = useState<any>('');
    const [config, setConfig] = useState<any>({
        departments: [],
        categoryLeads: [],
        sourcingStatuses: []
    });

    // Paste Modal State
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pasteInput, setPasteInput] = useState('');
    const [isProcessingPaste, setIsProcessingPaste] = useState(false);

    const handleStartEdit = (e: React.MouseEvent, event: any, field: string) => {
        e.stopPropagation(); // Prevent row click
        setEditingCell({ id: event._id, field });

        // Format initial value
        let val = event[field];
        if (field === 'needDate' && val) {
            val = new Date(val).toISOString().split('T')[0];
        }
        setEditValue(val || '');
    };

    const handleInlineSave = async () => {
        if (!editingCell) return;
        const { id, field } = editingCell;

        // Optimistic Update
        const oldEvents = [...events];
        const updatedEvents = events.map(e => {
            if (e._id === id) {
                return { ...e, [field]: editValue };
            }
            return e;
        });
        setEvents(updatedEvents);
        setEditingCell(null);

        try {
            await axios.post('/api/sourcing/events', { _id: id, [field]: editValue });
        } catch (e) {
            console.error("Inline update failed", e);
            setEvents(oldEvents); // Revert
            alert("Failed to update");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Allow Shift+Enter for textarea
            e.preventDefault();
            handleInlineSave();
        }
        if (e.key === 'Escape') setEditingCell(null);
    };

    // Column Widths State
    // Column Widths State - Using Percentages
    const [colWidths] = useState<Record<string, string | number>>({
        eventName: '14%',
        department: '8%',
        primaryLead: '7%',
        categoryLead: '7%',
        estimatedContractValue: '8%',
        riskLevel: '5%',
        onTrack: '10%',
        sourcingStatus: '9%',
        needDate: '7%',
        notes: '18%',
        actions: '7%'
    });

    // Sorting & Filtering State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        status: 'Active', // Default to Active
        primaryLead: '',
        categoryLead: '',
        department: '',
        risk: '',
        onTrack: ''
    });

    // Extract unique leads for filter dropdowns
    const { primaryLeads, categoryLeads } = useMemo(() => {
        const pLeads = new Set<string>();
        const cLeads = new Set<string>();
        events.forEach(e => {
            if (e.primaryLead) pLeads.add(e.primaryLead);
            if (e.categoryLead) cLeads.add(e.categoryLead);
        });
        return {
            primaryLeads: Array.from(pLeads).sort(),
            categoryLeads: Array.from(cLeads).sort()
        };
    }, [events]);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [eventsRes, configRes] = await Promise.all([
                axios.get('/api/sourcing/events'),
                axios.get('/api/sourcing/config')
            ]);
            setEvents(eventsRes.data);
            setConfig(configRes.data || { departments: [], categoryLeads: [], sourcingStatuses: [] });
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this event?")) return;
        try {
            await axios.delete(`/api/sourcing/events?id=${id}`);
            setEvents(prev => prev.filter(e => e._id !== id));
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const handleEdit = (event: any) => {
        setEditEvent(event);
    };

    const handleCreate = () => {
        setEditEvent({}); // Empty object triggers create mode
    };

    const handleSmartPaste = () => {
        setPasteInput('');
        setShowPasteModal(true);
    };

    const handleProcessPaste = async () => {
        if (!pasteInput.trim()) return;

        setIsProcessingPaste(true);
        try {
            const res = await axios.post('/api/sourcing/parse-clipboard', {
                text: pasteInput,
                options: {
                    departments: config.departments || [],
                    categoryLeads: config.categoryLeads || []
                }
            });
            const parsedData = res.data;

            // Map single 'vendor' return to 'vendors' array if needed
            if (parsedData.vendor) {
                parsedData.vendors = [parsedData.vendor];
                delete parsedData.vendor;
            }

            // Close paste modal and open edit modal
            setShowPasteModal(false);
            setEditEvent(parsedData);

        } catch (error: any) {
            console.error("Smart paste processing failed", error);
            const msg = error.response?.data?.error || error.response?.data?.details || error.message || "Unknown error";
            alert(`Failed to interpret data: ${msg}`);
        } finally {
            setIsProcessingPaste(false);
        }
    };

    const handleSaveEdit = () => {
        loadData(); // Reload all
        setEditEvent(null);
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };



    const sortedAndFilteredEvents = useMemo(() => {
        let items = [...events];

        // Filtering
        if (filters.search) {
            const lowerSearch = filters.search.toLowerCase();
            items = items.filter(item =>
                (item.eventName?.toLowerCase().includes(lowerSearch)) ||
                (item.description?.toLowerCase().includes(lowerSearch))
            );
        }
        if (filters.status) {
            items = items.filter(item => item.status === filters.status);
        }
        if (filters.primaryLead) {
            const lower = filters.primaryLead.toLowerCase();
            items = items.filter(item => item.primaryLead?.toLowerCase() === lower);
        }
        if (filters.categoryLead) {
            const lower = filters.categoryLead.toLowerCase();
            items = items.filter(item => item.categoryLead?.toLowerCase() === lower);
        }
        if (filters.department) {
            items = items.filter(item => item.department === filters.department);
        }
        if (filters.risk) {
            items = items.filter(item => item.riskLevel === filters.risk);
        }
        if (filters.onTrack) {
            items = items.filter(item => item.onTrack === filters.onTrack);
        }


        // Sorting
        if (sortConfig) {
            items.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === bValue) return 0;
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return items;
    }, [events, sortConfig, filters]);

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <div className="w-4 h-4 ml-1 inline-block opacity-0 group-hover:opacity-50">↕</div>;
        return sortConfig.direction === 'asc'
            ? <ChevronUpIcon className="w-4 h-4 ml-1 inline-block text-indigo-600" />
            : <ChevronDownIcon className="w-4 h-4 ml-1 inline-block text-indigo-600" />;
    };

    const FixedHeader = ({ label, column }: { label: string, column: string }) => (
        <th
            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group select-none bg-gray-50 sticky top-0 z-10 shadow-sm transition-colors hover:bg-gray-100 cursor-pointer"
            style={{ width: colWidths[column] }}
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center h-full w-full">
                <span className="truncate">{label}</span>
                <SortIcon column={column} />
            </div>
        </th>
    );

    const formatCurrency = (amount: number | undefined) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const renderRisk = (level: string) => {
        switch (level) {
            case 'High': return <span title="High Risk">🔴</span>;
            case 'Medium': return <span title="Medium Risk">🟡</span>;
            case 'Low': return <span title="Low Risk">🟢</span>;
            default: return <span>⚪</span>;
        }
    };

    const renderTracking = (status: string) => {
        let bgClass = 'bg-gray-100 text-gray-800';
        switch (status) {
            case 'On Track': bgClass = 'bg-green-100 text-green-800'; break;
            case 'At Risk': bgClass = 'bg-yellow-100 text-yellow-800'; break;
            case 'Off Track': bgClass = 'bg-red-100 text-red-800'; break;
            case 'Blocked / Critical': bgClass = 'bg-gray-900 text-white'; break;
            case 'Not Started': bgClass = 'bg-gray-100 text-gray-800'; break;
            case 'In Progress': bgClass = 'bg-blue-100 text-blue-800'; break;
            case 'On Hold / Paused': bgClass = 'bg-orange-100 text-orange-800'; break;
            case 'Pending Approval / Review': bgClass = 'bg-purple-100 text-purple-800'; break;
            case 'Draft / Scoping': bgClass = 'bg-teal-100 text-teal-800'; break;
            case 'Completed / Delivered': bgClass = 'bg-green-800 text-white'; break;
            case 'Cancelled': bgClass = 'bg-gray-600 text-white'; break;
            case 'Deferred': bgClass = 'bg-yellow-900 text-white'; break;
            case 'Archived': bgClass = 'bg-slate-300 text-slate-800'; break;
            default: bgClass = 'bg-gray-100 text-gray-800';
        }

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${bgClass}`}>
                {status || 'Not Started'}
            </span>
        );
    };

    const renderEditableCell = (event: any, field: string, type: 'text' | 'number' | 'select' | 'date' | 'textarea', options: string[] = []) => {
        const isEditing = editingCell?.id === event._id && editingCell?.field === field;
        const value = event[field];

        if (isEditing) {
            if (type === 'select') {
                return (
                    <select
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleInlineSave}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-1 h-full"
                    >
                        <option value="">-</option>
                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            }
            if (type === 'textarea') {
                return (
                    <textarea
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleInlineSave}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-1"
                        rows={3}
                    />
                );
            }
            if (type === 'date') {
                return (
                    <input
                        type="date"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleInlineSave}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-1"
                    />
                );
            }
            return (
                <input
                    type={type}
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleInlineSave}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-1"
                />
            );
        }

        // Display Mode
        let content;
        if (type === 'select' && field === 'riskLevel') content = renderRisk(value);
        else if (type === 'select' && field === 'onTrack') content = renderTracking(value);
        else if (type === 'date') content = value ? new Date(value).toLocaleDateString() : '-';
        else if (field === 'estimatedContractValue') content = formatCurrency(value);
        else content = value || '-';

        return (
            <div
                className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[1.5rem]"
                onClick={(e) => handleStartEdit(e, event, field)}
                title="Click to edit"
            >
                {content}
            </div>
        );
    };

    return (
        <>
            <Transition.Root show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-[95vw] h-[90vh] flex flex-col">
                                <div className="bg-white px-4 py-5 sm:px-6 border-b flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <Dialog.Title className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                            All Sourcing Events
                                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                                {sortedAndFilteredEvents.length}
                                            </span>
                                        </Dialog.Title>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setShowFilters(!showFilters)}
                                                className={`p-2 rounded-md transition-colors ${showFilters ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'}`}
                                                title="Toggle Filters"
                                            >
                                                <FunnelIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={handleSmartPaste}
                                                className="flex items-center gap-1 bg-white text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 border border-gray-300 transition-colors shadow-sm text-sm font-medium mr-2"
                                                title="Paste row from Excel/Email"
                                            >
                                                <ClipboardDocumentListIcon className="w-4 h-4 text-indigo-500" />
                                                Smart Paste
                                            </button>
                                            <button
                                                onClick={handleCreate}
                                                className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                New Event
                                            </button>
                                            <button
                                                type="button"
                                                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                                                onClick={onClose}
                                            >
                                                <span className="sr-only">Close</span>
                                                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filters Bar */}
                                    {showFilters && (
                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg animate-fadeIn">
                                            <input
                                                type="text"
                                                placeholder="Search..."
                                                value={filters.search}
                                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />

                                            <select
                                                value={filters.primaryLead}
                                                onChange={(e) => setFilters(prev => ({ ...prev, primaryLead: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            >
                                                <option value="">All Pri Leads</option>
                                                {primaryLeads.map(lead => (
                                                    <option key={lead} value={lead}>{lead}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={filters.categoryLead}
                                                onChange={(e) => setFilters(prev => ({ ...prev, categoryLead: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            >
                                                <option value="">All Cat Leads</option>
                                                {categoryLeads.map(lead => (
                                                    <option key={lead} value={lead}>{lead}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={filters.department}
                                                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            >
                                                <option value="">All Depts</option>
                                                {config.departments?.map((dept: string) => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={filters.status}
                                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="Active">Active</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Completed">Completed</option>
                                                <option value="On Hold">On Hold</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>

                                            <select
                                                value={filters.risk}
                                                onChange={(e) => setFilters(prev => ({ ...prev, risk: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            >
                                                <option value="">All Risks</option>
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                            </select>

                                            <select
                                                value={filters.onTrack}
                                                onChange={(e) => setFilters(prev => ({ ...prev, onTrack: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            >
                                                <option value="">All Tracking</option>
                                                <option value="On Track">On Track</option>
                                                <option value="At Risk">At Risk</option>
                                                <option value="Off Track">Off Track</option>
                                                <option value="Blocked / Critical">Blocked / Critical</option>
                                                <option value="Not Started">Not Started</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="On Hold / Paused">On Hold / Paused</option>
                                                <option value="Pending Approval / Review">Pending Approval / Review</option>
                                                <option value="Draft / Scoping">Draft / Scoping</option>
                                                <option value="Completed / Delivered">Completed / Delivered</option>
                                                <option value="Cancelled">Cancelled</option>
                                                <option value="Deferred">Deferred</option>
                                                <option value="Archived">Archived</option>
                                            </select>

                                            <div className="md:col-span-6 text-right">
                                                <button
                                                    onClick={() => setFilters({ search: '', status: '', primaryLead: '', categoryLead: '', department: '', risk: '', onTrack: '' })}
                                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                                >
                                                    Clear Filters
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-auto">
                                    <table className="min-w-full divide-y divide-gray-200 table-fixed">
                                        <thead>
                                            <tr>
                                                <FixedHeader label="Event Name" column="eventName" />
                                                <FixedHeader label="BU / Dept" column="department" />
                                                <FixedHeader label="Pri. Lead" column="primaryLead" />
                                                <FixedHeader label="Cat. Lead" column="categoryLead" />
                                                <FixedHeader label="Value" column="estimatedContractValue" />
                                                <FixedHeader label="Risk" column="riskLevel" />
                                                <FixedHeader label="Tracking" column="onTrack" />
                                                <FixedHeader label="Sourcing Status" column="sourcingStatus" />
                                                <FixedHeader label="Date" column="needDate" />
                                                <FixedHeader label="Notes" column="notes" />
                                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10 shadow-sm" style={{ width: colWidths.actions }}>
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {loading ? (
                                                <tr><td colSpan={10} className="p-4 text-center text-gray-500">Loading events...</td></tr>
                                            ) : sortedAndFilteredEvents.length === 0 ? (
                                                <tr><td colSpan={10} className="p-4 text-center text-gray-500">No events found.</td></tr>
                                            ) : (
                                                sortedAndFilteredEvents.map((event) => (
                                                    <tr key={event._id} className="hover:bg-gray-50 transition-colors">

                                                        {/* Event Name */}
                                                        <td className="px-3 py-4 text-sm text-gray-900 align-top whitespace-normal" style={{ width: colWidths.eventName }}>
                                                            <div className="flex items-start gap-2">
                                                                <div
                                                                    className={`font-medium text-indigo-600 break-words min-w-0 ${event.sourcePageId && onNavigateToPage ? 'cursor-pointer hover:underline' : ''}`}
                                                                    title={event.eventName}
                                                                    onClick={() => {
                                                                        if (event.sourcePageId && onNavigateToPage) {
                                                                            onNavigateToPage(event.sourcePageId);
                                                                        }
                                                                    }}
                                                                >
                                                                    {event.eventName || 'Untitled Event'}
                                                                </div>
                                                                {event.sourcePageId && onNavigateToPage && (
                                                                    <ArrowTopRightOnSquareIcon
                                                                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-600 flex-shrink-0 mt-0.5"
                                                                        onClick={() => onNavigateToPage(event.sourcePageId)}
                                                                        title="Go to Page"
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="text-gray-500 text-xs mt-1 whitespace-normal break-words">
                                                                {renderEditableCell(event, 'description', 'textarea')}
                                                            </div>
                                                        </td>

                                                        {/* Business Unit / Dept */}
                                                        <td className="px-3 py-4 text-sm text-gray-500 align-top truncate" style={{ width: colWidths.department }}>
                                                            {renderEditableCell(event, 'department', 'select', config.departments)}
                                                        </td>

                                                        {/* Leads */}
                                                        <td className="px-3 py-4 text-sm text-gray-500 align-top truncate" style={{ width: colWidths.primaryLead }}>
                                                            {renderEditableCell(event, 'primaryLead', 'text')}
                                                        </td>
                                                        <td className="px-3 py-4 text-sm text-gray-500 align-top truncate" style={{ width: colWidths.categoryLead }}>
                                                            {renderEditableCell(event, 'categoryLead', 'select', config.categoryLeads)}
                                                        </td>

                                                        {/* Value */}
                                                        <td className="px-3 py-4 text-sm text-gray-900 align-top font-medium font-mono truncate" style={{ width: colWidths.estimatedContractValue }}>
                                                            {renderEditableCell(event, 'estimatedContractValue', 'number')}
                                                        </td>

                                                        {/* Risk */}
                                                        <td className="px-3 py-4 text-sm text-center align-top text-lg" style={{ width: colWidths.riskLevel }}>
                                                            {renderEditableCell(event, 'riskLevel', 'select', ['Low', 'Medium', 'High'])}
                                                        </td>

                                                        {/* Tracking */}
                                                        <td className="px-3 py-4 text-sm align-top" style={{ width: colWidths.onTrack }}>
                                                            {renderEditableCell(event, 'onTrack', 'select', [
                                                                'On Track',
                                                                'At Risk',
                                                                'Off Track',
                                                                'Blocked / Critical',
                                                                'Not Started',
                                                                'In Progress',
                                                                'On Hold / Paused',
                                                                'Pending Approval / Review',
                                                                'Draft / Scoping',
                                                                'Completed / Delivered',
                                                                'Cancelled',
                                                                'Deferred',
                                                                'Archived'
                                                            ])}
                                                        </td>

                                                        {/* Sourcing Status */}
                                                        <td className="px-3 py-4 text-sm align-top text-gray-700 truncate" style={{ width: colWidths.sourcingStatus }}>
                                                            {renderEditableCell(event, 'sourcingStatus', 'select', config.sourcingStatuses.length > 0 ? config.sourcingStatuses : ['Active', 'Pending', 'Completed', 'On Hold', 'Cancelled'])}
                                                        </td>

                                                        {/* Date */}
                                                        <td className="px-3 py-4 text-sm text-gray-500 align-top whitespace-nowrap" style={{ width: colWidths.needDate }}>
                                                            {renderEditableCell(event, 'needDate', 'date')}
                                                        </td>

                                                        {/* Notes */}
                                                        <td className="px-3 py-4 text-sm text-gray-500 align-top" style={{ width: colWidths.notes }}>
                                                            {renderEditableCell(event, 'notes', 'textarea')}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="px-3 py-4 text-right text-sm font-medium align-top" style={{ width: colWidths.actions }}>
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => handleEdit(event)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded-md">
                                                                    <PencilSquareIcon className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDelete(event._id)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-md">
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>

            {/* Edit Modal (Nested) */}
            {editEvent && (
                <SourcingEventModal
                    isOpen={!!editEvent}
                    onClose={() => setEditEvent(null)}
                    initialData={editEvent._id ? editEvent : undefined}
                    onSave={handleSaveEdit}
                    defaultDescription={editEvent.description}
                    defaultEventName={editEvent.eventName}
                />
            )}

            {/* Smart Paste Data Input Modal */}
            <Transition.Root show={showPasteModal} as={Fragment}>
                <Dialog as="div" className="relative z-[60]" onClose={() => setShowPasteModal(false)}>
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <ClipboardDocumentListIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                            <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                                Smart Paste
                                            </Dialog.Title>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500 mb-2">
                                                    Paste your row data (from Excel, Email, or Slack) below. The AI will attempt to map the fields for you.
                                                </p>
                                                <textarea
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                    rows={6}
                                                    placeholder="Paste text here..."
                                                    value={pasteInput}
                                                    onChange={(e) => setPasteInput(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                                        onClick={handleProcessPaste}
                                        disabled={isProcessingPaste || !pasteInput.trim()}
                                    >
                                        {isProcessingPaste ? 'Processing...' : 'Parse & Create'}
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                        onClick={() => setShowPasteModal(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>
        </>
    );
}
