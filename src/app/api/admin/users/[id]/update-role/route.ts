import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    // Authentication check - admin only
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    // Verify requester role directly from DB to prevent session spoof/missing role
    const requesterId = session.user.id;
    const requester = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, requesterId))
      .limit(1);
    const requesterRole = requester[0]?.role;
    if (requesterRole !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    // Extract user ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userIdIndex = pathParts.indexOf('users') + 1;
    const userId = pathParts[userIdIndex];

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required',
        code: 'MISSING_USER_ID' 
      }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { role } = body;

    // Validate role field
    if (!role) {
      return NextResponse.json({ 
        error: 'Role is required',
        code: 'MISSING_ROLE' 
      }, { status: 400 });
    }

    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json({ 
        error: 'Role must be either "admin" or "user"',
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    // Check if user exists first
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

    // Update user role
    const updatedUser = await db.update(user)
      .set({
        role,
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

    return NextResponse.json(updatedUser[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}