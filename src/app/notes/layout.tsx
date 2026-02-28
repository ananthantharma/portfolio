'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

const Header = dynamic(() => import('@/components/Sections/Header'), { ssr: false });

// The floating navbar is: 12px top-padding + 48px bar height = 60px total.
// We use position:fixed on the content wrapper to start exactly at 60px.
const NAVBAR_HEIGHT = 60;

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
    <>
      {/* Shared modern navbar (fixed, sits above everything) */}
      <Header />

      {/* Content area occupies exactly the space below the navbar */}
      <div
        style={{
          position: 'fixed',
          top: `${NAVBAR_HEIGHT}px`,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        }}>
        {children}
      </div>
    </>
  );
}
