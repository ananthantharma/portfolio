import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useState } from 'react';

const CATEGORIES = [
    'Housing',
    'Utilities',
    'Groceries',
    'Dining Out',
    'Transportation',
    'Insurance',
    'Healthcare',
    'Childcare & Education',
    'Personal & Household',
    'Recreation & Entertainment',
    'Subscriptions & Memberships',
    'Travel & Vacations',
    'Technology & Communications',
    'Debt & Financial Obligations',
    'Savings & Investments',
    'Gifts & Celebrations',
    'Pets',
    'Taxes & Government Fees',
    'Miscellaneous / Other'
];

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
    const [selectedCategory, setSelectedCategory] = useState(transaction?.category || CATEGORIES[0]);

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
                                        Start typing or select a category
                                    </label>
                                    <select
                                        className="w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        value={selectedCategory}
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
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
