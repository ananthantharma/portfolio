'use client';

import {PlusIcon} from '@heroicons/react/24/solid';
import React, {useEffect, useState} from 'react';

import FinanceCharts from '@/components/Finance/FinanceCharts';
import SummaryCards from '@/components/Finance/SummaryCards';
import TransactionModal from '@/components/Finance/TransactionModal';
import TransactionTable from '@/components/Finance/TransactionTable';
import {ITransaction} from '@/models/Transaction';

// ...

export default function FinanceDashboard() {
    console.log('Rendering FinanceDashboard');
    const [transactions, setTransactions] = useState<ITransaction[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = React.useCallback(async () => {
        console.log('Fetching transactions...');
        try {
            const res = await fetch('/api/finance/transactions');
            console.log('Fetch response status:', res.status);
            const data = await res.json();
            console.log('Fetched data:', data);
            setTransactions(data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
            console.log('Loading set to false');
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleAddTransaction = React.useCallback(async (newTransaction: Omit<ITransaction, '_id'>) => {
        try {
            const res = await fetch('/api/finance/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newTransaction),
            });

            if (res.ok) {
                fetchTransactions(); // Refresh data
            } else {
                console.error('Failed to add transaction');
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
        }
    }, [fetchTransactions]);

    // ...

    const handleCloseModal = React.useCallback(() => {
        setIsModalOpen(false);
    }, []);

    return (
        // ...
        <TransactionModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleAddTransaction} />
        // ...
    );

    const handleDeleteTransaction = React.useCallback(async (id: string) => {
        // TODO: Implement delete API
        console.log('Delete transaction', id);
        alert('Delete functionality not yet implemented in API');
    }, []);

    // Calculate Summary Statistics
    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);

    const totalExpenses = transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);

    const netCashFlow = totalIncome - totalExpenses;

    const rentalIncome = transactions
        .filter(t => t.type === 'Income' && t.category === 'Rental Income')
        .reduce((acc, t) => acc + t.amount, 0);

    const rentalExpenses = transactions
        .filter((t) => {
            if (t.type !== 'Expense') return false;
            const prop = t.property as { type: string } | undefined;
            return prop?.type === 'Rental';
        })
        .reduce((acc, t) => acc + t.amount, 0);

    const rentalProfitability = rentalIncome - rentalExpenses;

    // Prepare Chart Data
    const expensesByCategory = transactions
        .filter(t => t.type === 'Expense')
        .reduce((acc: { name: string; value: number }[], t) => {
            const existing = acc.find(item => item.name === t.category);
            if (existing) {
                existing.value += t.amount;
            } else {
                acc.push({name: t.category, value: t.amount});
            }
            return acc;
        }, []);

    // Monthly Trend Data (Simplified for now - grouping by Month/Year)
    const monthlyTrend = transactions
        .reduce((acc: { name: string; Income: number; Expense: number }[], t) => {
            const date = new Date(t.date);
            const monthYear = date.toLocaleDateString('en-CA', {month: 'short', year: 'numeric'});

            let existing = acc.find(item => item.name === monthYear);
            if (!existing) {
                existing = {name: monthYear, Income: 0, Expense: 0};
                acc.push(existing);
            }

            if (t.type === 'Income') {
                existing.Income += t.amount;
            } else {
                existing.Expense += t.amount;
            }
            return acc;
        }, [])
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime()); // Sort by date

    if (loading) {
        return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <button
                    className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    onClick={() => setIsModalOpen(true)}>
                    <PlusIcon aria-hidden="true" className="-ml-0.5 mr-1.5 h-5 w-5" />
                    Add Transaction
                </button>
            </div>

            <SummaryCards
                netCashFlow={netCashFlow}
                rentalProfitability={rentalProfitability}
                totalExpenses={totalExpenses}
                totalIncome={totalIncome}
            />

            <FinanceCharts expensesByCategory={expensesByCategory} monthlyTrend={monthlyTrend} />

            <TransactionTable onDelete={handleDeleteTransaction} transactions={transactions} />

            <TransactionModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleAddTransaction} />
        </div>
    );
}
