import mongoose from 'mongoose';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {ADMIN_EMAIL, authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import GanttChart from '@/models/GanttChart';

export const dynamic = 'force-dynamic';

/** The Gantt planner is admin only. */
async function adminEmail() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  return email && email === ADMIN_EMAIL ? email : null;
}
const denied = () => NextResponse.json({error: 'Admin only'}, {status: 403});

export async function GET(req: Request) {
  const email = await adminEmail();
  if (!email) return denied();
  await dbConnect();
  const id = new URL(req.url).searchParams.get('id');
  try {
    if (id) {
      if (!mongoose.isValidObjectId(id)) return NextResponse.json({error: 'Chart not found'}, {status: 404});
      const chart = await GanttChart.findOne({_id: id, userId: email}).lean();
      if (!chart) return NextResponse.json({error: 'Chart not found'}, {status: 404});
      return NextResponse.json({chart});
    }
    // List with enough to show a summary card; sorted in JS (plain finds work best on the hosted database)
    const charts = await GanttChart.find({userId: email}).select('name description lastUpdated tasks').lean();
    const summaries = charts
      .map(c => {
        const tasks = (c.tasks || []).filter(t => t.type !== 'milestone');
        const starts = (c.tasks || []).map(t => new Date(t.start).getTime()).filter(n => !Number.isNaN(n));
        const ends = (c.tasks || []).map(t => new Date(t.end).getTime()).filter(n => !Number.isNaN(n));
        const leaf = tasks.filter(t => !(c.tasks || []).some(o => o.parentId === t.id));
        const progress = leaf.length ? Math.round(leaf.reduce((s, t) => s + (t.progress || 0), 0) / leaf.length) : 0;
        return {
          _id: c._id,
          name: c.name,
          description: c.description || '',
          lastUpdated: c.lastUpdated,
          taskCount: (c.tasks || []).length,
          start: starts.length ? new Date(Math.min(...starts)) : null,
          end: ends.length ? new Date(Math.max(...ends)) : null,
          progress,
        };
      })
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    return NextResponse.json({charts: summaries});
  } catch (error) {
    console.error('Error fetching Gantt chart(s):', error);
    return NextResponse.json({error: 'Could not load charts'}, {status: 500});
  }
}

export async function POST(req: Request) {
  const email = await adminEmail();
  if (!email) return denied();
  const {id, name, description, tasks, categoryColors} = await req.json();
  await dbConnect();
  try {
    const fields = {
      name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 200) : 'Untitled Project',
      description: typeof description === 'string' ? description.slice(0, 2000) : '',
      tasks: Array.isArray(tasks) ? tasks : [],
      categoryColors: categoryColors && typeof categoryColors === 'object' ? categoryColors : {},
      lastUpdated: new Date(),
    };
    let chart;
    if (id) {
      if (!mongoose.isValidObjectId(id)) return NextResponse.json({error: 'Chart not found'}, {status: 404});
      chart = await GanttChart.findOneAndUpdate({_id: id, userId: email}, fields, {new: true});
      if (!chart) return NextResponse.json({error: 'Chart not found'}, {status: 404});
    } else {
      chart = await GanttChart.create({userId: email, ...fields});
    }
    return NextResponse.json({success: true, chart: {_id: chart._id, lastUpdated: chart.lastUpdated}});
  } catch (error) {
    console.error('Error saving Gantt chart:', error);
    return NextResponse.json({error: error instanceof Error ? error.message : 'Could not save the chart'}, {status: 500});
  }
}

export async function DELETE(req: Request) {
  const email = await adminEmail();
  if (!email) return denied();
  const id = new URL(req.url).searchParams.get('id');
  if (!id || !mongoose.isValidObjectId(id)) return NextResponse.json({error: 'ID required'}, {status: 400});
  await dbConnect();
  try {
    await GanttChart.deleteOne({_id: id, userId: email});
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting chart:', error);
    return NextResponse.json({error: 'Failed to delete'}, {status: 500});
  }
}
