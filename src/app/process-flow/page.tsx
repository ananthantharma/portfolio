export const dynamic = 'force-dynamic';

import React, {Suspense} from 'react';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import AccessDenied from '@/components/AccessDenied';
import FlowStudio from '@/components/FlowStudio/FlowStudio';

export default async function ProcessFlowPage() {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any).notesEnabled) {
    return (
      <AccessDenied message="Access Denied. You do not have permission to access the Process Flow Builder. Please contact Ananthan." />
    );
  }

  return (
    <Suspense fallback={null}>
      <FlowStudio />
    </Suspense>
  );
}
