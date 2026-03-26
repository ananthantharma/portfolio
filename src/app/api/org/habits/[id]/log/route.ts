import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import OrgHabit from '@/models/OrgHabit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const body = await req.json();
    const {date, completed}: {date: string; completed: boolean} = body;

    const habit = await OrgHabit.findById(params.id);

    if (!habit) {
      return NextResponse.json({success: false, error: 'Habit not found'}, {status: 404});
    }

    // Upsert completion for this date
    const existingIndex = habit.completions.findIndex((c: {date: string}) => c.date === date);
    if (existingIndex >= 0) {
      habit.completions[existingIndex].completed = completed;
    } else {
      habit.completions.push({date, completed});
    }

    // Recalculate streak: consecutive days ending today where completed=true
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completionMap = new Map<string, boolean>();
    for (const c of habit.completions) {
      completionMap.set(c.date, c.completed);
    }

    let streak = 0;
    const checkDate = new Date(today);

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const done = completionMap.get(dateStr);
      if (done === true) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    habit.streak = streak;
    if (streak > habit.bestStreak) {
      habit.bestStreak = streak;
    }

    await habit.save();

    return NextResponse.json({success: true, data: habit});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
