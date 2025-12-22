/* eslint-disable react/jsx-sort-props, simple-import-sort/imports, react-memo/require-usememo */
import React, {Fragment, useEffect, useMemo, useState} from 'react';
import {Dialog, Listbox, Transition} from '@headlessui/react';
import {
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

import {CONTACT_DEPARTMENTS, CONTACT_POSITIONS, CONTACT_TYPES, IContactBase as IContact} from '@/lib/contact-constants';
import ContactFormModal, {ContactFormData} from './ContactFormModal';

interface ContactListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper for filter dropdowns
const FilterDropdown = React.memo(
  ({
    value,
    onChange,
    options,
    label,
  }: {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    label: string;
  }) => (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="relative w-40 cursor-default rounded-lg bg-white py-1.5 pl-3 pr-8 text-left border border-gray-200 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-xs">
          <span className="block truncate">{value === 'All' ? label : value}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-xs z-10">
            <Listbox.Option
              value="All"
              className={({active}) =>
                `relative cursor-default select-none py-2 pl-3 pr-4 ${
                  active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                }`
              }>
              {({selected}) => (
                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>All</span>
              )}
            </Listbox.Option>
            {options.map((opt, idx) => (
              <Listbox.Option
                key={idx}
                value={opt}
                className={({active}) =>
                  `relative cursor-default select-none py-2 pl-3 pr-4 ${
                    active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                  }`
                }>
                {({selected}) => (
                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{opt}</span>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  ),
);
FilterDropdown.displayName = 'FilterDropdown';

const ContactListModal: React.FC<ContactListModalProps> = React.memo(({isOpen, onClose}) => {
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [filterPosition, setFilterPosition] = useState<string>('All');
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');

  // Create/Edit State
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<IContact | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contacts');
      const data = await response.json();
      if (data.success) {
        setContacts(data.data);
      } else {
        setError(data.error || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      // Optimistic update
      setContacts(prev => prev.filter(c => c._id !== id));
      await fetch(`/api/contacts/${id}`, {method: 'DELETE'});
    } catch (error) {
      console.error('Error deleting contact:', error);
      fetchContacts(); // Revert
    }
  };

  const handleSaveContact = async (data: ContactFormData) => {
    try {
      if (editingContact) {
        await fetch(`/api/contacts/${editingContact._id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/contacts', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data),
        });
      }
      setIsContactFormOpen(false);
      setEditingContact(null);
      fetchContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const handleEdit = (contact: IContact) => {
    setEditingContact(contact);
    setIsContactFormOpen(true);
  };

  const handleCreate = () => {
    setEditingContact(null);
    setIsContactFormOpen(true);
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // Text Search
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (c.name || '').toLowerCase().includes(query) ||
        (c.company || '').toLowerCase().includes(query) ||
        (c.notes || '').toLowerCase().includes(query) ||
        (c.email || '').toLowerCase().includes(query) ||
        (c.phone || '').toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Filters
      if (filterPosition !== 'All' && c.position !== filterPosition) return false;
      if (filterDepartment !== 'All' && c.department !== filterDepartment) return false;
      if (filterType !== 'All' && c.type !== filterType) return false;

      return true;
    });
  }, [contacts, searchQuery, filterPosition, filterDepartment, filterType]);

  return (
    <>
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
                <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all h-[85vh] flex flex-col">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center mb-4 flex-shrink-0 border-b pb-3">
                    <div className="flex items-center gap-4">
                      <span>Contacts</span>
                      <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                          type="text"
                          className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border py-1.5"
                          placeholder="Search contacts..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <FilterDropdown
                        label="Type"
                        value={filterType}
                        onChange={setFilterType}
                        options={CONTACT_TYPES}
                      />
                      <FilterDropdown
                        label="Department"
                        value={filterDepartment}
                        onChange={setFilterDepartment}
                        options={CONTACT_DEPARTMENTS}
                      />
                      <FilterDropdown
                        label="Position"
                        value={filterPosition}
                        onChange={setFilterPosition}
                        options={CONTACT_POSITIONS}
                      />

                      <button
                        onClick={handleCreate}
                        className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors ml-2"
                        title="Add New Contact">
                        <PlusIcon className="h-5 w-5" />
                      </button>

                      <button className="text-gray-400 hover:text-gray-500 ml-4" onClick={onClose}>
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </Dialog.Title>

                  <div className="flex-1 overflow-y-auto pr-2">
                    {loading ? (
                      <div className="text-center py-10 text-gray-400">Loading contacts...</div>
                    ) : error ? (
                      <div className="text-center py-10 text-red-500 bg-red-50 rounded-lg border border-red-100 mx-4">
                        <p className="font-medium">Unable to load contacts</p>
                        <p className="text-sm mt-1 mb-3">{error}</p>
                        <button
                          onClick={fetchContacts}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                          Try Again
                        </button>
                      </div>
                    ) : filteredContacts.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">No contacts found.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredContacts.map(contact => (
                          <div
                            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400 group"
                            key={contact._id}>
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                {contact.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    contact.type === 'Internal'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                  {contact.type}
                                </span>
                              </div>
                              <p className="truncate text-xs text-gray-500 font-medium">{contact.position}</p>
                              <p className="truncate text-xs text-gray-500">{contact.company}</p>

                              <div className="mt-2 space-y-1">
                                {contact.department && (
                                  <div className="flex items-center text-xs text-gray-500">
                                    <BuildingOfficeIcon className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                                    <span className="truncate">{contact.department}</span>
                                  </div>
                                )}
                                {contact.email && (
                                  <div className="flex items-center text-xs text-gray-500">
                                    <EnvelopeIcon className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                                    <span className="truncate">{contact.email}</span>
                                  </div>
                                )}
                                {contact.phone && (
                                  <div className="flex items-center text-xs text-gray-500">
                                    <PhoneIcon className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                                    <span className="truncate">{contact.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 bg-white pl-1">
                              <button
                                onClick={() => handleEdit(contact)}
                                className="text-gray-400 hover:text-indigo-600">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(contact._id)}
                                className="text-gray-400 hover:text-red-600">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <ContactFormModal
        isOpen={isContactFormOpen}
        onClose={() => setIsContactFormOpen(false)}
        onSave={handleSaveContact}
        initialData={editingContact || undefined}
        title={editingContact ? 'Edit Contact' : 'New Contact'}
      />
    </>
  );
});

ContactListModal.displayName = 'ContactListModal';
export default ContactListModal;
