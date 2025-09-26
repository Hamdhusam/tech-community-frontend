import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { randomUUID } from 'crypto';

async function main() {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    
    // Delete existing admin user and associated accounts
    console.log('🧹 Cleaning up existing admin user...');
    const existingUsers = await db.select().from(user).where(eq(user.email, adminEmail));
    
    if (existingUsers.length > 0) {
        const existingUserId = existingUsers[0].id;
        await db.delete(account).where(eq(account.userId, existingUserId));
        await db.delete(user).where(eq(user.id, existingUserId));
        console.log('✅ Existing admin user and accounts deleted');
    }
    
    // Generate unique user ID
    const userId = randomUUID();
    const accountId = randomUUID();
    const currentTime = new Date();
    
    // Hash password using Argon2id with better-auth compatible parameters
    console.log('🔐 Hashing password...');
    const hashedPassword = await hash(adminPassword, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    });
    
    // Create admin user record
    console.log('👤 Creating admin user...');
    const adminUserData = {
        id: userId,
        name: 'Admin User',
        email: adminEmail,
        emailVerified: true,
        image: null,
        role: 'admin',
        strikes: 0,
        createdAt: currentTime,
        updatedAt: currentTime,
    };
    
    await db.insert(user).values(adminUserData);
    
    // Create credential account record
    console.log('🔑 Creating credential account...');
    const adminAccountData = {
        id: accountId,
        accountId: adminEmail,
        providerId: 'credential',
        userId: userId,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: hashedPassword,
        createdAt: currentTime,
        updatedAt: currentTime,
    };
    
    await db.insert(account).values(adminAccountData);
    
    // Verification steps
    console.log('🔍 Verifying admin user creation...');
    
    // Verify user created with admin role
    const createdUser = await db.select().from(user).where(eq(user.email, adminEmail));
    if (createdUser.length === 0 || createdUser[0].role !== 'admin') {
        throw new Error('Admin user not created with correct role');
    }
    console.log('✅ User verified:', {
        id: createdUser[0].id,
        email: createdUser[0].email,
        role: createdUser[0].role,
        emailVerified: createdUser[0].emailVerified,
        strikes: createdUser[0].strikes
    });
    
    // Verify account created with credential provider
    const createdAccount = await db.select().from(account).where(eq(account.userId, userId));
    if (createdAccount.length === 0 || createdAccount[0].providerId !== 'credential') {
        throw new Error('Account not created with credential provider');
    }
    console.log('✅ Account verified:', {
        id: createdAccount[0].id,
        accountId: createdAccount[0].accountId,
        providerId: createdAccount[0].providerId,
        userId: createdAccount[0].userId
    });
    
    // Test password verification
    console.log('🧪 Testing password verification...');
    const storedPasswordHash = createdAccount[0].password;
    if (!storedPasswordHash) {
        throw new Error('Password hash not stored');
    }
    
    // Test correct password
    const correctPasswordTest = await verify(storedPasswordHash, adminPassword);
    if (!correctPasswordTest) {
        throw new Error('Correct password verification failed');
    }
    console.log('✅ Correct password verification passed');
    
    // Test incorrect password
    const incorrectPasswordTest = await verify(storedPasswordHash, 'wrongpassword');
    if (incorrectPasswordTest) {
        throw new Error('Incorrect password verification should have failed');
    }
    console.log('✅ Incorrect password verification correctly failed');
    
    console.log('✅ Admin user seeder completed successfully');
    console.log('📋 Admin credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    console.log('   Provider: credential');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});