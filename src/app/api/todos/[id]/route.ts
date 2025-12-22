/* eslint-disable @typescript-eslint/no-explicit-any */
import {NextResponse} from 'next/server';

import dbConnect from '@/lib/dbConnect';
import ToDo from '@/models/ToDo';

// PUT: Update a To Do item
export async function PUT(req: Request, {params}: {params: {id: string}}) {
  try {
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

      data.attachments = [...keptAttachments, ...newAttachments];
    } else {
      // JSON fallback
      const body = await req.json();
      data = body;
    }

    const updatedToDo = await ToDo.findByIdAndUpdate(id, data, {new: true});

    if (!updatedToDo) {
      return NextResponse.json({success: false, error: 'To Do not found'}, {status: 404});
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
    await dbConnect();
    const {id} = params;

    // Direct delete (attachments are embedded, so no need to clean up external files)
    const deletedToDo = await ToDo.findByIdAndDelete(id);

    if (!deletedToDo) {
      return NextResponse.json({success: false, error: 'To Do not found'}, {status: 404});
    }

    return NextResponse.json({success: true, data: {}});
  } catch (error) {
    console.error('Error deleting To Do:', error);
    return NextResponse.json({success: false, error: 'Failed to delete To Do'}, {status: 500});
  }
}
