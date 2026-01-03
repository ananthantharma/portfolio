import { Dialog, Transition } from '@headlessui/react';
import { PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { Fragment } from 'react';

import { IBudgetItemData } from '@/models/BudgetItem';

interface BudgetListModalProps {
  isOpen: boolean;
  items: (IBudgetItemData & { _id: string })[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (item: IBudgetItemData & { _id: string }) => void;
  onAdd: () => void;
  type: 'Income' | 'Expense' | 'Investment';
}

const BudgetListModal: React.FC<BudgetListModalProps> = React.memo(
  ({ isOpen, items, onClose, onDelete, onEdit, onAdd, type }) => {
    // Investment filter logic preserved
    const displayItems =
      type === 'Investment' ? items.filter(i => i.category === 'Savings & Debt') : items.filter(i => i.type === type);

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    const totalAmount = displayItems.reduce((sum, item) => sum + item.amount, 0);

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
                      {displayItems.length} items found
                    </p>
                  </div>
                  <button
                    className="rounded-full p-2 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto bg-slate-50/50">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm text-xs font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-8 py-4 border-b border-slate-100">Name</th>
                        <th className="px-6 py-4 border-b border-slate-100">Category</th>
                        <th className="px-6 py-4 border-b border-slate-100">Subcategory</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-right">Amount</th>
                        <th className="px-8 py-4 border-b border-slate-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">
                            No budget items found for this category.
                          </td>
                        </tr>
                      ) : (
                        displayItems.map((item) => (
                          <tr
                            key={item._id}
                            className="group hover:bg-indigo-50/30 transition-colors"
                          >
                            <td className="px-8 py-4 font-semibold text-slate-700">
                              {item.name}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-sm">
                              {item.subcategory || '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="px-8 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                  onClick={() => onEdit(item)}
                                  title="Edit"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </button>
                                <button
                                  className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                                  onClick={() => onDelete(item._id)}
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-200 bg-white flex justify-between items-center z-10">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Total {type}</span>
                    <span className="text-2xl font-extrabold text-slate-900">{formatCurrency(totalAmount)}</span>
                  </div>

                  <button
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all active:translate-y-0"
                    onClick={() => {
                      onClose();
                      onAdd();
                    }}
                  >
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
