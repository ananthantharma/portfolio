/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {BookUser, Link2, Mail, Phone, Plus, Search, UserPlus, X} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import ContactFormModal, {ContactFormData} from '../ContactFormModal';
import {initials, VendorContact, VendorKeyContact, VendorPatch} from './vendorApi';
import styles from './VendorPage.module.css';

interface Props {
  vendorName: string;
  keyContacts: VendorKeyContact[];
  onPatch: (patch: VendorPatch) => Promise<void>;
}

const toPatch = (list: VendorKeyContact[]) => list.map(kc => ({contactId: kc.contactId._id, role: kc.role || ''}));

// "Acme" matches contacts at "Acme Cloud Inc." and vice versa
function worksAt(contact: VendorContact, vendorName: string) {
  const a = contact.company?.trim().toLowerCase();
  const b = vendorName.trim().toLowerCase();
  return !!a && !!b && (a.includes(b) || b.includes(a));
}

function Avatar({contact}: {contact: VendorContact}) {
  const isUrl = contact.image && /^(https?:|data:image\/)/.test(contact.image);
  return (
    <span className={styles.avatar} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {isUrl ? <img alt="" src={contact.image} /> : initials(contact.name)}
    </span>
  );
}

export default function KeyContactsCard({vendorName, keyContacts, onPatch}: Props) {
  const [allContacts, setAllContacts] = useState<VendorContact[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState('');
  const [error, setError] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  // Stable object: the form resets its fields whenever initialData changes identity
  const newContactDefaults = useMemo(() => ({company: vendorName, type: 'External' as const}), [vendorName]);

  const loadContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const json = await res.json();
      setAllContacts(Array.isArray(json.data) ? json.data : []);
    } catch {
      setAllContacts([]);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  const linkedIds = useMemo(() => new Set(keyContacts.map(kc => kc.contactId._id)), [keyContacts]);
  const available = useMemo(() => (allContacts || []).filter(c => !linkedIds.has(c._id)), [allContacts, linkedIds]);
  const suggestions = useMemo(() => available.filter(c => worksAt(c, vendorName)), [available, vendorName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (c: VendorContact) =>
      !q || [c.name, c.company, c.email, c.position].some(v => v?.toLowerCase().includes(q));
    return {
      atVendor: suggestions.filter(matches),
      others: available.filter(c => !worksAt(c, vendorName) && matches(c)).slice(0, 60),
    };
  }, [available, suggestions, query, vendorName]);

  const save = async (next: VendorKeyContact[]) => {
    setError('');
    try {
      await onPatch({keyContacts: toPatch(next)});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    }
  };

  const add = (contact: VendorContact) => {
    save([...keyContacts, {contactId: contact, role: ''}]);
    setQuery('');
  };

  const createContact = async (data: ContactFormData) => {
    setFormOpen(false);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.data) throw new Error(json.error || 'Could not create the contact.');
      setAllContacts(prev => [...(prev || []), json.data]);
      await save([...keyContacts, {contactId: json.data, role: ''}]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the contact.');
    }
  };

  const commitRole = (contactId: string) => {
    setEditingRole(null);
    const current = keyContacts.find(kc => kc.contactId._id === contactId);
    if (!current || current.role === roleDraft.trim()) return;
    save(keyContacts.map(kc => (kc.contactId._id === contactId ? {...kc, role: roleDraft.trim()} : kc)));
  };

  const renderPickerItem = (c: VendorContact) => (
    <button className={styles.pickerItem} key={c._id} onClick={() => add(c)}>
      <Avatar contact={c} />
      <span style={{minWidth: 0}}>
        {c.name}
        <small>{[c.position, c.company].filter(Boolean).join(' · ')}</small>
      </span>
    </button>
  );

  return (
    <section aria-label="Key contacts" className={styles.card} id="vendor-contacts">
      <div className={styles.cardHead}>
        <h2>
          <BookUser size={17} />
          Key contacts
          {keyContacts.length > 0 && <small>{keyContacts.length}</small>}
        </h2>
        <div className={styles.menu} ref={pickerRef}>
          <button className={styles.btn} onClick={() => setPickerOpen(v => !v)} aria-expanded={pickerOpen}>
            <Plus size={14} /> Add from Contacts
          </button>
          {pickerOpen && (
            <div className={styles.picker}>
              <input
                aria-label="Search contacts"
                autoFocus
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, company, or email"
                value={query}
              />
              <div className={styles.pickerList}>
                {allContacts === null && <p className={styles.muted} style={{padding: 8}}>Loading contacts…</p>}
                {filtered.atVendor.length > 0 && (
                  <>
                    <div className={styles.pickerGroup}>At {vendorName}</div>
                    {filtered.atVendor.map(renderPickerItem)}
                  </>
                )}
                {filtered.others.length > 0 && (
                  <>
                    <div className={styles.pickerGroup}>Everyone else</div>
                    {filtered.others.map(renderPickerItem)}
                  </>
                )}
                {allContacts !== null && !filtered.atVendor.length && !filtered.others.length && (
                  <p className={styles.muted} style={{padding: 8}}>
                    {query ? 'No contacts match that search.' : 'All your contacts are already added.'}
                  </p>
                )}
              </div>
              <div className={styles.pickerFoot}>
                <button
                  className={styles.pickerItem}
                  onClick={() => {
                    setPickerOpen(false);
                    setFormOpen(true);
                  }}>
                  <UserPlus size={15} /> Create a new contact at {vendorName}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {keyContacts.length === 0 ? (
        <div className={styles.empty}>Add the people you work with at {vendorName}. They stay linked to your Contacts.</div>
      ) : (
        <div className={styles.list}>
          {keyContacts.map(({contactId: c, role}) => (
            <div className={styles.row} key={c._id}>
              <Avatar contact={c} />
              <div className={styles.rowMain}>
                <div className={styles.rowTitle}>
                  <span>{c.name}</span>
                  {editingRole === c._id ? (
                    <input
                      aria-label={`Role for ${c.name}`}
                      autoFocus
                      onBlur={() => commitRole(c._id)}
                      onChange={e => setRoleDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRole(c._id);
                        if (e.key === 'Escape') setEditingRole(null);
                      }}
                      placeholder="Role at this vendor"
                      style={{padding: '2px 6px', fontSize: 12, width: 170}}
                      value={roleDraft}
                    />
                  ) : (
                    <button
                      className={styles.roleButton}
                      onClick={() => {
                        setEditingRole(c._id);
                        setRoleDraft(role);
                      }}
                      title="Set their role for this vendor">
                      {role || c.position || 'Add role'}
                    </button>
                  )}
                </div>
                <div className={styles.rowSub}>
                  {c.email && (
                    <a href={`mailto:${c.email}`}>
                      <Mail size={12} />
                      {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`}>
                      <Phone size={12} />
                      {c.phone}
                    </a>
                  )}
                  {!c.email && !c.phone && <span>No email or phone in Contacts yet</span>}
                </div>
              </div>
              <span className={`${styles.pill} ${styles.pillGood} ${styles.linkedPill}`} title="Details come from your Contacts list">
                <Link2 size={11} /> Contacts
              </span>
              <div className={styles.rowActions}>
                <button
                  aria-label={`Remove ${c.name} from key contacts`}
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={() => save(keyContacts.filter(kc => kc.contactId._id !== c._id))}
                  title="Remove from this vendor (keeps the contact)">
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && !pickerOpen && (
        <div className={styles.suggest}>
          <Search size={14} />
          <span>
            {suggestions.length} {suggestions.length === 1 ? 'person' : 'people'} in your Contacts{' '}
            {suggestions.length === 1 ? 'works' : 'work'} at {vendorName}
          </span>
          <button className={styles.btn} onClick={() => setPickerOpen(true)}>
            Review
          </button>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}

      <ContactFormModal
        initialData={newContactDefaults}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={createContact}
        title={`New contact at ${vendorName}`}
      />
    </section>
  );
}
