import React from 'react';

import { getCategoryEmoji } from '@/lib/categories';

interface CategoryData {
    budgeted: number;
    name: string;
    spent: number;
}

interface BudgetOverviewProps {
    categories: CategoryData[];
    onCategoryClick: (category: string) => void;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = React.memo(({ categories, onCategoryClick }) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="mb-6 text-lg font-bold text-slate-800">Budget Breakdown</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {categories.map(cat => {
                    const percent = cat.budgeted > 0 ? (cat.spent / cat.budgeted) * 100 : 0;
                    const isOver = cat.spent > cat.budgeted;

                    let progressColor = 'bg-indigo-500';
                    if (percent > 90) progressColor = 'bg-amber-500';
                    if (isOver) progressColor = 'bg-rose-500';

                    return (
                        <div
                            className="group cursor-pointer rounded-xl border border-slate-100 bg-white p-3 transition-all hover:bg-slate-50 hover:border-slate-200 hover:shadow-sm flex items-center gap-4"
                            key={cat.name}
                            onClick={() => onCategoryClick(cat.name)}
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xl shadow-sm">
                                {getCategoryEmoji(cat.name)}
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="font-semibold text-sm text-slate-700">{cat.name}</span>
                                    <span className="text-xs font-bold text-slate-500">
                                        {Math.round(percent)}%
                                    </span>
                                </div>

                                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`absolute left-0 top-0 h-full rounded-full ${progressColor} transition-all duration-500`}
                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between mt-1">
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {formatCurrency(cat.spent)} spent
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-400">
                                        of {formatCurrency(cat.budgeted)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

BudgetOverview.displayName = 'BudgetOverview';

export default BudgetOverview;
