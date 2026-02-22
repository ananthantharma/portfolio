/* eslint-disable simple-import-sort/imports */
import '@/models/NotePage'; // Ensure NotePage is registered for population
import '@/models/NoteSection'; // Ensure NoteSection is registered for population

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import ToDo from '@/models/ToDo';

export const runtime = 'nodejs';

// POST: Create a new To Do item
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      data = { ...body, userEmail: session.user.email };
    }

    console.log('Creating To Do:', {
      title: data.title,
      priority: data.priority,
      attachmentsCount: data.attachments?.length || 0,
    });

    const newToDo = await ToDo.create(data);

    console.log('To Do Created:', newToDo._id);
    return NextResponse.json({ success: true, data: newToDo }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/todos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const todos = await ToDo.find({ userEmail: session.user.email })
      .select('-attachments.data') // Exclude heavy data to prevent 2GB transfers
      .sort({ createdAt: -1 })
      .populate({
        path: 'sourcePageId',
        select: 'title sectionId',
        populate: {
          path: 'sectionId',
          select: 'categoryId',
        },
      });

    console.log(`Fetched ${todos.length} todos`);
    return NextResponse.json({ success: true, data: todos });
  } catch (error) {
    console.error('Error fetching To Dos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
