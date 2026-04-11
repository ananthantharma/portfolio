'use client';

import {SessionProvider} from 'next-auth/react';
import {usePathname, useSearchParams} from 'next/navigation';
import {useEffect, Suspense} from 'react';

function LogVisitTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    const logVisit = async (path: string) => {
      try {
        await fetch('/api/log-visit', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({path}),
        });
      } catch (e) {
        console.error('Analytics Error', e);
      }
    };

    if (pathname !== null) {
      logVisit(url);
    }
  }, [pathname, searchParams]);

  return null;
}

export function Providers({children}: {children: React.ReactNode}) {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <LogVisitTracker />
      </Suspense>
      {children}
    </SessionProvider>
  );
}
