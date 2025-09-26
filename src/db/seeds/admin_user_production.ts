import { db } from '@/db';
import { user, account } from '@/db/schema';
import { hash, verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function main() {
    const ADMIN_EMAIL = 'admin@example.com';
    const ADMIN_PASSWORD = 'admin123';
    
    // Argon2id parameters for better-auth compatibility
    const hashOptions = {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
        outputLen: 32
    };

    try {
        console.log('🧹 Cleaning up existing admin@example.com records...');
        
        // Clean up existing records
        await db.delete(account).where(eq(account.accountId, ADMIN_EMAIL));
        await db.delete(user).where(eq(user.email, ADMIN_EMAIL));
        
        console.log('✅ Cleanup completed');

        // Generate unique IDs
        const userId = randomUUID();
        const accountId = randomUUID();
        
        console.log(`🔑 Generated User ID: ${userId}`);
        console.log(`🔑 Generated Account ID: ${accountId}`);

        // Hash password with Argon2id
        console.log('🔐 Hashing password with Argon2id...');
        const hashedPassword = await hash(ADMIN_PASSWORD, hashOptions);
        console.log(`🔐 Password hash: ${hashedPassword.substring(0, 50)}...`);

        // Verify hash works before inserting
        console.log('🔍 Verifying password hash...');
        const isValidHash = await verify(hashedPassword, ADMIN_PASSWORD, hashOptions);
        if (!isValidHash) {
            throw new Error('Password hash verification failed');
        }
        console.log('✅ Password hash verification successful');

        const now = new Date();

        // Create admin user
        const adminUser = {
            id: userId,
            name: 'Admin User',
            email: ADMIN_EMAIL,
            emailVerified: true,
            image: null,
            role: 'admin',
            strikes: 0,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(user).values(adminUser);
        console.log('✅ Admin user created successfully');

        // Create credential account
        const adminAccount = {
            id: accountId,
            accountId: ADMIN_EMAIL,
            providerId: 'credential',
            userId: userId,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(account).values(adminAccount);
        console.log('✅ Admin account created successfully');

        // Final verification
        console.log('🔍 Performing final verification...');
        const createdUser = await db.select().from(user).where(eq(user.email, ADMIN_EMAIL));
        const createdAccount = await db.select().from(account).where(eq(account.accountId, ADMIN_EMAIL));

        if (createdUser.length === 0 || createdAccount.length === 0) {
            throw new Error('Verification failed: Records not found after creation');
        }

        // Verify password hash one more time
        const finalHashVerification = await verify(createdAccount[0].password!, ADMIN_PASSWORD, hashOptions);
        if (!finalHashVerification) {
            throw new Error('Final password verification failed');
        }

        console.log('📊 SEEDER SUMMARY:');
        console.log(`   👤 User ID: ${userId}`);
        console.log(`   📧 Email: ${ADMIN_EMAIL}`);
        console.log(`   🔑 Password: ${ADMIN_PASSWORD}`);
        console.log(`   👑 Role: admin`);
        console.log(`   ✅ Email Verified: true`);
        console.log(`   🚫 Strikes: 0`);
        console.log(`   🔐 Provider: credential`);
        console.log(`   🎯 Hash Verified: ✅`);
        
        console.log('✅ Admin user production seeder completed successfully');

    } catch (error) {
        console.error('❌ Seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});