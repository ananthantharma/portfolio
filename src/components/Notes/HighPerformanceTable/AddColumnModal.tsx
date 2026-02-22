import React, {Fragment, useState} from 'react';
import {Dialog, Transition} from '@headlessui/react';
import {XMarkIcon} from '@heroicons/react/24/outline';
import {ColumnType, ColumnDefinition} from './types';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (column: ColumnDefinition) => void;
}

const COLUMN_TYPES: {type: ColumnType; label: string; description: string}[] = [
  {type: 'text', label: 'Text', description: 'Simple text input'},
  {type: 'date', label: 'Date', description: 'Date picker'},
  {type: 'status', label: 'Status (Color)', description: 'Select from colored status options'},
  {type: 'currency', label: 'Currency', description: 'Monetary value'},
];

export default function AddColumnModal({isOpen, onClose, onAdd}: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ColumnType>('text');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCol: ColumnDefinition = {
      id: `col-${Date.now()}`,
      label: name,
      type: type,
      width: 200, // Default width
    };

    // Add default options for status/risk if selected
    if (type === 'status' || type === 'risk') {
      newCol.options = [
        {id: '1', label: 'Green', color: 'bg-green-500'},
        {id: '2', label: 'Yellow', color: 'bg-yellow-500'},
        {id: '3', label: 'Orange', color: 'bg-orange-500'},
        {id: '4', label: 'Gray', color: 'bg-gray-400'},
        {id: '5', label: 'Red', color: 'bg-red-500'},
      ];
    }

    onAdd(newCol);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setType('text');
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-start sm:pt-20 sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={handleClose}>
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start w-full">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      Add New Column
                    </Dialog.Title>
                    <div className="mt-4">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="col-name" className="block text-sm font-medium leading-6 text-gray-900">
                            Name
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="col-name"
                              id="col-name"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              placeholder="e.g. Cost, Priority"
                              value={name}
                              onChange={e => setName(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium leading-6 text-gray-900">Type</label>
                          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {COLUMN_TYPES.map(option => (
                              <div
                                key={option.type}
                                className={`
                                            relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none
                                            ${
                                              type === option.type
                                                ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50'
                                                : 'border-gray-300 hover:bg-gray-50'
                                            }
                                        `}
                                onClick={() => setType(option.type)}>
                                <div className="flex w-full items-center justify-between">
                                  <div className="content-center ml-2">
                                    <p className="font-medium text-gray-900">{option.label}</p>
                                    <p className="text-xs text-gray-500">{option.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto">
                            Add Column
                          </button>
                          <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                            onClick={handleClose}>
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
}
