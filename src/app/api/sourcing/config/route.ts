import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import connectToDatabase from '../../../../lib/mongodb';
import SourcingConfig from '../../../../models/SourcingConfig';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Find or create config
        let config = await SourcingConfig.findOne({ userId: session.user.email });

        if (!config) {
            config = await SourcingConfig.create({ userId: session.user.email });
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error fetching sourcing config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        await connectToDatabase();

        const config = await SourcingConfig.findOneAndUpdate(
            { userId: session.user.email },
            { $set: body },
            { new: true, upsert: true }
        );

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error updating sourcing config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
