import { FunnelIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/solid';
import React, { useMemo, useState } from 'react';

import { getCategoryEmoji } from '@/lib/categories';

import { CategoryPicker } from './CategoryPicker';

interface Transaction {
    _id: string;
    amount: number;
    category: string;
    date: string | Date;
    description: string;
    type: 'Income' | 'Expense';
}

interface ActivityItemProps {
    t: Transaction;
    onCategoryChange: (id: string, category: string) => void;
    onDelete: (id: string) => void;
    onEdit: (t: Transaction) => void;
}

const ActivityItem = React.memo(({ t, onCategoryChange, onDelete, onEdit }: ActivityItemProps) => {
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    const formatDate = (dateStr: string | Date) => {
        return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    };

    const handleTogglePicker = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPickerOpen(prev => !prev);
    }, []);

    const handleClosePicker = React.useCallback(() => {
        setIsPickerOpen(false);
    }, []);

    const handleSelectCategory = React.useCallback((cat: string) => {
        onCategoryChange(t._id, cat);
        // Do not close automatically or leave it? User request "option to select subcategory".
        // Usually selection implies completion. ActivityFeed logic previously didn't close anything (inline).
        // Let's close it.
        setIsPickerOpen(false);
    }, [onCategoryChange, t._id]);

    return (
        <div className="group relative flex items-center justify-between rounded-xl bg-slate-50/50 p-3 transition-colors hover:bg-slate-100 border border-transparent hover:border-slate-200">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <button
                        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 text-lg shadow-sm border ${t.type === 'Income'
                                ? 'bg-white border-emerald-100 ring-1 ring-emerald-50'
                                : 'bg-white border-indigo-100 ring-1 ring-indigo-50'
                            }`}
                        onClick={handleTogglePicker}
                        title="Change Category"
                    >
                        {getCategoryEmoji(t.category)}
                    </button>

                    {/* Category Picker Popover */}
                    {isPickerOpen && (
                        <div className="absolute top-12 left-0 z-50">
                            {/* Backdrop to close */}
                            <div
                                className="fixed inset-0 z-40"
                                onClick={handleClosePicker}
                            />
                            <CategoryPicker
                                currentCategory={t.category}
                                onClose={handleClosePicker}
                                onSelect={handleSelectCategory}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-sm font-bold text-slate-700 truncate max-w-[150px] sm:max-w-[200px]">{t.description}</p>
                    <p className="text-xs text-slate-500 font-medium">{t.category} • {formatDate(t.date)}</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className={`text-sm font-extrabold ${t.type === 'Income' ? 'text-emerald-600' : 'text-slate-800'
                        }`}>
                        {t.type === 'Income' ? '+' : ''}{formatCurrency(t.amount)}
                    </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        className="rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all"
                        onClick={() => onEdit(t)}
                        title="Edit Details"
                    >
                        <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                        className="rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-rose-500 hover:shadow-sm transition-all"
                        onClick={() => onDelete(t._id)}
                        title="Delete"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
});
ActivityItem.displayName = 'ActivityItem';

interface ActivityFeedProps {
    onCategoryChange: (id: string, category: string) => void;
    onClearAll: () => void;
    onDelete: (id: string) => void;
    onEdit: (t: Transaction) => void;
    transactions: Transaction[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = React.memo(({ onCategoryChange, onClearAll, onDelete, onEdit, transactions }) => {
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const min = minAmount ? parseFloat(minAmount) : -Infinity;
            const max = maxAmount ? parseFloat(maxAmount) : Infinity;
            return t.amount >= min && t.amount <= max;
        });
    }, [transactions, minAmount, maxAmount]);

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                    {filteredTransactions.length > 0 && (
                        <button
                            className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                            onClick={onClearAll}
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <FunnelIcon className="h-4 w-4 text-slate-400" />
                    <input
                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        onChange={(e) => setMinAmount(e.target.value)}
                        placeholder="Min $"
                        type="number"
                        value={minAmount}
                    />
                    <span className="text-slate-400 text-xs">-</span>
                    <input
                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        onChange={(e) => setMaxAmount(e.target.value)}
                        placeholder="Max $"
                        type="number"
                        value={maxAmount}
                    />
                </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {filteredTransactions.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-10">
                        {transactions.length === 0 ? 'No recent activity' : 'No transactions match filters'}
                    </p>
                ) : (
                    filteredTransactions.map(t => (
                        <ActivityItem
                            key={t._id}
                            onCategoryChange={onCategoryChange}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            t={t}
                        />
                    ))
                )}
            </div>
        </div>
    );
});

ActivityFeed.displayName = 'ActivityFeed';

export default ActivityFeed;
