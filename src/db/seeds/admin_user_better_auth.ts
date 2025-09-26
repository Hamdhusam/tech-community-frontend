import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { randomUUID } from 'crypto';

async function main() {
    try {
        // Step 1: Clean up existing admin@example.com records
        console.log('🧹 Cleaning up existing admin@example.com records...');
        
        const existingUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).get();
        if (existingUser) {
            await db.delete(account).where(eq(account.userId, existingUser.id));
            await db.delete(user).where(eq(user.id, existingUser.id));
            console.log('✅ Cleaned up existing admin records');
        }

        // Step 2: Hash password with exact Argon2id parameters
        console.log('🔒 Hashing password with Argon2id...');
        const passwordHash = await hash('admin123', {
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
            outputLen: 32
        });
        console.log('✅ Password hashed successfully');

        // Step 3: Generate UUIDs for user and account
        const userId = randomUUID();
        const accountId = randomUUID();
        const now = new Date();

        // Step 4: Create user record with admin role
        console.log('👤 Creating admin user record...');
        const adminUser = {
            id: userId,
            name: 'Admin User',
            email: 'admin@example.com',
            emailVerified: true,
            image: null,
            role: 'admin',
            strikes: 0,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(user).values(adminUser);
        console.log('✅ Admin user created with ID:', userId);

        // Step 5: Create account record with providerId: 'credential'
        console.log('🔐 Creating credential account record...');
        const adminAccount = {
            id: accountId,
            accountId: 'admin@example.com',
            providerId: 'credential',
            userId: userId,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            password: passwordHash,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(account).values(adminAccount);
        console.log('✅ Credential account created with ID:', accountId);

        // Step 6: Verify password hash works
        console.log('🔍 Verifying password hash...');
        const isValid = await verify(passwordHash, 'admin123', {
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
            outputLen: 32
        });

        if (isValid) {
            console.log('✅ Password verification successful');
        } else {
            throw new Error('Password verification failed');
        }

        // Step 7: Verify foreign key relationship
        console.log('🔗 Verifying foreign key relationship...');
        const verifyUser = await db.select().from(user).where(eq(user.id, userId)).get();
        const verifyAccount = await db.select().from(account).where(eq(account.userId, userId)).get();

        if (verifyUser && verifyAccount && verifyUser.id === verifyAccount.userId) {
            console.log('✅ Foreign key relationship verified');
        } else {
            throw new Error('Foreign key relationship verification failed');
        }

        console.log('');
        console.log('📋 SEEDER SUMMARY:');
        console.log('==================');
        console.log('Email:', adminUser.email);
        console.log('Password:', 'admin123');
        console.log('Role:', adminUser.role);
        console.log('User ID:', userId);
        console.log('Account ID:', accountId);
        console.log('Provider ID:', adminAccount.providerId);
        console.log('Email Verified:', adminUser.emailVerified);
        console.log('Strikes:', adminUser.strikes);
        console.log('Password Hash Length:', passwordHash.length);
        console.log('');
        console.log('✅ Admin user seeder completed successfully');

    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});