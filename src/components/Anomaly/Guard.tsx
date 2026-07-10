/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {Loader2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useSession} from 'next-auth/react';
import {useEffect} from 'react';

/**
 * Client-side shell for /anomaly: bounces signed-out visitors to /login and
 * pins the app to the full viewport. The real admin check happens server-side
 * in app/anomaly/page.tsx.
 */
export default function Guard({children}: {children: React.ReactNode}) {
  const {status} = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0c12]">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400/60" />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return <div style={{position: 'fixed', inset: 0, overflow: 'hidden'}}>{children}</div>;
}
