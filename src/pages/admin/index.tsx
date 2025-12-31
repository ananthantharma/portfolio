
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import React from 'react';

import dbConnect from '@/lib/dbConnect';
import AccessLog, { IAccessLog } from '@/models/AccessLog';
import User, { IUser } from '@/models/User';

interface AdminDashboardProps {
    users: IUser[];
    accessLogs: IAccessLog[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, accessLogs }) => {
    const [expandedIps, setExpandedIps] = React.useState<Set<string>>(new Set());
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

    // Group logs by IP
    const groupedLogs = React.useMemo(() => {
        const groups: { [ip: string]: IAccessLog[] } = {};
        accessLogs.forEach(log => {
            if (!groups[log.ip]) {
                groups[log.ip] = [];
            }
            groups[log.ip].push(log);
        });

        return Object.entries(groups).map(([ip, logs]) => {
            // Find the latest timestamp in the group
            logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const lastActive = logs[0].timestamp;
            const user = logs.find(l => l.userEmail)?.userEmail || 'Guest';

            return {
                ip,
                logs,
                lastActive,
                user,
                totalVisits: logs.length,
            };
        }).sort((a, b) => {
            const timeA = new Date(a.lastActive).getTime();
            const timeB = new Date(b.lastActive).getTime();
            return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
    }, [accessLogs, sortOrder]);

    const toggleIp = (ip: string) => {
        const newSet = new Set(expandedIps);
        if (newSet.has(ip)) {
            newSet.delete(ip);
        } else {
            newSet.add(ip);
        }
        setExpandedIps(newSet);
    };

    const toggleSort = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="mb-8 text-3xl font-bold text-gray-900">Admin Dashboard</h1>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Users Section */}
                    <div className="rounded-lg bg-white p-6 shadow">
                        <h2 className="mb-4 text-xl font-semibold text-gray-800">User Activity</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Last Login
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {users.map((user: any) => (
                                        <tr key={user._id}>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="flex items-center">
                                                    {user.image && (
                                                        <img className="mr-3 h-8 w-8 rounded-full" src={user.image} alt="" />
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Access Logs Section */}
                    <div className="rounded-lg bg-white p-6 shadow">
                        <h2 className="mb-4 text-xl font-semibold text-gray-800">Recent Visits (Grouped by IP)</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100"
                                            onClick={toggleSort}
                                        >
                                            Last Active {sortOrder === 'desc' ? '↓' : '↑'}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            IP Address
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Visits
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {groupedLogs.map((group) => (
                                        <React.Fragment key={group.ip}>
                                            <tr
                                                className="cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={() => toggleIp(group.ip)}
                                            >
                                                <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">
                                                    {new Date(group.lastActive).toLocaleString()}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex items-center">
                                                        <span className={`mr-2 transform transition-transform ${expandedIps.has(group.ip) ? 'rotate-90' : ''}`}>
                                                            ▶
                                                        </span>
                                                        <div className="text-sm text-gray-900 font-medium">{group.ip}</div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                    {group.user}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                    {group.totalVisits}
                                                </td>
                                            </tr>
                                            {expandedIps.has(group.ip) && (
                                                <tr>
                                                    <td colSpan={4} className="bg-gray-50 px-6 py-4">
                                                        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Detailed History</div>
                                                        <table className="min-w-full divide-y divide-gray-200 bg-white rounded border border-gray-200">
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
                                                                        <td className="px-4 py-2 text-xs text-gray-900 font-mono">
                                                                            {log.path}
                                                                        </td>
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
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async context => {
    const session = await getSession(context);

    console.log('Admin Access Attempt:', {
        email: session?.user?.email,
        expected: 'lankanprinze@gmail.com',
        match: session?.user?.email === 'lankanprinze@gmail.com'
    });

    if (!session || !session.user?.email || session.user.email.toLowerCase() !== 'lankanprinze@gmail.com') {
        return {
            redirect: {
                destination: '/',
                permanent: false,
            },
        };
    }

    await dbConnect();

    // Fetch users sorted by lastLogin (desc)
    const users = await User.find({}).sort({ lastLogin: -1 }).limit(50).lean();

    // Fetch recent access logs (desc) - Increased limit for better grouping context
    const accessLogs = await AccessLog.find({}).sort({ timestamp: -1 }).limit(500).lean();

    return {
        props: {
            // Serialize MongoDB objects (dates/ids)
            users: JSON.parse(JSON.stringify(users)),
            accessLogs: JSON.parse(JSON.stringify(accessLogs)),
        },
    };
};

export default AdminDashboard;
