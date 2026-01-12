import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilSquareIcon, TrashIcon, FunnelIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import SourcingEventModal from './SourcingEventModal';

interface SourcingListModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SourcingListModal({ isOpen, onClose }: SourcingListModalProps) {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editEvent, setEditEvent] = useState<any>(null);

    // Sorting & Filtering State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        lead: '',
        activityType: ''
    });

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
            await axios.delete(`/api/sourcing/events?id=${id}`);
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
        if (filters.lead) {
            const lowerLead = filters.lead.toLowerCase();
            items = items.filter(item =>
                (item.primaryLead?.toLowerCase().includes(lowerLead)) ||
                (item.categoryLead?.toLowerCase().includes(lowerLead))
            );
        }
        if (filters.activityType) {
            items = items.filter(item => item.activityType === filters.activityType);
        }

        // Sorting
        if (sortConfig) {
            items.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';
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

    const SortableHeader = ({ label, column, className = "" }: { label: string, column: string, className?: string }) => (
        <th
            className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 select-none ${className}`}
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center">
                {label}
                <SortIcon column={column} />
            </div>
        </th>
    );

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
                                                <FunnelIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                                <XMarkIcon className="h-6 w-6" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filter Bar */}
                                    {showFilters && (
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <input
                                                type="text"
                                                placeholder="Search Name or Desc..."
                                                value={filters.search}
                                                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Filter by Lead..."
                                                value={filters.lead}
                                                onChange={e => setFilters(prev => ({ ...prev, lead: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                            <select
                                                value={filters.status}
                                                onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="Active">Active</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Complete">Complete</option>
                                                <option value="On Hold">On Hold</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                            <button
                                                onClick={() => setFilters({ search: '', status: '', lead: '', activityType: '' })}
                                                className="text-sm text-gray-500 hover:text-gray-700 text-right underline"
                                            >
                                                Clear Filters
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-auto p-4 bg-gray-50">
                                    {loading ? (
                                        <div className="flex justify-center p-10">Loading...</div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-lg border shadow-sm bg-white">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <SortableHeader label="Event Name / Description" column="eventName" className="w-1/4" />
                                                        <SortableHeader label="Leads" column="categoryLead" />
                                                        <SortableHeader label="Classification" column="activityType" />
                                                        <SortableHeader label="Status / Date" column="status" />
                                                        <SortableHeader label="Notes" column="notes" className="w-1/4" />
                                                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {sortedAndFilteredEvents.map((event) => (
                                                        <tr key={event._id} className="hover:bg-gray-50">
                                                            <td className="px-3 py-4 text-sm text-gray-900 align-top">
                                                                <div className="font-medium text-indigo-600 truncate" title={event.eventName}>{event.eventName || 'Untitled Event'}</div>
                                                                <div className="text-gray-500 text-xs mt-1 line-clamp-2" title={event.description}>{event.description}</div>
                                                            </td>
                                                            <td className="px-3 py-4 text-sm text-gray-500 align-top">
                                                                <div className="text-xs"><span className="font-semibold">Pri:</span> {event.primaryLead || '-'}</div>
                                                                <div className="text-xs"><span className="font-semibold">Cat:</span> {event.categoryLead || '-'}</div>
                                                            </td>
                                                            <td className="px-3 py-4 text-sm text-gray-500 align-top">
                                                                <div className="text-xs">{event.activityType}</div>
                                                                <div className="text-xs text-gray-400">{event.sourcingStatus}</div>
                                                                <div className={`text-xs mt-1 font-medium ${event.riskLevel === 'High' ? 'text-red-600' :
                                                                        event.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                                                                    }`}>
                                                                    {event.riskLevel ? `${event.riskLevel} Risk` : ''}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-4 text-sm align-top">
                                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium mb-1 ${event.status === 'Active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                                                                        event.status === 'On Hold' ? 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20' :
                                                                            'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10'
                                                                    }`}>
                                                                    {event.status}
                                                                </span>
                                                                <div className="text-xs text-gray-500">
                                                                    Need: {event.needDate ? new Date(event.needDate).toLocaleDateString() : '-'}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-4 text-sm text-gray-500 align-top">
                                                                <div className="line-clamp-3 text-xs" title={event.notes}>
                                                                    {event.notes || '-'}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                                                                <button onClick={() => handleEdit(event)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                                                                    <PencilSquareIcon className="w-5 h-5" />
                                                                </button>
                                                                <button onClick={() => handleDelete(event._id)} className="text-red-600 hover:text-red-900">
                                                                    <TrashIcon className="w-5 h-5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
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
