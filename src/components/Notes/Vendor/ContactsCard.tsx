/* eslint-disable react-memo/require-usememo, react-memo/require-memo, react/jsx-sort-props */
'use client';

import {BookUser, Building2, ChevronDown, Link2, Mail, Phone, Plus, Search, UserPlus, X} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import ContactFormModal, {ContactFormData} from '../ContactFormModal';
import {initials, VendorContact, VendorKeyContact, VendorPatch} from './vendorApi';
import styles from './VendorPage.module.css';

// 'vendor' = people at the vendor (key contacts); 'internal' = people in your own organization
export type ContactsVariant = 'vendor' | 'internal';

interface Props {
  variant: ContactsVariant;
  vendorName: string;
  contacts: VendorKeyContact[];
  onPatch: (patch: VendorPatch) => Promise<void>;
}

const COPY = {
  vendor: {
    id: 'vendor-contacts',
    title: 'Key contacts',
    field: 'keyContacts',
    empty: (vendor: string) => `Add the people you work with at ${vendor}. They stay linked to your Contacts.`,
    rolePlaceholder: 'Role at this vendor',
    createLabel: (vendor: string) => `Create a new contact at ${vendor}`,
    matchGroup: (vendor: string) => `At ${vendor}`,
  },
  internal: {
    id: 'vendor-internal-contacts',
    title: 'Internal contacts',
    field: 'internalContacts',
    empty: (vendor: string) =>
      `Add the people on your side who work with ${vendor}, like the contract owner, technical lead, or approver.`,
    rolePlaceholder: 'Their role with this vendor',
    createLabel: () => 'Create a new internal contact',
    matchGroup: () => 'Internal contacts',
  },
} as const;

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

const collapsedKey = (variant: ContactsVariant) => `VENDOR_CARD_COLLAPSED_${variant}`;

export default function ContactsCard({variant, vendorName, contacts, onPatch}: Props) {
  const copy = COPY[variant];
  const [allContacts, setAllContacts] = useState<VendorContact[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState('');
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Minimized cards stay minimized, on every vendor, until expanded again
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(collapsedKey(variant)) === 'true');
    } catch {
      // storage unavailable: the toggle still works for this visit
    }
  }, [variant]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (next) setPickerOpen(false);
    try {
      localStorage.setItem(collapsedKey(variant), String(next));
    } catch {
      // ignore unavailable storage
    }
  };

  useEffect(() => {
    fetch('/api/contacts')
      .then(res => res.json())
      .then(json => setAllContacts(Array.isArray(json.data) ? json.data : []))
      .catch(() => setAllContacts([]));
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  // Who belongs at the top of the picker: people at the vendor, or people marked Internal
  const isMatch = (c: VendorContact) => (variant === 'vendor' ? worksAt(c, vendorName) : c.type === 'Internal');

  const linkedIds = useMemo(() => new Set(contacts.map(kc => kc.contactId._id)), [contacts]);
  const available = useMemo(() => (allContacts || []).filter(c => !linkedIds.has(c._id)), [allContacts, linkedIds]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matches = useMemo(() => available.filter(isMatch), [available, vendorName, variant]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = (c: VendorContact) =>
      !q || [c.name, c.company, c.email, c.position, c.department].some(v => v?.toLowerCase().includes(q));
    return {
      top: matches.filter(hit),
      others: available.filter(c => !isMatch(c) && hit(c)).slice(0, 60),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, matches, query]);

  // New internal contacts default to the company your other internal contacts use
  const newContactDefaults = useMemo(() => {
    if (variant === 'vendor') return {company: vendorName, type: 'External' as const};
    const tally = new Map<string, number>();
    (allContacts || [])
      .filter(c => c.type === 'Internal' && c.company)
      .forEach(c => tally.set(c.company, (tally.get(c.company) || 0) + 1));
    const company = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return {company, type: 'Internal' as const};
  }, [variant, vendorName, allContacts]);

  const save = async (next: VendorKeyContact[]) => {
    setError('');
    try {
      await onPatch({[copy.field]: toPatch(next)});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    }
  };

  const add = (contact: VendorContact) => {
    save([...contacts, {contactId: contact, role: ''}]);
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
      await save([...contacts, {contactId: json.data, role: ''}]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the contact.');
    }
  };

  const commitRole = (contactId: string) => {
    setEditingRole(null);
    const current = contacts.find(kc => kc.contactId._id === contactId);
    if (!current || current.role === roleDraft.trim()) return;
    save(contacts.map(kc => (kc.contactId._id === contactId ? {...kc, role: roleDraft.trim()} : kc)));
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

  const Icon = variant === 'vendor' ? BookUser : Building2;
  const bodyId = `${copy.id}-body`;

  return (
    <section aria-label={copy.title} className={styles.card} data-collapsed={collapsed} id={copy.id}>
      <div className={styles.cardHead} style={collapsed ? {marginBottom: 0} : undefined}>
        <h2>
          <button
            aria-controls={bodyId}
            aria-expanded={!collapsed}
            className={styles.collapseToggle}
            onClick={toggleCollapsed}
            title={collapsed ? `Expand ${copy.title.toLowerCase()}` : `Minimize ${copy.title.toLowerCase()}`}>
            <ChevronDown size={15} className={styles.collapseChevron} />
            <Icon size={17} />
            {copy.title}
            {contacts.length > 0 && <small>{contacts.length}</small>}
          </button>
        </h2>
        {!collapsed && (
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
                  {filtered.top.length > 0 && (
                    <>
                      <div className={styles.pickerGroup}>{copy.matchGroup(vendorName)}</div>
                      {filtered.top.map(renderPickerItem)}
                    </>
                  )}
                  {filtered.others.length > 0 && (
                    <>
                      <div className={styles.pickerGroup}>Everyone else</div>
                      {filtered.others.map(renderPickerItem)}
                    </>
                  )}
                  {allContacts !== null && !filtered.top.length && !filtered.others.length && (
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
                    <UserPlus size={15} /> {copy.createLabel(vendorName)}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <div id={bodyId}>
          {contacts.length === 0 ? (
            <div className={styles.empty}>{copy.empty(vendorName)}</div>
          ) : (
            <div className={styles.list}>
              {contacts.map(({contactId: c, role}) => (
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
                          placeholder={copy.rolePlaceholder}
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
                          title={variant === 'vendor' ? 'Set their role for this vendor' : 'Set their role with this vendor'}>
                          {role || c.position || 'Add role'}
                        </button>
                      )}
                    </div>
                    <div className={styles.rowSub}>
                      {variant === 'internal' && c.department && <span>{c.department}</span>}
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
                      aria-label={`Remove ${c.name} from ${copy.title.toLowerCase()}`}
                      className={`${styles.iconBtn} ${styles.danger}`}
                      onClick={() => save(contacts.filter(kc => kc.contactId._id !== c._id))}
                      title="Remove from this vendor (keeps the contact)">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {variant === 'vendor' && matches.length > 0 && !pickerOpen && (
            <div className={styles.suggest}>
              <Search size={14} />
              <span>
                {matches.length} {matches.length === 1 ? 'person' : 'people'} in your Contacts{' '}
                {matches.length === 1 ? 'works' : 'work'} at {vendorName}
              </span>
              <button className={styles.btn} onClick={() => setPickerOpen(true)}>
                Review
              </button>
            </div>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      <ContactFormModal
        initialData={newContactDefaults}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={createContact}
        title={variant === 'vendor' ? `New contact at ${vendorName}` : 'New internal contact'}
      />
    </section>
  );
}
