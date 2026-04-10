export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
// @ts-ignore
import GanttChart from '@/models/GanttChart';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  await dbConnect();

  const {searchParams} = new URL(req.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      // Fetch specific chart
      const chart = await GanttChart.findOne({_id: id, userId: session.user?.email});
      if (!chart) return NextResponse.json({error: 'Chart not found'}, {status: 404});
      return NextResponse.json({chart});
    } else {
      // List all charts (minimal data)
      const charts = await GanttChart.find(
        {userId: session.user?.email},
        {name: 1, lastUpdated: 1, _id: 1}, // Projection
      ).sort({lastUpdated: -1});

      return NextResponse.json({charts});
    }
  } catch (error) {
    console.error('Error fetching Gantt chart(s):', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error fetching charts',
        details: JSON.stringify(error),
      },
      {status: 500},
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const {id, name, tasks, categoryColors} = await req.json();

  await dbConnect();
  try {
    let chart;
    if (id) {
      // Update existing
      chart = await GanttChart.findOneAndUpdate(
        {_id: id, userId: session.user?.email},
        {
          name,
          tasks,
          categoryColors,
          lastUpdated: new Date(),
        },
        {new: true},
      );
    } else {
      // Create new
      chart = await GanttChart.create({
        userId: session.user?.email,
        name: name || 'Untitled Project',
        tasks,
        categoryColors,
        lastUpdated: new Date(),
      });
    }

    return NextResponse.json({success: true, chart});
  } catch (error) {
    console.error('Error saving Gantt chart:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error saving chart',
        details: JSON.stringify(error),
      },
      {status: 500},
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const {searchParams} = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({error: 'ID required'}, {status: 400});

  await dbConnect();
  try {
    await GanttChart.deleteOne({_id: id, userId: session.user?.email});
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting chart:', error);
    return NextResponse.json({error: 'Failed to delete'}, {status: 500});
  }
}
