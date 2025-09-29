import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET method - List submissions (for testing)
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get submissions for the authenticated user
    const userSubmissions = await db.select()
      .from(submissions)
      .where(eq(submissions.userId, session.user.id))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(userSubmissions);

  } catch (error) {
    console.error('GET submissions error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    // Parse request body
    const requestBody = await request.json();
    
    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Extract and validate fields
    const { 
      date = new Date().toISOString().split('T')[0], // Default to today in YYYY-MM-DD format
      attendanceClass,
      fileAcademics,
      qdOfficial 
    } = requestBody;

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ 
        error: "Date must be in YYYY-MM-DD format",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Check for existing submission for user + date combination
    const existingSubmission = await db.select()
      .from(submissions)
      .where(and(
        eq(submissions.userId, session.user.id),
        eq(submissions.date, date)
      ))
      .limit(1);

    if (existingSubmission.length > 0) {
      return NextResponse.json({ 
        error: `You have already submitted for ${date}`,
        code: "DUPLICATE_SUBMISSION" 
      }, { status: 409 });
    }

    // Create new submission
    const newSubmission = await db.insert(submissions)
      .values({
        userId: session.user.id,
        date: date,
        attendanceClass: attendanceClass || null,
        fileAcademics: fileAcademics || null,
        qdOfficial: qdOfficial || null,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newSubmission[0], { status: 201 });

  } catch (error) {
    console.error('POST submissions error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}