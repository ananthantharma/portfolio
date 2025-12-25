import { Dialog, Transition } from '@headlessui/react';
import { PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment } from 'react';

import { IBudgetItemData } from '@/models/BudgetItem';

interface BudgetListModalProps {
    isOpen: boolean;
    items: (IBudgetItemData & { _id: string })[];
    onClose: () => void;
    onDelete: (id: string) => void;
    onEdit: (item: IBudgetItemData & { _id: string }) => void;
    onAdd: () => void;
    type: 'Income' | 'Expense' | 'Investment';
}

const BudgetListModal: React.FC<BudgetListModalProps> = React.memo(({ isOpen, items, onClose, onDelete, onEdit, onAdd, type }) => {

    // Quick fix for Investment filter: Just show savings/investments category or specific logic if needed.
    // For now assuming 'Investment' maps to specific categories or we just pass pre-filtered items?
    // actually page.tsx should probably pass filtered items or we do it here. 
    // Let's rely on page.tsx passing all items and we filtering by type, BUT 'Investment' isn't a strict type in DB.
    // 'Investment' usually means 'Savings & Investments' category in Expenses.

    const displayItems = type === 'Investment'
        ? items.filter(i => i.category === 'Savings & Investments')
        : items.filter(i => i.type === type);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    return (
        <Transition appear as={Fragment} show={isOpen}>
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
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
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
                                <div className="flex items-center justify-between mb-6">
                                    <Dialog.Title as="h3" className="text-xl font-bold text-slate-800">
                                        Manage {type === 'Investment' ? 'Savings & Investments' : type}
                                    </Dialog.Title>
                                    <button className="rounded-full p-1 hover:bg-slate-100" onClick={onClose}>
                                        <XMarkIcon className="h-6 w-6 text-slate-500" />
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                    {displayItems.length === 0 ? (
                                        <p className="text-center text-slate-400 py-8">No items found.</p>
                                    ) : (
                                        displayItems.map(item => (
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100" key={item._id}>
                                                <div>
                                                    <p className="font-bold text-slate-700">{item.name}</p>
                                                    <p className="text-xs text-slate-500">{item.category} • {item.subcategory}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                                                    <div className="flex gap-1">
                                                        <button
                                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            onClick={() => onEdit(item)}
                                                            title="Edit"
                                                        >
                                                            <PencilSquareIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                            onClick={() => onDelete(item._id)}
                                                            title="Delete"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="mt-6 border-t border-slate-100 pt-4 flex justify-end">
                                    <button
                                        className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 transition-colors"
                                        onClick={() => {
                                            onClose();
                                            onAdd(); // Logic to open Add Modal (pre-filled type?)
                                        }}
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                        Add New Item
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
});

BudgetListModal.displayName = 'BudgetListModal';

export default BudgetListModal;
