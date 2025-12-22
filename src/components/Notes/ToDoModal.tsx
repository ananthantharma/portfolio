import {Dialog, Listbox, Transition} from '@headlessui/react';
import {
  CalendarIcon,
  CheckIcon,
  ChevronUpDownIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, {Fragment, useEffect, useState} from 'react';

interface ToDoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {title: string; priority: string; dueDate: Date; category: string; notes: string}) => void;
  initialTitle: string;
}

const PRIORITIES = [
  {name: 'High', value: 'High', icon: ExclamationCircleIcon, color: 'text-red-500'},
  {name: 'Medium', value: 'Medium', icon: ExclamationTriangleIcon, color: 'text-amber-500'},
  {name: 'Low', value: 'Low', icon: MinusCircleIcon, color: 'text-green-500'},
  {name: 'None', value: 'None', icon: MinusCircleIcon, color: 'text-gray-400'},
];

const CATEGORIES = [
  {name: 'Urgent!', value: 'Urgent!', color: 'bg-red-100 text-red-800'},
  {name: 'Sourcing!', value: 'Sourcing!', color: 'bg-amber-100 text-amber-800'},
  {name: 'Boss!', value: 'Boss!', color: 'bg-purple-100 text-purple-800'},
  {name: 'Staff! (Team)', value: 'Staff! (Team)', color: 'bg-blue-100 text-blue-800'},
  {name: 'Projects!', value: 'Projects!', color: 'bg-green-100 text-green-800'},
  {name: 'Admin!', value: 'Admin!', color: 'bg-gray-100 text-gray-800'},
  {name: 'Personal!', value: 'Personal!', color: 'bg-teal-100 text-teal-800'},
];

const ToDoModal: React.FC<ToDoModalProps> = React.memo(({isOpen, onClose, onSave, initialTitle}) => {
  const [title, setTitle] = useState(initialTitle);
  const [priority, setPriority] = useState(PRIORITIES[3]); // Default to None (index 3)
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // User requested category "can be blank and is blank as default"
  const [selectedCategory, setSelectedCategory] = useState<{name: string; value: string; color: string} | null>(null);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, isOpen]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setPriority(PRIORITIES[3]); // Default to None
      setDueDate(new Date().toISOString().split('T')[0]);
      setSelectedCategory(null);
      setNotes('');
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave({
      title,
      priority: priority.value,
      dueDate: new Date(dueDate),
      category: selectedCategory ? selectedCategory.value : '',
      notes,
    });
    onClose();
  };

  return (
    <Transition appear={true} as={Fragment} show={isOpen}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
                  Create To Do
                  <button className="text-gray-400 hover:text-gray-500" onClick={onClose}>
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  {/* Task Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Task Name</label>
                    <input
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      onChange={e => setTitle(e.target.value)}
                      type="text"
                      value={title}
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <div className="flex gap-4">
                      {PRIORITIES.map(p => (
                        <button
                          className={`flex flex-col items-center p-2 rounded-md border ${
                            priority.name === p.name
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          key={p.name}
                          onClick={() => setPriority(p)}
                          type="button">
                          <p.icon className={`h-6 w-6 ${p.color}`} />
                          <span className="text-xs mt-1 text-gray-600">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <div className="relative mt-1 rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <CalendarIcon aria-hidden="true" className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        onChange={e => setDueDate(e.target.value)}
                        type="date"
                        value={dueDate}
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <Listbox onChange={setSelectedCategory} value={selectedCategory}>
                      <div className="relative mt-1">
                        <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm border border-gray-300 min-h-[38px]">
                          <span className={`block truncate ${!selectedCategory ? 'text-gray-400' : ''}`}>
                            {selectedCategory ? selectedCategory.name : 'Select a category (Optional)'}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon aria-hidden="true" className="h-5 w-5 text-gray-400" />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0">
                          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                            {/* Option for blank/none */}
                            <Listbox.Option
                              className={({active}) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                                }`
                              }
                              key="none"
                              value={null}>
                              {({selected}) => (
                                <>
                                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                    None
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                      <CheckIcon aria-hidden="true" className="h-5 w-5" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>

                            {CATEGORIES.map((cat, catIdx) => (
                              <Listbox.Option
                                className={({active}) =>
                                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                    active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                                  }`
                                }
                                key={catIdx}
                                value={cat}>
                                {({selected}) => (
                                  <>
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                      {cat.name}
                                    </span>
                                    {selected ? (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                        <CheckIcon aria-hidden="true" className="h-5 w-5" />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                    <textarea
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      value={notes}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                    type="button">
                    Cancel
                  </button>
                  <button
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    onClick={handleSave}
                    type="button">
                    Save To Do
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});

ToDoModal.displayName = 'ToDoModal';
export default ToDoModal;
