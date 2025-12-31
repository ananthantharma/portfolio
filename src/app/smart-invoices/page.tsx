/* eslint-disable simple-import-sort/imports */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import InvoiceScanner from '@/components/Invoices/InvoiceScanner';
import InvoiceList from '@/components/Invoices/InvoiceList';
import AccessDenied from '@/components/AccessDenied';

import Header from '@/components/Sections/Header';

export default function SmartInvoicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Dashboard State
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [stats, setStats] = useState({ amount: 0, tax: 0 });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  /* eslint-disable react-memo/require-usememo */
  const handleInvoiceSaved = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleStatsUpdate = useCallback((newStats: { amount: number; tax: number }) => {
    setStats(newStats);
  }, []);

  const handleYearsLoaded = useCallback((years: string[]) => {
    setAvailableYears(prev => {
      // Only update if different to avoid infinite loops
      if (JSON.stringify(prev) !== JSON.stringify(years)) {
        return years;
      }
      return prev;
    });
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full bg-neutral-900 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (status === 'authenticated' && !(session?.user as any).invoiceEnabled) {
    return <AccessDenied message="Access Denied. You do not have permission to access Invoices. Please contact Ananthan." />;
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 p-6 font-sans text-slate-200">
      <Header />
      <div className="max-w-7xl mx-auto space-y-8 pt-20">
        <header>
          <h1 className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-3xl font-extrabold text-transparent">
            Smart Invoice Tracker
          </h1>
          <p className="mt-2 text-slate-400">
            AI-powered expense tracking. Scan your bills and let Gemini do the rest.
          </p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl">💰</span>
            </div>
            <h3 className="text-slate-400 font-medium mb-1">Total Amount ({selectedYear})</h3>
            <div className="text-3xl font-bold text-white">${stats.amount.toFixed(2)}</div>
          </div>

          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl">🧾</span>
            </div>
            <h3 className="text-slate-400 font-medium mb-1">Total Tax ({selectedYear})</h3>
            <div className="text-3xl font-bold text-emerald-400">${stats.tax.toFixed(2)}</div>
          </div>
        </div>

        {/* Year Selector */}
        {availableYears.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedYear === 'All'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-neutral-800 text-slate-400 hover:bg-neutral-700'
                }`}
              onClick={() => setSelectedYear('All')}>
              All Time
            </button>
            {availableYears.map(year => (
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedYear === year
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-neutral-800 text-slate-400 hover:bg-neutral-700'
                  }`}
                key={year}
                onClick={() => setSelectedYear(year)}>
                {year}
              </button>
            ))}
          </div>
        )}

        <section className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 p-6">
          <h2 className="text-xl font-bold mb-6 text-white">Add New Invoice</h2>
          <InvoiceScanner onSaved={handleInvoiceSaved} />
        </section>

        <section className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 p-6">
          <h2 className="text-xl font-bold mb-6 text-white">Invoice History</h2>
          <InvoiceList
            key={refreshTrigger}
            onStatsUpdate={handleStatsUpdate}
            onYearsLoaded={handleYearsLoaded}
            selectedYear={selectedYear}
          />
        </section>
      </div>
    </div>
  );
}
