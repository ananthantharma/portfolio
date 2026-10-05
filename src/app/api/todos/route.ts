export const dynamic = 'force-dynamic';
/* eslint-disable simple-import-sort/imports */
import '@/models/NotePage'; // Ensure NotePage is registered for population
import '@/models/NoteSection'; // Ensure NoteSection is registered for population

import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';

import {NextResponse} from 'next/server';

import mongoose from 'mongoose';

import dbConnect from '@/lib/dbConnect';
import {logActivity} from '@/lib/projectActivity';
import ToDo, {VENDOR_POPULATE} from '@/models/ToDo';

export const runtime = 'nodejs';

// POST: Create a new To Do item
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    console.log('POST /api/todos hit');
    await dbConnect();

    let data;
    // Check if content-type is multipart/form-data
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      console.log('FormData received. Keys:', Array.from(formData.keys()));
      const title = formData.get('title') as string;
      const priority = formData.get('priority') as string;
      const dueDate = formData.get('dueDate') as string;
      const category = formData.get('category') as string;
      const notes = formData.get('notes') as string;
      const sourcePageId = formData.get('sourcePageId') as string;
      const tabId = formData.get('tabId') as string;
      const tabName = formData.get('tabName') as string;

      const subtasksRaw = formData.get('subtasks') as string;
      const subtasks = subtasksRaw ? JSON.parse(subtasksRaw) : [];

      const estimatedTime = formData.get('estimatedTime') ? Number(formData.get('estimatedTime')) : undefined;
      const aiGenerated = formData.get('aiGenerated') === 'true';
      const aiContext = formData.get('aiContext') as string;

      const tagsRaw = formData.get('tags') as string;
      const tags = tagsRaw ? JSON.parse(tagsRaw) : [];

      const driveAttachmentsRaw = formData.get('driveAttachments') as string;
      const driveAttachments = driveAttachmentsRaw ? JSON.parse(driveAttachmentsRaw) : [];

      const blobAttachmentsRaw = formData.get('blobAttachments') as string;
      const blobAttachments = blobAttachmentsRaw ? JSON.parse(blobAttachmentsRaw) : [];

      const files = formData.getAll('files') as File[];
      const attachments = [...driveAttachments, ...blobAttachments]; // Start with Drive and Blob files

      for (const file of files) {
        console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);
        if (file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;

          attachments.push({
            name: file.name,
            type: file.type,
            data: base64Data, // Store directly
            storageType: 'local',
            size: file.size,
          });
        }
      }

      data = {
        sourcePageId: sourcePageId || undefined,
        tabId: tabId || undefined,
        tabName: tabName || undefined,
        title,
        priority,
        dueDate,
        category,
        notes,
        status: 'todo', // Default
        attachments,
        userEmail: session.user.email,
        subtasks,
        estimatedTime,
        aiGenerated,
        aiContext,
        tags,
      };
    } else {
      // Fallback for JSON (e.g. from existing external calls?)
      // Though our frontend will switch to FormData.
      const body = await req.json();
      data = {...body, userEmail: session.user.email};
      if ((data.isCompleted || data.status === 'done') && !data.completedAt) data.completedAt = new Date();
    }

    console.log('Creating To Do:', {
      title: data.title,
      priority: data.priority,
      attachmentsCount: data.attachments?.length || 0,
    });

    if (data.vendorSectionId && !mongoose.isValidObjectId(data.vendorSectionId)) data.vendorSectionId = null;
    if (data.taskGroupId && !mongoose.isValidObjectId(data.taskGroupId)) data.taskGroupId = null;
    const newToDo = await ToDo.create(data);
    // Return the vendor name with the new task so its vendor pill can render immediately
    await newToDo.populate(VENDOR_POPULATE(session.user.email));

    console.log('To Do Created:', newToDo._id);
    // Project history: tasks created on (or for) a project
    const vendorId = (newToDo.vendorSectionId as {_id?: unknown} | null)?._id || newToDo.vendorSectionId;
    if (vendorId) {
      await logActivity(session.user.email, vendorId, {
        type: 'task',
        action: 'created',
        label: 'Task created',
        title: newToDo.title,
        refId: String(newToDo._id),
      });
    }
    return NextResponse.json({success: true, data: newToDo}, {status: 201});
  } catch (error) {
    console.error('Error in POST /api/todos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}

// Tasks completed longer ago than this are left out unless ?olderDone=1 is passed
const DONE_WINDOW_DAYS = 30;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const includeOlderDone = new URL(req.url).searchParams.get('olderDone') === '1';
    const cutoff = new Date(Date.now() - DONE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    // Tasks completed before completedAt existed fall back to their last update time
    const recentOrOpen = {
      $or: [
        {isCompleted: {$ne: true}, status: {$ne: 'done'}},
        {completedAt: {$gte: cutoff}},
        {completedAt: null, updatedAt: {$gte: cutoff}},
      ],
    };
    const olderDone = {
      $and: [
        {$or: [{isCompleted: true}, {status: 'done'}]},
        {$or: [{completedAt: {$lt: cutoff}}, {completedAt: null, updatedAt: {$lt: cutoff}}]},
      ],
    };

    const todos = await ToDo.find({userEmail: session.user.email, ...(includeOlderDone ? {} : recentOrOpen)})
      .select('-attachments.data') // Exclude heavy data to prevent 2GB transfers
      .sort({createdAt: -1})
      .populate({
        path: 'sourcePageId',
        select: 'title sectionId',
        populate: {
          path: 'sectionId',
          select: 'categoryId',
        },
      })
      .populate(VENDOR_POPULATE(session.user.email));

    // How many older completed tasks were left out, so the list can offer to load them
    let olderDoneCount = 0;
    if (!includeOlderDone) {
      try {
        olderDoneCount = await ToDo.countDocuments({userEmail: session.user.email, ...olderDone});
      } catch (countError) {
        console.error('Could not count older completed To Dos:', countError);
      }
    }

    console.log(`Fetched ${todos.length} todos${includeOlderDone ? ' (including older completed)' : `, ${olderDoneCount} older completed skipped`}`);
    return NextResponse.json({success: true, data: todos, olderDoneCount, doneWindowDays: DONE_WINDOW_DAYS});
  } catch (error) {
    console.error('Error fetching To Dos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
