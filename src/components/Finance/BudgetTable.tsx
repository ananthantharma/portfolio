import {PencilSquareIcon, TrashIcon} from '@heroicons/react/24/outline';
import React from 'react';

import {IBudgetItem} from '@/models/BudgetItem';

interface BudgetTableProps {
    items: IBudgetItem[];
    onEdit: (item: IBudgetItem) => void;
    onDelete: (id: string) => void;
}

const BudgetTable: React.FC<BudgetTableProps> = React.memo(({items, onEdit, onDelete}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    // Group 1: Income
    const incomeItems = items.filter(item => item.type === 'Income');
    const totalIncome = incomeItems.reduce((acc, item) => acc + item.amount, 0);

    // Group 2: Fixed Property Expenses (Grouped by Property)
    const propertyExpenses = items.filter(
        item => item.type === 'Expense' && item.propertyTag !== 'General'
    );
    // Group by property tag
    const propertyGroups = propertyExpenses.reduce((acc, item) => {
        if (!acc[item.propertyTag]) {
            acc[item.propertyTag] = [];
        }
        acc[item.propertyTag].push(item);
        return acc;
    }, {} as Record<string, IBudgetItem[]>);

    // Group 3: Variable/Living Expenses (General Expenses)
    const livingExpenses = items.filter(
        item => item.type === 'Expense' && item.propertyTag === 'General'
    );
    const totalLivingExpenses = livingExpenses.reduce((acc, item) => acc + item.amount, 0);

    const renderTableSection = (title: string, data: IBudgetItem[], total?: number) => (
        <div className="mb-8 overflow-hidden rounded-xl bg-gray-800 shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-700 bg-gray-750 px-6 py-4">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {total !== undefined && (
                    <span className="text-lg font-bold text-emerald-400">{formatCurrency(total)}</span>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                Type
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                                Monthly Amount
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800">
                        {data.map(item => (
                            <tr className="hover:bg-gray-700/50" key={item._id as string}>
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                                    {item.name}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                                    {item.category}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                                    {item.isVariable ? (
                                        <span className="inline-flex items-center rounded-full bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-400">
                                            Variable
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400">
                                            Fixed
                                        </span>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-white">
                                    {formatCurrency(item.amount)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            className="text-indigo-400 hover:text-indigo-300"
                                            onClick={() => onEdit(item)}>
                                            <PencilSquareIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            className="text-red-400 hover:text-red-300"
                                            onClick={() => onDelete(item._id as string)}>
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td className="px-6 py-4 text-center text-sm text-gray-500" colSpan={5}>
                                    No items in this section.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Group 1: Income */}
            {renderTableSection('Income Sources', incomeItems, totalIncome)}

            {/* Group 2: Property Expenses */}
            {Object.entries(propertyGroups).map(([property, items]) => {
                const total = items.reduce((acc, i) => acc + i.amount, 0);
                return (
                    <div key={property}>
                        {renderTableSection(`Property Expenses: ${property}`, items, total)}
                    </div>
                );
            })}

            {/* Group 3: Living Expenses */}
            {renderTableSection('Variable & Living Expenses', livingExpenses, totalLivingExpenses)}
        </div>
    );
});

export default BudgetTable;
