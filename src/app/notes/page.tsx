import React from 'react';
import dynamic from 'next/dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AccessDenied from '@/components/AccessDenied';
import NotesLayout from '@/components/Notes/NotesLayout';

const Header = dynamic(() => import('@/components/Sections/Header'), { ssr: false });


export default async function NotesPage() {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any).notesEnabled) {
    return (
      <AccessDenied message="Access Denied. You do not have permission to access Notes. Please contact Ananthan." />
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header />
      {/* NotesLayout uses h-[calc(100vh-64px)] internally */}
      <div className="flex-1 pt-[60px] bg-gray-100">
        <NotesLayout />
      </div>
    </div>
  );
}
