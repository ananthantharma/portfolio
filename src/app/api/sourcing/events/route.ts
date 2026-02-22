import {NextRequest, NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '../../../../lib/auth';
import dbConnect from '../../../../lib/dbConnect';
import SourcingEvent from '../../../../models/SourcingEvent';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {searchParams} = new URL(req.url);
    const countOnly = searchParams.get('count') === 'true';

    await dbConnect();

    if (countOnly) {
      const count = await SourcingEvent.countDocuments({userId: session.user.email});
      return NextResponse.json({count});
    }

    const events = await SourcingEvent.find({userId: session.user.email}).sort({updatedAt: -1});

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching sourcing events:', error);
    return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const body = await req.json();
    await dbConnect();

    let event;
    if (body._id) {
      // Update
      event = await SourcingEvent.findOneAndUpdate(
        {_id: body._id, userId: session.user.email},
        {$set: {...body, userId: session.user.email}},
        {new: true},
      );
    } else {
      // Create
      event = await SourcingEvent.create({...body, userId: session.user.email});
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error saving sourcing event:', error);
    return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {searchParams} = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({error: 'Missing ID'}, {status: 400});
    }

    await dbConnect();
    await SourcingEvent.deleteOne({_id: id, userId: session.user.email});

    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting sourcing event:', error);
    return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
  }
}
