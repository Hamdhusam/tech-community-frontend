import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate required fields
    if (!email) {
      return NextResponse.json({
        success: false,
        error: "Email is required",
        code: "MISSING_EMAIL",
        debugInfo: {
          providedFields: { email: !!email, password: !!password }
        }
      }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({
        success: false,
        error: "Password is required",
        code: "MISSING_PASSWORD",
        debugInfo: {
          providedFields: { email: !!email, password: !!password }
        }
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
        success: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
        debugInfo: {
          searchedEmail: normalizedEmail,
          userFound: false,
          accountFound: false,
          passwordVerified: false
        }
      }, { status: 404 });
    }

    const foundUser = users[0];

    // Find corresponding account with providerId 'email'
    const accounts = await db.select()
      .from(account)
      .where(and(
        eq(account.userId, foundUser.id),
        eq(account.providerId, 'email')
      ))
      .limit(1);

    if (accounts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Email account not found for user",
        code: "ACCOUNT_NOT_FOUND",
        debugInfo: {
          searchedEmail: normalizedEmail,
          userFound: true,
          userId: foundUser.id,
          accountFound: false,
          passwordVerified: false,
          userDetails: {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role
          }
        }
      }, { status: 404 });
    }

    const foundAccount = accounts[0];

    // Check if password exists in account
    if (!foundAccount.password) {
      return NextResponse.json({
        success: false,
        error: "No password hash found for account",
        code: "NO_PASSWORD_HASH",
        debugInfo: {
          searchedEmail: normalizedEmail,
          userFound: true,
          accountFound: true,
          passwordHashExists: false,
          passwordVerified: false,
          userDetails: {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role
          },
          accountDetails: {
            id: foundAccount.id,
            providerId: foundAccount.providerId,
            accountId: foundAccount.accountId
          }
        }
      }, { status: 400 });
    }

    // Verify password using Argon2id
    let passwordVerified = false;
    try {
      passwordVerified = await verify(foundAccount.password, password);
    } catch (verifyError) {
      return NextResponse.json({
        success: false,
        error: "Password verification failed",
        code: "PASSWORD_VERIFY_ERROR",
        debugInfo: {
          searchedEmail: normalizedEmail,
          userFound: true,
          accountFound: true,
          passwordHashExists: true,
          passwordVerified: false,
          verifyError: verifyError instanceof Error ? verifyError.message : 'Unknown error',
          userDetails: {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role
          },
          accountDetails: {
            id: foundAccount.id,
            providerId: foundAccount.providerId,
            accountId: foundAccount.accountId
          }
        }
      }, { status: 500 });
    }

    if (!passwordVerified) {
      return NextResponse.json({
        success: false,
        error: "Invalid password",
        code: "INVALID_PASSWORD",
        debugInfo: {
          searchedEmail: normalizedEmail,
          userFound: true,
          accountFound: true,
          passwordHashExists: true,
          passwordVerified: false,
          userDetails: {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role
          },
          accountDetails: {
            id: foundAccount.id,
            providerId: foundAccount.providerId,
            accountId: foundAccount.accountId
          }
        }
      }, { status: 401 });
    }

    // Successful authentication
    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      userDetails: {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
        emailVerified: foundUser.emailVerified,
        strikes: foundUser.strikes,
        createdAt: foundUser.createdAt,
        updatedAt: foundUser.updatedAt
      },
      accountDetails: {
        id: foundAccount.id,
        providerId: foundAccount.providerId,
        accountId: foundAccount.accountId,
        createdAt: foundAccount.createdAt,
        updatedAt: foundAccount.updatedAt
      },
      passwordVerificationStatus: passwordVerified,
      debugInfo: {
        searchedEmail: normalizedEmail,
        userFound: true,
        accountFound: true,
        passwordHashExists: true,
        passwordVerified: true,
        authenticationFlow: "complete"
      }
    }, { status: 200 });

  } catch (error) {
    console.error('POST /api/test-admin-login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: "INTERNAL_SERVER_ERROR",
      debugInfo: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }, { status: 500 });
  }
}