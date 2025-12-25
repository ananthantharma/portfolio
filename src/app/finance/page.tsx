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

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingItem, setEditingItem] = useState<IBudgetItem | null>(null);
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
    // Group transactions by "MMM YYYY"
    const groups: { [key: string]: number } = {};
    const sortedTrans = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTrans.forEach(t => {
      // Only track expenses for trend? Or Net? User said "spend month over month".
      if (t.type === 'Expense') {
        const d = new Date(t.date);
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); // e.g., "Dec 24"
        groups[key] = (groups[key] || 0) + t.amount;
      }
    });

    // Take last 6 months or all? Let's show all available but maybe limit visual if too many.
    // Recharts handles scroll/fit reasonably well, or we slice.
    return Object.entries(groups).map(([month, amount]) => ({ month, amount }));
  }, [transactions]);


  // --- Rental Performance (Using Budget or Actuals? Usually KPIs differ) ---
  // User asked for "Finance Portfolio". If we strictly use Budget for Top Cards, 
  // let's stick to Budget for sidebar Stats unless requested otherwise or if it makes no sense.
  // "Rental Performance" implies Profit. Let's use Budgeted Rental Profit for consistency with Top Cards.
  const rentalIncome = budgetItems
    .filter((i) => i.type === 'Income' && i.category === 'Rental Income')
    .reduce((s, i) => s + i.amount, 0);
  const rentalExpenses = budgetItems
    .filter((i) => i.type === 'Expense' && i.propertyTag !== 'General')
    .reduce((s, i) => s + i.amount, 0);
  const rentalPerformance = rentalIncome - rentalExpenses;

  if (loading && budgetItems.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 font-sans text-slate-800">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-3xl font-extrabold text-transparent">
            Financial Portfolio
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hi Ananthan, here's your financial health overview.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <MonthSelector currentDate={selectedDate} onMonthChange={setSelectedDate} />

          <button
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-emerald-300"
            onClick={() => {
              setEditingItem(null);
              setIsBudgetModalOpen(true);
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" /> Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 w-full">
        {/* Left Column: Dynamic Data (8 cols) */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {/* Metric Cards Row (Budgeted Numbers) */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <MetricCard
              amount={netCashFlow}
              gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
              icon={WalletIcon}
              title="Net Cash Flow (Est)"
              trend={netCashFlow >= 0 ? 'up' : 'down'}
              trendValue="Plan"
            />
            <MetricCard
              amount={plannedIncome}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
              icon={BanknotesIcon}
              title="Total Income (Est)"
              trend="up"
              trendValue="Budget"
            />
            <MetricCard
              amount={plannedExpenses}
              gradient="bg-gradient-to-br from-rose-500 to-pink-500"
              icon={CreditCardIcon}
              title="Total Expenses (Est)"
              trend="down"
              trendValue="Budget"
            />
          </div>

          {/* Spend Trend Chart */}
          <SpendTrendChart data={trendData} />

          {/* Budget Overview (Progress - Actual vs Budget for selected month) */}
          <BudgetOverview categories={categoryData} onCategoryClick={handleCategoryClick} />

          {/* Activity Feed (Filtered) */}
          <ActivityFeed
            onClearAll={handleClearAllTransactions}
            onDelete={handleDeleteTransaction}
            transactions={filteredTransactions.slice(0, 10)}
          />
        </div>

        {/* Right Sidebar: KPIs & Actions (4 cols) */}
        <div className="col-span-12 space-y-6 lg:col-span-4">
          {/* Stat Cards */}
          <StatCard
            amount={rentalPerformance}
            colorClass="text-indigo-600"
            icon={ChartBarIcon}
            title="Rental Performance (Est)"
          />
          <StatCard
            amount={plannedIncome > 0 ? (netCashFlow / plannedIncome) * 100 : 0}
            colorClass="text-violet-600"
            icon={ArrowTrendingUpIcon}
            title="Savings Rate (Est)"
          />

          {/* Quick Actions / Upload */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-800">
              Quick Actions
            </h4>

            <div className="space-y-4">
              <CSVUploader lastUpdated={lastUpdated} onUploadSuccess={fetchData} />
            </div>
          </div>
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
    </div>
  );
}
