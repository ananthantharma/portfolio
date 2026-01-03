import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import {authOptions} from '@/lib/auth';

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();
    const properties = await Property.find({}).sort({name: 1});
    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
  }
}
