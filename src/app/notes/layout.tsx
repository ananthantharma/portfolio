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
    // Same calm screen as loading.tsx, so opening notes never flashes dark
    return (
      <div className="flex h-screen items-center justify-center bg-[#fbfaf7] text-[#405b43]" role="status">
        <div className="flex flex-col items-center gap-4">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#dfe5d7] border-t-[#405b43]" />
          <p className="text-sm">Opening your workspace…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return <div style={{position: 'fixed', inset: 0, overflow: 'hidden'}}>{children}</div>;
}
