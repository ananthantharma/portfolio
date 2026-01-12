import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
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

    return (
        <>
            <Transition.Root show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-[95%] sm:max-w-7xl h-[90vh] flex flex-col">
                                <div className="bg-white px-4 py-5 sm:px-6 flex justify-between items-center border-b">
                                    <Dialog.Title className="text-xl font-bold text-gray-900">
                                        All Sourcing Events
                                    </Dialog.Title>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-gray-500">{events.length} Events</span>
                                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                            <XMarkIcon className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto p-4 bg-gray-50">
                                    {loading ? (
                                        <div className="flex justify-center p-10">Loading...</div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-lg border shadow-sm bg-white">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name / Description</th>
                                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendors</th>
                                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sourcing Status</th>
                                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Lead</th>
                                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                                                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {events.map((event) => (
                                                        <tr key={event._id} className="hover:bg-gray-50">
                                                            <td className="px-3 py-4 text-sm text-gray-900 max-w-xs">
                                                                <div className="font-medium text-indigo-600 truncate" title={event.eventName}>{event.eventName || 'Untitled Event'}</div>
                                                                <div className="text-gray-500 text-xs truncate" title={event.description}>{event.description}</div>
                                                            </td>
                                                            <td className="px-3 py-4 text-sm text-gray-500">{event.facility}</td>
                                                            <td className="px-3 py-4 text-sm text-gray-500">{event.vendors?.join(', ')}</td>
                                                            <td className="px-3 py-4 text-sm text-gray-500">{event.activityType}</td>
                                                            <td className="px-3 py-4 text-sm text-gray-500">{event.sourcingStatus}</td>
                                                            <td className="px-3 py-4 text-sm">
                                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${event.status === 'Active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                                                                    event.status === 'On Hold' ? 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20' :
                                                                        'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10'
                                                                    }`}>
                                                                    {event.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-4 text-sm text-gray-500">{event.categoryLead}</td>
                                                            <td className="px-3 py-4 text-sm text-gray-500 text-xs text-nowrap">
                                                                <div>Eff: {event.effectiveDate ? new Date(event.effectiveDate).toLocaleDateString() : '-'}</div>
                                                                <div>Exp: {event.expirationDate ? new Date(event.expirationDate).toLocaleDateString() : '-'}</div>
                                                            </td>
                                                            <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
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
