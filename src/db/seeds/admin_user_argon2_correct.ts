import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { randomUUID } from 'crypto';

async function main() {
    // Clean up existing admin user and accounts
    console.log('🧹 Cleaning up existing admin user...');
    await db.delete(account).where(eq(account.accountId, 'admin@example.com'));
    await db.delete(user).where(eq(user.email, 'admin@example.com'));
    
    // Hash the password using Argon2id with better-auth defaults
    console.log('🔐 Hashing admin password...');
    const adminPassword = 'admin123';
    const hashedPassword = await hash(adminPassword, {
        memoryCost: 65536,  // 64MB
        timeCost: 3,        // 3 iterations
        parallelism: 4,     // 4 threads
        outputLen: 32,      // 32 bytes hash length
    });
    
    // Verify the hash works correctly
    console.log('✅ Verifying password hash...');
    const isValid = await verify(hashedPassword, adminPassword);
    if (!isValid) {
        throw new Error('Password hash verification failed');
    }
    console.log('✅ Password hash verified successfully');
    
    // Generate unique IDs
    const userId = randomUUID();
    const accountId = randomUUID();
    const currentTime = new Date();
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = {
        id: userId,
        name: 'Admin User',
        email: 'admin@example.com',
        emailVerified: true,
        image: null,
        role: 'admin',
        strikes: 0,
        createdAt: currentTime,
        updatedAt: currentTime,
    };
    
    await db.insert(user).values(adminUser);
    console.log('✅ Admin user created successfully');
    
    // Create corresponding account record for email authentication
    console.log('🔗 Creating admin account...');
    const adminAccount = {
        id: accountId,
        accountId: 'admin@example.com',
        providerId: 'email',  // Correct provider ID for better-auth email authentication
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
    
    await db.insert(account).values(adminAccount);
    console.log('✅ Admin account created successfully');
    
    // Verification steps
    console.log('🔍 Running verification checks...');
    
    // Check user exists
    const createdUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).get();
    if (!createdUser) {
        throw new Error('Admin user was not created');
    }
    console.log('✅ User verification passed');
    
    // Check account exists with correct provider
    const createdAccount = await db.select().from(account).where(eq(account.accountId, 'admin@example.com')).get();
    if (!createdAccount || createdAccount.providerId !== 'email') {
        throw new Error('Admin account was not created with correct provider');
    }
    console.log('✅ Account verification passed');
    
    // Verify password hash again
    const finalPasswordCheck = await verify(createdAccount.password!, adminPassword);
    if (!finalPasswordCheck) {
        throw new Error('Final password verification failed');
    }
    console.log('✅ Final password verification passed');
    
    console.log('🎉 Admin user seeder completed successfully!');
    console.log('📝 Test credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('🔗 Test endpoint: /api/test-admin-email-login');
}

main().catch((error) => {
    console.error('❌ Admin user seeder failed:', error);
    process.exit(1);
});