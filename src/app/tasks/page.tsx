'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ToDoListModal from '@/components/Notes/ToDoListModal';

export default function TasksPage() {
    const router = useRouter();

    return (
        <main className="w-full flex-1 h-[calc(100vh-theme(spacing.16))] sm:h-screen bg-[#0f1117] overflow-hidden">
            <ToDoListModal
                isOpen={true}
                onClose={() => {
                    // If standalone and cross button clicked, go back to somewhere maybe? Or don't do anything.
                    router.push('/dashboard');
                }}
                onNavigate={() => {
                    // Navigating to notes tab
                    router.push(`/notes`);
                }}
                isStandalone={true}
            />
        </main>
    );
}
