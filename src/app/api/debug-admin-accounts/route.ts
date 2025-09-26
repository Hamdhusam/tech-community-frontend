import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Query user table for admin@example.com
    const adminUser = await db.select()
      .from(user)
      .where(eq(user.email, 'admin@example.com'))
      .limit(1);

    if (adminUser.length === 0) {
      return NextResponse.json({
        error: 'Admin user not found',
        code: 'USER_NOT_FOUND',
        email: 'admin@example.com'
      }, { status: 404 });
    }

    const userData = adminUser[0];

    // Query all account records for that user ID
    const userAccounts = await db.select()
      .from(account)
      .where(eq(account.userId, userData.id));

    // Get unique provider types
    const providerTypes = [...new Set(userAccounts.map(acc => acc.providerId))];

    // Prepare debugging information
    const debugInfo = {
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        emailVerified: userData.emailVerified,
        image: userData.image,
        role: userData.role,
        strikes: userData.strikes,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      },
      accounts: {
        count: userAccounts.length,
        records: userAccounts.map(acc => ({
          id: acc.id,
          accountId: acc.accountId,
          providerId: acc.providerId,
          userId: acc.userId,
          accessToken: acc.accessToken ? '[REDACTED]' : null,
          refreshToken: acc.refreshToken ? '[REDACTED]' : null,
          idToken: acc.idToken ? '[REDACTED]' : null,
          accessTokenExpiresAt: acc.accessTokenExpiresAt,
          refreshTokenExpiresAt: acc.refreshTokenExpiresAt,
          scope: acc.scope,
          password: acc.password ? '[REDACTED]' : null,
          createdAt: acc.createdAt,
          updatedAt: acc.updatedAt
        }))
      },
      providerTypes: {
        available: providerTypes,
        count: providerTypes.length
      },
      summary: {
        userExists: true,
        hasAccounts: userAccounts.length > 0,
        accountCount: userAccounts.length,
        providers: providerTypes
      }
    };

    return NextResponse.json(debugInfo, { status: 200 });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error,
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}