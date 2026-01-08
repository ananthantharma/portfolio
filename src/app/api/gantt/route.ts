import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Ensure this path is correct based on your project structure
import dbConnect from '@/lib/dbConnect';
// @ts-ignore
import GanttChart from '@/models/GanttChart';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    try {
        const chart = await GanttChart.findOne({ userId: session.user?.email });
        return NextResponse.json({ chart });
    } catch (error) {
        console.error("Error fetching Gantt chart:", error);
        return NextResponse.json({ error: 'Failed to fetch chart' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tasks, categoryColors } = await req.json();

    await dbConnect();
    try {
        await GanttChart.findOneAndUpdate(
            { userId: session.user?.email },
            {
                tasks,
                categoryColors,
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving Gantt chart:", error);
        return NextResponse.json({ error: 'Failed to save chart' }, { status: 500 });
    }
}
