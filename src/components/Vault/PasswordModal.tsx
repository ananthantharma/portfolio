/* eslint-disable react/jsx-sort-props */
import {CreditCard, FileText, Key, KeyRound, LucideIcon, Star, User, X} from 'lucide-react';
import React, {memo, useCallback, useEffect, useState} from 'react';

import {VaultEntry, VaultItemType} from '../../data/dataDef';

interface PasswordModalProps {
  initialData?: Partial<VaultEntry>;
  isOpen: boolean;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (entry: Omit<VaultEntry, '_id'>) => Promise<void>;
}

/* ─── Type tabs ──────────────────────────────────────────────────────── */
const TYPE_TABS: {id: VaultItemType; label: string; Icon: LucideIcon}[] = [
  {id: 'password', label: 'Password', Icon: KeyRound},
  {id: 'card',     label: 'Card',     Icon: CreditCard},
  {id: 'note',     label: 'Note',     Icon: FileText},
  {id: 'identity', label: 'Identity', Icon: User},
  {id: 'apikey',   label: 'API Key',  Icon: Key},
];

const TYPE_COLORS: Record<VaultItemType, string> = {
  password: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  card:     'border-violet-500/50 bg-violet-500/10 text-violet-400',
  note:     'border-amber-500/50 bg-amber-500/10 text-amber-400',
  identity: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  apikey:   'border-cyan-500/50 bg-cyan-500/10 text-cyan-400',
};

/* ─── Field component ────────────────────────────────────────────────── */
const Field = memo(
  ({
    hint,
    label,
    mono,
    onChange,
    placeholder,
    required,
    rows,
    type,
    value,
  }: {
    hint?: string;
    label: string;
    mono?: boolean;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    rows?: number;
    type?: string;
    value: string;
  }) => {
    const cls =
      'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 ' +
      (mono ? 'font-mono' : '');
    return (
      <div className="space-y-1.5">
        <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {label}
          {required && <span className="text-red-400">*</span>}
          {hint && <span className="ml-auto font-normal normal-case tracking-normal text-zinc-600">{hint}</span>}
        </label>
        {rows ? (
          <textarea
            className={cls}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            rows={rows}
            value={value}
          />
        ) : (
          <input
            className={cls}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            type={type ?? 'text'}
            value={value}
          />
        )}
      </div>
    );
  },
);
Field.displayName = 'Field';

/* ─── Empty vault entry ──────────────────────────────────────────────── */
const empty = (): Omit<VaultEntry, '_id'> => ({
  itemType: 'password',
  title: '',
  favorite: false,
  site: '',
  username: '',
  password: '',
  cardNumber: '',
  cardHolder: '',
  expiry: '',
  cvv: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  dateOfBirth: '',
  idNumber: '',
  service: '',
  apiKey: '',
  apiSecret: '',
  content: '',
  notes: '',
});

