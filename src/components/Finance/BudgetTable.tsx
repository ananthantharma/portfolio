import {PencilSquareIcon, TrashIcon} from '@heroicons/react/24/outline';
import React from 'react';

import {BUDGET_CATEGORIES} from '@/lib/categories';
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

  // Group 2: Expenses by Category
  const expenseItems = items.filter(item => item.type === 'Expense');
  const expenseGroups: Record<string, IBudgetItem[]> = {};

  // Initialize groups based on defined categories to maintain order, but only if they have items
  Object.keys(BUDGET_CATEGORIES).forEach(category => {
    const categoryItems = expenseItems.filter(item => item.category === category);
    if (categoryItems.length > 0) {
      expenseGroups[category] = categoryItems;
    }
  });

  // Catch any expenses with categories not in the list (legacy data or "Other")
  const otherExpenses = expenseItems.filter(item => !Object.keys(BUDGET_CATEGORIES).includes(item.category));
  if (otherExpenses.length > 0) {
    expenseGroups['Other / Uncategorized'] = otherExpenses;
  }

  const renderTableSection = (title: string, data: IBudgetItem[], total: number) => (
    <div className="mb-8 overflow-hidden rounded-xl bg-gray-800 shadow-lg">
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-750 px-6 py-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-lg font-bold text-emerald-400">{formatCurrency(total)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Subcategory
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Property Tag
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
                  {item.subcategory || item.name}
                  {/* Fallback to name if subcategory missing (legacy data) */}
                  <span className="ml-2 text-xs text-gray-500">({item.name})</span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{item.propertyTag}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-white">
                  {formatCurrency(item.amount)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-3">
                    <button className="text-indigo-400 hover:text-indigo-300" onClick={() => onEdit(item)}>
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button className="text-red-400 hover:text-red-300" onClick={() => onDelete(item._id as string)}>
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Group 1: Income */}
      {renderTableSection('Income Sources', incomeItems, totalIncome)}

      {/* Group 2: Expenses by Category */}
      {Object.entries(expenseGroups).map(([category, items]) => {
        const total = items.reduce((acc, i) => acc + i.amount, 0);
        return <div key={category}>{renderTableSection(category, items, total)}</div>;
      })}
    </div>
  );
});

export default BudgetTable;
