import { CalendarDaysIcon } from '@heroicons/react/24/solid';
import React from 'react';

import { IBudgetItem } from '@/models/BudgetItem';

interface UpcomingExpensesProps {
    expenses: IBudgetItem[];
}

const UpcomingExpenses: React.FC<UpcomingExpensesProps> = React.memo(({ expenses }) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(val);

    // Simple logic: Display top 5 largest planned expenses as "Upcoming"
    // In a real app, this would use 'dueDate'.
    const sortedExpenses = [...expenses]
        .filter(e => e.type === 'Expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
                <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                Upcoming / Recurring
            </h4>

            <div className="space-y-4">
                {sortedExpenses.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No recurring expenses set.</p>
                ) : (
                    sortedExpenses.map((ex) => (
                        <div className="flex items-center justify-between" key={ex._id}>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-lg">
                                    {ex.category.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">{ex.name || ex.subcategory || ex.category}</p>
                                    <p className="text-xs text-slate-400">Monthly</p>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-slate-700">{formatCurrency(ex.amount)}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

UpcomingExpenses.displayName = 'UpcomingExpenses';

export default UpcomingExpenses;
