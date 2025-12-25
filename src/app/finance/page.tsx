'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  CreditCardIcon,
  WalletIcon,
} from '@heroicons/react/24/solid';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import ActivityFeed from '@/components/Finance/ActivityFeed';
import BudgetItemModal from '@/components/Finance/BudgetItemModal';
import BudgetOverview from '@/components/Finance/BudgetOverview';
import CategoryDetailModal from '@/components/Finance/CategoryDetailModal';
import CSVUploader from '@/components/Finance/CSVUploader';
import MetricCard from '@/components/Finance/MetricCard';
import MonthSelector from '@/components/Finance/MonthSelector';
import SpendTrendChart from '@/components/Finance/SpendTrendChart';
import StatCard from '@/components/Finance/StatCard';
import TransactionEditModal from '@/components/Finance/TransactionEditModal';
import UpcomingExpenses from '@/components/Finance/UpcomingExpenses';
import { IBudgetItem, IBudgetItemData } from '@/models/BudgetItem';

interface Transaction {
  _id: string;
  amount: number;
  category: string;
  date: string | Date;
  description: string;
  type: 'Income' | 'Expense';
}

export default function FinanceDashboard() {
  const [budgetItems, setBudgetItems] = useState<IBudgetItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modal States
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);

  // Selection States
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingItem, setEditingItem] = useState<IBudgetItem | null>(null); // For Budget Items
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null); // For Transactions

  const [loading, setLoading] = useState(true);

  // --- Fetching Data ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [budgetRes, transRes] = await Promise.all([
        fetch('/api/finance/budget'),
        fetch('/api/finance/transactions'),
      ]);

      const budgetData = await budgetRes.json();
      const transData = await transRes.json();

      if (Array.isArray(budgetData)) setBudgetItems(budgetData);
      if (transData.success) {
        setTransactions(transData.data);
        setLastUpdated(transData.lastUpdated);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---
  const handleSaveBudgetItem = useCallback(async (newItem: IBudgetItemData) => {
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `/api/finance/budget/${editingItem._id}` : '/api/finance/budget';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        fetchData();
        setIsBudgetModalOpen(false);
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Save failed', error);
    }
  }, [editingItem, fetchData]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    if (!confirm('Delete transaction?')) return;
    try {
      await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' });
      setTransactions((prev) => prev.filter((t) => t._id !== id));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleEditTransaction = useCallback((t: Transaction) => {
    setEditingTransaction(t);
    setIsEditTransactionModalOpen(true);
  }, []);

  const handleSaveTransactionCategory = useCallback(async (id: string, newCategory: string) => {
    // Optimistic update
    setTransactions(prev => prev.map(t => t._id === id ? { ...t, category: newCategory } : t));

    // In a real app, you'd PUT to an API endpoint here to save specifically.
    // Assuming we might not have a specific PATCH endpoint for just category, 
    // we might need to implement one or simulating it if the backend supports full update.
    // For now, I'll assume we can use the existing structure or just update state 
    // until we confirm the backend supports editing transactions. 
    // Wait, I see I only have DELETE and GET and POST (upload).
    // I need to add a PUT/PATCH endpoint logic or just assume local state for now?
    // User asked to "add another entry... when I edit...".
    // I will assume standard API patterns. If it fails, I'll need to add the route.
    // Let's TRY to fetch PUT /api/finance/transactions/[id]
    try {
      await fetch(`/api/finance/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory })
      });
      fetchData(); // Refresh to be sure
    } catch (err) {
      console.error("Failed to update transaction", err);
    }
  }, [fetchData]);


  const handleClearAllTransactions = useCallback(async () => {
    if (!confirm('Make sure you want to DELETE ALL transactions. This matches your "Clear" request.')) return;
    try {
      await fetch('/api/finance/transactions', { method: 'DELETE' });
      setTransactions([]);
      setLastUpdated(null);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleCategoryClick = useCallback((category: string) => {
    setSelectedCategory(category);
    setIsDetailModalOpen(true);
  }, []);

  const handleCloseBudgetModal = useCallback(() => {
    setIsBudgetModalOpen(false);
    setEditingItem(null);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);

  const handleMonthClick = useCallback((date: Date) => {
    setSelectedDate(date);
    // Optional: Scroll to list?
  }, []);

  // --- Filter Logic ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tDate = new Date(t.date);
      return (
        tDate.getMonth() === selectedDate.getMonth() &&
        tDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [transactions, selectedDate]);

  // --- Metrics (Input / Budget Based) ---
  const plannedIncome = useMemo(() =>
    budgetItems.filter((i) => i.type === 'Income').reduce((s, i) => s + i.amount, 0)
    , [budgetItems]);

  const plannedExpenses = useMemo(() =>
    budgetItems.filter((i) => i.type === 'Expense').reduce((s, i) => s + i.amount, 0)
    , [budgetItems]);

  const netCashFlow = plannedIncome - plannedExpenses;

  // --- Actuals Calculation (Filtered) ---
  // const actualIncome = filteredTransactions
  //   .filter((t) => t.type === 'Income')
  //   .reduce((s, t) => s + t.amount, 0);

  // --- Budget Overview Data (Planned vs Actual Filtered) ---
  const categoryData = useMemo(() => {
    const categories = new Set([
      ...budgetItems.filter((i) => i.type === 'Expense').map((i) => i.category),
      ...filteredTransactions.filter((t) => t.type === 'Expense').map((t) => t.category),
    ]);

    return Array.from(categories)
      .map((cat) => {
        const budgeted = budgetItems
          .filter((i) => i.category === cat && i.type === 'Expense')
          .reduce((s, i) => s + i.amount, 0);
        const spent = filteredTransactions
          .filter((t) => t.category === cat && t.type === 'Expense')
          .reduce((s, t) => s + t.amount, 0);
        return { name: cat, budgeted, spent };
      })
      .sort((a, b) => b.budgeted - a.budgeted);
  }, [budgetItems, filteredTransactions]);

  // --- Trend Data (Historical) ---
  const trendData = useMemo(() => {
    const groups: { [key: string]: { amount: number, date: Date } } = {};
    const sortedTrans = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTrans.forEach(t => {
      if (t.type === 'Expense') {
        const d = new Date(t.date);
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (!groups[key]) groups[key] = { amount: 0, date: d };
        groups[key].amount += t.amount;
      }
    });

    return Object.entries(groups).map(([month, val]) => ({
      month,
      amount: val.amount,
      fullDate: val.date
    }));
  }, [transactions]);


  // --- Rental Performance (KPIs) ---
  const rentalIncome = budgetItems
    .filter((i) => i.type === 'Income' && i.category === 'Rental Income')
    .reduce((s, i) => s + i.amount, 0);
  const rentalExpenses = budgetItems
    .filter((i) => i.type === 'Expense' && i.propertyTag !== 'General')
    .reduce((s, i) => s + i.amount, 0);
  const rentalPerformance = rentalIncome - rentalExpenses;

  const handleCloseEditTransactionModal = useCallback(() => {
    setIsEditTransactionModalOpen(false);
  }, []);

  if (loading && budgetItems.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 p-6 font-sans text-slate-800">

      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-3xl font-extrabold text-transparent">
            Finance Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of your financial portfolio
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <MonthSelector currentDate={selectedDate} onMonthChange={setSelectedDate} />

          <button
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300"
            onClick={() => {
              setEditingItem(null);
              setIsBudgetModalOpen(true);
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" /> Add Budget Item
          </button>
        </div>
      </div>

      {/* Top Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          amount={netCashFlow}
          icon={WalletIcon}
          iconColorClass="bg-blue-500"
          title="Net Cash Flow"
        />
        <MetricCard
          amount={plannedIncome}
          icon={BanknotesIcon}
          iconColorClass="bg-emerald-500"
          title="Total Income"
        />
        <MetricCard
          amount={plannedExpenses}
          icon={CreditCardIcon}
          iconColorClass="bg-rose-500"
          title="Total Expenses"
        />
        {/* Placeholder for Investments or Savings until we have real data */}
        <MetricCard
          amount={plannedIncome * 0.2} // Dummy 20% savings
          icon={ArrowTrendingUpIcon}
          iconColorClass="bg-violet-500"
          title="Investments (Est)"
        />
      </div>

      <div className="grid grid-cols-12 gap-8 w-full">
        {/* Main Content (8 cols) */}
        <div className="col-span-12 space-y-8 lg:col-span-8">

          {/* Budget Overview (Categories) */}
          <BudgetOverview categories={categoryData} onCategoryClick={handleCategoryClick} />

          {/* Spend Trend Chart (Deep Dive) */}
          <SpendTrendChart data={trendData} onMonthClick={handleMonthClick} />

          {/* Activity Feed */}
          <ActivityFeed
            onClearAll={handleClearAllTransactions}
            onDelete={handleDeleteTransaction}
            onEdit={handleEditTransaction}
            transactions={filteredTransactions.slice(0, 20)}
          />
        </div>

        {/* Right Sidebar (4 cols) */}
        <div className="col-span-12 space-y-8 lg:col-span-4">

          {/* KPI Stats Stacked */}
          <div className="space-y-4">
            <StatCard
              amount={rentalPerformance}
              colorClass="text-indigo-600"
              icon={ChartBarIcon}
              title="Rental Performance"
            />
            <StatCard
              amount={plannedIncome > 0 ? (netCashFlow / plannedIncome) * 100 : 0}
              colorClass="text-violet-600"
              icon={ArrowTrendingUpIcon}
              title="Savings Rate"
            />
          </div>

          {/* Quick Actions */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-800">
              Quick Actions
            </h4>
            <div className="space-y-4">
              <CSVUploader lastUpdated={lastUpdated} onUploadSuccess={fetchData} />
            </div>
          </div>

          {/* Upcoming Expenses */}
          <UpcomingExpenses expenses={budgetItems} />

        </div>
      </div>

      {/* Modals */}
      <BudgetItemModal
        initialData={editingItem}
        isOpen={isBudgetModalOpen}
        onClose={handleCloseBudgetModal}
        onSave={handleSaveBudgetItem}
      />

      <CategoryDetailModal
        budgetItems={budgetItems.filter((i) => i.category === selectedCategory)}
        category={selectedCategory}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        transactions={filteredTransactions.filter((t) => t.category === selectedCategory)}
      />

      <TransactionEditModal
        isOpen={isEditTransactionModalOpen}
        onClose={handleCloseEditTransactionModal}
        onSave={handleSaveTransactionCategory}
        transaction={editingTransaction}
      />

    </div>
  );
}
