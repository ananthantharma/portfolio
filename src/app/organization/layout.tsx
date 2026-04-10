'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useSession} from 'next-auth/react';
import {useEffect} from 'react';

export default function OrganizationRootLayout({children}: {children: React.ReactNode}) {
  const {status} = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      {/* Floating home button */}
      <Link
        href="/"
        aria-label="Go home"
        className="fixed top-3 left-3 z-50 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          boxShadow: '0 2px 12px rgba(249,115,22,0.45)',
        }}>
        <span className="text-white text-sm font-black">A</span>
      </Link>

      <div style={{position: 'fixed', inset: 0, overflow: 'hidden'}}>{children}</div>
    </>
  );
}
