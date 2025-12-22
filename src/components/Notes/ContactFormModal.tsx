/* eslint-disable react/jsx-sort-props */
import {Dialog, Listbox, Transition} from '@headlessui/react';
import {ChevronUpDownIcon, XMarkIcon} from '@heroicons/react/24/outline';
import React, {Fragment, useEffect, useState} from 'react';

import {CONTACT_DEPARTMENTS, CONTACT_POSITIONS, CONTACT_TYPES, IContactBase as IContact} from '@/lib/contact-constants';

export interface ContactFormData {
  name: string;
  company: string;
  phone: string;
  email: string;
  notes: string;
  position: string;
  department: string;
  type: 'Internal' | 'External';
}

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => void;
  initialData?: Partial<IContact>;
  title?: string;
}

const ContactFormModal: React.FC<ContactFormModalProps> = React.memo(
  ({isOpen, onClose, onSave, initialData, title}) => {
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [notes, setNotes] = useState('');
    const [position, setPosition] = useState<string>(CONTACT_POSITIONS[0]);
    const [department, setDepartment] = useState<string>(CONTACT_DEPARTMENTS[0]);
    const [type, setType] = useState<'Internal' | 'External'>('External');

    useEffect(() => {
      if (isOpen) {
        if (initialData) {
          setName(initialData.name || '');
          setCompany(initialData.company || '');
          setPhone(initialData.phone || '');
          setEmail(initialData.email || '');
          setNotes(initialData.notes || '');
          setPosition(initialData.position || CONTACT_POSITIONS[0]);
          setDepartment(initialData.department || CONTACT_DEPARTMENTS[0]);
          setType(initialData.type || 'External');
        } else {
          // Reset for new contact
          setName('');
          setCompany('');
          setPhone('');
          setEmail('');
          setNotes('');
          setPosition(CONTACT_POSITIONS[0]);
          setDepartment(CONTACT_DEPARTMENTS[0]);
          setType('External');
        }
      }
    }, [isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
        name,
        company,
        phone,
        email,
        notes,
        position,
        department,
        type,
      });
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
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center mb-4">
                    <span>{title || 'New Contact'}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </Dialog.Title>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        placeholder="Acme Corp"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <Listbox value={type} onChange={setType}>
                          <div className="relative mt-1">
                            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm">
                              <span className="block truncate">{type}</span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                              </span>
                            </Listbox.Button>
                            <Transition
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0">
                              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                                {CONTACT_TYPES.map((t, idx) => (
                                  <Listbox.Option
                                    key={idx}
                                    value={t}
                                    className={({active}) =>
                                      `relative cursor-default select-none py-2 pl-3 pr-4 ${
                                        active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                                      }`
                                    }>
                                    {({selected}) => (
                                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                        {t}
                                      </span>
                                    )}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </Listbox>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Position</label>
                        <Listbox value={position} onChange={setPosition}>
                          <div className="relative mt-1">
                            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm">
                              <span className="block truncate">{position}</span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                              </span>
                            </Listbox.Button>
                            <Transition
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0">
                              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                                {CONTACT_POSITIONS.map((pos, idx) => (
                                  <Listbox.Option
                                    key={idx}
                                    value={pos}
                                    className={({active}) =>
                                      `relative cursor-default select-none py-2 pl-3 pr-4 ${
                                        active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                                      }`
                                    }>
                                    {({selected}) => (
                                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                        {pos}
                                      </span>
                                    )}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </Listbox>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <Listbox value={department} onChange={setDepartment}>
                        <div className="relative mt-1">
                          <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm">
                            <span className="block truncate">{department}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0">
                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                              {CONTACT_DEPARTMENTS.map((dept, idx) => (
                                <Listbox.Option
                                  key={idx}
                                  value={dept}
                                  className={({active}) =>
                                    `relative cursor-default select-none py-2 pl-3 pr-4 ${
                                      active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                                    }`
                                  }>
                                  {({selected}) => (
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                      {dept}
                                    </span>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Phone <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="tel"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="email"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Notes <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border-gray-300 shadow-sm"
                        onClick={onClose}>
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm">
                        Save Contact
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
  },
);

ContactFormModal.displayName = 'ContactFormModal';
export default ContactFormModal;
