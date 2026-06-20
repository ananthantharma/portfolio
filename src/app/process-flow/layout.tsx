'use client';

import {useRouter} from 'next/navigation';
import {useSession} from 'next-auth/react';
import {useEffect} from 'react';

export default function ProcessFlowLayout({children}: {children: React.ReactNode}) {
  const {status} = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0C2721',
          color: '#C7E995',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: '14px',
          gap: '10px',
        }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity=".3" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur=".8s" repeatCount="indefinite" />
          </path>
        </svg>
        Loading…
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return <div style={{position: 'fixed', inset: 0, overflow: 'hidden'}}>{children}</div>;
}
