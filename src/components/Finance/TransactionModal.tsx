
import {Dialog, Transition} from '@headlessui/react';
import {XMarkIcon} from '@heroicons/react/24/outline';
import React, {Fragment, useEffect, useState} from 'react';

import {ITransaction} from '@/models/Transaction';

interface Property {
  _id: string;
  name: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<ITransaction, '_id'>) => void;
}

const INCOME_CATEGORIES = ['Salary (Ananthan)', 'Salary (Sai)', 'Rental Income', 'Child Benefits'];
const EXPENSE_CATEGORIES = [
  'Mortgage', 'Property Tax', 'Hydro/Electricity', 'Water/Sewer', 'Gas', 'House Insurance', // Housing
  'TREB Fees', 'RECO Insurance', 'CREA/OREA Fees', 'ReMax Fees', 'P.Eng Dues', 'PMP Certification', // Professional
  'Groceries', 'Dining Out', 'Car Insurance', 'Gas (Auto)', 'Internet', 'Phone (Bell/Fido)', // Living
  'Daycare/Hanu School', 'Activities', // Family
  'Google One', 'YouTube Premium', 'ChatGPT', 'Amazon' // Subscriptions
];

const TransactionModal: React.FC<TransactionModalProps> = React.memo(({isOpen, onClose, onSave}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'Expense',
    category: EXPENSE_CATEGORIES[0],
    property: '',
    isRecurring: false,
  });

  useEffect(() => {
    if (isOpen) {
      fetch('/api/finance/properties')
        .then(res => res.json())
        .then(data => setProperties(data))
        .catch(err => console.error('Failed to fetch properties', err));
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const {name, value} = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, checked} = e.target;
    setFormData(prev => ({...prev, [name]: checked}));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      type: formData.type as 'Expense' | 'Income',
      amount: parseFloat(formData.amount),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      property: (formData.property || undefined) as any,
    });
    onClose();
  };

  const categories = formData.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Transition.Root as={Fragment} show={isOpen}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    className="rounded-md bg-gray-800 text-gray-400 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                    type="button">
                    <span className="sr-only">Close</span>
                    <XMarkIcon aria-hidden="true" className="h-6 w-6" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-white">
                      Add Transaction
                    </Dialog.Title>
                    <div className="mt-4">
                      <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                          <label className="block text-sm font-medium text-gray-300" htmlFor="type">
                            Type
                          </label>
                          <select
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            id="type"
                            name="type"
                            onChange={handleChange}
                            value={formData.type}>
                            <option value="Expense">Expense</option>
                            <option value="Income">Income</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300" htmlFor="date">
                            Date
                          </label>
                          <input
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            id="date"
                            name="date"
                            onChange={handleChange}
                            required
                            type="date"
                            value={formData.date}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300" htmlFor="description">
                            Description
                          </label>
                          <input
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            id="description"
                            name="description"
                            onChange={handleChange}
                            required
                            type="text"
                            value={formData.description}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300" htmlFor="amount">
                            Amount
                          </label>
                          <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <span className="text-gray-400 sm:text-sm">$</span>
                            </div>
                            <input
                              className="block w-full rounded-md border-gray-600 bg-gray-700 pl-7 text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              id="amount"
                              min="0.01"
                              name="amount"
                              onChange={handleChange}
                              placeholder="0.00"
                              required
                              step="0.01"
                              type="number"
                              value={formData.amount}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300" htmlFor="category">
                            Category
                          </label>
                          <select
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            id="category"
                            name="category"
                            onChange={handleChange}
                            value={formData.category}>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300" htmlFor="property">
                            Property (Optional)
                          </label>
                          <select
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            id="property"
                            name="property"
                            onChange={handleChange}
                            value={formData.property}>
                            <option value="">General / Personal</option>
                            {properties.map(prop => (
                              <option key={prop._id} value={prop._id}>
                                {prop.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center">
                          <input
                            checked={formData.isRecurring}
                            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                            id="isRecurring"
                            name="isRecurring"
                            onChange={handleCheckboxChange}
                            type="checkbox"
                          />
                          <label className="ml-2 block text-sm text-gray-300" htmlFor="isRecurring">
                            Recurring Transaction
                          </label>
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                            type="submit">
                            Save
                          </button>
                          <button
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-300 shadow-sm ring-1 ring-inset ring-gray-600 hover:bg-gray-600 sm:mt-0 sm:w-auto"
                            onClick={onClose}
                            type="button">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
});

export default TransactionModal;
