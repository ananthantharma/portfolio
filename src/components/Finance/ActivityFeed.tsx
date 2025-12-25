import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@heroicons/react/24/solid';
import React from 'react';

interface Transaction {
    _id: string;
    date: string | Date;
    description: string;
    amount: number;
    type: 'Income' | 'Expense';
    category: string;
}

interface ActivityFeedProps {
    onClearAll: () => void;
    onDelete: (id: string) => void;
    transactions: Transaction[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = React.memo(({ onClearAll, onDelete, transactions }) => {
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

            <div className="space-y-4">
                {transactions.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-4">No recent activity</p>
                ) : (
                    transactions.map(t => (
                        <div className="group flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50" key={t._id}>
                            <div className="flex items-center gap-4">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${t.type === 'Income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                    }`}>
                                    {t.type === 'Income' ? <ArrowUpIcon className="h-5 w-5" /> : <ArrowDownIcon className="h-5 w-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">{t.description}</p>
                                    <p className="text-xs text-slate-500">{t.category} • {formatDate(t.date)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-bold ${t.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                    {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                                </p>
                                <button
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500 mt-1"
                                    onClick={() => onDelete(t._id)}
                                    title="Delete"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
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
