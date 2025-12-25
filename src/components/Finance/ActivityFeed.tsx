import { ArrowDownIcon, ArrowUpIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/solid';
import React from 'react';

import { getCategoryEmoji } from '@/lib/categories';

interface Transaction {
    _id: string;
    amount: number;
    category: string;
    date: string | Date;
    description: string;
    type: 'Income' | 'Expense';
}

interface ActivityFeedProps {
    onClearAll: () => void;
    onDelete: (id: string) => void;
    onEdit: (t: Transaction) => void;
    transactions: Transaction[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = React.memo(({ onClearAll, onDelete, onEdit, transactions }) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    const formatDate = (dateStr: string | Date) => {
        return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                {transactions.length > 0 && (
                    <button
                        className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                        onClick={onClearAll}
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {transactions.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-4">No recent activity</p>
                ) : (
                    transactions.map(t => (
                        <div className="group flex items-center justify-between rounded-xl bg-slate-50/50 p-3 transition-colors hover:bg-slate-100 border border-transparent hover:border-slate-200" key={t._id}>
                            <div className="flex items-center gap-4">
                                <div
                                    className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 ${t.type === 'Income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
                                    onClick={() => onEdit(t)}
                                    title="Edit Category"
                                >
                                    {t.type === 'Income' ? <ArrowUpIcon className="h-5 w-5" /> : <ArrowDownIcon className="h-5 w-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700 truncate max-w-[150px] sm:max-w-[200px]">{t.description}</p>
                                    <p className="text-xs text-slate-500 font-medium">{t.category} • {formatDate(t.date)}</p>
                                </div>
                            </div>

                            {/* Center Category Icon */}
                            <div
                                className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-slate-100 text-2xl transition-all hover:scale-110 hover:bg-indigo-100 hover:shadow-md"
                                onClick={() => onEdit(t)}
                                title={`Edit Category: ${t.category}`}
                            >
                                {getCategoryEmoji(t.category)}
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
                                        title="Edit Category"
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
                    ))
                )}
            </div>
        </div>
    );
});

ActivityFeed.displayName = 'ActivityFeed';

export default ActivityFeed;
