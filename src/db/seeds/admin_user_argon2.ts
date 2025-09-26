import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { randomUUID } from 'crypto';

async function main() {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    const currentTime = new Date();
    
    console.log('🔄 Starting admin user seeder...');
    
    // Step 1: Clean slate - delete existing admin user and accounts
    console.log('🧹 Cleaning existing admin records...');
    
    // Delete existing accounts for admin user first (due to foreign key constraint)
    await db.delete(account).where(eq(account.accountId, adminEmail));
    
    // Delete existing admin user
    await db.delete(user).where(eq(user.email, adminEmail));
    
    console.log('✅ Existing admin records cleaned');
    
    // Step 2: Hash password using Argon2id with better-auth defaults
    console.log('🔐 Hashing password with Argon2id...');
    
    const passwordHash = await hash(adminPassword, {
        memoryCost: 65536,  // 64MB
        timeCost: 3,        // 3 iterations
        lanes: 4,           // 4 parallel threads
        outputLen: 32,      // 32 byte hash length
    });
    
    console.log('✅ Password hashed successfully');
    
    // Step 3: Verify hash can authenticate the password
    console.log('🔍 Verifying password hash...');
    
    const isValidHash = await verify(passwordHash, adminPassword);
    if (!isValidHash) {
        throw new Error('Password hash verification failed!');
    }
    
    console.log('✅ Password hash verification successful');
    
    // Step 4: Generate unique IDs
    const userId = randomUUID();
    const accountId = randomUUID();
    
    // Step 5: Create admin user
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
    
    console.log('✅ Admin user created successfully');
    
    // Step 6: Create corresponding account record
    console.log('🔗 Creating admin account record...');
    
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
        password: passwordHash,
        createdAt: currentTime,
        updatedAt: currentTime,
    };
    
    await db.insert(account).values(adminAccountData);
    
    console.log('✅ Admin account record created successfully');
    
    // Step 7: Final verification
    console.log('🔍 Running final verification...');
    
    // Verify user exists
    const createdUser = await db.select().from(user).where(eq(user.email, adminEmail));
    if (createdUser.length !== 1) {
        throw new Error('Admin user verification failed - user not found');
    }
    
    // Verify account exists
    const createdAccount = await db.select().from(account).where(eq(account.userId, userId));
    if (createdAccount.length !== 1) {
        throw new Error('Admin account verification failed - account not found');
    }
    
    // Verify password hash in account
    const storedHash = createdAccount[0].password;
    if (!storedHash) {
        throw new Error('Password hash not stored in account');
    }
    
    const finalHashVerification = await verify(storedHash, adminPassword);
    if (!finalHashVerification) {
        throw new Error('Final password hash verification failed');
    }
    
    console.log('✅ Final verification completed successfully');
    
    console.log('🎉 Admin user seeder completed successfully');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`🔗 Account ID: ${accountId}`);
    console.log(`🛡️ Role: admin`);
    console.log(`✅ Email Verified: true`);
}

main().catch((error) => {
    console.error('❌ Admin user seeder failed:', error);
    process.exit(1);
});