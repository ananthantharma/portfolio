/* eslint-disable simple-import-sort/imports */
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';

import dbConnect from '@/lib/dbConnect';
import Contact from '@/models/Contact';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();
    const body = await req.json();

    console.log('Creating Contact:', body.name);

    const newContact = await Contact.create({...body, userEmail: session.user.email});

    return NextResponse.json({success: true, data: newContact}, {status: 201});
  } catch (error) {
    console.error('Error in POST /api/contacts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();
    const contacts = await Contact.find({userEmail: session.user.email}).sort({name: 1});
    return NextResponse.json({success: true, data: contacts});
  } catch (error) {
    console.error('Error fetching Contacts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
