import {getServerSession} from 'next-auth';

import AccessDenied from '@/components/AccessDenied';
import AnomalyApp from '@/components/Anomaly/AnomalyApp';
import {ADMIN_EMAIL, authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AnomalyPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  // Anomaly is admin-only — stricter than the notesEnabled permission used by /notes.
  if (!session || email !== ADMIN_EMAIL) {
    return <AccessDenied message="Anomaly is restricted to the site administrator." />;
  }

  return <AnomalyApp />;
}
