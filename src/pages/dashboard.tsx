import Head from 'next/head';
import {useRouter} from 'next/router';
import {signOut, useSession} from 'next-auth/react';
import React, {useEffect, useState} from 'react';

import {PasswordEntry} from '../data/dataDef';
import {VaultDashboard} from '../components/Vault/VaultDashboard';

const Dashboard = React.memo(() => {
  const {data: session, status} = useSession();
  const router = useRouter();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState({title: '', site: '', username: '', password: '', notes: ''});
  const [isAdding, setIsAdding] = useState(false);

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

  if (status === 'loading' || loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#121212] text-white">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Vault - Secure Password Manager</title>
      </Head>
      <VaultDashboard
        passwords={passwords}
        onAdd={() => setIsAdding(true)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        userEmail={session.user?.email}
        onSignOut={() => signOut()}
      />

      {/* Retain the Add Modal logic for now, but style it to match if needed, or we can move it into VaultDashboard later. 
          For now, to fulfill high-fidelity, let's keep the modal external but rendered if isAdding is true.
      */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            className="w-full max-w-2xl rounded-2xl bg-[#1E1E1E] p-8 shadow-2xl border border-zinc-800"
            onSubmit={handleAddPassword}>
            <h3 className="mb-6 text-2xl font-bold text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-lg">
                +
              </span>
              Add New Item
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Title</label>
                <input
                  className="w-full rounded-xl bg-zinc-900/50 p-3 text-white border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  onChange={e => setNewPassword({...newPassword, title: e.target.value})}
                  placeholder="e.g. Netflix"
                  required
                  type="text"
                  value={newPassword.title}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Website URL</label>
                <input
                  className="w-full rounded-xl bg-zinc-900/50 p-3 text-white border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  onChange={e => setNewPassword({...newPassword, site: e.target.value})}
                  placeholder="https://netflix.com"
                  type="text"
                  value={newPassword.site}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Username / Email</label>
                <input
                  className="w-full rounded-xl bg-zinc-900/50 p-3 text-white border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  onChange={e => setNewPassword({...newPassword, username: e.target.value})}
                  placeholder="user@example.com"
                  type="text"
                  value={newPassword.username}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Password</label>
                <input
                  className="w-full rounded-xl bg-zinc-900/50 p-3 text-white border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  onChange={e => setNewPassword({...newPassword, password: e.target.value})}
                  placeholder="********"
                  type="text"
                  value={newPassword.password}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Notes</label>
                <textarea
                  className="w-full rounded-xl bg-zinc-900/50 p-3 text-white border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  onChange={e => setNewPassword({...newPassword, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows={3}
                  value={newPassword.notes}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3 border-t border-zinc-800 pt-6">
              <button
                className="rounded-lg px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-medium"
                onClick={() => setIsAdding(false)}
                type="button">
                Cancel
              </button>
              <button
                className="rounded-lg bg-orange-500 px-6 py-2.5 font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all hover:scale-105"
                type="submit">
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
