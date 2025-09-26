import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account, session, verification, attendance } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Simple admin setup summary without session checking for now
    const [userCount] = await db.select({ count: count() }).from(user);
    const [sessionCount] = await db.select({ count: count() }).from(session);
    const [accountCount] = await db.select({ count: count() }).from(account);
    const [attendanceCount] = await db.select({ count: count() }).from(attendance);

    const adminUsers = await db.select().from(user).where(eq(user.role, 'admin'));

    return NextResponse.json({
      summary: {
        totalUsers: userCount.count,
        totalAdmins: adminUsers.length,
        totalSessions: sessionCount.count,
        totalAccounts: accountCount.count,
        totalAttendance: attendanceCount.count
      },
      adminUsers: adminUsers.map(admin => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        emailVerified: admin.emailVerified
      })),
      status: 'Admin setup operational'
    }, { status: 200 });

  } catch (error) {
    console.error('Admin summary error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate admin summary: ' + error,
      code: 'ADMIN_SUMMARY_ERROR'
    }, { status: 500 });
  }
}