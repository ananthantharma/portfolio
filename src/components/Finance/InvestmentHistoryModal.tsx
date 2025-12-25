import { Dialog } from '@headlessui/react';
import { PencilSquareIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React from 'react';

interface Investment {
    _id: string;
    ticker: string;
    quantity: number;
    purchaseDate: string;
    bookPrice: number;
    category: 'RRSP' | 'TFSA' | 'RESP' | 'CASH';
}

interface InvestmentHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticker: string;
    category: 'RRSP' | 'TFSA' | 'RESP' | 'CASH';
    investments: Investment[]; // All lots for this ticker/category
    onEdit: (inv: Investment) => void;
    onDelete: (id: string) => void;
    onSell: (ticker: string, category: 'RRSP' | 'TFSA' | 'RESP' | 'CASH') => void;
}

export default function InvestmentHistoryModal({
    isOpen,
    onClose,
    ticker,
    category,
    investments,
    onEdit,
    onDelete,
    onSell
}: InvestmentHistoryModalProps) {
    const totalQty = investments.reduce((sum, i) => sum + i.quantity, 0);
    const avgPrice = totalQty > 0
        ? investments.reduce((sum, i) => sum + (i.quantity * i.bookPrice), 0) / totalQty
        : 0;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    return (
        <Dialog className="relative z-50" onClose={onClose} open={isOpen}>
            <div aria-hidden="true" className="fixed inset-0 bg-black/30" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <Dialog.Title className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {ticker}
                                <span className="text-sm font-medium px-2 py-1 bg-slate-100 rounded text-slate-500">{category}</span>
                            </Dialog.Title>
                            <div className="text-sm text-slate-500 mt-1">
                                {totalQty} shares • Avg Cost: {formatCurrency(avgPrice)}
                            </div>
                        </div>
                        <button className="rounded-full p-1 hover:bg-slate-100" onClick={onClose}>
                            <XMarkIcon className="h-6 w-6 text-slate-500" />
                        </button>
                    </div>

                    <div className="mb-6 flex justify-end">
                        <button
                            className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
                            onClick={() => { onClose(); onSell(ticker, category); }}
                        >
                            Sell Stock
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Qty</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Price</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Total Cost</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {investments.map(inv => (
                                    <tr className="hover:bg-slate-50/50" key={inv._id}>
                                        <td className="px-4 py-3 text-slate-700">{inv.purchaseDate}</td>
                                        <td className="px-4 py-3 text-right text-slate-700 font-medium">{inv.quantity}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(inv.bookPrice)}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(inv.quantity * inv.bookPrice)}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button className="text-indigo-600 hover:text-indigo-800" onClick={() => onEdit(inv)}>
                                                <PencilSquareIcon className="h-4 w-4" />
                                            </button>
                                            <button className="text-rose-500 hover:text-rose-700" onClick={() => onDelete(inv._id)}>
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
