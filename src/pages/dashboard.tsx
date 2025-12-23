import Head from 'next/head';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState } from 'react';

import Header from '../components/Sections/Header';
import PasswordModal from '../components/Vault/PasswordModal';
import { VaultDashboard } from '../components/Vault/VaultDashboard';
import { PasswordEntry } from '../data/dataDef';

const Dashboard = React.memo(() => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PasswordEntry | null>(null);

  const fetchPasswords = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPasswords();
    }
  }, [status, router, fetchPasswords]);

  const handleSave = useCallback(
    async (data: Omit<PasswordEntry, '_id'>) => {
      try {
        let res;
        if (editingItem) {
          // Update existing
          res = await fetch(`/api/passwords/${editingItem._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        } else {
          // Create new
          res = await fetch('/api/passwords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        }

        if (res.ok) {
          fetchPasswords();
          setIsModalOpen(false);
          setEditingItem(null);
        }
      } catch (error) {
        console.error('Failed to save password', error);
      }
    },
    [editingItem, fetchPasswords],
  );

  const handleDelete = useCallback(
    async (id: string) => {
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
    },
    [fetchPasswords],
  );

  const handleEdit = useCallback(
    (id: string) => {
      const item = passwords.find(p => p._id === id);
      if (item) {
        setEditingItem(item);
        setIsModalOpen(true);
      }
    },
    [passwords],
  );

  const handleAddClick = useCallback(() => {
    setEditingItem(null);
    setIsModalOpen(true);
  }, []);

  const handleSignOut = useCallback(() => {
    signOut();
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
  }, []);

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
      <Header />
      {/* Adjust container to account for fixed header (approx 64px - 80px) */}
      <div className="pt-20 h-screen overflow-hidden bg-[#121212]">
        <VaultDashboard
          onAdd={handleAddClick}
          onDelete={handleDelete}
          onSignOut={handleSignOut}
          onUpdate={handleEdit}
          passwords={passwords}
          userEmail={session.user?.email}
        />
      </div>

      <PasswordModal
        initialData={editingItem || {}}
        isOpen={isModalOpen}
        mode={editingItem ? 'edit' : 'add'}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
