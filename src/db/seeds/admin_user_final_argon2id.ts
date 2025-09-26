import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { randomUUID } from 'crypto';

async function main() {
    try {
        // Delete ALL existing admin@example.com records first (complete cleanup)
        console.log('🧹 Cleaning up existing admin@example.com records...');
        
        // First, delete account records for admin@example.com user
        const existingUsers = await db.select().from(user).where(eq(user.email, 'admin@example.com'));
        for (const existingUser of existingUsers) {
            await db.delete(account).where(eq(account.userId, existingUser.id));
        }
        
        // Then delete the user record
        await db.delete(user).where(eq(user.email, 'admin@example.com'));
        
        console.log('✅ Cleanup completed');

        // Hash the password using Argon2id with specific parameters
        console.log('🔐 Hashing password with Argon2id...');
        const hashedPassword = await hash('admin123', {
            memoryCost: 65536,    // 64MB
            timeCost: 3,          // 3 iterations
            parallelism: 4,       // 4 parallel threads
            outputLen: 32,        // 32 byte hash length
        });

        console.log('🔍 Password hash generated:', hashedPassword);
        console.log('🔍 Hash starts with $argon2id$:', hashedPassword.startsWith('$argon2id$'));

        // Generate unique IDs
        const userId = randomUUID();
        const accountId = randomUUID();
        const currentTime = new Date();

        // Create admin user record
        console.log('👤 Creating admin user...');
        const adminUsers = [
            {
                id: userId,
                name: 'Admin User',
                email: 'admin@example.com',
                emailVerified: true,
                image: null,
                role: 'admin',
                strikes: 0,
                createdAt: currentTime,
                updatedAt: currentTime,
            }
        ];

        await db.insert(user).values(adminUsers);
        console.log('✅ Admin user created with ID:', userId);

        // Create corresponding account record
        console.log('🔑 Creating account record...');
        const adminAccounts = [
            {
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
                password: hashedPassword,
                createdAt: currentTime,
                updatedAt: currentTime,
            }
        ];

        await db.insert(account).values(adminAccounts);
        console.log('✅ Account record created with ID:', accountId);

        // Comprehensive verification
        console.log('🔍 Starting verification...');

        // 1. Verify the user record was created with admin role
        const createdUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).get();
        if (!createdUser) {
            throw new Error('User record was not created');
        }
        console.log('✅ User record verified - Role:', createdUser.role);
        console.log('✅ User record verified - Email verified:', createdUser.emailVerified);
        console.log('✅ User record verified - Strikes:', createdUser.strikes);

        // 2. Verify the account record was created with credential provider
        const createdAccount = await db.select().from(account).where(eq(account.userId, userId)).get();
        if (!createdAccount) {
            throw new Error('Account record was not created');
        }
        console.log('✅ Account record verified - Provider ID:', createdAccount.providerId);
        console.log('✅ Account record verified - Account ID:', createdAccount.accountId);

        // 3. Verify the password hash starts with '$argon2id$'
        if (!createdAccount.password || !createdAccount.password.startsWith('$argon2id$')) {
            throw new Error('Password hash is invalid or does not start with $argon2id$');
        }
        console.log('✅ Password hash verified - Starts with $argon2id$');

        // 4. Test the hash can validate against 'admin123'
        const isValidPassword = await verify(createdAccount.password, 'admin123');
        if (!isValidPassword) {
            throw new Error('Password hash validation failed');
        }
        console.log('✅ Password validation test passed');

        // 5. Log all details for debugging
        console.log('📊 Final verification details:');
        console.log('   User ID:', createdUser.id);
        console.log('   User Email:', createdUser.email);
        console.log('   User Role:', createdUser.role);
        console.log('   User Email Verified:', createdUser.emailVerified);
        console.log('   User Strikes:', createdUser.strikes);
        console.log('   Account ID:', createdAccount.id);
        console.log('   Account Provider ID:', createdAccount.providerId);
        console.log('   Account Account ID:', createdAccount.accountId);
        console.log('   Password Hash Length:', createdAccount.password?.length);
        console.log('   Password Hash Prefix:', createdAccount.password?.substring(0, 20) + '...');

        console.log('✅ Admin user seeder completed successfully');
        console.log('🎉 Admin user credentials: admin@example.com / admin123');

    } catch (error) {
        console.error('❌ Seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});