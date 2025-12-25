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
import StatCard from '@/components/Finance/StatCard';
import { IBudgetItem, IBudgetItemData } from '@/models/BudgetItem';

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

export default function FinanceDashboard() {
  const [budgetItems, setBudgetItems] = useState<IBudgetItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingItem, setEditingItem] = useState<IBudgetItem | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Fetching Data ---
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [budgetRes, transRes] = await Promise.all([
        fetch('/api/finance/budget'),
        fetch('/api/finance/transactions')
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
      setTransactions(prev => prev.filter(t => t._id !== id));
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

  // --- Calculations ---
  // 1. Budget Summary (Planned vs Actual per Category)
  const categoryData = useMemo(() => {
    const categories = new Set([
      ...budgetItems.filter(i => i.type === 'Expense').map(i => i.category),
      ...transactions.filter(t => t.type === 'Expense').map(t => t.category)
    ]);

    return Array.from(categories).map(cat => {
      const budgeted = budgetItems.filter(i => i.category === cat && i.type === 'Expense').reduce((s, i) => s + i.amount, 0);
      const spent = transactions.filter(t => t.category === cat && t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
      return { name: cat, budgeted, spent };
    }).sort((a, b) => b.budgeted - a.budgeted); // Sort by highest budget
  }, [budgetItems, transactions]);

  // 2. Top Metrics (Actuals from Transactions default, fallback to Budget if 0?)
  // User wants "Finance Portfolio". Usually means "Real Money". Let's use Transactions for Income/Exp.
  const actualIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
  const actualExpenses = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
  // If no transactions, show Budget stats?
  const useBudgetStats = transactions.length === 0;

  const displayIncome = useBudgetStats
    ? budgetItems.filter(i => i.type === 'Income').reduce((s, i) => s + i.amount, 0)
    : actualIncome;

  const displayExpenses = useBudgetStats
    ? budgetItems.filter(i => i.type === 'Expense').reduce((s, i) => s + i.amount, 0)
    : actualExpenses;

  const netCashFlow = displayIncome - displayExpenses;

  // Rental (Specific Logic)
  const rentalIncome = budgetItems.filter(i => i.type === 'Income' && i.category === 'Rental Income').reduce((s, i) => s + i.amount, 0);
  const rentalExpenses = budgetItems.filter(i => i.type === 'Expense' && i.propertyTag !== 'General').reduce((s, i) => s + i.amount, 0);
  const rentalPerformance = rentalIncome - rentalExpenses;

  if (loading && budgetItems.length === 0) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-3xl font-extrabold text-transparent">
            Financial Portfolio
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hi Ananthan, here's your financial health overview.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <button
            className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-emerald-300"
            onClick={() => { setEditingItem(null); setIsBudgetModalOpen(true); }}
          >
            <PlusIcon className="mr-2 h-4 w-4" /> Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* Left Column: Dynamic Data (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Metric Cards Row */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <MetricCard
              amount={netCashFlow}
              gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
              icon={WalletIcon}
              title="Net Cash Flow"
              trend={netCashFlow >= 0 ? 'up' : 'down'}
              trendValue="vs prev"
            />
            <MetricCard
              amount={displayIncome}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
              icon={BanknotesIcon}
              title="Total Income"
              trend="up"
              trendValue="+12%"
            />
            <MetricCard
              amount={displayExpenses}
              gradient="bg-gradient-to-br from-rose-500 to-pink-500"
              icon={CreditCardIcon}
              title="Total Expenses"
              trend="down"
              trendValue="--%"
            />
          </div>

          {/* Budget Overview (Progress) */}
          <BudgetOverview
            categories={categoryData}
            onCategoryClick={handleCategoryClick}
          />

          {/* Activity Feed */}
          <ActivityFeed
            onClearAll={handleClearAllTransactions}
            onDelete={handleDeleteTransaction}
            transactions={transactions.slice(0, 10)} // Show recently 10
          />

        </div>

        {/* Right Sidebar: KPIs & Actions (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* Stat Cards */}
          <StatCard
            amount={rentalPerformance}
            colorClass="text-indigo-600"
            icon={ChartBarIcon}
            title="Rental Performance"
          />
          <StatCard
            amount={displayIncome > 0 ? (netCashFlow / displayIncome) * 100 : 0}
            colorClass="text-violet-600"
            icon={ArrowTrendingUpIcon}
            title="Savings Rate"
          />

          {/* Quick Actions / Upload */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <h4 className="mb-4 text-sm font-bold text-slate-800 uppercase tracking-wide">Quick Actions</h4>

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
        budgetItems={budgetItems.filter(i => i.category === selectedCategory)}
        category={selectedCategory}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        transactions={transactions.filter(t => t.category === selectedCategory)}
      />

    </div>
  );
}
