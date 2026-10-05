import {redirect} from 'next/navigation';
import {getServerSession} from 'next-auth';
import React from 'react';

import AccessDenied from '@/components/AccessDenied';
import ContractRedlineStudio from '@/components/Notes/ContractRedlineStudio';
import {ADMIN_EMAIL, authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Version 2 of the Contract Redline & Comment Analyzer. Reached from the /notes tools sidebar; admin only.
export default async function ContractReviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user?.email !== ADMIN_EMAIL) {
    return <AccessDenied message="This contract review tool is only available to the site admin." />;
  }
  return <ContractRedlineStudio />;
}
