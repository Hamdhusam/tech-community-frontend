import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateId } from 'lucia';

async function main() {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    
    try {
        // Step 1: Delete existing admin user and related account records
        console.log('🧹 Cleaning existing admin records...');
        
        const existingUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
        
        if (existingUser.length > 0) {
            const userId = existingUser[0].id;
            
            // Delete account records first (foreign key constraint)
            await db.delete(account).where(eq(account.userId, userId));
            console.log('🗑️ Deleted existing admin account records');
            
            // Delete user record
            await db.delete(user).where(eq(user.id, userId));
            console.log('🗑️ Deleted existing admin user record');
        }
        
        // Step 2: Hash password with bcrypt using 10 salt rounds (better-auth standard)
        console.log('🔒 Hashing password...');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        // Step 3: Generate UUID for user
        const userId = generateId(15);
        const accountId = generateId(15);
        const currentTimestamp = new Date();
        
        // Step 4: Create user record
        console.log('👤 Creating admin user record...');
        const newUser = {
            id: userId,
            name: 'Admin User',
            email: adminEmail,
            emailVerified: true,
            image: null,
            role: 'admin',
            strikes: 0,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        };
        
        await db.insert(user).values(newUser);
        console.log('✅ Admin user record created successfully');
        
        // Step 5: Create account record with providerId 'credential'
        console.log('🔐 Creating admin account record...');
        const newAccount = {
            id: accountId,
            accountId: userId,
            providerId: 'credential',
            userId: userId,
            password: hashedPassword,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        };
        
        await db.insert(account).values(newAccount);
        console.log('✅ Admin account record created successfully');
        
        // Step 6: Verify records were created
        console.log('🔍 Verifying created records...');
        
        const createdUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
        const createdAccount = await db.select().from(account).where(eq(account.userId, userId)).limit(1);
        
        if (createdUser.length === 0) {
            throw new Error('User record verification failed');
        }
        
        if (createdAccount.length === 0) {
            throw new Error('Account record verification failed');
        }
        
        // Step 7: Log detailed information for debugging
        console.log('📋 Admin user details:');
        console.log(`   User ID: ${userId}`);
        console.log(`   Name: ${newUser.name}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Role: ${newUser.role}`);
        console.log(`   Email Verified: ${newUser.emailVerified}`);
        console.log(`   Strikes: ${newUser.strikes}`);
        console.log(`   Created At: ${newUser.createdAt.toISOString()}`);
        
        console.log('📋 Admin account details:');
        console.log(`   Account ID: ${accountId}`);
        console.log(`   Provider ID: ${newAccount.providerId}`);
        console.log(`   Password Hash Length: ${hashedPassword.length} characters`);
        console.log(`   Password Hash Preview: ${hashedPassword.substring(0, 29)}...`);
        
        console.log('✅ Admin user seeder completed successfully');
        console.log('🎯 You can now login with: admin@example.com / admin123');
        
    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});