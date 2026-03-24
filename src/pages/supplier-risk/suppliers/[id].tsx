import Head from 'next/head';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useSession} from 'next-auth/react';
import React, {useCallback, useEffect, useState} from 'react';

import {AlertItem} from '../../../components/SupplierRisk/AlertItem';
import {RiskBadge, ScoreBar} from '../../../components/SupplierRisk/RiskBadge';
import {RiskRadarChart} from '../../../components/SupplierRisk/RiskRadarChart';
import {SupplierModal} from '../../../components/SupplierRisk/SupplierModal';
import {SupplierRiskLayout} from '../../../components/SupplierRisk/SupplierRiskLayout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupplierDoc = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AlertDoc = any;

const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Onboarding: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-yellow-100 text-yellow-700',
  Suspended: 'bg-red-100 text-red-700',
  Inactive: 'bg-gray-100 text-gray-600',
};

const SupplierDetailPage = () => {
  const {status} = useSession();
  const router = useRouter();
  const {id} = router.query;
  const [supplier, setSupplier] = useState<SupplierDoc | null>(null);
  const [alerts, setAlerts] = useState<AlertDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'mitigation'>('overview');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        fetch(`/api/supplier-risk/suppliers/${id}`),
        fetch(`/api/supplier-risk/alerts?supplierId=${id}&limit=20`),
      ]);
      if (sRes.ok) setSupplier(await sRes.json());
      if (aRes.ok) setAlerts(await aRes.json());
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated' && id) fetchData();
  }, [status, router, id, fetchData]);

  const handleSave = async (data: Partial<SupplierDoc>) => {
    await fetch(`/api/supplier-risk/suppliers/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    });
    await fetchData();
  };

  const handleResolveAlert = async (alertId: string) => {
    await fetch('/api/supplier-risk/alerts', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ids: [alertId], action: 'resolve'}),
    });
    await fetchData();
  };

  const handleMarkReadAlert = async (alertId: string) => {
    await fetch('/api/supplier-risk/alerts', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ids: [alertId], action: 'markRead'}),
    });
    await fetchData();
  };

  if (loading || !supplier)
    return (
      <SupplierRiskLayout title="Supplier Detail">
        <div className="flex h-64 items-center justify-center text-gray-400">
          {loading ? 'Loading...' : 'Supplier not found'}
        </div>
      </SupplierRiskLayout>
    );

  const unresolved = alerts.filter(a => !a.isResolved);

  return (
    <>
      <Head>
        <title>{supplier.name} — Supplier Risk Platform</title>
      </Head>
      <SupplierRiskLayout title={supplier.name}>
        <div className="space-y-6">
          {/* Header card */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
                  <RiskBadge level={supplier.riskLevel} score={supplier.overallScore} size="lg" />
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[supplier.status]}`}>
                    {supplier.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {supplier.category} · {supplier.country}
                  {supplier.website && (
                    <>
                      {' · '}
                      <a href={supplier.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {supplier.website}
                      </a>
                    </>
                  )}
                </p>
                {supplier.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {supplier.tags.map((t: string) => (
                      <span key={t} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary text-sm" onClick={() => setIsEditOpen(true)}>
                  Edit Supplier
                </button>
                <Link href="/supplier-risk/suppliers" className="btn-secondary text-sm">
                  ← Back
                </Link>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-400">Annual Spend</p>
                <p className="font-semibold text-gray-800">
                  {supplier.annualSpend ? `$${(supplier.annualSpend / 1000000).toFixed(1)}M ${supplier.currency}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Contact</p>
                <p className="font-semibold text-gray-800">{supplier.contactName || '—'}</p>
                {supplier.contactEmail && (
                  <a href={`mailto:${supplier.contactEmail}`} className="text-xs text-blue-600 hover:underline">
                    {supplier.contactEmail}
                  </a>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400">Last Assessed</p>
                <p className="font-semibold text-gray-800">
                  {supplier.lastAssessed ? new Date(supplier.lastAssessed).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Open Alerts</p>
                <p className="font-semibold text-gray-800">{unresolved.length}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {(['overview', 'alerts', 'mitigation'] as const).map(tab => (
              <button
                key={tab}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab)}>
                {tab}
                {tab === 'alerts' && unresolved.length > 0 && (
                  <span className="ml-1 rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700">
                    {unresolved.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Risk radar */}
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="mb-2 font-semibold text-gray-700">Risk Profile</h3>
                <RiskRadarChart
                  financialRisk={supplier.financialRisk?.score ?? 0}
                  operationalRisk={supplier.operationalRisk?.score ?? 0}
                  complianceRisk={supplier.complianceRisk?.score ?? 0}
                  esgRisk={supplier.esgRisk?.score ?? 0}
                />
              </div>

              {/* Score breakdown */}
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-semibold text-gray-700">Score Breakdown</h3>
                <div className="space-y-4">
                  {[
                    {key: 'financialRisk', label: 'Financial Risk', weight: '35%'},
                    {key: 'operationalRisk', label: 'Operational Risk', weight: '30%'},
                    {key: 'complianceRisk', label: 'Compliance Risk', weight: '20%'},
                    {key: 'esgRisk', label: 'ESG Risk', weight: '15%'},
                  ].map(({key, label, weight}) => (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                        <span>{label} <span className="text-gray-400">({weight} weight)</span></span>
                        <span className="font-semibold text-gray-700">{supplier[key]?.score ?? 0}/100</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${
                            (supplier[key]?.score ?? 0) <= 30
                              ? 'bg-emerald-500'
                              : (supplier[key]?.score ?? 0) <= 60
                              ? 'bg-yellow-500'
                              : (supplier[key]?.score ?? 0) <= 80
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                          }`}
                          style={{width: `${supplier[key]?.score ?? 0}%`}}
                        />
                      </div>
                      {supplier[key]?.notes && (
                        <p className="mt-0.5 text-xs text-gray-400">{supplier[key].notes}</p>
                      )}
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-3">
                    <ScoreBar score={supplier.overallScore} label="Overall Risk Score (weighted)" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-gray-400 shadow-sm">
                  No alerts for this supplier
                </div>
              ) : (
                alerts.map(alert => (
                  <AlertItem
                    key={alert._id}
                    alert={alert}
                    onResolve={handleResolveAlert}
                    onMarkRead={handleMarkReadAlert}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'mitigation' && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-700">Mitigation Plan</h3>
              {supplier.mitigationPlan ? (
                <p className="whitespace-pre-wrap text-sm text-gray-700">{supplier.mitigationPlan}</p>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-400">No mitigation plan defined.</p>
                  <button
                    className="mt-2 text-sm text-blue-600 hover:underline"
                    onClick={() => setIsEditOpen(true)}>
                    Add mitigation plan →
                  </button>
                </div>
              )}

              {supplier.riskLevel === 'High' || supplier.riskLevel === 'Critical' ? (
                <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm">
                  <p className="font-semibold text-orange-800">⚠️ Recommended Actions</p>
                  <ul className="mt-2 space-y-1 text-orange-700">
                    <li>• Identify and qualify a backup/secondary supplier</li>
                    <li>• Schedule an on-site audit within 30 days</li>
                    <li>• Increase safety stock to 90-day buffer</li>
                    <li>• Request updated financial statements</li>
                    <li>• Review contract force majeure clauses</li>
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </SupplierRiskLayout>

      <SupplierModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSave}
        initial={supplier}
        title="Edit Supplier"
      />
    </>
  );
};

export default SupplierDetailPage;
