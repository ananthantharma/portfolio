import React, { useMemo } from 'react';

import { getCategoryEmoji } from '@/lib/categories';

interface Transaction {
    amount: number;
    category: string;
    type: 'Income' | 'Expense';
}

interface TopCategorySpendProps {
    transactions: Transaction[];
}

const TopCategorySpend: React.FC<TopCategorySpendProps> = React.memo(({ transactions }) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(val);

    const topCategories = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'Expense');
        const map: { [key: string]: number } = {};

        expenses.forEach(t => {
            map[t.category] = (map[t.category] || 0) + t.amount;
        });

        const sorted = Object.entries(map)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount]) => ({ category, amount }));

        return sorted;
    }, [transactions]);

    if (topCategories.length === 0) return null;

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 mb-6">
            <h3 className="mb-4 text-lg font-bold text-slate-800">Category Spending</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {topCategories.map((item, index) => (
                    <div className="flex items-center justify-between" key={item.category}>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-xl">
                                {getCategoryEmoji(item.category)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">{item.category}</p>
                                <p className="text-xs font-medium text-slate-400">
                                    {(index + 1) === 1 ? '🥇 Highest' : `#${index + 1} Spender`}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm font-bold text-slate-800">
                            {formatCurrency(item.amount)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
});

TopCategorySpend.displayName = 'TopCategorySpend';

export default TopCategorySpend;
