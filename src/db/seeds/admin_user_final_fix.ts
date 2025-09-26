import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
    try {
        console.log('🚀 Starting admin user seeder...');

        // Step 1: Cleanup - Delete existing admin user and accounts
        console.log('🧹 Cleaning up existing admin user...');
        const existingUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
        
        if (existingUser.length > 0) {
            const userId = existingUser[0].id;
            // Delete accounts first (due to foreign key constraint)
            await db.delete(account).where(eq(account.userId, userId));
            // Delete user
            await db.delete(user).where(eq(user.id, userId));
            console.log('✅ Existing admin user and accounts deleted');
        }

        // Step 2: Generate password hash using bcryptjs with 10 salt rounds
        console.log('🔐 Generating password hash...');
        const password = 'admin123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Step 3: Verify hash works before proceeding
        console.log('🔍 Verifying password hash...');
        const isHashValid = await bcrypt.compare(password, hashedPassword);
        if (!isHashValid) {
            throw new Error('Password hash verification failed - hash does not match original password');
        }
        console.log('✅ Password hash verified successfully');

        // Step 4: Create admin user
        console.log('👤 Creating admin user...');
        const adminUserId = 'user_admin_' + Date.now();
        const now = new Date();
        
        const adminUser = {
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

        await db.insert(user).values(adminUser);
        console.log('✅ Admin user created with ID:', adminUserId);

        // Step 5: Create credential account
        console.log('🔑 Creating credential account...');
        const accountId = 'account_admin_' + Date.now();
        
        const adminAccount = {
            id: accountId,
            accountId: 'admin@example.com',
            providerId: 'credential',
            userId: adminUserId,
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
        console.log('✅ Credential account created');

        // Step 6: Comprehensive verification
        console.log('🔍 Running comprehensive verification...');
        
        // Verify user exists with admin role
        const verifyUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
        if (verifyUser.length === 0 || verifyUser[0].role !== 'admin') {
            throw new Error('Admin user verification failed - user not found or role incorrect');
        }
        console.log('✅ User verification passed - admin role confirmed');

        // Verify account exists with credential provider
        const verifyAccount = await db.select().from(account).where(eq(account.userId, adminUserId)).limit(1);
        if (verifyAccount.length === 0 || verifyAccount[0].providerId !== 'credential') {
            throw new Error('Account verification failed - credential account not found');
        }
        console.log('✅ Account verification passed - credential provider confirmed');

        // Verify password hash can be compared
        const storedHash = verifyAccount[0].password;
        if (!storedHash) {
            throw new Error('Password verification failed - no password hash stored');
        }
        
        const finalHashCheck = await bcrypt.compare('admin123', storedHash);
        if (!finalHashCheck) {
            throw new Error('Password verification failed - stored hash does not match password');
        }
        console.log('✅ Password verification passed - hash comparison successful');

        console.log('🎉 Admin user seeder completed successfully!');
        console.log('📋 Summary:');
        console.log('   - Email: admin@example.com');
        console.log('   - Password: admin123');
        console.log('   - Role: admin');
        console.log('   - Provider: credential');
        console.log('   - User ID:', adminUserId);
        console.log('   - Account ID:', accountId);

    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        
        // Attempt rollback
        try {
            console.log('🔄 Attempting rollback...');
            const rollbackUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
            if (rollbackUser.length > 0) {
                const userId = rollbackUser[0].id;
                await db.delete(account).where(eq(account.userId, userId));
                await db.delete(user).where(eq(user.id, userId));
                console.log('✅ Rollback completed');
            }
        } catch (rollbackError) {
            console.error('❌ Rollback failed:', rollbackError);
        }
        
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});