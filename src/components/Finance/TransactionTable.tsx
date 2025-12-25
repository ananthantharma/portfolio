import { TrashIcon } from '@heroicons/react/24/outline';
import React from 'react';

interface Transaction {
  _id: string;
  date: string | Date;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  property?:
  | {
    name: string;
  }
  | string
  | null;
  cardLast4?: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = React.memo(({ transactions, onDelete }) => {
  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  return (
    <div className="overflow-hidden rounded-xl bg-gray-800 shadow-lg">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700/50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                scope="col">
                Date
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                scope="col">
                Description
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                scope="col">
                Card
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                scope="col">
                Property
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                scope="col">
                Category
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                scope="col">
                Amount
              </th>
              <th className="relative px-6 py-3" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700 bg-gray-800">
            {transactions.map(transaction => (
              <tr className="hover:bg-gray-700/50 transition-colors" key={transaction._id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{formatDate(transaction.date)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                  {transaction.description}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                  {transaction.cardLast4 ? `**** ${transaction.cardLast4}` : '-'}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                  <span className="inline-flex items-center rounded-md bg-gray-700 px-2 py-1 text-xs font-medium text-gray-300 ring-1 ring-inset ring-gray-600">
                    {typeof transaction.property === 'object' && transaction.property && 'name' in transaction.property
                      ? transaction.property.name
                      : 'General'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{transaction.category}</td>
                <td
                  className={`whitespace-nowrap px-6 py-4 text-sm font-bold ${transaction.type === 'Income' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                  {transaction.type === 'Income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      className="text-gray-400 hover:text-red-400 transition-colors"
                      onClick={() => onDelete(transaction._id)}
                      title="Delete">
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
});

export default TransactionTable;
