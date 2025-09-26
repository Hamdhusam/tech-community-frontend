import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, user } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin authorization
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Query attendance records with user details using join
    const attendanceRecords = await db
      .select({
        id: attendance.id,
        userId: attendance.userId,
        submittedAt: attendance.submittedAt,
        confirmedNotion: attendance.confirmedNotion,
        notes: attendance.notes,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          strikes: user.strikes
        }
      })
      .from(attendance)
      .innerJoin(user, eq(attendance.userId, user.id))
      .orderBy(desc(attendance.submittedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(attendanceRecords);

  } catch (error) {
    console.error('GET attendance records error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}