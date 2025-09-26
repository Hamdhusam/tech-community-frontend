import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account, attendance } from '@/db/schema';
import { eq, gte, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all users
    const users = await db.select().from(user);

    // For each user, calculate recent attendance count
    const usersWithAttendance = await Promise.all(
      users.map(async (userData) => {
        // Count attendance records in last 30 days for this user
        const recentAttendanceResult = await db
          .select({ count: count() })
          .from(attendance)
          .where(
            eq(attendance.userId, userData.id) && 
            gte(attendance.submittedAt, thirtyDaysAgo)
          );

        const recentAttendanceCount = recentAttendanceResult[0]?.count || 0;

        return {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          strikes: userData.strikes,
          totalStrikes: userData.strikes,
          recentAttendanceCount,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          emailVerified: userData.emailVerified,
          image: userData.image
        };
      })
    );

    return NextResponse.json(usersWithAttendance);

  } catch (error) {
    console.error('GET users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, email, password, role = 'user' } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Name is required and must be a non-empty string',
        code: 'INVALID_NAME' 
      }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ 
        error: 'Valid email is required',
        code: 'INVALID_EMAIL' 
      }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ 
        error: 'Password is required and must be at least 6 characters',
        code: 'INVALID_PASSWORD' 
      }, { status: 400 });
    }

    // Validate role
    if (role !== 'user' && role !== 'admin') {
      return NextResponse.json({ 
        error: 'Role must be either "user" or "admin"',
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Check if email already exists
    const existingUser = await db.select()
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: 'User with this email already exists',
        code: 'EMAIL_EXISTS' 
      }, { status: 409 });
    }

    // Hash password with bcrypt (better-auth compatible)
    const hashedPassword = await bcrypt.hash(password, 10);

    const currentTime = new Date();

    // Create user record
    const newUsers = await db.insert(user).values({
      name: trimmedName,
      email: normalizedEmail,
      emailVerified: false,
      image: null,
      role: role,
      strikes: 0,
      createdAt: currentTime,
      updatedAt: currentTime,
    }).returning();

    const newUser = newUsers[0];

    // Create corresponding account record for credential provider
    await db.insert(account).values({
      accountId: normalizedEmail,
      providerId: 'credential',
      userId: newUser.id,
      password: hashedPassword,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      createdAt: currentTime,
      updatedAt: currentTime,
    });

    // Return created user (exclude sensitive information)
    const responseUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      strikes: newUser.strikes,
      emailVerified: newUser.emailVerified,
      image: newUser.image,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    return NextResponse.json(responseUser, { status: 201 });

  } catch (error) {
    console.error('POST users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}