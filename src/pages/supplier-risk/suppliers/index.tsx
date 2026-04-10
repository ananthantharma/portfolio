import Head from 'next/head';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useSession} from 'next-auth/react';
import React, {useCallback, useEffect, useState} from 'react';

import {RiskBadge} from '../../../components/SupplierRisk/RiskBadge';
import {SupplierModal} from '../../../components/SupplierRisk/SupplierModal';
import {SupplierRiskLayout} from '../../../components/SupplierRisk/SupplierRiskLayout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupplierDoc = any;

const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Onboarding: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-yellow-100 text-yellow-700',
  Suspended: 'bg-red-100 text-red-700',
  Inactive: 'bg-gray-100 text-gray-600',
};

const SuppliersPage = () => {
  const {data: session, status} = useSession();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDoc | null>(null);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState('overallScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterRisk) params.set('riskLevel', filterRisk);
      if (filterStatus) params.set('status', filterStatus);
      params.set('sort', sortField);
      params.set('order', sortOrder);
      const res = await fetch(`/api/supplier-risk/suppliers?${params}`);
      if (res.ok) setSuppliers(await res.json());
    } finally {
      setLoading(false);
    }
  }, [search, filterRisk, filterStatus, sortField, sortOrder]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') fetchSuppliers();
  }, [status, router, fetchSuppliers]);

  const handleSave = async (data: Partial<SupplierDoc>) => {
    const method = editingSupplier ? 'PUT' : 'POST';
    const url = editingSupplier
      ? `/api/supplier-risk/suppliers/${editingSupplier._id}`
      : '/api/supplier-risk/suppliers';
    await fetch(url, {method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    await fetchSuppliers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier and all associated alerts?')) return;
    await fetch(`/api/supplier-risk/suppliers/${id}`, {method: 'DELETE'});
    await fetchSuppliers();
  };

  if (status === 'loading') return null;
  if (!session) return null;

  return (
    <>
      <Head>
        <title>Suppliers — Supplier Risk Platform</title>
      </Head>
      <SupplierRiskLayout
        title="Suppliers"
        actions={
          <button
            className="btn-primary text-sm"
            onClick={() => {
              setEditingSupplier(null);
              setIsModalOpen(true);
            }}>
            + Add Supplier
          </button>
        }>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              className="input max-w-xs flex-1"
              placeholder="Search suppliers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="input w-36" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
              <option value="">All Risk Levels</option>
              {['Low', 'Medium', 'High', 'Critical'].map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select className="input w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {['Active', 'Onboarding', 'Under Review', 'Suspended', 'Inactive'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="input w-40"
              value={`${sortField}:${sortOrder}`}
              onChange={e => {
                const [f, o] = e.target.value.split(':');
                setSortField(f);
                setSortOrder(o as 'asc' | 'desc');
              }}>
              <option value="overallScore:desc">Risk ↓</option>
              <option value="overallScore:asc">Risk ↑</option>
              <option value="name:asc">Name A-Z</option>
              <option value="annualSpend:desc">Spend ↓</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-gray-400">Loading...</div>
            ) : suppliers.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
                <p>No suppliers found.</p>
                <button className="text-sm text-blue-600 hover:underline" onClick={() => setIsModalOpen(true)}>
                  Add your first supplier →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Country</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Risk Level</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Annual Spend</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {suppliers.map((s: SupplierDoc) => (
                      <tr key={s._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/supplier-risk/suppliers/${s._id}`}
                            className="font-medium text-blue-700 hover:underline">
                            {s.name}
                          </Link>
                          {s.tags?.length > 0 && (
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {s.tags.map((t: string) => (
                                <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.category}</td>
                        <td className="px-4 py-3 text-gray-600">{s.country}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_BADGE[s.status] || 'bg-gray-100 text-gray-600'
                            }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge level={s.riskLevel} size="sm" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className={`h-full rounded-full ${
                                  s.overallScore <= 30
                                    ? 'bg-emerald-500'
                                    : s.overallScore <= 60
                                    ? 'bg-yellow-500'
                                    : s.overallScore <= 80
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                                }`}
                                style={{width: `${s.overallScore}%`}}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700">{s.overallScore}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.annualSpend ? `$${(s.annualSpend / 1000000).toFixed(1)}M` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              className="text-xs text-gray-500 hover:text-blue-600"
                              onClick={() => {
                                setEditingSupplier(s);
                                setIsModalOpen(true);
                              }}>
                              Edit
                            </button>
                            <button
                              className="text-xs text-gray-500 hover:text-red-600"
                              onClick={() => handleDelete(s._id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
          </p>
        </div>

        <SupplierModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSupplier(null);
          }}
          onSave={handleSave}
          initial={editingSupplier}
          title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        />
      </SupplierRiskLayout>
    </>
  );
};

export default SuppliersPage;
