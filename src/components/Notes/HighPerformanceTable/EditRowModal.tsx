import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ColumnDefinition, TableRow } from './types';
import clsx from 'clsx';

interface EditRowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rowId: string, data: Record<string, any>) => void;
    row: TableRow | null;
    columns: ColumnDefinition[];
}

export default function EditRowModal({ isOpen, onClose, onSave, row, columns }: EditRowModalProps) {
    const [formData, setFormData] = useState<Record<string, any>>({});

    useEffect(() => {
        if (row) {
            setFormData({ ...row.data });
        }
    }, [row]);

    const handleChange = (colId: string, value: any) => {
        setFormData(prev => ({ ...prev, [colId]: value }));
    };

    const handleSave = () => {
        if (row) {
            onSave(row.id, formData);
            onClose();
        }
    };

    if (!row) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        Edit {row.type === 'stream' ? 'Activity Stream' : 'Task'}
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {columns.map((col) => (
                                        <div key={col.id} className="flex flex-col gap-1">
                                            <label className="text-sm font-medium text-gray-700">{col.label}</label>

                                            {col.type === 'text' && (
                                                <input
                                                    type="text"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    value={formData[col.id] || ''}
                                                    onChange={(e) => handleChange(col.id, e.target.value)}
                                                />
                                            )}

                                            {col.type === 'date' && (
                                                <input
                                                    type="date"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    value={formData[col.id] || ''}
                                                    onChange={(e) => handleChange(col.id, e.target.value)}
                                                />
                                            )}

                                            {col.type === 'currency' && (
                                                <div className="relative rounded-md shadow-sm">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                        <span className="text-gray-500 sm:text-sm">$</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                        placeholder="0.00"
                                                        value={formData[col.id] || ''}
                                                        onChange={(e) => handleChange(col.id, e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            {(col.type === 'status' || col.type === 'risk') && (
                                                <div className="flex gap-2 flex-wrap">
                                                    {col.options?.map(opt => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => handleChange(col.id, opt.id)}
                                                            className={clsx(
                                                                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                                                formData[col.id] === opt.id
                                                                    ? "border-gray-400 bg-gray-100 ring-2 ring-offset-1 ring-indigo-500"
                                                                    : "border-transparent text-gray-700",
                                                                opt.color && opt.color.includes('bg-') ? opt.color.replace('bg-', 'bg-opacity-20 bg-') : "bg-gray-100"
                                                            )}
                                                            style={formData[col.id] === opt.id ? { borderColor: 'currentColor' } : {}}
                                                        >
                                                            {/* We can use the color for the badge background if we parse tailwind classes generally */}
                                                            <div className="flex items-center gap-1">
                                                                <div className={clsx("w-2 h-2 rounded-full", opt.color)} />
                                                                {opt.label}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                        onClick={handleSave}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
