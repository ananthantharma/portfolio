import { ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline';
import React, { useCallback, useMemo, useState } from 'react';

import InvestmentHistoryModal from './InvestmentHistoryModal';
import InvestmentModal from './InvestmentModal';
import SellInvestmentModal from './SellInvestmentModal';

export interface Investment {
    _id: string;
    ticker: string;
    quantity: number;
    purchaseDate: string;
    bookPrice: number;
    category: 'RRSP' | 'TFSA' | 'RESP' | 'CASH';
}

interface GroupedInvestment {
    ticker: string;
    category: 'RRSP' | 'TFSA' | 'RESP' | 'CASH';
    totalQty: number;
    avgBookPrice: number;
    totalBookValue: number;
    currentPrice: number | null;
    marketValue: number;
    gainLoss: number;
    gainLossPercent: number;
    lots: Investment[];
}

interface InvestmentManagerProps {
    investments: Investment[];
    prices: { [ticker: string]: number };
    loading: boolean;
    refreshing: boolean;
    onRefreshPrices: () => void;
    onDataChange: () => Promise<void>;
}

export default function InvestmentManager({
    investments,
    prices,
    loading,
    refreshing,
    onRefreshPrices,
    onDataChange
}: InvestmentManagerProps) {
    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // History Modal State
    const [selectedHolding, setSelectedHolding] = useState<GroupedInvestment | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Sell Modal State
    const [sellTicker, setSellTicker] = useState<{ ticker: string, category: string, maxQty: number } | null>(null);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);

    const [editingInv, setEditingInv] = useState<Investment | null>(null); // For Add/Edit single lot



    const handleSave = useCallback(async (inv: Partial<Investment>) => {
        const method = inv._id ? 'PUT' : 'POST';
        const url = inv._id ? `/api/finance/investments/${inv._id}` : '/api/finance/investments';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inv)
        });

        if (res.ok) {
            await onDataChange();
        }
    }, [onDataChange]);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm('Delete this investment lot?')) return;
        await fetch(`/api/finance/investments/${id}`, { method: 'DELETE' });
        await onDataChange();
        setIsHistoryModalOpen(false);
    }, [onDataChange]);

    const handleSell = useCallback(async (quantity: number) => {
        if (!sellTicker) return;

        await fetch('/api/finance/investments/sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticker: sellTicker.ticker,
                category: sellTicker.category,
                quantity
            })
        });

        await onDataChange();
        setIsSellModalOpen(false);
        setIsHistoryModalOpen(false); // Close history too as state changed
    }, [sellTicker, onDataChange]);

    const handleEditFromHistory = useCallback((inv: Investment) => {
        setIsHistoryModalOpen(false);
        setEditingInv(inv);
        setIsAddModalOpen(true);
    }, []);

    const handleSellFromHistory = useCallback((ticker: string, cat: string) => {
        setSellTicker({ ticker, category: cat, maxQty: selectedHolding?.totalQty || 0 });
        setIsSellModalOpen(true);
    }, [selectedHolding]);

    const handleCloseHistory = useCallback(() => {
        setIsHistoryModalOpen(false);
    }, []);

    const handleCloseSell = useCallback(() => {
        setIsSellModalOpen(false);
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    const formatPercent = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'percent', minimumFractionDigits: 2 }).format(val);

    // Grouping Logic: Key = Ticker + Category
    const groupedHoldings = useMemo(() => {
        const groups: { [key: string]: GroupedInvestment } = {};

        investments.forEach(inv => {
            const key = `${inv.ticker}-${inv.category}`;
            if (!groups[key]) {
                groups[key] = {
                    ticker: inv.ticker,
                    category: inv.category,
                    totalQty: 0,
                    avgBookPrice: 0,
                    totalBookValue: 0,
                    currentPrice: prices[inv.ticker] || null,
                    marketValue: 0,
                    gainLoss: 0,
                    gainLossPercent: 0,
                    lots: []
                };
            }

            const g = groups[key];
            g.lots.push(inv);
            g.totalQty += inv.quantity;
            g.totalBookValue += (inv.quantity * inv.bookPrice);
        });

        // Calculate Averages
        return Object.values(groups).map(g => {
            g.avgBookPrice = g.totalQty > 0 ? g.totalBookValue / g.totalQty : 0;
            const price = g.currentPrice || g.avgBookPrice; // Fallback to book for stats
            g.marketValue = g.totalQty * price;
            g.gainLoss = g.marketValue - g.totalBookValue;
            g.gainLossPercent = g.totalBookValue > 0 ? (g.gainLoss / g.totalBookValue) : 0;
            return g;
        });
    }, [investments, prices]);

    // Group Holdings by Category for Display (RRSP, TFSA...)
    const holdingsByCategory = useMemo(() => {
        const cats: { [key: string]: GroupedInvestment[] } = { RRSP: [], TFSA: [], RESP: [], CASH: [] };
        groupedHoldings.forEach(h => {
            if (cats[h.category]) cats[h.category].push(h);
        });
        return cats;
    }, [groupedHoldings]);

    // Totals per category
    const calculateTotals = (items: GroupedInvestment[]) => {
        let totalVal = 0;
        let totalGain = 0;
        items.forEach(i => {
            totalVal += i.marketValue;
            totalGain += i.gainLoss;
        });
        return { totalVal, totalGain };
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Portfolio</h3>
                <div className="flex gap-2">
                    <button
                        className={`p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-all ${refreshing ? 'animate-spin' : ''}`}
                        disabled={refreshing}
                        onClick={onRefreshPrices}
                        title="Refresh Prices"
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                    </button>
                    <button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-md transition-colors"
                        onClick={() => { setEditingInv(null); setIsAddModalOpen(true); }}
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
                    {Object.entries(holdingsByCategory).map(([category, items]) => {
                        if (items.length === 0) return null;
                        const { totalVal, totalGain } = calculateTotals(items);

                        return (
                            <div className="border-b last:border-0 border-slate-100 pb-4 last:pb-0" key={category}>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{category}</h4>
                                    <span className={`text-xs font-bold ${totalGain >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {formatCurrency(totalVal)} ({totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)})
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="text-slate-400 border-b border-slate-50">
                                                <th className="pb-2 font-medium">Ticker</th>
                                                <th className="pb-2 font-medium text-right">Qty</th>
                                                <th className="pb-2 font-medium text-right">Avg Cost</th>
                                                <th className="pb-2 font-medium text-right">Price</th>
                                                <th className="pb-2 font-medium text-right">Value</th>
                                                <th className="pb-2 font-medium text-right">Return</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {items.map(h => (
                                                <tr
                                                    className="group hover:bg-slate-50 cursor-pointer"
                                                    key={h.ticker}
                                                    onClick={() => { setSelectedHolding(h); setIsHistoryModalOpen(true); }}
                                                    title="Click to view details & history"
                                                >
                                                    <td className="py-2 font-bold text-slate-700">{h.ticker}</td>
                                                    <td className="py-2 text-right text-slate-600 font-medium">{h.totalQty}</td>
                                                    <td className="py-2 text-right text-slate-500">{formatCurrency(h.avgBookPrice)}</td>
                                                    <td className="py-2 text-right font-medium text-slate-700">
                                                        {h.currentPrice ? formatCurrency(h.currentPrice) : <span className="animate-pulse bg-slate-200 h-3 w-10 inline-block rounded" />}
                                                    </td>
                                                    <td className="py-2 text-right font-bold text-slate-800">{formatCurrency(h.marketValue)}</td>
                                                    <td className={`py-2 text-right font-bold ${h.gainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {formatPercent(h.gainLossPercent)}
                                                    </td>
                                                </tr>
                                            ))}
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

            {/* Add/Edit Modal (New Lot) */}
            <InvestmentModal
                initialData={editingInv}
                isOpen={isAddModalOpen}
                onClose={handleCloseAddModal}
                onSave={handleSave}
            />

            {selectedHolding && (
                <InvestmentHistoryModal
                    category={selectedHolding.category}
                    investments={selectedHolding.lots}
                    isOpen={isHistoryModalOpen}
                    onClose={handleCloseHistory}
                    onDelete={handleDelete}
                    onEdit={handleEditFromHistory}
                    onSell={handleSellFromHistory}
                    ticker={selectedHolding.ticker}
                />
            )}

            {/* Sell Modal */}
            {sellTicker && (
                <SellInvestmentModal
                    isOpen={isSellModalOpen}
                    maxQuantity={sellTicker.maxQty}
                    onClose={handleCloseSell}
                    onConfirm={handleSell}
                    ticker={sellTicker.ticker}
                />
            )}
        </div>
    );
}

