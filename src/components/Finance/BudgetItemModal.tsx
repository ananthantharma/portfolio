import {Dialog, Transition} from '@headlessui/react';
import React, {Fragment, useEffect, useState} from 'react';

import {BUDGET_CATEGORIES, INCOME_CATEGORIES} from '@/lib/categories';
import {IBudgetItem, IBudgetItemData} from '@/models/BudgetItem';

interface BudgetItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: IBudgetItemData) => void;
    initialData?: IBudgetItem | null;
}

const PROPERTY_TAGS = ['General', '197 Randall', '89 Laing'];

const BudgetItemModal: React.FC<BudgetItemModalProps> = React.memo(
    ({isOpen, onClose, onSave, initialData}) => {
        const [name, setName] = useState('');
        const [amount, setAmount] = useState('');
        const [type, setType] = useState<'Income' | 'Expense'>('Expense');
        const [category, setCategory] = useState('');
        const [subcategory, setSubcategory] = useState('');
        const [propertyTag, setPropertyTag] = useState('General');
        const [isVariable, setIsVariable] = useState(false);

        // Initialize or reset form state
        useEffect(() => {
            if (initialData) {
                setName(initialData.name);
                setAmount(initialData.amount.toString());
                setType(initialData.type);
                setCategory(initialData.category);
                setSubcategory(initialData.subcategory);
                setPropertyTag(initialData.propertyTag);
                setIsVariable(initialData.isVariable);
            } else {
                // Defaults for new item
                setName('');
                setAmount('');
                setType('Expense');
                setCategory(Object.keys(BUDGET_CATEGORIES)[0]); // Default to first expense category
                setSubcategory(Object.values(BUDGET_CATEGORIES)[0][0]); // Default to first subcategory
                setPropertyTag('General');
                setIsVariable(false);
            }
        }, [initialData, isOpen]);

        // Handle Type change
        const handleTypeChange = (newType: 'Income' | 'Expense') => {
            setType(newType);
            if (newType === 'Income') {
                setCategory('Income');
                setSubcategory(INCOME_CATEGORIES[0]);
            } else {
                const firstCategory = Object.keys(BUDGET_CATEGORIES)[0];
                setCategory(firstCategory);
                setSubcategory(BUDGET_CATEGORIES[firstCategory as keyof typeof BUDGET_CATEGORIES][0]);
            }
        };

        // Handle Category change
        const handleCategoryChange = (newCategory: string) => {
            setCategory(newCategory);
            if (type === 'Expense') {
                // Reset subcategory to first item of new category
                const subcats = BUDGET_CATEGORIES[newCategory as keyof typeof BUDGET_CATEGORIES];
                if (subcats && subcats.length > 0) {
                    setSubcategory(subcats[0]);
                }
            }
        };

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            onSave({
                name,
                amount: parseFloat(amount),
                type,
                category,
                subcategory,
                propertyTag,
                isVariable,
            });
            onClose();
        };

        // Get available subcategories based on current state
        const availableSubcategories =
            type === 'Income'
                ? INCOME_CATEGORIES
                : BUDGET_CATEGORIES[category as keyof typeof BUDGET_CATEGORIES] || [];

        return (
            <Transition appear as={Fragment} show={isOpen}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black bg-opacity-75" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">
                                        {initialData ? 'Edit Budget Item' : 'Add Budget Item'}
                                    </Dialog.Title>
                                    <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400">Name</label>
                                            <input
                                                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                                onChange={e => setName(e.target.value)}
                                                placeholder="e.g. Mortgage, Salary"
                                                required
                                                type="text"
                                                value={name}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-400">Monthly Amount ($)</label>
                                            <input
                                                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                                min="0"
                                                onChange={e => setAmount(e.target.value)}
                                                placeholder="0.00"
                                                required
                                                step="0.01"
                                                type="number"
                                                value={amount}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400">Type</label>
                                                <select
                                                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                                    onChange={e => handleTypeChange(e.target.value as 'Income' | 'Expense')}
                                                    value={type}>
                                                    <option value="Income">Income</option>
                                                    <option value="Expense">Expense</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-400">Property Tag</label>
                                                <select
                                                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                                    onChange={e => setPropertyTag(e.target.value)}
                                                    value={propertyTag}>
                                                    {PROPERTY_TAGS.map(tag => (
                                                        <option key={tag} value={tag}>
                                                            {tag}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-400">Category</label>
                                            <select
                                                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                                disabled={type === 'Income'}
                                                onChange={e => handleCategoryChange(e.target.value)}
                                                value={category}>
                                                {type === 'Income' ? (
                                                    <option value="Income">Income</option>
                                                ) : (
                                                    Object.keys(BUDGET_CATEGORIES).map(cat => (
                                                        <option key={cat} value={cat}>
                                                            {cat}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-400">Subcategory</label>
                                            <select
                                                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                                onChange={e => setSubcategory(e.target.value)}
                                                value={subcategory}>
                                                {availableSubcategories.map(sub => (
                                                    <option key={sub} value={sub}>
                                                        {sub}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                checked={isVariable}
                                                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500"
                                                id="isVariable"
                                                onChange={e => setIsVariable(e.target.checked)}
                                                type="checkbox"
                                            />
                                            <label className="ml-2 block text-sm text-gray-400" htmlFor="isVariable">
                                                Variable Cost? (e.g. Groceries, Utilities)
                                            </label>
                                        </div>

                                        <div className="mt-6 flex justify-end space-x-3">
                                            <button
                                                className="rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
                                                onClick={onClose}
                                                type="button">
                                                Cancel
                                            </button>
                                            <button
                                                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                                                type="submit">
                                                Save Item
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        );
    }
);

export default BudgetItemModal;
