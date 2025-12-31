
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
                        <h2 className="mb-4 text-xl font-semibold text-gray-800">Recent Visits</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Time
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            IP & Path
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            User
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {accessLogs.map((log: any) => (
                                        <tr key={log._id}>
                                            <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="text-sm text-gray-900">{log.path}</div>
                                                <div className="text-xs text-gray-400">{log.ip}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {log.userEmail || '-'}
                                            </td>
                                        </tr>
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

    // Fetch recent access logs (desc)
    const accessLogs = await AccessLog.find({}).sort({ timestamp: -1 }).limit(100).lean();

    return {
        props: {
            // Serialize MongoDB objects (dates/ids)
            users: JSON.parse(JSON.stringify(users)),
            accessLogs: JSON.parse(JSON.stringify(accessLogs)),
        },
    };
};

export default AdminDashboard;
