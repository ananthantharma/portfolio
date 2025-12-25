import { ArrowPathIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import InvestmentModal from './InvestmentModal';

interface Investment {
    _id: string;
    ticker: string;
    quantity: number;
    purchaseDate: string;
    bookPrice: number;
    category: 'RRSP' | 'TFSA' | 'RESP' | 'CASH';
}



export default function InvestmentManager() {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [prices, setPrices] = useState<{ [ticker: string]: number }>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInv, setEditingInv] = useState<Investment | null>(null);

    const fetchInvestments = useCallback(async () => {
        try {
            const res = await fetch('/api/finance/investments');
            const data = await res.json();
            if (Array.isArray(data)) {
                setInvestments(data);
                return data;
            }
            return [];
        } catch (error) {
            console.error('Failed to fetch investments', error);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPrices = useCallback(async (invs: Investment[]) => {
        setRefreshing(true);
        const uniqueTickers = Array.from(new Set(invs.map(i => i.ticker)));
        const newPrices: { [ticker: string]: number } = {};

        await Promise.all(uniqueTickers.map(async (ticker) => {
            try {
                const res = await fetch(`/api/finance/stock-price?ticker=${ticker}`);
                const data = await res.json();
                if (data.price) {
                    newPrices[ticker] = data.price;
                }
            } catch (err) {
                console.error(`Failed to fetch price for ${ticker}`, err);
            }
        }));

        setPrices(prev => ({ ...prev, ...newPrices }));
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchInvestments().then((data) => {
            if (data.length > 0) {
                fetchPrices(data);
            }
        });
    }, [fetchInvestments, fetchPrices]);

    const handleSave = useCallback(async (inv: Partial<Investment>) => { // inv type is partial Investment
        const method = inv._id ? 'PUT' : 'POST';
        const url = inv._id ? `/api/finance/investments/${inv._id}` : '/api/finance/investments';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inv)
        });

        if (res.ok) {
            const updatedList = await fetchInvestments();
            // Refresh prices if it's a new ticker or updated
            if (updatedList.length > 0) fetchPrices(updatedList);
        }
    }, [fetchInvestments, fetchPrices]);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete investment?')) return;
        await fetch(`/api/finance/investments/${id}`, { method: 'DELETE' });
        fetchInvestments();
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    const formatPercent = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'percent', minimumFractionDigits: 2 }).format(val);

    // Grouping Logic
    const groupedInvestments = useMemo(() => {
        const groups: { [key: string]: Investment[] } = { RRSP: [], TFSA: [], RESP: [], CASH: [] };
        investments.forEach(inv => {
            if (groups[inv.category]) groups[inv.category].push(inv);
        });
        return groups;
    }, [investments]);

    // Totals
    const calculateTotals = (items: Investment[]) => {
        let totalBook = 0;
        let totalMarket = 0;
        items.forEach(i => {
            const currentPrice = prices[i.ticker] || i.bookPrice; // Fallback to book
            totalBook += i.quantity * i.bookPrice;
            totalMarket += i.quantity * currentPrice;
        });
        return { totalBook, totalMarket, diff: totalMarket - totalBook };
    };

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Portfolio</h3>
                <div className="flex gap-2">
                    <button
                        className={`p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-all ${refreshing ? 'animate-spin' : ''}`}
                        disabled={refreshing}
                        onClick={() => fetchPrices(investments)}
                        title="Refresh Prices"
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                    </button>
                    <button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-md transition-colors"
                        onClick={() => { setEditingInv(null); setIsModalOpen(true); }}
                        title="Add Investment"
                    >
                        <PlusIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8 text-slate-400">Loading Investments...</div>
            ) : (
                <div className="space-y-6">
                    {/* Render Each Category Group */}
                    {Object.entries(groupedInvestments).map(([category, items]) => {
                        if (items.length === 0) return null;
                        const { totalMarket, diff } = calculateTotals(items);

                        return (
                            <div className="border-b last:border-0 border-slate-100 pb-4 last:pb-0" key={category}>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{category}</h4>
                                    <span className={`text-xs font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {formatCurrency(totalMarket)} ({diff >= 0 ? '+' : ''}{formatCurrency(diff)})
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="text-slate-400 border-b border-slate-50">
                                                <th className="pb-2 font-medium">Ticker</th>
                                                <th className="pb-2 font-medium text-right">Qty</th>
                                                <th className="pb-2 font-medium text-right">Avg Price</th>
                                                <th className="pb-2 font-medium text-right">Current</th>
                                                <th className="pb-2 font-medium text-right">Mkt Value</th>
                                                <th className="pb-2 font-medium text-right">G/L</th>
                                                <th className="pb-2 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {items.map(inv => {
                                                const currentPrice = prices[inv.ticker];
                                                const marketValue = inv.quantity * (currentPrice || inv.bookPrice); // Prevents showing 0 if loading
                                                const gainLoss = marketValue - (inv.quantity * inv.bookPrice);
                                                const gainLossPercent = (gainLoss / (inv.quantity * inv.bookPrice));

                                                return (
                                                    <tr className="group hover:bg-slate-50/50" key={inv._id}>
                                                        <td className="py-2 font-bold text-slate-700">{inv.ticker}</td>
                                                        <td className="py-2 text-right text-slate-600">{inv.quantity}</td>
                                                        <td className="py-2 text-right text-slate-500">{formatCurrency(inv.bookPrice)}</td>
                                                        <td className="py-2 text-right font-medium text-slate-700">
                                                            {currentPrice ? formatCurrency(currentPrice) : <span className="animate-pulse bg-slate-200 h-3 w-10 inline-block rounded" />}
                                                        </td>
                                                        <td className="py-2 text-right font-bold text-slate-800">{formatCurrency(marketValue)}</td>
                                                        <td className={`py-2 text-right font-bold ${gainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {gainLossPercent ? formatPercent(gainLossPercent) : '-'}
                                                        </td>
                                                        <td className="py-2 text-right opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                                                            <button className="text-slate-400 hover:text-indigo-600" onClick={() => { setEditingInv(inv); setIsModalOpen(true); }}>
                                                                <PencilSquareIcon className="h-3 w-3" />
                                                            </button>
                                                            <button className="text-slate-400 hover:text-rose-500" onClick={() => handleDelete(inv._id)}>
                                                                <TrashIcon className="h-3 w-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}

                    {investments.length === 0 && (
                        <div className="text-center text-sm text-slate-400 py-4">No investments added.</div>
                    )}
                </div>
            )}

            <InvestmentModal
                initialData={editingInv}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
            />
        </div>
    );
}
