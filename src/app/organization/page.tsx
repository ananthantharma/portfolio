import React from 'react';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import AccessDenied from '@/components/AccessDenied';
import OrganizationLayout from '@/components/Organization/OrganizationLayout';

export default async function OrganizationPage() {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any).notesEnabled) {
    return (
      <AccessDenied message="Access Denied. You do not have permission to access this page. Please contact Ananthan." />
    );
  }

  return <OrganizationLayout />;
}
