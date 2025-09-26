import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { nanoid } from 'nanoid';

const ADMIN_EMAIL = 'archanaarchu200604@gmail.com';
const ADMIN_PASSWORD = 'archanaarchu2006';
const ADMIN_ROLE = 'admin';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting admin credential fix...');

    // Hash the password with exact auth.ts params
    const hashedPassword = await hash(ADMIN_PASSWORD, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
      outputLen: 32,
    });
    console.log('Password hashed successfully');

    // Find or create user
    let existingUser = await db.query.user.findFirst({
      where: eq(user.email, ADMIN_EMAIL),
    });

    if (!existingUser) {
      // Create user if not exists
      const newUserId = nanoid();
      const createdUser = await db.insert(user).values({
        id: newUserId,
        name: 'Admin User',
        email: ADMIN_EMAIL,
        emailVerified: true,
        role: ADMIN_ROLE,
        strikes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      existingUser = createdUser[0];
      console.log('Created new user:', existingUser.id);
    } else {
      // Update role if needed
      if (existingUser.role !== ADMIN_ROLE) {
        await db.update(user).set({ role: ADMIN_ROLE }).where(eq(user.id, existingUser.id));
        console.log('Updated user role to admin');
      }
    }

    const userId = existingUser.id;

    // Remove any existing credential for this user/email
    await db.delete(account).where(
      eq(account.userId, userId)
    );
    console.log('Cleared existing credentials');

    // Insert new credential
    const credentialId = nanoid();
    await db.insert(account).values({
      id: credentialId,
      accountId: ADMIN_EMAIL,  // For credential provider, accountId is the email
      providerId: 'credential',
      userId: userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Inserted new credential for admin');

    // Verify insertion
    const verifyCredential = await db.query.account.findFirst({
      where: eq(account.providerId, 'credential'),
      columns: {
        id: true,
        accountId: true,
        providerId: true,
        userId: true,
        password: true,  // Just for log, don't expose
      },
    });
    console.log('Verified credential inserted:', {
      ...verifyCredential,
      password: '***HIDDEN***',
    });

    console.log('Admin credential fix completed successfully!');
    return NextResponse.redirect(new URL('/admin/sign-in?fixed=true', request.url));

  } catch (error) {
    console.error('Admin credential fix failed:', error);
    return NextResponse.json({ error: 'Fix failed', details: error.message }, { status: 500 });
  }
}