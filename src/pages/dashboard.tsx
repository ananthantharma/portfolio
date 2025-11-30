import {MagnifyingGlassIcon, PlusIcon} from '@heroicons/react/24/solid';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import {useRouter} from 'next/router';
import {signOut, useSession} from 'next-auth/react';
import React, {useEffect, useMemo, useState} from 'react';

import PasswordItem from '../components/PasswordItem';
import {PasswordEntry} from '../data/dataDef';

// eslint-disable-next-line react-memo/require-memo
const Header = dynamic(() => import('../components/Sections/Header'), {ssr: false});

const Dashboard = React.memo(() => {
  const {data: session, status} = useSession();
  const router = useRouter();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState({title: '', site: '', username: '', password: '', notes: ''});
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPasswords();
    }
  }, [status, router]);

  const fetchPasswords = async () => {
    try {
      const res = await fetch('/api/passwords');
      if (res.ok) {
        const data = await res.json();
        setPasswords(data);
      }
    } catch (error) {
      console.error('Failed to fetch passwords', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/passwords', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newPassword),
      });
      if (res.ok) {
        setNewPassword({title: '', site: '', username: '', password: '', notes: ''});
        setIsAdding(false);
        fetchPasswords();
      }
    } catch (error) {
      console.error('Failed to add password', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this password?')) return;
    try {
      const res = await fetch(`/api/passwords/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchPasswords();
      }
    } catch (error) {
      console.error('Failed to delete password', error);
    }
  };

  const handleUpdate = async (id: string, data: Partial<PasswordEntry>) => {
    try {
      const res = await fetch(`/api/passwords/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchPasswords();
      }
    } catch (error) {
      console.error('Failed to update password', error);
    }
  };

  const filteredPasswords = useMemo(() => {
    if (!searchQuery) return passwords;
    const lowerQuery = searchQuery.toLowerCase();
    return passwords.filter((pwd: PasswordEntry) => pwd.title.toLowerCase().includes(lowerQuery));
  }, [passwords, searchQuery]);

  if (status === 'loading' || loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>Dashboard - Password Manager</title>
      </Head>
      <Header />
      <div className="pt-16">
        <nav className="border-b border-gray-800 bg-gray-900 p-4">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold text-orange-500">Password Manager</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">Signed in as {session.user?.email}</span>
              <button
                className="rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-700"
                onClick={() => signOut()}>
                Sign out
              </button>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-bold">Your Passwords</h2>

            <div className="flex flex-1 items-center gap-4 md:max-w-md">
              <div className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon aria-hidden="true" className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  className="block w-full rounded-md border-gray-700 bg-gray-800 py-2 pl-10 pr-3 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search passwords..."
                  type="text"
                  value={searchQuery}
                />
              </div>
              <button
                className="flex items-center gap-2 rounded bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600 whitespace-nowrap"
                onClick={() => setIsAdding(!isAdding)}>
                <PlusIcon className="h-5 w-5" />
                Add Password
              </button>
            </div>
          </div>

          {isAdding && (
            <form
              className="mb-8 rounded-lg bg-gray-800 p-6 shadow-lg border border-gray-700"
              onSubmit={handleAddPassword}>
              <h3 className="mb-4 text-lg font-bold text-orange-500">Add New Password</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={e => setNewPassword({...newPassword, title: e.target.value})}
                    placeholder="e.g. Netflix"
                    required
                    type="text"
                    value={newPassword.title}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Website URL</label>
                  <input
                    className="w-full rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={e => setNewPassword({...newPassword, site: e.target.value})}
                    placeholder="https://netflix.com"
                    type="text"
                    value={newPassword.site}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Username / Email</label>
                  <input
                    className="w-full rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={e => setNewPassword({...newPassword, username: e.target.value})}
                    placeholder="user@example.com"
                    type="text"
                    value={newPassword.username}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Password</label>
                  <input
                    className="w-full rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={e => setNewPassword({...newPassword, password: e.target.value})}
                    placeholder="********"
                    type="text"
                    value={newPassword.password}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-400">Notes</label>
                  <textarea
                    className="w-full rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={e => setNewPassword({...newPassword, notes: e.target.value})}
                    placeholder="Additional notes..."
                    rows={2}
                    value={newPassword.notes}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  className="rounded px-4 py-2 text-gray-400 hover:text-white"
                  onClick={() => setIsAdding(false)}
                  type="button">
                  Cancel
                </button>
                <button
                  className="rounded bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
                  type="submit">
                  Save Password
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-4">
            {filteredPasswords.length === 0 ? (
              <p className="text-center text-gray-500">
                {searchQuery ? 'No passwords match your search.' : 'No passwords saved yet.'}
              </p>
            ) : (
              filteredPasswords.map((pwd: PasswordEntry) => (
                <PasswordItem key={pwd._id} onDelete={handleDelete} onUpdate={handleUpdate} password={pwd} />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
