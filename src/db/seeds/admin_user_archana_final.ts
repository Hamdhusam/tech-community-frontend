import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';

async function main() {
    const adminEmail = 'archanaarchu200604@gmail.com';
    const adminPassword = 'archanaarchu2006';
    const userId = 'user_archana_admin_01h4kxt2e8z9y3b1n7m6q5w8r4';
    const accountId = 'account_archana_admin_01h4kxt2e8z9y3b1n7m6q5w8r4';
    
    console.log('🧹 Cleaning up existing records for', adminEmail);
    
    // Clean up existing account records first (due to foreign key constraints)
    const existingAccounts = await db.select().from(account).where(eq(account.accountId, adminEmail));
    if (existingAccounts.length > 0) {
        await db.delete(account).where(eq(account.accountId, adminEmail));
        console.log(`✅ Deleted ${existingAccounts.length} existing account records`);
    }
    
    // Clean up existing user records
    const existingUsers = await db.select().from(user).where(eq(user.email, adminEmail));
    if (existingUsers.length > 0) {
        await db.delete(user).where(eq(user.email, adminEmail));
        console.log(`✅ Deleted ${existingUsers.length} existing user records`);
    }
    
    console.log('🔐 Hashing password with Argon2id (better-auth compatible)');
    
    // Hash password using Argon2id (same as better-auth internally uses)
    const hashedPassword = await hash(adminPassword, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    });
    
    console.log('👤 Creating admin user record');
    
    // Create the admin user
    const adminUser = {
        id: userId,
        name: 'Archana',
        email: adminEmail,
        emailVerified: true,
        image: null,
        role: 'admin',
        strikes: 0,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };
    
    await db.insert(user).values(adminUser);
    console.log('✅ Admin user created successfully');
    
    console.log('🔑 Creating email provider account');
    
    // Create the email account (for email/password authentication)
    const emailAccount = {
        id: accountId,
        accountId: adminEmail,
        providerId: 'email',
        userId: userId,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: hashedPassword,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };
    
    await db.insert(account).values(emailAccount);
    console.log('✅ Email account created successfully');
    
    console.log('🔍 Verifying created records');
    
    // Verify user creation
    const createdUser = await db.select().from(user).where(eq(user.email, adminEmail));
    if (createdUser.length === 1) {
        console.log('✅ User verification passed:', {
            id: createdUser[0].id,
            email: createdUser[0].email,
            name: createdUser[0].name,
            role: createdUser[0].role,
            emailVerified: createdUser[0].emailVerified,
            strikes: createdUser[0].strikes
        });
    } else {
        console.error('❌ User verification failed: Expected 1 user, found', createdUser.length);
    }
    
    // Verify account creation
    const createdAccount = await db.select().from(account).where(eq(account.accountId, adminEmail));
    if (createdAccount.length === 1) {
        console.log('✅ Account verification passed:', {
            id: createdAccount[0].id,
            accountId: createdAccount[0].accountId,
            providerId: createdAccount[0].providerId,
            userId: createdAccount[0].userId,
            hasPassword: !!createdAccount[0].password
        });
    } else {
        console.error('❌ Account verification failed: Expected 1 account, found', createdAccount.length);
    }
    
    console.log('🎯 Admin seeder completed successfully');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👑 Role: admin');
    console.log('🌐 Ready for better-auth sign-in at /api/auth/sign-in/email');
}

main().catch((error) => {
    console.error('❌ Admin seeder failed:', error);
});