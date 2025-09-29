import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { account, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';
import { nanoid } from 'nanoid';

const ADMIN_EMAIL = 'archanaarchu200604@gmail.com';
const ADMIN_PASSWORD = 'archanaarchu2006';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting direct sign-in test...');

    // Step 1: Find user by email
    const userRecord = await db.query.user.findFirst({
      where: eq(user.email, ADMIN_EMAIL),
    });
    if (!userRecord) {
      console.log('User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.log('User found:', userRecord.id, userRecord.role);

    // Step 2: Find credential
    const credential = await db.query.account.findFirst({
      where: and(
        eq(account.providerId, 'credential'),
        eq(account.accountId, ADMIN_EMAIL)
      ),
    });
    if (!credential || !credential.password) {
      console.log('Credential not found');
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }
    console.log('Credential found for:', credential.accountId);

    // Step 3: Verify password
    const isValid = await verify(credential.password, ADMIN_PASSWORD, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
      outputLen: 32,
    });
    if (!isValid) {
      console.log('Password verification failed');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    console.log('Password verified successfully');

    // Step 4: Create session manually (mimic better-auth)
    const sessionId = nanoid();
    const sessionToken = nanoid(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(auth.schema.session).values({
      id: sessionId,
      token: sessionToken,
      expiresAt: Math.floor(expiresAt.getTime() / 1000),
      userId: userRecord.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Session created:', sessionId);

    // Return session data
    return NextResponse.json({
      ok: true,
      session: {
        token: sessionToken,
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          role: userRecord.role,
        },
      },
    });

  } catch (error: any) {
    console.error('Direct sign-in test failed:', error);
    return NextResponse.json({ 
      error: 'Sign-in test failed', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}