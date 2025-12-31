import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AccessDenied from '@/components/AccessDenied';
import NotesLayout from '@/components/Notes/NotesLayout';

export default async function NotesPage() {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any).notesEnabled) {
    return <AccessDenied message="Access Denied. You do not have permission to access Notes. Please contact Ananthan." />;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <NotesLayout />
    </div>
  );
}
