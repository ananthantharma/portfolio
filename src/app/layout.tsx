import 'tailwindcss/tailwind.css';
import '../globalStyles.scss';

import { Providers } from './providers';

export const metadata = {
  title: "Ananthan's Site",
  description: 'Personal Finance Manager',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
