import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account, session as sessionSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { nanoid } from 'nanoid';

const ADMIN_EMAIL = 'archanaarchu200604@gmail.com';
const ADMIN_PASSWORD = 'archanaarchu2006';
const ADMIN_NAME = 'Super Admin';
const ADMIN_ROLE = 'admin';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting manual admin setup...');

    // Hash password consistently
    const hashedPassword = await hash(ADMIN_PASSWORD, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
      outputLen: 32,
    });

    // Find or create user
    let existingUser = await db.query.user.findFirst({
      where: eq(user.email, ADMIN_EMAIL),
    });

    let userId: string;
    if (!existingUser) {
      const newUserId = nanoid();
      const [createdUser] = await db.insert(user).values({
        id: newUserId,
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        emailVerified: true,
        role: ADMIN_ROLE,
        strikes: 0,
        superAdmin: true,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      }).returning();
      existingUser = createdUser;
      userId = newUserId;
      console.log('Created super admin user:', userId);
    } else {
      userId = existingUser.id;
      // Update if needed
      if (existingUser.role !== ADMIN_ROLE || !existingUser.superAdmin) {
        await db.update(user).set({ 
          role: ADMIN_ROLE, 
          superAdmin: true,
          updatedAt: new Date().getTime(),
        }).where(eq(user.id, userId));
        console.log('Updated user to super admin');
      }
    }

    // Clear existing sessions and credentials for this user
    await db.delete(sessionSchema).where(eq(sessionSchema.userId, userId));
    await db.delete(account).where(eq(account.userId, userId));
    console.log('Cleared old sessions and credentials');

    // Insert credential
    const credentialId = nanoid();
    await db.insert(account).values({
      id: credentialId,
      accountId: ADMIN_EMAIL,
      providerId: 'credential',
      userId: userId,
      password: hashedPassword,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
    });
    console.log('Inserted admin credential');

    // Verify password works
    const cred = await db.query.account.findFirst({
      where: and(eq(account.userId, userId), eq(account.providerId, 'credential')),
    });
    if (cred && await verify(cred.password!, ADMIN_PASSWORD, { memoryCost: 65536, timeCost: 3, parallelism: 4, outputLen: 32 })) {
      console.log('Password verification confirmed');
    } else {
      throw new Error('Password verification failed');
    }

    // Create session manually
    const sessionId = nanoid();
    const sessionToken = nanoid(43); // Better-auth tokens are 43 chars
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime(); // 30 days

    await db.insert(sessionSchema).values({
      id: sessionId,
      token: sessionToken,
      expiresAt: Math.floor(expiresAt / 1000),
      userId: userId,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      // Optional: ipAddress, userAgent from request if needed
    });
    console.log('Created admin session:', sessionToken.substring(0, 10) + '...');

    return NextResponse.json({ 
      ok: true, 
      userId,
      sessionToken,
      success: 'Admin account prepared and signed in server-side'
    });

  } catch (error: any) {
    console.error('Manual admin setup failed:', error);
    return NextResponse.json({ error: 'Setup failed', details: error.message }, { status: 500 });
  }
}