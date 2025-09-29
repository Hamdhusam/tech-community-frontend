import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account, attendance } from '@/db/schema';
import { eq, like, and, or, desc, count, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { hash } from '@node-rs/argon2';
import { nanoid } from 'nanoid';

// Admin authentication helper with superAdmin check
async function requireAdmin(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || !session.user || session.user.role !== 'admin') {
      return null;
    }
    
    return session.user;
  } catch (error) {
    console.error('Admin auth error:', error);
    return null;
  }
}

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

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password hashing helper
async function hashPassword(password: string): Promise<string> {
  return await hash(password, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
    outputLen: 32,
  });
}

// GET method - List users with search, pagination, and attendance data
export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ 
        error: 'Admin authentication required',
        code: 'ADMIN_ACCESS_REQUIRED' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const roleFilter = searchParams.get('role');

    // Build base query with attendance count subquery
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let baseQuery = db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        strikes: user.strikes,
        superAdmin: user.superAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        recentAttendanceCount: sql<number>`
          COALESCE((
            SELECT COUNT(*) 
            FROM ${attendance} 
            WHERE ${attendance.userId} = ${user.id} 
            AND ${attendance.submittedAt} >= ${thirtyDaysAgo.getTime()}
          ), 0)
        `.as('recentAttendanceCount')
      })
      .from(user);

    // Apply filters
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(user.name, `%${search}%`),
          like(user.email, `%${search}%`)
        )
      );
    }

    if (roleFilter && (roleFilter === 'admin' || roleFilter === 'user')) {
      conditions.push(eq(user.role, roleFilter));
    }

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }

    // Execute query with pagination
    const users = await baseQuery
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    let countQuery = db.select({ count: count() }).from(user);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ count: totalCount }] = await countQuery;

    const pagination = {
      limit,
      offset,
      total: totalCount,
      hasMore: offset + limit < totalCount
    };

    console.log(`Admin ${adminUser.id} fetched users list - ${users.length} records`);

    return NextResponse.json({
      users,
      pagination
    });

  } catch (error) {
    console.error('GET users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// POST method - Create new user (requires superAdmin)
export async function POST(request: NextRequest) {
  try {
    const superAdminUser = await requireSuperAdmin(request);
    if (!superAdminUser) {
      return NextResponse.json({ 
        error: 'Super admin access required for user creation',
        code: 'SUPER_ADMIN_ACCESS_REQUIRED' 
      }, { status: 403 });
    }

    const requestBody = await request.json();
    const { name, email, password, role, superAdmin } = requestBody;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Name is required and cannot be empty',
        code: 'INVALID_NAME' 
      }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json({ 
        error: 'Valid email is required',
        code: 'INVALID_EMAIL' 
      }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long',
        code: 'INVALID_PASSWORD' 
      }, { status: 400 });
    }

    if (!role || (role !== 'admin' && role !== 'user')) {
      return NextResponse.json({ 
        error: 'Role must be either "admin" or "user"',
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: 'User with this email already exists',
        code: 'EMAIL_EXISTS' 
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate user ID
    const userId = nanoid();
    const accountId = nanoid();

    const now = new Date();

    // Create user record
    const [newUser] = await db.insert(user).values({
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      emailVerified: false,
      role,
      superAdmin: superAdmin === true ? true : false,
      strikes: 0,
      createdAt: now,
      updatedAt: now
    }).returning();

    // Create account record
    await db.insert(account).values({
      id: accountId,
      accountId: normalizedEmail,
      providerId: 'email',
      userId: userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now
    });

    // Return user without password
    const { ...userResponse } = newUser;

    console.log(`Super Admin ${superAdminUser.id} created new user: ${userId} (${normalizedEmail})`);

    return NextResponse.json(userResponse, { status: 201 });

  } catch (error) {
    console.error('POST users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}

// PUT method - Update existing user (superAdmin required for admin role changes)
export async function PUT(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ 
        error: 'Admin authentication required',
        code: 'ADMIN_ACCESS_REQUIRED' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Valid user ID is required',
        code: 'INVALID_USER_ID' 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { name, email, password, role, emailVerified, strikes, superAdmin } = requestBody;

    // Check if user exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check if trying to change admin role or superAdmin status - requires superAdmin
    if ((role !== undefined && role !== existingUser[0].role) || 
        (superAdmin !== undefined && superAdmin !== existingUser[0].superAdmin)) {
      const superAdminUser = await requireSuperAdmin(request);
      if (!superAdminUser) {
        return NextResponse.json({ 
          error: 'Super admin access required for role or superAdmin changes',
          code: 'SUPER_ADMIN_ACCESS_REQUIRED' 
        }, { status: 403 });
      }
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date()
    };

    // Validate and set name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Name cannot be empty',
          code: 'INVALID_NAME' 
        }, { status: 400 });
      }
      updates.name = name.trim();
    }

    // Validate and set email
    if (email !== undefined) {
      if (typeof email !== 'string' || !isValidEmail(email)) {
        return NextResponse.json({ 
          error: 'Valid email is required',
          code: 'INVALID_EMAIL' 
        }, { status: 400 });
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email is already taken by another user
      if (normalizedEmail !== existingUser[0].email) {
        const emailExists = await db
          .select({ id: user.id })
          .from(user)
          .where(and(eq(user.email, normalizedEmail), sql`${user.id} != ${userId}`))
          .limit(1);

        if (emailExists.length > 0) {
          return NextResponse.json({ 
            error: 'Email is already taken by another user',
            code: 'EMAIL_EXISTS' 
          }, { status: 400 });
        }

        updates.email = normalizedEmail;
      }
    }

    // Validate and set role
    if (role !== undefined) {
      if (role !== 'admin' && role !== 'user') {
        return NextResponse.json({ 
          error: 'Role must be either "admin" or "user"',
          code: 'INVALID_ROLE' 
        }, { status: 400 });
      }
      updates.role = role;
    }

    // Validate and set superAdmin
    if (superAdmin !== undefined) {
      if (typeof superAdmin !== 'boolean') {
        return NextResponse.json({ 
          error: 'superAdmin must be a boolean',
          code: 'INVALID_SUPER_ADMIN' 
        }, { status: 400 });
      }
      updates.superAdmin = superAdmin;
    }

    // Validate and set emailVerified
    if (emailVerified !== undefined) {
      if (typeof emailVerified !== 'boolean') {
        return NextResponse.json({ 
          error: 'emailVerified must be a boolean',
          code: 'INVALID_EMAIL_VERIFIED' 
        }, { status: 400 });
      }
      updates.emailVerified = emailVerified;
    }

    // Validate and set strikes
    if (strikes !== undefined) {
      if (typeof strikes !== 'number' || strikes < 0) {
        return NextResponse.json({ 
          error: 'Strikes must be a non-negative number',
          code: 'INVALID_STRIKES' 
        }, { status: 400 });
      }
      updates.strikes = strikes;
    }

    // Update user record
    const [updatedUser] = await db
      .update(user)
      .set(updates)
      .where(eq(user.id, userId))
      .returning();

    // Handle password update
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ 
          error: 'Password must be at least 6 characters long',
          code: 'INVALID_PASSWORD' 
        }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password);
      
      await db
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(and(eq(account.userId, userId), eq(account.providerId, 'email')));
    }

    // Handle email update in account
    if (updates.email) {
      await db
        .update(account)
        .set({
          accountId: updates.email,
          updatedAt: new Date()
        })
        .where(and(eq(account.userId, userId), eq(account.providerId, 'email')));
    }

    console.log(`Admin ${adminUser.id} updated user: ${userId}`);

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('PUT users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}

// DELETE method - Delete user (requires superAdmin)
export async function DELETE(request: NextRequest) {
  try {
    const superAdminUser = await requireSuperAdmin(request);
    if (!superAdminUser) {
      return NextResponse.json({ 
        error: 'Super admin access required for user deletion',
        code: 'SUPER_ADMIN_ACCESS_REQUIRED' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Valid user ID is required',
        code: 'INVALID_USER_ID' 
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Prevent superAdmin from deleting themselves
    if (userId === superAdminUser.id) {
      return NextResponse.json({ 
        error: 'Cannot delete your own super admin account',
        code: 'CANNOT_DELETE_SELF' 
      }, { status: 400 });
    }

    // Delete associated account records first (cascade will handle this, but being explicit)
    await db
      .delete(account)
      .where(eq(account.userId, userId));

    // Delete user record
    const [deletedUser] = await db
      .delete(user)
      .where(eq(user.id, userId))
      .returning();

    console.log(`Super Admin ${superAdminUser.id} deleted user: ${userId} (${deletedUser.email})`);

    return NextResponse.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: deletedUser.id,
        name: deletedUser.name,
        email: deletedUser.email,
        role: deletedUser.role,
        superAdmin: deletedUser.superAdmin
      }
    });

  } catch (error) {
    console.error('DELETE users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}