/* ─── Modal ──────────────────────────────────────────────────────────── */
const PasswordModal: React.FC<PasswordModalProps> = memo(({initialData, isOpen, mode, onClose, onSave}) => {
  const [form, setForm] = useState<Omit<VaultEntry, '_id'>>(empty());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialData) {
      setForm({...empty(), ...initialData});
    } else {
      setForm(empty());
    }
  }, [isOpen, mode, initialData]);

  const set = useCallback(<K extends keyof Omit<VaultEntry, '_id'>>(key: K, value: Omit<VaultEntry, '_id'>[K]) => {
    setForm(f => ({...f, [key]: value}));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeColor = TYPE_COLORS[form.itemType ?? 'password'];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-white/[0.08] bg-[#0e0e18] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <h2 className="text-lg font-bold text-white">
            {mode === 'add' ? 'New Vault Item' : 'Edit Item'}
          </h2>
          <div className="flex items-center gap-3">
            {/* Favorite toggle */}
            <button
              className={`rounded-lg p-2 transition-colors ${
                form.favorite ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-600 hover:text-zinc-400'
              }`}
              onClick={() => set('favorite', !form.favorite)}
              title="Favorite"
              type="button">
              <Star fill={form.favorite ? 'currentColor' : 'none'} size={16} />
            </button>
            <button
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
              onClick={onClose}
              type="button">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] px-6 py-3">
          {TYPE_TABS.map(({id, label, Icon}) => (
            <button
              key={id}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                form.itemType === id
                  ? TYPE_COLORS[id]
                  : 'border-transparent text-zinc-600 hover:bg-white/5 hover:text-zinc-400'
              }`}
              onClick={() => set('itemType', id)}
              type="button">
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Form body */}
        <form className="overflow-y-auto" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">

            {/* Title — always shown */}
            <div className="md:col-span-2">
              <Field
                label="Title"
                onChange={v => set('title', v)}
                placeholder="e.g. Netflix, Visa Card, AWS Key…"
                required
                value={form.title ?? ''}
              />
            </div>

            {/* ── PASSWORD ── */}
            {form.itemType === 'password' && (
              <>
                <Field label="Website URL" onChange={v => set('site', v)} placeholder="https://example.com" value={form.site ?? ''} />
                <Field label="Username / Email" onChange={v => set('username', v)} placeholder="user@example.com" value={form.username ?? ''} />
                <div className="md:col-span-2">
                  <Field hint="Stored as-is — do not share" label="Password" mono onChange={v => set('password', v)} placeholder="••••••••••" value={form.password ?? ''} />
                </div>
              </>
            )}

            {/* ── CARD ── */}
            {form.itemType === 'card' && (
              <>
                <div className="md:col-span-2">
                  <Field label="Card Number" mono onChange={v => set('cardNumber', v)} placeholder="1234 5678 9012 3456" value={form.cardNumber ?? ''} />
                </div>
                <Field label="Cardholder Name" onChange={v => set('cardHolder', v)} placeholder="John Doe" value={form.cardHolder ?? ''} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expiry" onChange={v => set('expiry', v)} placeholder="MM/YY" value={form.expiry ?? ''} />
                  <Field label="CVV" mono onChange={v => set('cvv', v)} placeholder="•••" value={form.cvv ?? ''} />
                </div>
              </>
            )}

            {/* ── SECURE NOTE ── */}
            {form.itemType === 'note' && (
              <div className="md:col-span-2">
                <Field label="Content" onChange={v => set('content', v)} placeholder="Your secure note…" rows={6} value={form.content ?? ''} />
              </div>
            )}

            {/* ── IDENTITY ── */}
            {form.itemType === 'identity' && (
              <>
                <Field label="Full Name" onChange={v => set('fullName', v)} placeholder="John Doe" value={form.fullName ?? ''} />
                <Field label="Date of Birth" onChange={v => set('dateOfBirth', v)} placeholder="YYYY-MM-DD" type="date" value={form.dateOfBirth ?? ''} />
                <Field label="Email" onChange={v => set('email', v)} placeholder="john@example.com" type="email" value={form.email ?? ''} />
                <Field label="Phone" onChange={v => set('phone', v)} placeholder="+1 (555) 000-0000" value={form.phone ?? ''} />
                <div className="md:col-span-2">
                  <Field label="Address" onChange={v => set('address', v)} placeholder="123 Main St, City, Country" value={form.address ?? ''} />
                </div>
                <div className="md:col-span-2">
                  <Field hint="Passport, Driver's License, etc." label="ID / Document Number" mono onChange={v => set('idNumber', v)} placeholder="AB123456789" value={form.idNumber ?? ''} />
                </div>
              </>
            )}

            {/* ── API KEY ── */}
            {form.itemType === 'apikey' && (
              <>
                <Field label="Service" onChange={v => set('service', v)} placeholder="AWS, Stripe, OpenAI…" value={form.service ?? ''} />
                <div className="md:col-span-2">
                  <Field hint="Keep this private" label="API Key / Token" mono onChange={v => set('apiKey', v)} placeholder="sk-…" value={form.apiKey ?? ''} />
                </div>
                <div className="md:col-span-2">
                  <Field label="Secret / Password" mono onChange={v => set('apiSecret', v)} placeholder="Optional secret or password" value={form.apiSecret ?? ''} />
                </div>
              </>
            )}

            {/* Notes — always shown (except for secure note type) */}
            {form.itemType !== 'note' && (
              <div className="md:col-span-2">
                <Field label="Notes" onChange={v => set('notes', v)} placeholder="Optional notes…" rows={2} value={form.notes ?? ''} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-white/[0.06] px-6 py-4">
            <button
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              disabled={loading}
              onClick={onClose}
              type="button">
              Cancel
            </button>
            <button
              className={`rounded-xl border px-6 py-2.5 text-sm font-bold text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${activeColor} bg-gradient-to-r from-cyan-600/30 to-violet-600/30 hover:from-cyan-600/50 hover:to-violet-600/50 shadow-lg`}
              disabled={loading}
              type="submit">
              {loading ? 'Saving…' : mode === 'add' ? 'Save Item' : 'Update Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

PasswordModal.displayName = 'PasswordModal';
export default PasswordModal;
