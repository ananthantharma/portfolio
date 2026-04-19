import {GetServerSideProps} from 'next';
import {getSession} from 'next-auth/react';
import React from 'react';

import dbConnect from '@/lib/dbConnect';
import AccessLog, {IAccessLog} from '@/models/AccessLog';
import User, {IUser} from '@/models/User';

interface AdminDashboardProps {
  users: IUser[];
  accessLogs: IAccessLog[];
}

const PERMISSION_FIELDS = [
  {field: 'googleApiEnabled', label: 'Google API'},
  {field: 'openAiApiEnabled', label: 'OpenAI'},
  {field: 'notesEnabled', label: 'Notes'},
  {field: 'secureLoginEnabled', label: 'Vault'},
  {field: 'financeEnabled', label: 'Finance'},
  {field: 'invoiceEnabled', label: 'Invoices'},
  {field: 'formFillEnabled', label: 'Form Fill'},
];

const ADMIN_EMAIL = 'lankanprinze@gmail.com';

const AdminDashboard: React.FC<AdminDashboardProps> = ({users: initialUsers, accessLogs}) => {
  const [users, setUsers] = React.useState<any[]>(initialUsers);
  const [expandedIps, setExpandedIps] = React.useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [saving, setSaving] = React.useState<Set<string>>(new Set());
  const [filter, setFilter] = React.useState<'all' | 'pending'>('all');

  const groupedLogs = React.useMemo(() => {
    const groups: {[ip: string]: IAccessLog[]} = {};
    accessLogs.forEach(log => {
      if (!groups[log.ip]) groups[log.ip] = [];
      groups[log.ip].push(log);
    });

    return Object.entries(groups)
      .map(([ip, logs]) => {
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return {
          ip,
          logs,
          lastActive: logs[0].timestamp,
          user: logs.find(l => l.userEmail)?.userEmail || 'Guest',
          totalVisits: logs.length,
        };
      })
      .sort((a, b) => {
        const timeA = new Date(a.lastActive).getTime();
        const timeB = new Date(b.lastActive).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
  }, [accessLogs, sortOrder]);

  const hasAnyPermission = (user: any) =>
    PERMISSION_FIELDS.some(({field}) => !!user[field]);

  const pendingCount = users.filter(u => u.email !== ADMIN_EMAIL && !hasAnyPermission(u)).length;

  const visibleUsers = users.filter(u => {
    if (filter === 'pending') return u.email !== ADMIN_EMAIL && !hasAnyPermission(u);
    return true;
  });

  const applyPermissions = async (userId: string, payload: Record<string, boolean>) => {
    setSaving(prev => new Set(prev).add(userId));
    setUsers(prev => prev.map(u => (u._id === userId ? {...u, ...payload} : u)));

    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch (error) {
      console.error('Permission update failed', error);
      setUsers(prev => prev.map(u => (u._id === userId ? initialUsers.find(iu => iu._id === userId) || u : u)));
      alert('Failed to update permissions. Please try again.');
    } finally {
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handlePermissionChange = (userId: string, field: string, value: boolean) => {
    const currentUser = users.find(u => u._id === userId);
    if (!currentUser) return;
    const payload: Record<string, boolean> = {};
    PERMISSION_FIELDS.forEach(({field: f}) => {
      payload[f] = f === field ? value : !!currentUser[f];
    });
    applyPermissions(userId, payload);
  };

  const handleGrantAll = (userId: string) => {
    const payload: Record<string, boolean> = {};
    PERMISSION_FIELDS.forEach(({field}) => { payload[field] = true; });
    applyPermissions(userId, payload);
  };

  const handleRevokeAll = (userId: string) => {
    const payload: Record<string, boolean> = {};
    PERMISSION_FIELDS.forEach(({field}) => { payload[field] = false; });
    applyPermissions(userId, payload);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <span className="text-sm text-gray-400">Logged in as {ADMIN_EMAIL}</span>
        </div>

        {/* Users Section */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-800">User Permissions</h2>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  {pendingCount} pending
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                All users ({users.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filter === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}>
                Pending ({pendingCount})
              </button>
            </div>
          </div>

          {pendingCount > 0 && filter === 'all' && (
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <span className="text-amber-500 mt-0.5">⚠</span>
              <p className="text-sm text-amber-800">
                <strong>{pendingCount} user{pendingCount > 1 ? 's have' : ' has'} signed in but have no permissions yet.</strong>{' '}
                Use <strong>Grant All</strong> to give them access, or toggle individual permissions below.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-56">
                    User
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Permissions
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-36">
                    Last Login
                  </th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleUsers.map((user: any) => {
                  const isAdmin = user.email === ADMIN_EMAIL;
                  const isPending = !isAdmin && !hasAnyPermission(user);
                  const isSaving = saving.has(user._id);

                  return (
                    <tr
                      key={user._id}
                      className={`transition-colors ${isPending ? 'bg-amber-50/40' : 'hover:bg-gray-50/50'}`}>
                      {/* User info */}
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img className="h-9 w-9 rounded-full object-cover" src={user.image} alt="" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-semibold">
                              {(user.name || user.email || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {user.name || '—'}
                              </span>
                              {isAdmin && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-600">
                                  ADMIN
                                </span>
                              )}
                              {isPending && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">
                                  NEW
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Permission toggles */}
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {PERMISSION_FIELDS.map(({field, label}) => (
                            <label
                              key={field}
                              className={`flex items-center gap-1.5 cursor-pointer select-none ${
                                isAdmin ? 'opacity-50 cursor-not-allowed' : ''
                              }`}>
                              <input
                                type="checkbox"
                                checked={isAdmin ? true : !!user[field]}
                                onChange={e => handlePermissionChange(user._id, field, e.target.checked)}
                                disabled={isAdmin || isSaving}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                              />
                              <span className="text-xs text-gray-600">{label}</span>
                            </label>
                          ))}
                        </div>
                      </td>

                      {/* Last login */}
                      <td className="py-4 pr-4 text-xs text-gray-400 whitespace-nowrap">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                      </td>

                      {/* Quick actions */}
                      <td className="py-4 text-right">
                        {!isAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleGrantAll(user._id)}
                              disabled={isSaving}
                              title="Grant all permissions"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-40">
                              {isSaving ? '…' : 'Grant All'}
                            </button>
                            <button
                              onClick={() => handleRevokeAll(user._id)}
                              disabled={isSaving}
                              title="Revoke all permissions"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-40">
                              Revoke
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-gray-400">
                      {filter === 'pending' ? 'No pending users 🎉' : 'No users yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Access Logs */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-gray-800">Recent Visits (Grouped by IP)</h2>
            <button
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors font-medium">
              Sort by time {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Last Active</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">IP Address</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">User</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groupedLogs.map(group => (
                  <React.Fragment key={group.ip}>
                    <tr
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        const next = new Set(expandedIps);
                        if (next.has(group.ip)) next.delete(group.ip);
                        else next.add(group.ip);
                        setExpandedIps(next);
                      }}>
                      <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(group.lastActive).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] transition-transform ${expandedIps.has(group.ip) ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                          <span className="text-sm font-mono text-gray-900">{group.ip}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-500">{group.user}</td>
                      <td className="py-3 text-sm text-gray-500">{group.totalVisits}</td>
                    </tr>
                    {expandedIps.has(group.ip) && (
                      <tr>
                        <td colSpan={4} className="bg-gray-50 px-6 py-4">
                          <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Detailed History</div>
                          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User Agent</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {group.logs.map((log: any) => (
                                <tr key={log._id}>
                                  <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </td>
                                  <td className="px-4 py-2 text-xs font-mono text-gray-900">{log.path}</td>
                                  <td className="px-4 py-2 text-xs text-gray-500 truncate max-w-xs" title={log.userAgent}>
                                    {log.userAgent}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async context => {
  const session = await getSession(context);

  if (!session || session.user?.email?.toLowerCase() !== 'lankanprinze@gmail.com') {
    return {redirect: {destination: '/', permanent: false}};
  }

  await dbConnect();

  const users = await User.find({}).sort({lastLogin: -1}).limit(100).lean();
  const accessLogs = await AccessLog.find({}).sort({timestamp: -1}).limit(500).lean();

  return {
    props: {
      users: JSON.parse(JSON.stringify(users)),
      accessLogs: JSON.parse(JSON.stringify(accessLogs)),
    },
  };
};

export default AdminDashboard;
