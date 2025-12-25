import React, { useCallback, useEffect, useState } from 'react';

import CSVUploader from './CSVUploader';
import FinanceCharts from './FinanceCharts';
import TransactionTable from './TransactionTable';

interface Transaction {
  _id: string;
  date: string | Date;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  property?: { name: string } | string | null;
  cardLast4?: string;
}

const TransactionList: React.FC = React.memo(() => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/transactions');
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
        setLastUpdated(data.lastUpdated);
      }
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      // setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      const res = await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTransactions(prev => prev.filter(t => t._id !== id));
      } else {
        alert('Failed to delete');
      }
    } catch (error) {
      console.error('Delete failed', error);
    }
  }, []);

  // Prepare chart data for transactions
  // Reusing the same structure as Budget: Stacked bar by Category
  const chartData = React.useMemo(
    () => [
      {
        name: 'Income',
        ...transactions
          .filter(i => i.type === 'Income')
          .reduce(
            (acc, i) => {
              acc[i.category] = (acc[i.category] || 0) + i.amount;
              return acc;
            },
            {} as Record<string, number>,
          ),
      },
      {
        name: 'Expenses',
        ...transactions
          .filter(i => i.type === 'Expense')
          .reduce(
            (acc, i) => {
              acc[i.category] = (acc[i.category] || 0) + i.amount;
              return acc;
            },
            {} as Record<string, number>,
          ),
      },
    ],
    [transactions],
  );

  const allCategories = React.useMemo(() => Array.from(new Set(transactions.map(t => t.category))), [transactions]);

  return (
    <div className="space-y-6 mt-12 border-t border-gray-700 pt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>
        {transactions.length > 0 && (
          <button
            className="text-sm text-red-400 hover:text-red-300 underline"
            onClick={async () => {
              if (confirm('Are you sure you want to DELETE ALL transactions? This cannot be undone.')) {
                try {
                  const res = await fetch('/api/finance/transactions', { method: 'DELETE' });
                  if (res.ok) {
                    setTransactions([]);
                    setLastUpdated(null);
                  } else {
                    alert('Failed to clear transactions');
                  }
                } catch (error) {
                  console.error('Clear failed', error);
                }
              }
            }}>
            Clear All
          </button>
        )}
      </div>

      <CSVUploader lastUpdated={lastUpdated} onUploadSuccess={fetchTransactions} />

      {transactions.length > 0 && <FinanceCharts categories={allCategories} data={chartData} />}

      <TransactionTable onDelete={handleDelete} transactions={transactions} />
    </div>
  );
});

export default TransactionList;
