import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ 
        error: "Password is required",
        code: "MISSING_PASSWORD" 
      }, { status: 400 });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Query user by email
    const userRecord = await db.select()
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (userRecord.length === 0) {
      return NextResponse.json({ 
        error: "User not found",
        code: "USER_NOT_FOUND",
        debug: `No user found with email: ${normalizedEmail}`
      }, { status: 401 });
    }

    const foundUser = userRecord[0];

    // Query account with providerId 'email' for this user
    const accountRecord = await db.select()
      .from(account)
      .where(and(
        eq(account.userId, foundUser.id),
        eq(account.providerId, 'email')
      ))
      .limit(1);

    if (accountRecord.length === 0) {
      return NextResponse.json({ 
        error: "Email account not found",
        code: "EMAIL_ACCOUNT_NOT_FOUND",
        debug: `No email provider account found for user ID: ${foundUser.id}`
      }, { status: 401 });
    }

    const foundAccount = accountRecord[0];

    // Check if password hash exists
    if (!foundAccount.password) {
      return NextResponse.json({ 
        error: "No password set for this account",
        code: "NO_PASSWORD_SET",
        debug: "Account exists but no password hash is stored"
      }, { status: 401 });
    }

    // Compare password with hash
    const isPasswordValid = await bcrypt.compare(password, foundAccount.password);

    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: "Invalid password",
        code: "INVALID_PASSWORD",
        debug: "Password does not match stored hash"
      }, { status: 401 });
    }

    // Authentication successful - return verification results
    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        emailVerified: foundUser.emailVerified,
        strikes: foundUser.strikes,
        createdAt: foundUser.createdAt,
        updatedAt: foundUser.updatedAt
      },
      account: {
        id: foundAccount.id,
        accountId: foundAccount.accountId,
        providerId: foundAccount.providerId,
        userId: foundAccount.userId,
        createdAt: foundAccount.createdAt,
        updatedAt: foundAccount.updatedAt
      },
      verification: {
        passwordMatch: true,
        userExists: true,
        emailAccountExists: true,
        hasPasswordHash: true
      }
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: "INTERNAL_ERROR"
    }, { status: 500 });
  }
}