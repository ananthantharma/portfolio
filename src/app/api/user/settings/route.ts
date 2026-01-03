import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';

export async function GET(_req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            systemInstruction: user.systemInstruction || ''
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { systemInstruction } = await req.json();
        console.log('Saving settings for:', session.user.email, 'Instruction:', systemInstruction);

        await dbConnect();
        const user = await User.findOneAndUpdate(
            { email: session.user.email },
            { $set: { systemInstruction } },
            { new: true }
        );
        console.log('User updated:', user ? 'Yes' : 'No');

        return NextResponse.json({
            success: true,
            systemInstruction: user?.systemInstruction
        });
    } catch (error) {
        console.error('Error saving settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
