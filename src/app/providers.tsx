'use client';

import {SessionProvider} from 'next-auth/react';
import {usePathname, useSearchParams} from 'next/navigation';
import {useEffect} from 'react';

export function Providers({children}: {children: React.ReactNode}) {
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

  return <SessionProvider>{children}</SessionProvider>;
}
