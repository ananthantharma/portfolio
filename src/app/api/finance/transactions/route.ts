/* eslint-disable simple-import-sort/imports */
import {getServerSession} from 'next-auth';
import {NextRequest, NextResponse} from 'next/server';

import dbConnect from '@/lib/dbConnect';
import BudgetItem from '@/models/BudgetItem';
import Contact from '@/models/Contact';
import Investment from '@/models/Investment';
import NoteCategory from '@/models/NoteCategory';
import NotePage from '@/models/NotePage';
import NoteSection from '@/models/NoteSection';
import Password from '@/models/Password';
import ToDo from '@/models/ToDo';
import Transaction from '@/models/Transaction';
import {authOptions} from '@/pages/api/auth/[...nextauth]';

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const userEmail = session.user.email;

    // --- LAZY MIGRATION (One-time fix for existing owner) ---
    if (userEmail === 'lankanprinze@gmail.com') {
      const orphanCount = await Transaction.countDocuments({userEmail: {$exists: false}});
      if (orphanCount > 0) {
        console.log('Migrating orphaned data to', userEmail);
        const models = [
          Transaction,
          BudgetItem,
          Investment,
          Password,
          NoteCategory,
          NoteSection,
          NotePage,
          ToDo,
          Contact,
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await Promise.all(models.map((m: any) => m.updateMany({userEmail: {$exists: false}}, {$set: {userEmail}})));
      }
    }
    // --------------------------------------------------------

    // Fetch transactions for the user
    const transactions = await Transaction.find({userEmail}).sort({date: -1, createdAt: -1});

    const latest = await Transaction.findOne({userEmail}).sort({createdAt: -1}).select('createdAt');

    const lastUpdated = latest ? latest.createdAt : null;

    return NextResponse.json({
      success: true,
      data: transactions,
      lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({error: 'Failed to fetch transactions'}, {status: 500});
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    // Only delete user's transactions
    const result = await Transaction.deleteMany({userEmail: session.user.email});
    return NextResponse.json({success: true, deletedCount: result.deletedCount});
  } catch (error) {
    console.error('Error clearing transactions:', error);
    return NextResponse.json({error: 'Failed to clear transactions'}, {status: 500});
  }
}
