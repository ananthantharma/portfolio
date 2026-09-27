import {NextResponse} from 'next/server';

import {authorizeSection, loadProfile} from '@/lib/vendorProfileServer';
import NotePage from '@/models/NotePage';
import ProjectActivity from '@/models/ProjectActivity';
import ToDo from '@/models/ToDo';

export const dynamic = 'force-dynamic';

// Structured facts about a project in one call. The Project Brief is hand-written today;
// this is the input an AI-generated brief can summarise later.
export async function GET(_req: Request, {params}: {params: {sectionId: string}}) {
  const auth = await authorizeSection(params.sectionId);
  if ('error' in auth) return auth.error;
  const {userEmail} = auth;
  try {
    const [profile, tasks, notes, activity] = await Promise.all([
      loadProfile(userEmail, params.sectionId),
      ToDo.find({userEmail, vendorSectionId: params.sectionId, isArchived: {$ne: true}, isTemplate: {$ne: true}})
        .select('title status isCompleted priority dueDate')
        .lean(),
      NotePage.find({userEmail, sectionId: params.sectionId}).select('title createdAt updatedAt isPinned').sort({updatedAt: -1}).limit(10).lean(),
      ProjectActivity.find({userEmail, sectionId: params.sectionId}).sort({createdAt: -1}).limit(20).select('label title createdAt -_id').lean(),
    ]);
    const openTasks = tasks.filter(t => !t.isCompleted && t.status !== 'done');
    return NextResponse.json({
      success: true,
      data: {
        project: {
          name: auth.sectionName,
          description: profile.summary,
          status: profile.status,
          phase: profile.phase,
          health: profile.health,
          startDate: profile.startDate,
          targetDate: profile.targetDate,
          owner: profile.owner,
          currentFocus: profile.currentFocus,
          brief: profile.brief,
        },
        tasks: {open: openTasks, completedCount: tasks.length - openTasks.length},
        attention: (profile.attention || []).filter(a => a.status !== 'Resolved'),
        decisions: (profile.decisions || []).filter(d => d.status === 'Active'),
        documents: (profile.documents || []).map(d => ({title: d.title, type: d.docType, notes: d.notes, pinned: d.pinned})),
        recentNotes: notes,
        recentActivity: activity,
      },
    });
  } catch (error) {
    console.error('Snapshot GET error:', error);
    return NextResponse.json({error: 'Failed to build snapshot'}, {status: 500});
  }
}
