import 'tailwindcss/tailwind.css';
import '../globalStyles.scss';

import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { memo, useEffect } from 'react';

const MyApp = memo(({ Component, pageProps: { session, ...pageProps } }: AppProps): JSX.Element => {
  const router = useRouter();

  useEffect(() => {
    const logVisit = async (url: string) => {
      try {
        await fetch('/api/log-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: url }),
        });
      } catch (e) {
        console.error('Analytics Error', e);
      }
    };

    // Log initial load
    if (typeof window !== 'undefined') {
      logVisit(window.location.pathname + window.location.search);
    }

    const handleRouteChange = (url: string) => {
      logVisit(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
});

export default MyApp;
