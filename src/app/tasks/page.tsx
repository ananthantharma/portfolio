import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {getServerSession} from 'next-auth';
import React from 'react';

import TasksHome from '@/components/Tasks/TasksHome';
import {authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  // On a computer, notes users get tasks inside /notes; phones always get this page's mobile layout.
  const phone = /Mobi|Android|iPhone|iPod/i.test(headers().get('user-agent') || '');
  if (!phone && (session?.user as {notesEnabled?: boolean} | undefined)?.notesEnabled) {
    redirect('/notes?view=tasks');
  }
  return <TasksHome />;
}
