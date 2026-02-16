/* eslint-disable react/jsx-sort-props, simple-import-sort/imports, react-memo/require-usememo, react-memo/require-memo */
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';

import { CONTACT_DEPARTMENTS, IContactBase as IContact } from '@/lib/contact-constants';
import ContactFormModal, { ContactFormData } from './ContactFormModal';

interface ContactListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortField = 'name' | 'company' | 'recent';

// Avatar with auto-generated color
const ContactAvatar = React.memo(({ name, image }: { name: string; image?: string }) => {
  // Generate a consistent color from the name
  const getColor = (str: string) => {
    const colors = [
      'bg-rose-100 text-rose-700',
      'bg-sky-100 text-sky-700',
      'bg-amber-100 text-amber-700',
      'bg-emerald-100 text-emerald-700',
      'bg-violet-100 text-violet-700',
      'bg-cyan-100 text-cyan-700',
      'bg-pink-100 text-pink-700',
      'bg-lime-100 text-lime-700',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = name
    .split(' ')
    .map(n => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative flex-shrink-0">
      {image ? (
        <img
          src={`/api/notes/brandfetch?domain=${image}`}
          alt={name}
          className="h-11 w-11 rounded-full object-contain bg-white border border-gray-100"
          onError={e => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div
        className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold ${getColor(name)} ${image ? 'hidden' : ''
          }`}>
        {initials || '?'}
      </div>
    </div>
  );
});
ContactAvatar.displayName = 'ContactAvatar';

// Filter Pill
const FilterPill = React.memo(({
  label, active, onClick, count,
}: {
  label: string; active: boolean; onClick: () => void; count?: number;
}) => (
  <button
    className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all duration-150 flex items-center gap-1 ${active ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
      }`}
    onClick={onClick}>
    {label}
    {count !== undefined && count > 0 && (
      <span className={`text-[9px] px-1 py-0.5 rounded-full leading-none ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
        }`}>{count}</span>
    )}
  </button>
));
FilterPill.displayName = 'FilterPill';

const ContactListModal: React.FC<ContactListModalProps> = React.memo(({ isOpen, onClose }) => {
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [filterType, setFilterType] = useState<string>('All');
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('name');

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
      setContacts(prev => prev.filter(c => c._id !== id));
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting contact:', error);
      fetchContacts();
    }
  };

  const handleSaveContact = async (data: ContactFormData) => {
    try {
      if (editingContact) {
        await fetch(`/api/contacts/${editingContact._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    let result = contacts.filter(c => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (c.name || '').toLowerCase().includes(query) ||
        (c.company || '').toLowerCase().includes(query) ||
        (c.notes || '').toLowerCase().includes(query) ||
        (c.email || '').toLowerCase().includes(query) ||
        (c.phone || '').toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (filterType !== 'All' && c.type !== filterType) return false;
      if (filterDepartment !== 'All' && c.department !== filterDepartment) return false;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortField) {
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'company': return (a.company || '').localeCompare(b.company || '');
        case 'recent': return 0; // Keep API order (most recent first)
        default: return 0;
      }
    });

    return result;
  }, [contacts, searchQuery, filterType, filterDepartment, sortField]);

  // Count stats
  const internalCount = contacts.filter(c => c.type === 'Internal').length;
  const externalCount = contacts.filter(c => c.type === 'External').length;

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-amber-100 text-amber-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <>
      <Transition appear={true} as={Fragment} show={isOpen}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-[0.98] translate-y-2"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl ring-1 ring-black/5 transition-all h-[85vh] flex flex-col">

                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Contacts</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">{contacts.length} total</p>
                      </div>

                      {/* Search */}
                      <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          className="w-64 rounded-lg border border-gray-200 bg-gray-50/50 pl-9 pr-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-colors"
                          placeholder="Search by name, company, email..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCreate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-xs font-medium"
                        title="Add New Contact">
                        <PlusIcon className="h-3.5 w-3.5" />
                        New Contact
                      </button>
                      <div className="w-px h-6 bg-gray-200 mx-1" />
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors" onClick={onClose}>
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Filters Bar */}
                  <div className="px-6 py-2.5 flex items-center gap-4 border-b border-gray-50 flex-shrink-0 bg-gray-50/30">
                    {/* Type */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Type</span>
                      <FilterPill label="All" active={filterType === 'All'} onClick={() => setFilterType('All')} count={contacts.length} />
                      <FilterPill label="Internal" active={filterType === 'Internal'} onClick={() => setFilterType('Internal')} count={internalCount} />
                      <FilterPill label="External" active={filterType === 'External'} onClick={() => setFilterType('External')} count={externalCount} />
                    </div>

                    <div className="w-px h-5 bg-gray-200" />

                    {/* Department */}
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1 flex-shrink-0">Dept</span>
                      <FilterPill label="All" active={filterDepartment === 'All'} onClick={() => setFilterDepartment('All')} />
                      {CONTACT_DEPARTMENTS.slice(0, 6).map(dept => (
                        <FilterPill key={dept} label={dept} active={filterDepartment === dept} onClick={() => setFilterDepartment(dept)} />
                      ))}
                    </div>

                    <div className="w-px h-5 bg-gray-200" />

                    {/* Sort */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <ArrowsUpDownIcon className="h-3.5 w-3.5 text-gray-400" />
                      {(['name', 'company', 'recent'] as SortField[]).map(field => (
                        <button
                          key={field}
                          onClick={() => setSortField(field)}
                          className={`px-2 py-1 text-[10px] font-medium rounded-md capitalize transition-colors ${sortField === field ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                            }`}>
                          {field}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500 mb-3" />
                        <p className="text-sm">Loading contacts...</p>
                      </div>
                    ) : error ? (
                      <div className="text-center py-12 text-red-500 bg-red-50 rounded-xl border border-red-100">
                        <p className="font-medium">Unable to load contacts</p>
                        <p className="text-sm mt-1 mb-3">{error}</p>
                        <button onClick={fetchContacts}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-red-700 bg-white border border-red-200 hover:bg-red-50 transition-colors">
                          Try Again
                        </button>
                      </div>
                    ) : filteredContacts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <UserIcon className="h-12 w-12 text-gray-200 mb-3" />
                        <p className="text-sm font-medium text-gray-500">
                          {searchQuery ? 'No contacts match your search' : 'No contacts yet'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {searchQuery ? 'Try a different search term' : 'Add your first contact to get started'}
                        </p>
                        {!searchQuery && (
                          <button onClick={handleCreate}
                            className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-xs font-medium">
                            <PlusIcon className="h-3.5 w-3.5" />
                            Add Contact
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {filteredContacts.map(contact => (
                          <div
                            className="group relative bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all duration-150"
                            key={contact._id}>

                            <div className="flex items-start gap-3">
                              <ContactAvatar name={contact.name} image={contact.image} />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[13px] font-semibold text-gray-900 truncate">
                                    {highlightMatch(contact.name, searchQuery)}
                                  </h4>
                                  <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${contact.type === 'Internal'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-sky-50 text-sky-600'
                                    }`}>
                                    {contact.type}
                                  </span>
                                </div>
                                <p className="text-[11px] font-medium text-gray-500 truncate">{contact.position}</p>
                                {contact.company && (
                                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                    {highlightMatch(contact.company, searchQuery)}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Quick Info */}
                            <div className="mt-3 space-y-1">
                              {contact.department && (
                                <div className="flex items-center text-[11px] text-gray-400">
                                  <BuildingOfficeIcon className="mr-1.5 h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{contact.department}</span>
                                </div>
                              )}
                            </div>

                            {/* Quick Actions */}
                            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {contact.email && (
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                                    onClick={e => e.stopPropagation()}
                                    title={contact.email}>
                                    <EnvelopeIcon className="h-3 w-3" />
                                    Email
                                  </a>
                                )}
                                {contact.phone && (
                                  <a
                                    href={`tel:${contact.phone}`}
                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                                    onClick={e => e.stopPropagation()}
                                    title={contact.phone}>
                                    <PhoneIcon className="h-3 w-3" />
                                    Call
                                  </a>
                                )}
                              </div>

                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEdit(contact)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                  title="Edit">
                                  <PencilIcon className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(contact._id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Delete">
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Notes preview */}
                            {contact.notes && (
                              <p className="mt-2 text-[10px] text-gray-400 truncate">{contact.notes}</p>
                            )}
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
