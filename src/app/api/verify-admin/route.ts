import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const adminEmail = 'admin@example.com';
    
    // Query user table for admin user
    const adminUser = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      strikes: user.strikes,
      emailVerified: user.emailVerified
    })
    .from(user)
    .where(eq(user.email, adminEmail))
    .limit(1);

    if (adminUser.length === 0) {
      return NextResponse.json({ 
        error: 'Admin user not found',
        code: 'ADMIN_NOT_FOUND',
        email: adminEmail
      }, { status: 404 });
    }

    const adminUserData = adminUser[0];

    // Query account table for credential provider setup
    const adminAccount = await db.select({
      id: account.id,
      accountId: account.accountId,
      providerId: account.providerId,
      userId: account.userId,
      password: account.password,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    })
    .from(account)
    .where(eq(account.userId, adminUserData.id));

    // Return combined user and account information
    return NextResponse.json({
      user: adminUserData,
      accounts: adminAccount,
      verification: {
        userExists: true,
        accountsFound: adminAccount.length,
        hasCredentialProvider: adminAccount.some(acc => acc.providerId === 'credential' && acc.password),
        providerTypes: adminAccount.map(acc => acc.providerId)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}