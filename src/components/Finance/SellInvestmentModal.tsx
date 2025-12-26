import {Dialog} from '@headlessui/react';
import {XMarkIcon} from '@heroicons/react/24/outline';
import React, {useState} from 'react';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => Promise<void>;
  ticker: string;
  maxQuantity: number;
}

export default function SellInvestmentModal({isOpen, onClose, onConfirm, ticker, maxQuantity}: SellModalProps) {
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const qty = Number(quantity);
    if (qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    if (qty > maxQuantity) {
      setError(`You only have ${maxQuantity} shares available.`);
      return;
    }

    setLoading(true);
    try {
      await onConfirm(qty);
      onClose();
      setQuantity('');
    } catch (err) {
      console.error(err);
      setError('Failed to process sell order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog className="relative z-50" onClose={onClose} open={isOpen}>
      <div aria-hidden="true" className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-bold text-slate-800">Sell {ticker}</Dialog.Title>
            <button className="rounded-full p-1 hover:bg-slate-100" onClick={onClose}>
              <XMarkIcon className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            This will sell your oldest shares first (FIFO). <br />
            <strong>Available: {maxQuantity}</strong>
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Quantity to Sell</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                max={maxQuantity}
                min="0"
                onChange={e => setQuantity(e.target.value)}
                placeholder="0.00"
                required
                step="any"
                type="number"
                value={quantity}
              />
            </div>

            {error && <div className="text-xs text-rose-500 font-medium">{error}</div>}

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                onClick={onClose}
                type="button">
                Cancel
              </button>
              <button
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                disabled={loading}
                type="submit">
                {loading ? 'Selling...' : 'Confirm Sell'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
