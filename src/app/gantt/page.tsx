import {redirect} from 'next/navigation';
import {getServerSession} from 'next-auth';
import React from 'react';

import AccessDenied from '@/components/AccessDenied';
import GanttApp from '@/components/Gantt/GanttApp';
import {ADMIN_EMAIL, authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Gantt planner: admin only
export default async function GanttPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user?.email !== ADMIN_EMAIL) {
    return <AccessDenied message="The Gantt planner is only available to the site admin." />;
  }
  return <GanttApp />;
}
