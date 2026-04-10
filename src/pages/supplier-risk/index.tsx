import Head from 'next/head';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useSession} from 'next-auth/react';
import React, {useCallback, useEffect, useState} from 'react';

import {AlertItem} from '../../components/SupplierRisk/AlertItem';
import {RiskDistributionChart} from '../../components/SupplierRisk/RiskDistributionChart';
import {RiskBadge} from '../../components/SupplierRisk/RiskBadge';
import {StatCard} from '../../components/SupplierRisk/StatCard';
import {SupplierRiskLayout} from '../../components/SupplierRisk/SupplierRiskLayout';

interface DashboardData {
  total: number;
  byRisk: {Low: number; Medium: number; High: number; Critical: number};
  byStatus: Record<string, number>;
  avgScore: number;
  byCategory: Array<{name: string; count: number; avgScore: number}>;
  topRisky: Array<{
    _id: string;
    name: string;
    country: string;
    category: string;
    overallScore: number;
    riskLevel: string;
  }>;
  recentAlerts: AlertDoc[];
  unreadAlerts: number;
  criticalAlerts: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AlertDoc = any;

const SupplierRiskDashboard = () => {
  const {data: session, status} = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supplier-risk/dashboard');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') fetchDashboard();
  }, [status, router, fetchDashboard]);

  const handleSeed = async () => {
    if (!confirm('This will reset all demo data. Continue?')) return;
    setSeeding(true);
    try {
      await fetch('/api/supplier-risk/seed', {method: 'POST'});
      await fetchDashboard();
    } finally {
      setSeeding(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <SupplierRiskLayout title="Dashboard">
        <div className="flex h-64 items-center justify-center text-gray-400">Loading dashboard...</div>
      </SupplierRiskLayout>
    );
  }

  if (!session) return null;

  return (
    <>
      <Head>
        <title>Supplier Risk Platform — Dashboard</title>
      </Head>
      <SupplierRiskLayout
        title="Risk Intelligence Dashboard"
        unreadCount={data?.unreadAlerts}
        actions={
          <button
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            onClick={handleSeed}
            disabled={seeding}>
            {seeding ? 'Loading demo...' : '⚡ Load Demo Data'}
          </button>
        }>
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Suppliers"
              value={data?.total ?? 0}
              icon={<span className="text-xl">🏭</span>}
              color="blue"
            />
            <StatCard
              label="Avg. Risk Score"
              value={data?.avgScore ?? 0}
              sub="out of 100"
              icon={<span className="text-xl">📊</span>}
              color={
                (data?.avgScore ?? 0) <= 30
                  ? 'emerald'
                  : (data?.avgScore ?? 0) <= 60
                  ? 'yellow'
                  : (data?.avgScore ?? 0) <= 80
                  ? 'orange'
                  : 'red'
              }
            />
            <StatCard
              label="Unread Alerts"
              value={data?.unreadAlerts ?? 0}
              icon={<span className="text-xl">🔔</span>}
              color="purple"
            />
            <StatCard
              label="Critical Alerts"
              value={data?.criticalAlerts ?? 0}
              icon={<span className="text-xl">🚨</span>}
              color="red"
            />
          </div>

          {/* Risk breakdown row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {['Low', 'Medium', 'High', 'Critical'].map(level => (
              <div key={level} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <RiskBadge level={level as 'Low' | 'Medium' | 'High' | 'Critical'} />
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {data?.byRisk[level as keyof typeof data.byRisk] ?? 0}
                </p>
                <p className="text-xs text-gray-400">suppliers</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Risk Distribution Chart */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-700">Risk Distribution</h3>
              {data && data.total > 0 ? (
                <RiskDistributionChart data={data.byRisk} />
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                  No data — load demo data to get started
                </div>
              )}
            </div>

            {/* Top risky suppliers */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Highest Risk Suppliers</h3>
                <Link href="/supplier-risk/suppliers" className="text-xs text-blue-600 hover:underline">
                  View all →
                </Link>
              </div>
              {data?.topRisky && data.topRisky.length > 0 ? (
                <div className="space-y-2">
                  {data.topRisky.map(s => (
                    <Link
                      key={s._id}
                      href={`/supplier-risk/suppliers/${s._id}`}
                      className="flex items-center justify-between rounded-lg p-2 hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">
                          {s.country} · {s.category}
                        </p>
                      </div>
                      <RiskBadge
                        level={s.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical'}
                        score={s.overallScore}
                        size="sm"
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-gray-400">No suppliers yet</div>
              )}
            </div>
          </div>

          {/* Category breakdown */}
          {data?.byCategory && data.byCategory.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-700">Risk by Category</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.byCategory.map(cat => (
                  <div key={cat.name} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                      <span
                        className={`text-sm font-bold ${
                          cat.avgScore <= 30
                            ? 'text-emerald-600'
                            : cat.avgScore <= 60
                            ? 'text-yellow-600'
                            : cat.avgScore <= 80
                            ? 'text-orange-600'
                            : 'text-red-600'
                        }`}>
                        {cat.avgScore}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {cat.count} supplier{cat.count !== 1 ? 's' : ''} · avg score
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${
                          cat.avgScore <= 30
                            ? 'bg-emerald-500'
                            : cat.avgScore <= 60
                            ? 'bg-yellow-500'
                            : cat.avgScore <= 80
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                        style={{width: `${cat.avgScore}%`}}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Alerts */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Recent Alerts</h3>
              <Link href="/supplier-risk/alerts" className="text-xs text-blue-600 hover:underline">
                View all →
              </Link>
            </div>
            {data?.recentAlerts && data.recentAlerts.length > 0 ? (
              <div className="space-y-3">
                {data.recentAlerts.slice(0, 5).map((alert: AlertDoc) => (
                  <AlertItem key={alert._id} alert={alert} compact />
                ))}
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center text-sm text-gray-400">No active alerts</div>
            )}
          </div>
        </div>
      </SupplierRiskLayout>
    </>
  );
};

export default SupplierRiskDashboard;
