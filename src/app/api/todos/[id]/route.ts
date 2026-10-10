/* eslint-disable @typescript-eslint/no-explicit-any */
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import '@/models/NotePage';
import '@/models/NoteSection'; // registered for vendor population
import mongoose from 'mongoose';

import dbConnect from '@/lib/dbConnect';
import {ActivityEntry, logActivity} from '@/lib/projectActivity';
import TaskPage from '@/models/TaskPage';
import ToDo, {VENDOR_POPULATE} from '@/models/ToDo';

export const dynamic = 'force-dynamic';

// PUT: Update a To Do item
export async function PUT(req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    await dbConnect();
    const {id} = params;

    let data: any = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      // Extract standard fields
      const title = formData.get('title') as string;
      if (title) data.title = title;

      const priority = formData.get('priority') as string;
      if (priority) data.priority = priority;

      const dueDate = formData.get('dueDate') as string;
      if (dueDate) data.dueDate = dueDate;

      const category = formData.get('category') as string;
      if (category) data.category = category;

      const notes = formData.get('notes') as string;
      if (notes) data.notes = notes;

      const status = formData.get('status') as string;
      if (status) data.status = status;

      const subtasksRaw = formData.get('subtasks') as string;
      if (subtasksRaw) data.subtasks = JSON.parse(subtasksRaw);

      const estimatedTime = formData.get('estimatedTime');
      if (estimatedTime) data.estimatedTime = Number(estimatedTime);

      const aiGenerated = formData.get('aiGenerated');
      if (aiGenerated) data.aiGenerated = aiGenerated === 'true';

      const aiContext = formData.get('aiContext') as string;
      if (aiContext) data.aiContext = aiContext;

      const tagsRaw = formData.get('tags') as string;
      if (tagsRaw) data.tags = JSON.parse(tagsRaw);

      // Handle attachments
      // 1. New files
      const files = formData.getAll('files') as File[];
      const newAttachments: any[] = [];

      const bufferPromises = files.map(async file => {
        if (file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;

          return {
            name: file.name,
            type: file.type,
            data: base64Data, // Store directly
            size: file.size,
          };
        }
        return null;
      });

      const results = await Promise.all(bufferPromises);
      results.forEach(res => {
        if (res) newAttachments.push(res);
      });

      // 2. Existing attachments (kept)
      const existingAttachmentsJson = formData.get('existingAttachments') as string;
      let keptAttachments = [];
      if (existingAttachmentsJson) {
        keptAttachments = JSON.parse(existingAttachmentsJson);
      }

      // 3. New Drive/Blob attachments
      const driveAttachmentsRaw = formData.get('driveAttachments') as string;
      const driveAttachments = driveAttachmentsRaw ? JSON.parse(driveAttachmentsRaw) : [];

      const blobAttachmentsRaw = formData.get('blobAttachments') as string;
      const blobAttachments = blobAttachmentsRaw ? JSON.parse(blobAttachmentsRaw) : [];

      data.attachments = [...keptAttachments, ...newAttachments, ...driveAttachments, ...blobAttachments];
    } else {
      // JSON fallback
      const body = await req.json();
      data = body;
    }

    // Never accept ownership changes or Mongo operators from a client payload.
    const allowed = ['title', 'priority', 'dueDate', 'category', 'notes', 'status', 'isCompleted', 'subtasks', 'estimatedTime', 'aiGenerated', 'aiContext', 'tags', 'attachments', 'sourcePageId', 'tabId', 'tabName', 'isArchived', 'isTemplate', 'recurrence', 'blockedBy', 'actualMinutes', 'hasNeonBorder', 'neonColor', 'isMinimized', 'order', 'vendorSectionId', 'bucket', 'taskGroupId', 'emailSubject', 'assignedTo', 'hasPage'];
    data = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.includes(key)));
    if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim())) return NextResponse.json({success: false, error: 'A task title is required'}, {status: 400});
    if (data.status !== undefined) {
      if (!['todo', 'in-progress', 'done'].includes(data.status)) return NextResponse.json({success: false, error: 'Invalid task status'}, {status: 400});
      data.isCompleted = data.status === 'done';
    } else if (data.isCompleted !== undefined) data.status = data.isCompleted ? 'done' : 'todo';
    if (data.dueDate === '') data.dueDate = null;
    if (data.vendorSectionId !== undefined && !mongoose.isValidObjectId(data.vendorSectionId)) data.vendorSectionId = null;
    if (data.taskGroupId !== undefined && !mongoose.isValidObjectId(data.taskGroupId)) data.taskGroupId = null;
    if (data.sourcePageId !== undefined && !mongoose.isValidObjectId(data.sourcePageId)) data.sourcePageId = null;
    if (data.assignedTo !== undefined) {
      const a = data.assignedTo;
      data.assignedTo = a && typeof a.name === 'string' && a.name.trim()
        ? {name: a.name.trim().slice(0, 120), email: typeof a.email === 'string' ? a.email.trim().slice(0, 200) : '', staffId: mongoose.isValidObjectId(a.staffId) ? a.staffId : null}
        : null;
    }
    const before = await ToDo.findOne({_id: id, userEmail: session.user.email}).select('isCompleted status vendorSectionId').lean();
    // Remember when a task was completed so Done can list the most recent first
    if (data.isCompleted !== undefined && before) {
      const wasDone = before.isCompleted || before.status === 'done';
      if (data.isCompleted && !wasDone) data.completedAt = new Date();
      if (!data.isCompleted) data.completedAt = null;
    }
    const updatedToDo = await ToDo.findOneAndUpdate({_id: id, userEmail: session.user.email}, {$set: data}, {new: true, runValidators: true})
      .populate({
        path: 'sourcePageId',
        select: 'title',
      })
      .populate(VENDOR_POPULATE(session.user.email));

    if (!updatedToDo) {
      return NextResponse.json({success: false, error: 'To Do not found'}, {status: 404});
    }

    // Project history: tasks completed, reopened, or linked to a project
    const vendorId = String((updatedToDo.vendorSectionId as {_id?: unknown} | null)?._id || updatedToDo.vendorSectionId || '');
    if (vendorId && before) {
      const entries: ActivityEntry[] = [];
      const wasDone = before.isCompleted || before.status === 'done';
      const isDone = updatedToDo.isCompleted || updatedToDo.status === 'done';
      const ref = String(updatedToDo._id);
      if (String(before.vendorSectionId || '') !== vendorId)
        entries.push({type: 'task', action: 'linked', label: 'Task linked', title: updatedToDo.title, refId: ref});
      if (!wasDone && isDone) entries.push({type: 'task', action: 'completed', label: 'Task completed', title: updatedToDo.title, refId: ref});
      if (wasDone && !isDone) entries.push({type: 'task', action: 'reopened', label: 'Task reopened', title: updatedToDo.title, refId: ref});
      await logActivity(session.user.email, vendorId, entries);
    }
    return NextResponse.json({success: true, data: updatedToDo});
  } catch (error) {
    console.error('Error updating To Do:', error);
    return NextResponse.json({success: false, error: 'Failed to update To Do'}, {status: 500});
  }
}

// DELETE: Remove a To Do item
export async function DELETE(_req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    await dbConnect();
    const {id} = params;

    // Direct delete (attachments are embedded, so no need to clean up external files)
    const deletedToDo = await ToDo.findOneAndDelete({_id: id, userEmail: session.user.email});

    if (!deletedToDo) {
      return NextResponse.json({success: false, error: 'To Do not found'}, {status: 404});
    }
    // The task's private page goes with it
    try {
      await TaskPage.deleteMany({taskId: deletedToDo._id, userEmail: session.user.email});
    } catch (pageError) {
      console.error('Could not delete the task page:', pageError);
    }

    return NextResponse.json({success: true, data: {}});
  } catch (error) {
    console.error('Error deleting To Do:', error);
    return NextResponse.json({success: false, error: 'Failed to delete To Do'}, {status: 500});
  }
}
