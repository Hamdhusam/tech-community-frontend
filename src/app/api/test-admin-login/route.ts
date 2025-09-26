import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

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

    // Find user by email
    const users = await db.select()
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json({ 
        error: "Invalid credentials - user not found",
        code: "USER_NOT_FOUND",
        details: {
          email: normalizedEmail,
          userExists: false
        }
      }, { status: 401 });
    }

    const foundUser = users[0];

    // Find associated account with credentials
    const accounts = await db.select()
      .from(account)
      .where(eq(account.userId, foundUser.id))
      .limit(1);

    if (accounts.length === 0) {
      return NextResponse.json({ 
        error: "Invalid credentials - no account found",
        code: "ACCOUNT_NOT_FOUND",
        details: {
          email: normalizedEmail,
          userExists: true,
          userId: foundUser.id,
          accountExists: false
        }
      }, { status: 401 });
    }

    const foundAccount = accounts[0];

    // Check if account has password
    if (!foundAccount.password) {
      return NextResponse.json({ 
        error: "Invalid credentials - no password set",
        code: "NO_PASSWORD_SET",
        details: {
          email: normalizedEmail,
          userExists: true,
          userId: foundUser.id,
          accountExists: true,
          hasPassword: false,
          providerId: foundAccount.providerId
        }
      }, { status: 401 });
    }

    // Compare password with stored hash
    const isValidPassword = await bcrypt.compare(password, foundAccount.password);

    if (!isValidPassword) {
      return NextResponse.json({ 
        error: "Invalid credentials - wrong password",
        code: "INVALID_PASSWORD",
        details: {
          email: normalizedEmail,
          userExists: true,
          userId: foundUser.id,
          accountExists: true,
          hasPassword: true,
          passwordMatch: false
        }
      }, { status: 401 });
    }

    // Credentials are valid - return user details
    return NextResponse.json({
      success: true,
      message: "Credentials verified successfully",
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
        providerId: foundAccount.providerId,
        hasPassword: true,
        createdAt: foundAccount.createdAt,
        updatedAt: foundAccount.updatedAt
      },
      verification: {
        email: normalizedEmail,
        userExists: true,
        accountExists: true,
        hasPassword: true,
        passwordMatch: true,
        isAdmin: foundUser.role === 'admin'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}