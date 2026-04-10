import Head from 'next/head';
import {useRouter} from 'next/router';
import {useSession} from 'next-auth/react';
import React, {useCallback, useEffect, useState} from 'react';

import {AlertItem} from '../../components/SupplierRisk/AlertItem';
import {SupplierRiskLayout} from '../../components/SupplierRisk/SupplierRiskLayout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AlertDoc = any;

const SEVERITY_ORDER: Record<string, number> = {Critical: 0, High: 1, Warning: 2, Info: 3};

const AlertsPage = () => {
  const {data: session, status} = useSession();
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({limit: '100'});
      if (filterSeverity) params.set('severity', filterSeverity);
      if (filterCategory) params.set('category', filterCategory);
      if (!showResolved) params.set('isResolved', 'false');
      const res = await fetch(`/api/supplier-risk/alerts?${params}`);
      if (res.ok) {
        const data: AlertDoc[] = await res.json();
        data.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
        setAlerts(data);
      }
    } finally {
      setLoading(false);
    }
  }, [filterSeverity, filterCategory, showResolved]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') fetchAlerts();
  }, [status, router, fetchAlerts]);

  const patch = async (ids: string[], action: string) => {
    await fetch('/api/supplier-risk/alerts', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ids, action}),
    });
    setSelected(new Set());
    await fetchAlerts();
  };

  const unread = alerts.filter(a => !a.isRead).length;
  const critical = alerts.filter(a => a.severity === 'Critical' && !a.isResolved).length;

  if (status === 'loading') return null;
  if (!session) return null;

  return (
    <>
      <Head>
        <title>Alerts — Supplier Risk Platform</title>
      </Head>
      <SupplierRiskLayout
        title="Risk Alerts"
        unreadCount={unread}
        actions={
          selected.size > 0 ? (
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                onClick={() => patch([...selected], 'markRead')}>
                Mark {selected.size} Read
              </button>
              <button
                className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                onClick={() => patch([...selected], 'resolve')}>
                Resolve {selected.size}
              </button>
            </div>
          ) : null
        }>
        <div className="space-y-4">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm">
              <span className="font-bold text-red-700">{critical}</span>
              <span className="ml-1 text-red-600">critical alerts</span>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm">
              <span className="font-bold text-blue-700">{unread}</span>
              <span className="ml-1 text-blue-600">unread</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select className="input w-40" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
              <option value="">All Severities</option>
              {['Critical', 'High', 'Warning', 'Info'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select className="input w-40" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {['Financial', 'Operational', 'Compliance', 'ESG', 'News', 'System'].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={e => setShowResolved(e.target.checked)}
                className="rounded"
              />
              Show resolved
            </label>
            {unread > 0 && (
              <button
                className="ml-auto rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                onClick={() =>
                  patch(
                    alerts.filter(a => !a.isRead).map(a => a._id),
                    'markRead',
                  )
                }>
                Mark all as read
              </button>
            )}
          </div>

          {/* Alert list */}
          {loading ? (
            <div className="flex h-40 items-center justify-center text-gray-400">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 shadow-sm">
              No alerts found
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert._id} className="flex gap-3">
                  <input
                    type="checkbox"
                    className="mt-4 h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-blue-600"
                    checked={selected.has(alert._id)}
                    onChange={e => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(alert._id);
                      else next.delete(alert._id);
                      setSelected(next);
                    }}
                  />
                  <div className="flex-1">
                    <AlertItem
                      alert={alert}
                      onResolve={id => patch([id], 'resolve')}
                      onMarkRead={id => patch([id], 'markRead')}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SupplierRiskLayout>
    </>
  );
};

export default AlertsPage;
