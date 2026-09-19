import {redirect} from 'next/navigation';
import {getServerSession} from 'next-auth';
import React from 'react';

import TasksHome from '@/components/Tasks/TasksHome';
import {authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  // Keep task-only accounts working without granting access to notes.
  if ((session?.user as {notesEnabled?: boolean} | undefined)?.notesEnabled) {
    redirect('/notes?view=tasks');
  }
  return <TasksHome />;
}

