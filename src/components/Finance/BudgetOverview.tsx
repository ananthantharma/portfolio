import React from 'react';

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
            <h3 className="mb-6 text-lg font-bold text-slate-800">Budget Progress</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {categories.map(cat => {
                    const percent = cat.budgeted > 0 ? (cat.spent / cat.budgeted) * 100 : 0;
                    const isOver = cat.spent > cat.budgeted;

                    let barColor = 'bg-emerald-500';
                    if (percent > 85) barColor = 'bg-amber-500';
                    if (isOver) barColor = 'bg-rose-500';

                    return (
                        <div
                            className="group cursor-pointer rounded-xl bg-slate-50 p-4 transition-all hover:bg-slate-100 hover:shadow-sm"
                            key={cat.name}
                            onClick={() => onCategoryClick(cat.name)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">
                                        {cat.name.charAt(0)}
                                    </div>
                                    <span className="font-semibold text-slate-700">{cat.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-slate-800">{formatCurrency(cat.spent)}</span>
                                    <span className="text-xs text-slate-500">of {formatCurrency(cat.budgeted)}</span>
                                </div>
                            </div>

                            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                    className={`absolute left-0 top-0 h-full rounded-full ${barColor} transition-all duration-500`}
                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                ></div>
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
