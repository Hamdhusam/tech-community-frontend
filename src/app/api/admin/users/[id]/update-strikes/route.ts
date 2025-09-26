import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    // Get session and verify admin role
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    // Extract user ID from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const userId = pathSegments[pathSegments.indexOf('users') + 1];

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required',
        code: 'MISSING_USER_ID' 
      }, { status: 400 });
    }

    // Parse request body
    const requestBody = await request.json();
    const { strikes } = requestBody;

    // Validate strikes field
    if (strikes === undefined || strikes === null) {
      return NextResponse.json({ 
        error: 'Strikes field is required',
        code: 'MISSING_STRIKES' 
      }, { status: 400 });
    }

    if (!Number.isInteger(strikes) || strikes < 0) {
      return NextResponse.json({ 
        error: 'Strikes must be a non-negative integer',
        code: 'INVALID_STRIKES' 
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await db.select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Update user strikes
    const updatedUser = await db.update(user)
      .set({
        strikes,
        updatedAt: new Date()
      })
      .where(eq(user.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update user',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json(updatedUser[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}