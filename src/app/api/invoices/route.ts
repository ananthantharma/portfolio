/* eslint-disable simple-import-sort/imports */
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/dbConnect';
import Invoice from '@/models/Invoice';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();
    const SHARED_ACCESS_EMAILS = ['lankanprinze@gmail.com', 'saikantha@gmail.com'];
    let query;

    if (session.user.email && SHARED_ACCESS_EMAILS.includes(session.user.email)) {
      // If user is in the shared group, they can see invoices from any email in that group
      query = {userEmail: {$in: SHARED_ACCESS_EMAILS}};
    } else {
      // Default strict isolation
      query = {userEmail: session.user.email};
    }

    const invoices = await Invoice.find(query).sort({date: -1, createdAt: -1});

    return NextResponse.json({success: true, data: invoices});
  } catch (error) {
    console.error('Fetch Invoices Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();
    const body = await req.json();

    // Ensure userEmail is set from session, overriding any body input
    const newInvoice = await Invoice.create({
      ...body,
      userEmail: session.user.email,
    });

    return NextResponse.json({success: true, data: newInvoice}, {status: 201});
  } catch (error) {
    console.error('Create Invoice Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
