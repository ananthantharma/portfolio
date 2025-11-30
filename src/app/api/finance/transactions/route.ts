import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property'; // Ensure Property model is registered
import Transaction from '@/models/Transaction';
import {authOptions} from '@/pages/api/auth/[...nextauth]';

export async function GET(_request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        await dbConnect();
        // Ensure Property model is registered before populating
        // This is sometimes needed if Property hasn't been used yet
        console.log('Property model registered:', !!Property);

        const transactions = await Transaction.find({}).populate('property').sort({date: -1});

        return NextResponse.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        await dbConnect();
        const body = await request.json();

        // Basic validation
        if (!body.date || !body.description || !body.amount || !body.type || !body.category) {
            return NextResponse.json({error: 'Missing required fields'}, {status: 400});
        }

        const transaction = await Transaction.create(body);
        return NextResponse.json(transaction, {status: 201});
    } catch (error) {
        console.error('Error creating transaction:', error);
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
    }
}
