import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get session using better-auth
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Check if user has already submitted for today
    const existingSubmission = await db.select()
      .from(submissions)
      .where(and(
        eq(submissions.userId, session.user.id),
        eq(submissions.date, today)
      ))
      .limit(1);

    const hasSubmitted = existingSubmission.length > 0;

    return NextResponse.json({
      hasSubmitted,
      message: hasSubmitted ? "Already submitted today" : "Ready to submit"
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}