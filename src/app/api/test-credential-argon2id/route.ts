import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS',
        debug: {
          providedFields: {
            email: !!email,
            password: !!password
          }
        }
      }, { status: 400 });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const userResults = await db.select()
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (userResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        debug: {
          searchedEmail: normalizedEmail,
          userFound: false
        }
      }, { status: 404 });
    }

    const foundUser = userResults[0];

    // Find corresponding account with providerId 'credential'
    const accountResults = await db.select()
      .from(account)
      .where(and(
        eq(account.userId, foundUser.id),
        eq(account.providerId, 'credential')
      ))
      .limit(1);

    if (accountResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Credential account not found',
        code: 'CREDENTIAL_ACCOUNT_NOT_FOUND',
        debug: {
          userId: foundUser.id,
          searchedProviderId: 'credential',
          accountFound: false
        }
      }, { status: 404 });
    }

    const credentialAccount = accountResults[0];

    // Check if password hash exists
    if (!credentialAccount.password) {
      return NextResponse.json({
        success: false,
        error: 'No password hash found for credential account',
        code: 'NO_PASSWORD_HASH',
        debug: {
          userId: foundUser.id,
          accountId: credentialAccount.id,
          hasPassword: false
        }
      }, { status: 400 });
    }

    // Verify hash format (should start with '$argon2id$')
    const isArgon2idHash = credentialAccount.password.startsWith('$argon2id$');

    // Verify password using Argon2id
    let passwordVerified = false;
    let verificationError = null;

    try {
      passwordVerified = await verify(credentialAccount.password, password);
    } catch (error) {
      verificationError = error instanceof Error ? error.message : 'Unknown verification error';
    }

    // Prepare response data
    const responseData = {
      success: passwordVerified,
      authentication: {
        verified: passwordVerified,
        method: 'argon2id'
      },
      user: passwordVerified ? {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
        emailVerified: foundUser.emailVerified,
        strikes: foundUser.strikes,
        createdAt: foundUser.createdAt,
        updatedAt: foundUser.updatedAt
      } : null,
      account: passwordVerified ? {
        id: credentialAccount.id,
        accountId: credentialAccount.accountId,
        providerId: credentialAccount.providerId,
        userId: credentialAccount.userId,
        createdAt: credentialAccount.createdAt,
        updatedAt: credentialAccount.updatedAt
      } : null,
      debug: {
        userFound: true,
        userId: foundUser.id,
        email: foundUser.email,
        credentialAccountFound: true,
        accountId: credentialAccount.id,
        providerId: credentialAccount.providerId,
        hashFormat: {
          isArgon2id: isArgon2idHash,
          hashPrefix: credentialAccount.password.substring(0, 10) + '...',
          hashLength: credentialAccount.password.length
        },
        passwordVerification: {
          verified: passwordVerified,
          error: verificationError
        },
        timestamp: new Date().toISOString()
      }
    };

    if (!passwordVerified) {
      responseData.error = verificationError || 'Password verification failed';
      responseData.code = verificationError ? 'VERIFICATION_ERROR' : 'INVALID_PASSWORD';
    }

    const statusCode = passwordVerified ? 200 : 401;
    return NextResponse.json(responseData, { status: statusCode });

  } catch (error) {
    console.error('POST /api/test-auth error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: 'INTERNAL_ERROR',
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.constructor.name : typeof error
      }
    }, { status: 500 });
  }
}