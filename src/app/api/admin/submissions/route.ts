import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions, user } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication using better-auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role
    if (session.user.role !== 'admin') {
      console.warn(`Non-admin user ${session.user.id} attempted to access admin submissions endpoint`);
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    // Log admin access
    console.log(`Admin user ${session.user.id} (${session.user.email}) accessed submissions endpoint`);

    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Date filter parameter
    const dateFilter = searchParams.get('date');
    
    // Validate date format if provided
    if (dateFilter) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateFilter)) {
        return NextResponse.json({ 
          error: 'Invalid date format. Use YYYY-MM-DD format',
          code: 'INVALID_DATE_FORMAT' 
        }, { status: 400 });
      }
      
      // Validate that it's a valid date
      const parsedDate = new Date(dateFilter);
      if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().split('T')[0] !== dateFilter) {
        return NextResponse.json({ 
          error: 'Invalid date value',
          code: 'INVALID_DATE_VALUE' 
        }, { status: 400 });
      }
    }

    // Build query with join
    let query = db
      .select({
        id: submissions.id,
        userId: submissions.userId,
        submissionDate: submissions.submissionDate,
        date: submissions.date,
        attendanceClass: submissions.attendanceClass,
        fileAcademics: submissions.fileAcademics,
        qdOfficial: submissions.qdOfficial,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      })
      .from(submissions)
      .leftJoin(user, eq(submissions.userId, user.id));

    // Apply date filter if provided
    if (dateFilter) {
      query = query.where(eq(submissions.submissionDate, dateFilter));
    }

    // Apply ordering and pagination
    const results = await query
      .orderBy(desc(submissions.submissionDate), desc(submissions.createdAt))
      .limit(limit)
      .offset(offset);

    console.log(`Admin ${session.user.id} retrieved ${results.length} submissions (limit: ${limit}, offset: ${offset}, date filter: ${dateFilter || 'none'})`);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET submissions admin error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}