import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
// @ts-ignore
import GanttChart from '@/models/GanttChart';
import mongoose from 'mongoose';

export async function GET(_req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // UPDATE THIS STRING TO FORCE DEPLOYMENT
    const VERSION = "2026-01-08-FIX-V3";

    await dbConnect();

    try {
        const collection = mongoose.connection.collection('ganttcharts');
        const logs: string[] = [];
        logs.push(`Script Version: ${VERSION}`);

        // 1. List indexes before
        try {
            const indexesBefore = await collection.indexes();
            logs.push(`Indexes found: ${indexesBefore.length}`);
            indexesBefore.forEach(idx => logs.push(`- ${idx.name} (Unique: ${idx.unique || false})`));
        } catch (e) { logs.push("Could not list indexes (might be dropped already)"); }

        // 2. Aggressive Drop Attempts

        // Attempt A: By Name "userId_1"
        try {
            await collection.dropIndex("userId_1");
            logs.push("SUCCESS: Dropped index by name 'userId_1'");
        } catch (e) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logs.push(`Attempt A (Name) failed: ${(e as any).message}`);
        }

        // Attempt B: By naming convention "userId_1_unique" (just in case)
        try {
            await collection.dropIndex("userId_1_unique");
            logs.push("SUCCESS: Dropped index by name 'userId_1_unique'");
        } catch (e) {
            // Ignored
        }

        // Attempt C: By Specification (Mongoose/Mongo driver supports dropping by spec)
        try {
            // @ts-ignore - dropIndex signature allows object in some driver versions, trying just in case
            await collection.dropIndex({ userId: 1 });
            logs.push("SUCCESS: Dropped index by specification { userId: 1 }");
        } catch (e) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logs.push(`Attempt C (Spec) failed: ${(e as any).message}`);
        }

        // 3. List indexes after
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let indexesAfter: any[] = [];
        try {
            indexesAfter = await collection.indexes();
        } catch (e) { logs.push("Could not list indexes after op"); }

        return new NextResponse(`
            <html>
                <body style="font-family: sans-serif; padding: 20px; background: #f3f4f6;">
                    <div style="max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <h1 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Database Cleanup Report</h1>
                        <div style="margin-bottom: 15px;">
                            <span style="background: #dbeafe; color: #1e40af; px: 3px; py: 1px; border-radius: 4px; font-size: 14px; font-family: monospace;">
                                Script Version: ${VERSION}
                            </span>
                        </div>
                        
                        <h3 style="color: #374151;">Operation Logs:</h3>
                        <pre style="background: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 8px; overflow-x: auto;">${logs.join('\n')}</pre>
                        
                        <h3 style="color: #374151;">Current Indexes:</h3>
                        <pre style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">${JSON.stringify(indexesAfter, null, 2)}</pre>
                        
                        <div style="margin-top: 20px; padding: 15px; background: #ecfdf5; color: #065f46; border-radius: 8px; border: 1px solid #6ee7b7;">
                            <strong>✅ Steps Completed.</strong> If you see "SUCCESS" in the logs above, try "Save As" again.
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
