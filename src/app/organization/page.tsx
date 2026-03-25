'use client';

import React from 'react';
import {useRouter} from 'next/navigation';
import ToDoListModal from '@/components/Notes/ToDoListModal';

export default function OrganizationPage() {
  const router = useRouter();

  return (
    <main className="w-full flex-1 h-[calc(100vh-theme(spacing.16))] sm:h-screen bg-[#0f1117] overflow-hidden">
      <ToDoListModal
        isOpen={true}
        onClose={() => {
          router.push('/dashboard');
        }}
        onNavigate={() => {
          router.push('/notes');
        }}
        isStandalone={true}
        initialView="board"
      />
    </main>
  );
}
