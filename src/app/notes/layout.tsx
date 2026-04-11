'use client';

import {useRouter} from 'next/navigation';
import {useSession} from 'next-auth/react';
import {useEffect} from 'react';

export default function NotesLayout({children}: {children: React.ReactNode}) {
  const {status} = useSession();
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

  return <div style={{position: 'fixed', inset: 0, overflow: 'hidden'}}>{children}</div>;
}
