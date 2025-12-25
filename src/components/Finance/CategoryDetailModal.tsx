import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment } from 'react';

import { IBudgetItem } from '@/models/BudgetItem';

interface Transaction {
    _id: string;
    amount: number;
    category: string;
    date: string | Date;
    description: string;
    type: 'Income' | 'Expense';
}

interface CategoryDetailModalProps {
    budgetItems: IBudgetItem[];
    category: string;
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
}

const CategoryDetailModal: React.FC<CategoryDetailModalProps> = React.memo(({
    budgetItems,
    category,
    isOpen,
    onClose,
    transactions,
}) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    const totalBudgeted = budgetItems.reduce((sum, item) => sum + item.amount, 0);
    const totalSpent = transactions.reduce((sum, item) => sum + item.amount, 0);
    const balance = totalBudgeted - totalSpent;

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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-800">
                                        {category} Details
                                    </Dialog.Title>
                                    <button className="rounded-full p-1 hover:bg-slate-100" onClick={onClose}>
                                        <XMarkIcon className="h-6 w-6 text-slate-500" />
                                    </button>
                                </div>

                                {/* Summary Row */}
                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-500 uppercase">Budgeted</p>
                                        <p className="text-xl font-bold text-slate-800">{formatCurrency(totalBudgeted)}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-500 uppercase">Spent</p>
                                        <p className="text-xl font-bold text-rose-600">{formatCurrency(totalSpent)}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-500 uppercase">Remaining</p>
                                        <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatCurrency(balance)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Budget Items List */}
                                    <div>
                                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-blue-500"></span> Planned Items
                                        </h4>
                                        {budgetItems.length === 0 ? (
                                            <p className="text-sm text-slate-400 italic">No budget items set.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {budgetItems.map(item => (
                                                    <li className="flex justify-between text-sm p-2 rounded hover:bg-slate-50" key={item._id}>
                                                        <span className="text-slate-600">{item.name || item.subcategory}</span>
                                                        <span className="font-medium text-slate-800">{formatCurrency(item.amount)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Transactions List */}
                                    <div>
                                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-rose-500"></span> Actual Transactions
                                        </h4>
                                        {transactions.length === 0 ? (
                                            <p className="text-sm text-slate-400 italic">No transactions found.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {transactions.map(t => (
                                                    <li className="flex justify-between text-sm p-2 rounded hover:bg-slate-50" key={t._id}>
                                                        <div>
                                                            <span className="block text-slate-600 truncate max-w-[150px]">{t.description}</span>
                                                            <span className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <span className="font-medium text-rose-600">-{formatCurrency(t.amount)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
});

CategoryDetailModal.displayName = 'CategoryDetailModal';

export default CategoryDetailModal;
