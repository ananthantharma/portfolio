/* eslint-disable react/jsx-sort-props, react-memo/require-usememo, react-memo/require-memo, @typescript-eslint/no-explicit-any */
import {Dialog, Listbox, Transition} from '@headlessui/react';
import {BuildingOffice2Icon, ChevronUpDownIcon, PencilIcon, PhotoIcon, TrashIcon, XMarkIcon} from '@heroicons/react/24/outline';
import React, {Fragment, useEffect, useMemo, useRef, useState} from 'react';

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
  /** Headshot as a JPEG data URL; null removes it */
  photo?: string | null;
}

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => void;
  initialData?: Partial<IContact>;
  title?: string;
}

/** Square-crop any picture to a small JPEG headshot (keeps contacts light to load). */
export function toHeadshot(file: Blob, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      // Centre horizontally; lean towards the top, where faces usually are
      const sx = (img.naturalWidth - side) / 2;
      const sy = Math.max(0, (img.naturalHeight - side) * 0.2);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not read that picture'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file is not a picture we can read'));
    };
    img.src = url;
  });
}

export function contactInitials(name: string) {
  return (
    name
      .split(' ')
      .map(n => n.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function contactColor(name: string) {
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
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length] || colors[0];
}

const fieldClass =
  'w-full rounded-[14px] border-[1.5px] border-[#DFDDE6] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#131313] outline-none transition-colors placeholder:font-medium placeholder:text-[#b4b3bb] focus:border-black';
const labelClass = 'mb-1.5 block text-[13px] font-medium text-[#706f6f]';

const SelectField = ({label, value, onChange, options}: {label: string; value: string; onChange: (val: any) => void; options: string[]}) => (
  <div>
    <label className={labelClass}>{label}</label>
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className={`${fieldClass} relative pr-10 text-left`}>
          <span className="block truncate">{value}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronUpDownIcon className="h-4 w-4 text-[#131313]/40" />
          </span>
        </Listbox.Button>
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-[14px] bg-white py-1 text-[14px] shadow-xl ring-1 ring-black/5 focus:outline-none">
            {options.map(opt => (
              <Listbox.Option
                key={opt}
                value={opt}
                className={({active}) => `cursor-default select-none px-4 py-2 ${active ? 'bg-[#F5F5F7] text-[#131313]' : 'text-[#3a3a3c]'}`}>
                {({selected}) => <span className={`block truncate ${selected ? 'font-semibold' : ''}`}>{opt}</span>}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  </div>
);

const ContactFormModal: React.FC<ContactFormModalProps> = React.memo(({isOpen, onClose, onSave, initialData, title}) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [position, setPosition] = useState<string>(CONTACT_POSITIONS[0]);
  const [department, setDepartment] = useState<string>(CONTACT_DEPARTMENTS[0]);
  const [type, setType] = useState<'Internal' | 'External'>('External');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name || '');
    setCompany(initialData?.company || '');
    setPhone(initialData?.phone || '');
    setEmail(initialData?.email || '');
    setNotes(initialData?.notes || '');
    setPosition(initialData?.position || CONTACT_POSITIONS[0]);
    setDepartment(initialData?.department || CONTACT_DEPARTMENTS[0]);
    setType(initialData?.type || 'External');
    setImage(initialData?.image);
    setPhoto(initialData?.photo || null);
    setPhotoError(null);
  }, [isOpen, initialData]);

  const takePicture = async (file: Blob | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setPhotoError('Paste or drop a picture (PNG, JPG, …).');
    try {
      setPhoto(await toHeadshot(file));
      setPhotoError(null);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Could not use that picture.');
    }
  };

  // Paste a picture anywhere in the form to use it as the headshot
  useEffect(() => {
    if (!isOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      void takePicture(item.getAsFile());
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleIconSelect = React.useCallback((_icon: string, img?: string | null) => setImage(img || undefined), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({name, company, phone, email, notes, position, department, type, image, photo});
  };

  const initials = useMemo(() => contactInitials(name), [name]);
  const color = useMemo(() => contactColor(name), [name]);
  const updated = initialData?.updatedAt ? new Date(initialData.updatedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : null;

  return (
    <Transition appear={true} as={Fragment} show={isOpen}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px]" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="transition duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1.15)]"
              enterFrom="opacity-0 scale-90 translate-y-5"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-[760px] overflow-hidden rounded-[24px] border border-[#f0f0f0] bg-[#F5F5F7] text-left shadow-[0_8px_10px_rgb(0,0,0,0.04),0_30px_60px_-30px_rgb(0,0,0,0.35)]">
                <form onSubmit={handleSubmit}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 md:px-8">
                    <Dialog.Title className="text-[18px] font-semibold text-[#010101]">{title || 'New contact'}</Dialog.Title>
                    <button type="button" aria-label="Close" onClick={onClose} className="p-1 text-[#a0a0a0] transition-colors hover:text-gray-500">
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col rounded-[18px] border-y-[1.6px] border-[#EAE9F2] bg-white md:flex-row">
                    {/* Form */}
                    <div className="flex-1 space-y-4 p-6">
                      <div>
                        <label className={labelClass}>Full name</label>
                        <input type="text" required className={fieldClass} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
                      </div>
                      <div>
                        <label className={labelClass}>Email</label>
                        <input type="email" className={fieldClass} value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" />
                      </div>
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="flex-1">
                          <label className={labelClass}>Company</label>
                          <input type="text" required className={fieldClass} value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" />
                        </div>
                        <div className="flex-1">
                          <label className={labelClass}>Phone</label>
                          <input type="tel" className={fieldClass} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
                        </div>
                      </div>
                      <SelectField label="Title" value={position} onChange={setPosition} options={CONTACT_POSITIONS} />
                      <SelectField label="Department" value={department} onChange={setDepartment} options={CONTACT_DEPARTMENTS} />
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div>
                          <label className={labelClass}>Type</label>
                          <div className="inline-flex rounded-full border-[1.5px] border-[#DFDDE6] bg-[#F7F7F9] p-0.5">
                            {(CONTACT_TYPES as Array<'Internal' | 'External'>).map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${type === t ? 'bg-white text-[#131313] shadow-sm' : 'text-[#8a8990] hover:text-[#131313]'}`}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className={labelClass}>Company logo</label>
                          <IconPicker selectedIcon="User" selectedImage={image} onSelectIcon={handleIconSelect} />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Notes</label>
                        <textarea className={`${fieldClass} resize-none font-medium`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything worth remembering…" />
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-0 w-full border-t-[1.6px] border-dashed border-[#E9E8EB] md:h-auto md:w-0 md:border-l-[1.6px] md:border-t-0" />

                    {/* Preview — paste, drop or pick a headshot */}
                    <div
                      className={`flex flex-1 flex-col items-center justify-center px-6 py-8 transition-colors ${dragging ? 'bg-[#F5F5F7]' : ''}`}
                      onDragLeave={() => setDragging(false)}
                      onDragOver={e => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDrop={e => {
                        e.preventDefault();
                        setDragging(false);
                        void takePicture(e.dataTransfer.files?.[0]);
                      }}>
                      <span className="mb-4 text-[14px] font-medium text-[#706f6f]">Preview</span>
                      <div className="relative mb-4">
                        {photo ? (
                          <img src={photo} alt={name || 'Headshot'} className="h-32 w-32 rounded-full object-cover object-top shadow-sm ring-1 ring-[#f0f0f0]" />
                        ) : (
                          <div className={`flex h-32 w-32 items-center justify-center rounded-full text-[34px] font-bold ring-1 ring-[#f0f0f0] ${color}`}>{initials}</div>
                        )}
                        <button
                          type="button"
                          aria-label="Choose a headshot"
                          title="Choose a picture"
                          onClick={() => fileInput.current?.click()}
                          className="absolute bottom-0 right-0 rounded-full border border-[#f0f0f0] bg-white p-2 text-[#707070]/70 shadow-md transition-colors hover:text-[#131313]">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        {photo && (
                          <button
                            type="button"
                            aria-label="Remove headshot"
                            title="Remove picture"
                            onClick={() => setPhoto(null)}
                            className="absolute left-0 top-0 rounded-full border border-[#f0f0f0] bg-white p-1.5 text-[#707070]/70 shadow-md transition-colors hover:text-rose-600">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                        <input
                          ref={fileInput}
                          accept="image/*"
                          className="hidden"
                          type="file"
                          onChange={e => {
                            void takePicture(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </div>
                      <h3 className="text-center text-[18px] font-bold text-[#101010]">{name || 'Contact name'}</h3>
                      <p className="mb-4 text-center text-[14px] text-[#777678]">{position}</p>
                      <div className="flex max-w-full items-center gap-2 rounded-full bg-[#F7F7F9] px-3 py-1 text-[12px] font-medium text-[#101010]/60 shadow-sm">
                        {image ? (
                          <img src={`https://logo.clearbit.com/${image}`} alt="" className="h-3.5 w-3.5 rounded-sm object-contain" />
                        ) : (
                          <BuildingOffice2Icon className="h-3.5 w-3.5 text-[#777678]" />
                        )}
                        <span className="truncate">{company || 'Company'}</span>
                      </div>
                      <p className={`mt-5 flex items-center gap-1.5 text-center text-[11.5px] ${photoError ? 'text-rose-600' : 'text-[#a3a2a8]'}`}>
                        <PhotoIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        {photoError || 'Paste (Ctrl+V) or drop a picture for the headshot'}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex flex-col-reverse items-center justify-between gap-4 bg-[#F5F5F7] px-6 py-5 sm:flex-row md:px-8">
                    <span className="text-[13px] text-[#767578]">
                      {updated ? (
                        <>
                          Last updated: <span className="font-medium">{updated}</span>
                        </>
                      ) : (
                        'New contact'
                      )}
                    </span>
                    <div className="flex w-full gap-3 sm:w-auto">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-full border-[1.6px] border-[#E2E2E6] bg-[#f3f4f6] px-5 py-2 text-[14px] font-bold text-[#0F0F0F] transition-colors hover:bg-[#ebebee] sm:flex-none">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 rounded-full bg-[#0F0F0F] px-5 py-2 text-[13px] font-bold text-white shadow-lg shadow-black/10 transition-colors hover:bg-[#222] sm:flex-none">
                        {initialData?._id ? 'Save changes' : 'Save contact'}
                      </button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});

ContactFormModal.displayName = 'ContactFormModal';
export default ContactFormModal;
