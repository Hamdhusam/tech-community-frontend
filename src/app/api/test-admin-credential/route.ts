import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { account, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';
import { auth } from '@/lib/auth';

const ADMIN_EMAIL = 'archanaarchu200604@gmail.com';
const ADMIN_PASSWORD = 'archanaarchu2006';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing admin credential verification...');

    // 1. Fetch user and credential
    const adminUser = await db.query.user.findFirst({
      where: eq(user.email, ADMIN_EMAIL),
      with: {
        accounts: {
          where: eq(account.providerId, 'credential'),
        },
      },
    });

    if (!adminUser || !adminUser.accounts.length) {
      console.log('❌ No user or credential found for admin email');
      return NextResponse.json({ error: 'No admin credential found' }, { status: 404 });
    }

    const credential = adminUser.accounts[0];
    console.log('✅ User and credential found:', {
      userId: adminUser.id,
      role: adminUser.role,
      credentialProvider: credential.providerId,
      credentialAccountId: credential.accountId,
      hasPassword: !!credential.password,
    });

    // 2. Verify password hash manually (same params as auth.ts)
    const isValidHash = await verify(credential.password!, ADMIN_PASSWORD, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
      outputLen: 32,
    });

    console.log('Manual argon2 verification result:', isValidHash ? '✅ PASS' : '❌ FAIL');

    // 3. Test better-auth signIn directly (simulate internal call)
    const { data, error } = await auth.api.signIn.email({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const authSuccess = !error && !!data?.session;
    console.log('Better-auth signIn result:', {
      success: authSuccess,
      errorCode: error?.code,
      sessionToken: authSuccess ? '***EXISTS***' : null,
    });

    if (authSuccess) {
      console.log('🎉 Full flow works! Admin login should succeed now.');
    } else {
      console.log('❌ Better-auth failed. Check error details above.');
    }

    return NextResponse.redirect(new URL('/admin/sign-in?tested=true', request.url));

  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({ error: 'Test failed', details: error.message }, { status: 500 });
  }
}