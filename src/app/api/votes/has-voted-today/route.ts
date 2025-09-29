import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authentication check using better-auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === 'admin';
    
    // Generate today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Query votes table for today's vote
    const existingVote = await db.select()
      .from(votes)
      .where(and(eq(votes.userId, userId), eq(votes.voteDate, today)))
      .limit(1);

    // Check if user has voted today
    const hasVoted = existingVote.length > 0;
    const voteValue = hasVoted ? existingVote[0].vote : null;

    // Generate response message based on voting status and admin role
    let message: string;
    if (hasVoted) {
      message = isAdmin ? "Admin view: Already voted today" : "Already voted today";
    } else {
      message = isAdmin ? "Admin view: Ready to vote" : "Ready to vote";
    }

    return NextResponse.json({
      hasVoted,
      vote: voteValue,
      message
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}