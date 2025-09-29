import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// SuperAdmin authentication helper
async function requireSuperAdmin(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || !session.user || session.user.role !== 'admin') {
      return null;
    }
    
    // Get full user details to check superAdmin status
    const fullUser = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    
    if (fullUser.length === 0 || !fullUser[0].superAdmin) {
      return null;
    }
    
    return session.user;
  } catch (error) {
    console.error('SuperAdmin auth error:', error);
    return null;
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authentication check - superAdmin only for role updates
    const superAdminUser = await requireSuperAdmin(request);
    if (!superAdminUser) {
      return NextResponse.json({ 
        error: 'Super admin access required for role updates',
        code: 'SUPER_ADMIN_ACCESS_REQUIRED' 
      }, { status: 403 });
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

    console.log(`Super Admin ${superAdminUser.id} updated role for user ${userId} to ${role}`);

    return NextResponse.json(updatedUser[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}