/* eslint-disable react/jsx-sort-props, react-memo/require-usememo, react-memo/require-memo, @typescript-eslint/no-explicit-any */
import {Dialog, Listbox, Transition} from '@headlessui/react';
import {ChevronUpDownIcon, XMarkIcon} from '@heroicons/react/24/outline';
import React, {Fragment, useEffect, useMemo, useState} from 'react';

import {CONTACT_DEPARTMENTS, CONTACT_POSITIONS, CONTACT_TYPES, IContactBase as IContact} from '@/lib/contact-constants';

import {IconPicker} from './IconPicker';

export interface ContactFormData {
  name: string;
  company: string;
  phone: string;
  email: string;
  notes: string;
  position: string;
  department: string;
  type: 'Internal' | 'External';
  image?: string;
}

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => void;
  initialData?: Partial<IContact>;
  title?: string;
}

// Select component with clean styling
const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (val: any) => void;
  options: string[];
}) => (
  <div>
    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 text-sm text-gray-700 transition-colors hover:border-gray-300">
          <span className="block truncate">{value}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
          </span>
        </Listbox.Button>
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute mt-1 max-h-48 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none z-10">
            {options.map((opt, idx) => (
              <Listbox.Option
                key={idx}
                value={opt}
                className={({active}) =>
                  `cursor-default select-none py-2 pl-3 pr-4 ${active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`
                }>
                {({selected}) => (
                  <span className={`block truncate ${selected ? 'font-medium text-gray-900' : ''}`}>{opt}</span>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  </div>
);

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
    const [image, setImage] = useState<string | undefined>(undefined);

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
          setImage(initialData.image);
        } else {
          setName('');
          setCompany('');
          setPhone('');
          setEmail('');
          setNotes('');
          setPosition(CONTACT_POSITIONS[0]);
          setDepartment(CONTACT_DEPARTMENTS[0]);
          setType('External');
          setImage(undefined);
        }
      }
    }, [isOpen, initialData]);

    const handleIconSelect = React.useCallback((_icon: string, img?: string | null) => {
      setImage(img || undefined);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({name, company, phone, email, notes, position, department, type, image});
    };

    // Auto-avatar preview
    const avatarInitials = useMemo(() => {
      return (
        name
          .split(' ')
          .map(n => n.charAt(0))
          .slice(0, 2)
          .join('')
          .toUpperCase() || '?'
      );
    }, [name]);

    const avatarColor = useMemo(() => {
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
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length] || colors[0];
    }, [name]);

    return (
      <Transition appear={true} as={Fragment} show={isOpen}>
        <Dialog as="div" className="relative z-[60]" onClose={onClose}>
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl ring-1 ring-black/5 transition-all">
                  {/* Header with Avatar Preview */}
                  <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900 tracking-tight">{title || 'New Contact'}</h3>
                      <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Avatar Preview */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold transition-all ${avatarColor}`}>
                        {image ? (
                          <img
                            src={`https://logo.clearbit.com/${image}`}
                            alt={name}
                            className="h-14 w-14 rounded-full object-contain bg-white border border-gray-100"
                            onError={e => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          avatarInitials
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{name || 'Contact Name'}</p>
                        <p className="text-xs text-gray-400">
                          {company || 'Company'} · {position}
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="px-6 py-4">
                    {/* Two-column layout */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {/* Name - full width */}
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Name
                        </label>
                        <input
                          type="text"
                          required
                          className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-colors"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>

                      {/* Company - full width */}
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Company
                        </label>
                        <input
                          type="text"
                          required
                          className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-colors"
                          value={company}
                          onChange={e => setCompany(e.target.value)}
                          placeholder="Acme Corp"
                        />
                      </div>

                      {/* Type */}
                      <SelectField label="Type" value={type} onChange={setType} options={CONTACT_TYPES} />

                      {/* Position */}
                      <SelectField
                        label="Position"
                        value={position}
                        onChange={setPosition}
                        options={CONTACT_POSITIONS}
                      />

                      {/* Department - full width */}
                      <div className="col-span-2">
                        <SelectField
                          label="Department"
                          value={department}
                          onChange={setDepartment}
                          options={CONTACT_DEPARTMENTS}
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Phone <span className="font-normal text-gray-300">(Optional)</span>
                        </label>
                        <input
                          type="tel"
                          className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-colors"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+1 555 123 4567"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Email <span className="font-normal text-gray-300">(Optional)</span>
                        </label>
                        <input
                          type="email"
                          className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-colors"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="john@acme.com"
                        />
                      </div>

                      {/* Logo */}
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Logo <span className="font-normal text-gray-300">(Optional)</span>
                        </label>
                        <IconPicker selectedIcon="User" selectedImage={image} onSelectIcon={handleIconSelect} />
                      </div>

                      {/* Notes */}
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Notes <span className="font-normal text-gray-300">(Optional)</span>
                        </label>
                        <textarea
                          className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-colors resize-none"
                          rows={2}
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Additional notes..."
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        onClick={onClose}>
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
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
