import React, { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Investment {
    _id?: string;
    ticker: string;
    quantity: number;
    purchaseDate: string; // ISO date string YYYY-MM-DD
    bookPrice: number;
    category: 'RRSP' | 'TFSA' | 'RESP' | 'CASH';
}

interface InvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (inv: Investment) => Promise<void>;
    initialData?: Investment | null;
}

const CATEGORIES = ['RRSP', 'TFSA', 'RESP', 'CASH'];

export default function InvestmentModal({ isOpen, onClose, onSave, initialData }: InvestmentModalProps) {
    const [ticker, setTicker] = useState('');
    const [quantity, setQuantity] = useState('');
    const [bookPrice, setBookPrice] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [category, setCategory] = useState(CATEGORIES[1]); // Default TFSA
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTicker(initialData.ticker);
                setQuantity(initialData.quantity.toString());
                setBookPrice(initialData.bookPrice.toString());
                // Format date to YYYY-MM-DD for input
                const d = new Date(initialData.purchaseDate);
                setPurchaseDate(d.toISOString().split('T')[0]);
                setCategory(initialData.category);
            } else {
                setTicker('');
                setQuantity('');
                setBookPrice('');
                setPurchaseDate(new Date().toISOString().split('T')[0]); // Default Today
                setCategory('TFSA');
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                _id: initialData?._id,
                ticker: ticker.toUpperCase(),
                quantity: Number(quantity),
                bookPrice: Number(bookPrice),
                purchaseDate,
                category: category as any,
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <Dialog.Title className="text-lg font-bold text-slate-800">
                            {initialData ? 'Edit Investment' : 'Add Investment'}
                        </Dialog.Title>
                        <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
                            <XMarkIcon className="h-5 w-5 text-slate-500" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Ticker Symbol</label>
                            <input
                                required
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none uppercase"
                                onChange={e => setTicker(e.target.value.toUpperCase())}
                                placeholder="AAPL"
                                type="text"
                                value={ticker}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Quantity</label>
                                <input
                                    required
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                    min="0"
                                    onChange={e => setQuantity(e.target.value)}
                                    placeholder="10"
                                    step="any"
                                    type="number"
                                    value={quantity}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Book Price ($)</label>
                                <input
                                    required
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                    min="0"
                                    onChange={e => setBookPrice(e.target.value)}
                                    placeholder="150.00"
                                    step="any"
                                    type="number"
                                    value={bookPrice}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Purchase Date</label>
                                <input
                                    required
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                    onChange={e => setPurchaseDate(e.target.value)}
                                    type="date"
                                    value={purchaseDate}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Category</label>
                                <select
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                    onChange={e => setCategory(e.target.value)}
                                    value={category}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                                onClick={onClose}
                                type="button"
                            >
                                Cancel
                            </button>
                            <button
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                disabled={loading}
                                type="submit"
                            >
                                {loading ? 'Saving...' : 'Save Investment'}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
