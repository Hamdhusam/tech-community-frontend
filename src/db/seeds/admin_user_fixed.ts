import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function main() {
    const adminEmail = 'admin@example.com';
    const adminUserId = randomUUID();
    const accountId = randomUUID();
    const now = new Date();

    console.log('🔄 Starting admin user seeding process...');

    try {
        // Check if admin user already exists and delete if found
        console.log(`🔍 Checking for existing admin user with email: ${adminEmail}`);
        const existingUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
        
        if (existingUser.length > 0) {
            console.log(`🗑️ Found existing admin user (ID: ${existingUser[0].id}), deleting to ensure clean state...`);
            // Delete associated accounts first (due to foreign key constraints)
            await db.delete(account).where(eq(account.userId, existingUser[0].id));
            await db.delete(user).where(eq(user.email, adminEmail));
            console.log('✅ Existing admin user and associated records deleted successfully');
        } else {
            console.log('ℹ️ No existing admin user found, proceeding with creation');
        }

        // Create admin user record
        console.log('👤 Creating admin user record...');
        const adminUserData = {
            id: adminUserId,
            name: 'Admin User',
            email: 'admin@example.com',
            emailVerified: true,
            image: null,
            role: 'admin',
            strikes: 0,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(user).values(adminUserData);
        console.log(`✅ Admin user created with ID: ${adminUserId}`);

        // Create credential account record with plain password (better-auth will hash it)
        console.log('🔐 Creating credential account record...');
        const adminAccountData = {
            id: accountId,
            accountId: adminEmail,
            providerId: 'credential',
            userId: adminUserId,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            password: 'admin123',
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(account).values(adminAccountData);
        console.log(`✅ Credential account created with ID: ${accountId}`);

        // Verify the user was created correctly
        console.log('🔍 Verifying admin user creation...');
        const verifyUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
        
        if (verifyUser.length > 0) {
            const createdUser = verifyUser[0];
            console.log('✅ Admin user verification successful:');
            console.log(`   - ID: ${createdUser.id}`);
            console.log(`   - Name: ${createdUser.name}`);
            console.log(`   - Email: ${createdUser.email}`);
            console.log(`   - Role: ${createdUser.role}`);
            console.log(`   - Email Verified: ${createdUser.emailVerified}`);
            console.log(`   - Strikes: ${createdUser.strikes}`);
            
            // Verify account creation
            const verifyAccount = await db.select().from(account).where(eq(account.userId, adminUserId)).limit(1);
            if (verifyAccount.length > 0) {
                console.log('✅ Credential account verification successful:');
                console.log(`   - Account ID: ${verifyAccount[0].id}`);
                console.log(`   - Provider ID: ${verifyAccount[0].providerId}`);
                console.log(`   - Password stored: ${verifyAccount[0].password ? 'Yes (will be hashed by better-auth)' : 'No'}`);
            } else {
                throw new Error('❌ Account verification failed - no account record found');
            }
        } else {
            throw new Error('❌ User verification failed - no user record found');
        }

        console.log('✅ Admin user seeder completed successfully');
        console.log('ℹ️ You can now login with:');
        console.log('   Email: admin@example.com');
        console.log('   Password: admin123');

    } catch (error) {
        console.error('❌ Error during admin user seeding:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Admin user seeder failed:', error);
    process.exit(1);
});