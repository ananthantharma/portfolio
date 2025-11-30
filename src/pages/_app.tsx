import 'tailwindcss/tailwind.css';
import '../globalStyles.scss';

import type {AppProps} from 'next/app';
import {SessionProvider} from 'next-auth/react';
import {memo} from 'react';

const MyApp = memo(({Component, pageProps: {session, ...pageProps}}: AppProps): JSX.Element => {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
});

export default MyApp;
