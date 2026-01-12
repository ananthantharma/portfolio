```javascript
import React, { useState, useEffect, Fragment, useMemo, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilSquareIcon, TrashIcon, FunnelIcon, ChevronUpIcon, ChevronDownIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
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

    // Column Widths State
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        eventName: 250,
        primaryLead: 120,
        categoryLead: 120,
        estimatedContractValue: 120,
        riskLevel: 80,
        onTrack: 110,
        sourcingStatus: 140,
        needDate: 100,
        notes: 200,
        actions: 100
    });

    // Sorting & Filtering State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        status: 'Active', // Default to Active
        primaryLead: '',
        categoryLead: '',
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
            loadEvents();
        }
    }, [isOpen]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/sourcing/events');
            setEvents(res.data);
        } catch (e) {
            console.error("Failed to load events", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this event?")) return;
        try {
            await axios.delete(`/ api / sourcing / events ? id = ${ id } `);
            setEvents(prev => prev.filter(e => e._id !== id));
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const handleEdit = (event: any) => {
        setEditEvent(event);
    };

    const handleSaveEdit = () => {
        loadEvents(); // Reload all
        setEditEvent(null);
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Column Resizing Logic
    const resizingRef = useRef<{ startX: number, startWidth: number, colKey: string } | null>(null);

    const handleResizeStart = (e: React.MouseEvent, colKey: string) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = {
            startX: e.clientX,
            startWidth: colWidths[colKey] || 100,
            colKey
        };
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = 'col-resize';
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!resizingRef.current) return;
        const { startX, startWidth, colKey } = resizingRef.current;
        const diff = e.clientX - startX;
        setColWidths(prev => ({
            ...prev,
            [colKey]: Math.max(50, startWidth + diff) // Min width 50px
        }));
    };

    const handleResizeEnd = () => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = 'default';
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
            items = items.filter(item => item.sourcingStatus === filters.status);
        }
        if (filters.primaryLead) {
            const lower = filters.primaryLead.toLowerCase();
            items = items.filter(item => item.primaryLead?.toLowerCase() === lower);
        }
        if (filters.categoryLead) {
            const lower = filters.categoryLead.toLowerCase();
            items = items.filter(item => item.categoryLead?.toLowerCase() === lower);
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

    const ResizableHeader = ({ label, column }: { label: string, column: string }) => (
        <th
            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group select-none bg-gray-50 sticky top-0 z-10 shadow-sm transition-colors hover:bg-gray-100"
            style={{ width: colWidths[column] }}
        >
            <div
                className="flex items-center cursor-pointer h-full w-full"
                onClick={() => handleSort(column)}
            >
                <span className="truncate">{label}</span>
                <SortIcon column={column} />
            </div>

            {/* Resize Handle - Right Border Area */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-300 z-20 group-hover:bg-gray-300"
                onMouseDown={(e) => handleResizeStart(e, column)}
            />
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
        if (status === 'On Track') bgClass = 'bg-green-100 text-green-800';
        else if (status === 'At Risk') bgClass = 'bg-yellow-100 text-yellow-800';
        else if (status === 'Off Track / Late') bgClass = 'bg-red-100 text-red-800';
        // Removed 'Cancelled' and 'Closed' as they are now part of Sourcing Status
        return (
            <span className={`inline - flex items - center px - 2.5 py - 0.5 rounded - full text - xs font - medium whitespace - nowrap ${ bgClass } `}>
                {status || '-'}
            </span>
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
                                                className={`p - 2 rounded - md transition - colors ${ showFilters ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100' } `}
                                                title="Toggle Filters"
                                            >
                                                <FunnelIcon className="w-5 h-5" />
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
                                                value={filters.status}
                                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="Active">Active</option>
                                                <option value="Completed">Completed</option>
                                                <option value="On Hold">On Hold</option>
                                                <option value="Cancelled">Cancelled</option>
                                                <option value="Draft">Draft</option>
                                                <option value="Approved">Approved</option>
                                                <option value="Rejected">Rejected</option>
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
                                                <option value="Off Track / Late">Off Track / Late</option>
                                                <option value="Cancelled">Cancelled</option>
                                                <option value="Closed">Closed</option>
                                            </select>

                                            <div className="md:col-span-6 text-right">
                                                <button
                                                    onClick={() => setFilters({ search: '', status: '', primaryLead: '', categoryLead: '', risk: '', onTrack: '' })}
                                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                                >
                                                    Clear Filters
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-auto">
                                    <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
                                        <thead>
                                            <tr>
                                                <ResizableHeader label="Event Name" column="eventName" />
                                                <ResizableHeader label="Pri. Lead" column="primaryLead" />
                                                <ResizableHeader label="Cat. Lead" column="categoryLead" />
                                                <ResizableHeader label="Value" column="estimatedContractValue" />
                                                <ResizableHeader label="Risk" column="riskLevel" />
                                                <ResizableHeader label="Tracking" column="onTrack" />
                                                <ResizableHeader label="Sourcing Status" column="sourcingStatus" />
                                                <ResizableHeader label="Date" column="needDate" />
                                                <ResizableHeader label="Notes" column="notes" />
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
                                                        <td className="px-3 py-4 text-sm text-gray-900 align-top truncate" style={{ width: colWidths.eventName }}>
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className={`font - medium text - indigo - 600 truncate ${ event.sourcePageId && onNavigateToPage ? 'cursor-pointer hover:underline' : '' } `}
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
                                                                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-600 flex-shrink-0"
                                                                        onClick={() => onNavigateToPage(event.sourcePageId)}
                                                                        title="Go to Page"
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="text-gray-500 text-xs mt-1 truncate" title={event.description}>{event.description}</div>
                                                        </td>

                                                        {/* Leads */}
                                                        <td className="px-3 py-4 text-sm text-gray-500 align-top truncate" style={{ width: colWidths.primaryLead }}>{event.primaryLead || '-'}</td>
                                                        <td className="px-3 py-4 text-sm text-gray-500 align-top truncate" style={{ width: colWidths.categoryLead }}>{event.categoryLead || '-'}</td>

                                                        {/* Value */}
                                                        <td className="px-3 py-4 text-sm text-gray-900 align-top font-medium font-mono truncate" style={{ width: colWidths.estimatedContractValue }}>
                                                            {formatCurrency(event.estimatedContractValue)}
                                                        </td>

                                                        {/* Risk */}
                                                        <td className="px-3 py-4 text-sm text-center align-top text-lg" style={{ width: colWidths.riskLevel }}>
                                                            {renderRisk(event.riskLevel)}
                                                        </td>

                                                        {/* Tracking */}
                                                        <td className="px-3 py-4 text-sm align-top" style={{ width: colWidths.onTrack }}>
                                                            {renderTracking(event.onTrack)}
                                                        </td>

                                                        {/* Sourcing Status */}
                                                        <td className="px-3 py-4 text-sm align-top text-gray-700 truncate" style={{ width: colWidths.sourcingStatus }}>
                                                            {event.sourcingStatus || '-'}
                                                        </td>

                                                        {/* Date */}
                                                        <td className="px-3 py-4 text-sm text-gray-500 align-top whitespace-nowrap" style={{ width: colWidths.needDate }}>
                                                            {event.needDate ? new Date(event.needDate).toLocaleDateString() : '-'}
                                                        </td>

                                                        {/* Notes */}
                                                        <td className="px-3 py-4 text-sm text-gray-500 align-top" style={{ width: colWidths.notes }}>
                                                            <div className="line-clamp-2 text-xs italic" title={event.notes}>
                                                                {event.notes}
                                                            </div>
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
                    initialData={editEvent}
                    onSave={handleSaveEdit}
                />
            )}
        </>
    );
}
