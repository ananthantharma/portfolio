'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useSession} from 'next-auth/react';
import {useEffect} from 'react';

export default function SigningLayout({children}: {children: React.ReactNode}) {
  const {status} = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
          <p className="text-sm text-gray-400 font-medium">Loading SignDocs...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <>
      <Link
        href="/"
        aria-label="Go home"
        className="fixed top-3 left-3 z-50 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-110"
        style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          boxShadow: '0 2px 12px rgba(249,115,22,0.45)',
        }}>
        <span className="text-white text-sm font-black">A</span>
      </Link>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">{children}</div>
    </>
  );
}
