import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useMemo, useState } from 'react';

import { getCategoryEmoji, TRANSACTION_CATEGORIES } from '@/lib/categories';

interface Transaction {
    _id: string;
    category: string;
    description: string;
    amount: number;
}

interface TransactionEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, newCategory: string) => void;
    transaction: Transaction | null;
}

const TransactionEditModal: React.FC<TransactionEditModalProps> = React.memo(({ isOpen, onClose, onSave, transaction }) => {
    const [selectedCategory, setSelectedCategory] = useState(transaction?.category || TRANSACTION_CATEGORIES[0]);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCategories = useMemo(() => {
        return TRANSACTION_CATEGORIES.filter(c =>
            c.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    useEffect(() => {
        if (transaction) {
            // Ensure current category is selected even if not in standard list (though it should be)
            setSelectedCategory(transaction.category);
        }
    }, [transaction]);

    const handleSave = () => {
        if (transaction) {
            onSave(transaction._id, selectedCategory);
            onClose();
        }
    };

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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-bold text-slate-800">
                                        Edit Transaction
                                    </Dialog.Title>
                                    <button className="rounded-full p-1 hover:bg-slate-100" onClick={onClose}>
                                        <XMarkIcon className="h-5 w-5 text-slate-500" />
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <p className="text-sm text-slate-500 mb-1">Transaction</p>
                                    <p className="font-semibold text-slate-800">{transaction?.description}</p>
                                    <p className="text-sm font-bold text-slate-800 mt-1">
                                        ${transaction?.amount.toFixed(2)}
                                    </p>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Select a category
                                    </label>

                                    <div className="relative mb-4">
                                        <input
                                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search categories..."
                                            type="text"
                                            value={searchTerm}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {filteredCategories.map((cat) => {
                                            const isSelected = selectedCategory === cat;
                                            return (
                                                <button
                                                    className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${isSelected
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-200'
                                                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    key={cat}
                                                    onClick={() => setSelectedCategory(cat)}
                                                    type="button"
                                                >
                                                    <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full text-2xl ${isSelected ? 'bg-white shadow-sm' : 'bg-slate-50 grayscale'
                                                        }`}>
                                                        {getCategoryEmoji(cat)}
                                                    </div>
                                                    <span className="text-xs font-bold text-center leading-tight">
                                                        {cat}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        {filteredCategories.length === 0 && (
                                            <p className="col-span-full text-center text-sm text-slate-400 py-4">No categories found.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-end gap-3">
                                    <button
                                        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                                        onClick={onClose}
                                        type="button"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
                                        onClick={handleSave}
                                        type="button"
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
});

TransactionEditModal.displayName = 'TransactionEditModal';

export default TransactionEditModal;
