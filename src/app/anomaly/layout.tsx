import Guard from '@/components/Anomaly/Guard';

export const metadata = {
  title: 'Anomaly — Notes, Reinvented',
  description: 'Admin-only notes workspace.',
  robots: {index: false, follow: false},
};

export default function AnomalyLayout({children}: {children: React.ReactNode}) {
  return <Guard>{children}</Guard>;
}
