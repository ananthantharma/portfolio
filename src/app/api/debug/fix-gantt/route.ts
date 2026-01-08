import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
// @ts-ignore
import GanttChart from '@/models/GanttChart';
import mongoose from 'mongoose';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const collection = mongoose.connection.collection('ganttcharts');

        // List indexes before
        const indexesBefore = await collection.indexes();
        console.log("Indexes before:", JSON.stringify(indexesBefore, null, 2));

        const logs: string[] = [];
        logs.push(`Indexes found: ${indexesBefore.length}`);
        indexesBefore.forEach(idx => logs.push(`- ${idx.name} (Unique: ${idx.unique || false})`));

        // Attempt to drop 'userId_1' directly
        try {
            if (await collection.indexExists('userId_1')) {
                await collection.dropIndex("userId_1");
                logs.push("Successfully dropped index 'userId_1'");
            } else {
                logs.push("Index 'userId_1' not found by name.");
            }
        } catch (e) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logs.push(`Failed to drop 'userId_1': ${(e as any).message}`);
        }

        // List indexes after
        const indexesAfter = await collection.indexes();

        return new NextResponse(`
            <html>
                <body style="font-family: monospace; padding: 20px; background: #f0f0f0;">
                    <h1>Database Fix Report</h1>
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3>Logs:</h3>
                        <pre>${logs.join('\n')}</pre>
                        <h3>Current Indexes:</h3>
                        <pre>${JSON.stringify(indexesAfter, null, 2)}</pre>
                        <br/>
                        <div style="padding: 10px; background: #dcfce7; color: #166534; border-radius: 4px;">
                            <strong>Refreshed!</strong> You can now try saving your Gantt chart again.
                        </div>
                    </div>
                </body>
            </html>
        `, { headers: { 'Content-Type': 'text/html' } });

    } catch (error) {
        console.error("Error fixing DB:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error',
            details: JSON.stringify(error)
        }, { status: 500 });
    }
}
