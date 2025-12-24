'use client';

import { PlusIcon } from '@heroicons/react/24/solid';
import React, { useEffect, useState } from 'react';

import BudgetItemModal from '@/components/Finance/BudgetItemModal';
import BudgetTable from '@/components/Finance/BudgetTable';
import FinanceCharts from '@/components/Finance/FinanceCharts';
import SummaryCards from '@/components/Finance/SummaryCards';
import { IBudgetItem, IBudgetItemData } from '@/models/BudgetItem';

export default function FinanceDashboard() {
  const [items, setItems] = useState<IBudgetItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<IBudgetItem | null>(null);

  const fetchBudgetItems = React.useCallback(async () => {
    try {
      const res = await fetch('/api/finance/budget');
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        console.error('Invalid budget data received:', data);
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching budget items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetItems();
  }, [fetchBudgetItems]);

  const handleSaveItem = React.useCallback(
    async (newItem: IBudgetItemData) => {
      try {
        const method = editingItem ? 'PUT' : 'POST';
        const url = editingItem ? `/api/finance/budget/${editingItem._id}` : '/api/finance/budget';

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newItem),
        });

        if (res.ok) {
          fetchBudgetItems();
          setEditingItem(null);
        } else {
          console.error('Failed to save item');
        }
      } catch (error) {
        console.error('Error saving item:', error);
      }
    },
    [editingItem, fetchBudgetItems],
  );

  const handleDeleteItem = React.useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this item?')) return;

      try {
        const res = await fetch(`/api/finance/budget/${id}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          fetchBudgetItems();
        } else {
          console.error('Failed to delete item');
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    },
    [fetchBudgetItems],
  );

  const handleEditItem = React.useCallback((item: IBudgetItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = React.useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
  }, []);

  // Calculate KPIs
  const totalIncome = items.filter(i => i.type === 'Income').reduce((acc, i) => acc + i.amount, 0);
  const totalExpenses = items.filter(i => i.type === 'Expense').reduce((acc, i) => acc + i.amount, 0);
  const netCashFlow = totalIncome - totalExpenses;

  const rentalIncome = items
    .filter(i => i.type === 'Income' && i.category === 'Rental Income')
    .reduce((acc, i) => acc + i.amount, 0);
  const rentalExpenses = items
    .filter(i => i.type === 'Expense' && i.propertyTag !== 'General')
    .reduce((acc, i) => acc + i.amount, 0);
  const rentalPerformance = rentalIncome - rentalExpenses;

  // Prepare Chart Data (Stacked Bar: Income vs Expense)
  const chartData = React.useMemo(
    () => [
      {
        name: 'Income',
        ...items
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
        ...items
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
    [items],
  );

  const allCategories = React.useMemo(() => Array.from(new Set(items.map(i => i.category))), [items]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Monthly Budget Planner</h1>
        <button
          className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          onClick={() => setIsModalOpen(true)}>
          <PlusIcon aria-hidden="true" className="-ml-0.5 mr-1.5 h-5 w-5" />
          Add Budget Item
        </button>
      </div>

      <SummaryCards
        netCashFlow={netCashFlow}
        rentalPerformance={rentalPerformance}
        totalExpenses={totalExpenses}
        totalIncome={totalIncome}
      />

      <FinanceCharts categories={allCategories} data={chartData} />

      <BudgetTable items={items} onDelete={handleDeleteItem} onEdit={handleEditItem} />

      <BudgetItemModal
        initialData={editingItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveItem}
      />
    </div>
  );
}
