'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

const Header = dynamic(() => import('@/components/Sections/Header'), { ssr: false });

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Shared modern navbar */}
      <Header />
      {/* Main content sits below the fixed 56px navbar (h-14 + 12px top padding = ~68px) */}
      <main className="flex-1 overflow-hidden" style={{ paddingTop: '68px' }}>
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
