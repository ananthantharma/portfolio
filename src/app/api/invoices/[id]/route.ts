/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';
import {authOptions} from '@/lib/auth';
import Invoice from '@/models/Invoice';
import dbConnect from '@/lib/dbConnect';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const SHARED_ACCESS_EMAILS = ['lankanprinze@gmail.com', 'saikantha@gmail.com'];
    let query;

    if (session.user.email && SHARED_ACCESS_EMAILS.includes(session.user.email)) {
      query = {_id: params.id, userEmail: {$in: SHARED_ACCESS_EMAILS}};
    } else {
      query = {_id: params.id, userEmail: session.user.email};
    }

    // Ensure the invoice belongs to the user (or shared group)
    const result = await Invoice.findOneAndDelete(query);

    if (!result) {
      return NextResponse.json({error: 'Invoice not found or unauthorized'}, {status: 404});
    }

    return NextResponse.json({message: 'Invoice deleted successfully'});
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({error: error.message || 'Failed to delete invoice'}, {status: 500});
  }
}

export async function PUT(req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const body = await req.json();
    await dbConnect();

    // Prevent userEmail injection
    delete body.userEmail;

    const SHARED_ACCESS_EMAILS = ['lankanprinze@gmail.com', 'saikantha@gmail.com'];
    let query;

    if (session.user.email && SHARED_ACCESS_EMAILS.includes(session.user.email)) {
      query = {_id: params.id, userEmail: {$in: SHARED_ACCESS_EMAILS}};
    } else {
      query = {_id: params.id, userEmail: session.user.email};
    }

    const result = await Invoice.findOneAndUpdate(
      query,
      {$set: body},
      {new: true}, // Return updated document
    );

    if (!result) {
      return NextResponse.json({error: 'Invoice not found or unauthorized'}, {status: 404});
    }

    return NextResponse.json({data: result});
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({error: error.message || 'Failed to update invoice'}, {status: 500});
  }
}
