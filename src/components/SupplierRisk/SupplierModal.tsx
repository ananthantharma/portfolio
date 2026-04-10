'use client';

import React, {useEffect, useState} from 'react';

const CATEGORIES = [
  'Electronics',
  'Raw Materials',
  'Manufacturing',
  'Logistics',
  'Chemicals',
  'Packaging',
  'Software & IT',
  'Professional Services',
  'Food & Beverage',
  'Other',
];

const COUNTRIES = [
  'USA',
  'Canada',
  'Germany',
  'UK',
  'France',
  'China',
  'India',
  'Japan',
  'South Korea',
  'Vietnam',
  'Mexico',
  'Brazil',
  'Australia',
  'Singapore',
  'South Africa',
  'Other',
];

interface SupplierFormData {
  name: string;
  country: string;
  category: string;
  contactName: string;
  contactEmail: string;
  website: string;
  annualSpend: string;
  currency: string;
  status: string;
  financialRisk: {score: number; notes: string};
  operationalRisk: {score: number; notes: string};
  complianceRisk: {score: number; notes: string};
  esgRisk: {score: number; notes: string};
  mitigationPlan: string;
  tags: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<SupplierFormData>) => Promise<void>;
  initial?: Partial<SupplierFormData> & {_id?: string};
  title?: string;
}

const DEFAULT_FORM: SupplierFormData = {
  name: '',
  country: 'USA',
  category: 'Electronics',
  contactName: '',
  contactEmail: '',
  website: '',
  annualSpend: '',
  currency: 'USD',
  status: 'Active',
  financialRisk: {score: 20, notes: ''},
  operationalRisk: {score: 20, notes: ''},
  complianceRisk: {score: 20, notes: ''},
  esgRisk: {score: 20, notes: ''},
  mitigationPlan: '',
  tags: '',
};

const scoreColor = (v: number) =>
  v <= 30 ? 'text-emerald-600' : v <= 60 ? 'text-yellow-600' : v <= 80 ? 'text-orange-600' : 'text-red-600';

export const SupplierModal: React.FC<Props> = ({isOpen, onClose, onSave, initial, title = 'Add Supplier'}) => {
  const [form, setForm] = useState<SupplierFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initial) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawTags = (initial as any).tags;
        const tagsStr = Array.isArray(rawTags) ? rawTags.join(', ') : rawTags ?? '';
        setForm({...DEFAULT_FORM, ...(initial as Partial<SupplierFormData>), tags: tagsStr});
      } else {
        setForm(DEFAULT_FORM);
      }
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const set = (field: keyof SupplierFormData, value: unknown) => setForm(p => ({...p, [field]: value}));
  const setRisk = (
    dim: 'financialRisk' | 'operationalRisk' | 'complianceRisk' | 'esgRisk',
    key: 'score' | 'notes',
    value: string | number,
  ) => setForm(p => ({...p, [dim]: {...p[dim], [key]: key === 'score' ? Number(value) : value}}));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        annualSpend: form.annualSpend ? String(form.annualSpend) : undefined,
        tags: form.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean) as unknown as string,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="space-y-6 p-6" onSubmit={handleSubmit}>
          {/* Basic Info */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Basic Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Supplier Name *</label>
                <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Country *</label>
                <select className="input" value={form.country} onChange={e => set('country', e.target.value)}>
                  {COUNTRIES.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Category *</label>
                <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Contact Name</label>
                <input className="input" value={form.contactName} onChange={e => set('contactName', e.target.value)} />
              </div>
              <div>
                <label className="label">Contact Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.contactEmail}
                  onChange={e => set('contactEmail', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Website</label>
                <input className="input" value={form.website} onChange={e => set('website', e.target.value)} />
              </div>
              <div>
                <label className="label">Annual Spend</label>
                <input
                  className="input"
                  type="number"
                  value={form.annualSpend}
                  onChange={e => set('annualSpend', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {['Active', 'Onboarding', 'Under Review', 'Suspended', 'Inactive'].map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tags (comma-separated)</label>
                <input
                  className="input"
                  value={form.tags}
                  onChange={e => set('tags', e.target.value)}
                  placeholder="Tier 1, Strategic"
                />
              </div>
            </div>
          </section>

          {/* Risk Dimensions */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Risk Scores (0 = no risk, 100 = critical)
            </h3>
            {(
              [
                ['financialRisk', 'Financial Risk'],
                ['operationalRisk', 'Operational Risk'],
                ['complianceRisk', 'Compliance Risk'],
                ['esgRisk', 'ESG Risk'],
              ] as const
            ).map(([dim, label]) => (
              <div key={dim} className="mb-4 rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className={`text-lg font-bold ${scoreColor(form[dim].score)}`}>{form[dim].score}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  className="mt-2 w-full accent-blue-600"
                  value={form[dim].score}
                  onChange={e => setRisk(dim, 'score', e.target.value)}
                />
                <input
                  className="input mt-2 text-sm"
                  placeholder="Notes..."
                  value={form[dim].notes}
                  onChange={e => setRisk(dim, 'notes', e.target.value)}
                />
              </div>
            ))}
          </section>

          {/* Mitigation */}
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Mitigation Plan</h3>
            <textarea
              className="input min-h-[80px] resize-none"
              value={form.mitigationPlan}
              onChange={e => set('mitigationPlan', e.target.value)}
              placeholder="Describe any mitigation actions or backup plans..."
            />
          </section>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
