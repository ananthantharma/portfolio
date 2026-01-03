import {Dialog, Transition} from '@headlessui/react';
import {PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon} from '@heroicons/react/24/outline';
import React, {Fragment} from 'react';

import {IBudgetItemData} from '@/models/BudgetItem';

interface BudgetListModalProps {
  isOpen: boolean;
  items: (IBudgetItemData & {_id: string})[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (item: IBudgetItemData & {_id: string}) => void;
  onAdd: () => void;
  type: 'Income' | 'Expense' | 'Investment';
}

const BudgetListModal: React.FC<BudgetListModalProps> = React.memo(
  ({isOpen, items, onClose, onDelete, onEdit, onAdd, type}) => {
    // Grouping State
    // Default to empty Set -> All collapsed initially (showing only totals)
    const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

    const displayItems = React.useMemo(
      () =>
        type === 'Investment' ? items.filter(i => i.category === 'Savings & Debt') : items.filter(i => i.type === type),
      [items, type],
    );

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('en-CA', {style: 'currency', currency: 'CAD'}).format(val);

    // Group items and calculate totals
    const {groupedItems, categoryTotals, totalAmount} = React.useMemo(() => {
      const groups: {[key: string]: typeof items} = {};
      const totals: {[key: string]: number} = {};
      let grandTotal = 0;

      displayItems.forEach(item => {
        if (!groups[item.category]) {
          groups[item.category] = [];
          totals[item.category] = 0;
        }
        groups[item.category].push(item);
        totals[item.category] += item.amount;
        grandTotal += item.amount;
      });

      return {groupedItems: groups, categoryTotals: totals, totalAmount: grandTotal};
    }, [displayItems]);

    // Derived sorted categories
    const sortedCategories = React.useMemo(() => Object.keys(groupedItems).sort(), [groupedItems]);

    const toggleCategory = (cat: string) => {
      const newSet = new Set(expandedCategories);
      if (newSet.has(cat)) {
        newSet.delete(cat);
      } else {
        newSet.add(cat);
      }
      setExpandedCategories(newSet);
    };

    const toggleAll = () => {
      if (expandedCategories.size === sortedCategories.length) {
        setExpandedCategories(new Set());
      } else {
        setExpandedCategories(new Set(sortedCategories));
      }
    };

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
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translation-y-4"
              enterTo="opacity-100 scale-100 translation-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translation-y-0"
              leaveTo="opacity-0 scale-95 translation-y-4">
              <Dialog.Panel className="w-full max-w-6xl h-[85vh] transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white z-10">
                  <div>
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-800">
                      Manage {type === 'Investment' ? 'Savings & Investments' : type}s
                    </Dialog.Title>
                    <p className="text-sm text-slate-500 mt-1">
                      {sortedCategories.length} Categories • {displayItems.length} Items Total
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleAll}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      {expandedCategories.size === sortedCategories.length ? 'Collapse All' : 'Expand All'}
                    </button>
                    <button
                      className="rounded-full p-2 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                      onClick={onClose}>
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-slate-50/50">
                  {sortedCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <p className="italic">No budget items found.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {sortedCategories.map(cat => {
                        const isExpanded = expandedCategories.has(cat);
                        const groupTotal = categoryTotals[cat];
                        const groupItems = groupedItems[cat];

                        return (
                          <div key={cat} className="bg-white">
                            {/* Category Header Row */}
                            <div
                              className="flex items-center justify-between px-8 py-5 cursor-pointer hover:bg-slate-50 transition-colors group select-none"
                              onClick={() => toggleCategory(cat)}>
                              <div className="flex items-center gap-4">
                                <div
                                  className={`p-1.5 rounded-md transition-transform duration-200 ${
                                    isExpanded
                                      ? 'rotate-90 bg-indigo-100 text-indigo-600'
                                      : 'text-slate-400 group-hover:text-slate-600'
                                  }`}>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="w-5 h-5">
                                    <path
                                      fillRule="evenodd"
                                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-slate-700">{cat}</h4>
                                  <p className="text-xs text-slate-500 font-medium">{groupItems.length} items</p>
                                </div>
                              </div>
                              <span className="text-lg font-bold text-slate-900 font-mono tracking-tight">
                                {formatCurrency(groupTotal)}
                              </span>
                            </div>

                            {/* Expanded Items Table */}
                            <div
                              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                              }`}>
                              <div className="bg-slate-50 border-t border-slate-100">
                                <table className="w-full text-left">
                                  <thead className="sr-only">
                                    <tr>
                                      <th>Name</th>
                                      <th>Subcategory</th>
                                      <th className="text-right">Amount</th>
                                      <th className="text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200/50">
                                    {groupItems.map(item => (
                                      <tr key={item._id} className="hover:bg-indigo-50/40 transition-colors">
                                        <td className="pl-20 py-3 pr-4 w-[40%] text-sm font-medium text-slate-700">
                                          {item.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500 w-[30%]">
                                          {item.subcategory || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-800 font-mono w-[15%]">
                                          {formatCurrency(item.amount)}
                                        </td>
                                        <td className="px-8 py-3 text-right w-[15%]">
                                          <div className="flex justify-end gap-2">
                                            <button
                                              className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
                                              onClick={e => {
                                                e.stopPropagation();
                                                onEdit(item);
                                              }}
                                              title="Edit">
                                              <PencilSquareIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                              className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition-colors"
                                              onClick={e => {
                                                e.stopPropagation();
                                                onDelete(item._id);
                                              }}
                                              title="Delete">
                                              <TrashIcon className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-200 bg-white flex justify-between items-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Grand Total</span>
                    <span className="text-2xl font-extrabold text-slate-900 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>

                  <button
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all active:translate-y-0"
                    onClick={() => {
                      onClose();
                      onAdd();
                    }}>
                    <PlusIcon className="h-5 w-5" />
                    Add New Item
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    );
  },
);

BudgetListModal.displayName = 'BudgetListModal';

export default BudgetListModal;
