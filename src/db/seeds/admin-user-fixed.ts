import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
    try {
        const adminEmail = 'archanaarchu200604@gmail.com';
        const adminName = 'Archana';
        const adminPassword = 'archanaarchu2006';
        const adminRole = 'admin';
        
        // Generate admin user ID
        const adminUserId = 'user_admin_01h4kxt2e8z9y3b1n7m6q5w8r4';
        
        console.log('🧹 Cleaning up existing admin records...');
        
        // Clean up existing records for this email
        const existingUsers = await db.select().from(user).where(eq(user.email, adminEmail));
        if (existingUsers.length > 0) {
            const existingUserId = existingUsers[0].id;
            await db.delete(account).where(eq(account.userId, existingUserId));
            await db.delete(user).where(eq(user.email, adminEmail));
            console.log('✅ Cleaned up existing admin records');
        }
        
        console.log('🔐 Hashing password with bcryptjs...');
        
        // Hash password using bcryptjs with 10 salt rounds (better-auth standard)
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        console.log('👤 Creating admin user...');
        
        // Create admin user
        const adminUser = {
            id: adminUserId,
            name: adminName,
            email: adminEmail,
            emailVerified: true,
            image: null,
            role: adminRole,
            strikes: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        await db.insert(user).values(adminUser);
        console.log('✅ Admin user created successfully');
        
        console.log('🔗 Creating credential account...');
        
        // Create credential account (better-auth compatibility)
        const adminAccount = {
            id: 'account_admin_01h4kxt2e8z9y3b1n7m6q5w8r4',
            accountId: adminEmail, // Use email as account ID for credential provider
            providerId: 'credential', // Use 'credential' not 'email' for better-auth
            userId: adminUserId,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            password: hashedPassword, // Store bcrypt hashed password
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        await db.insert(account).values(adminAccount);
        console.log('✅ Admin credential account created successfully');
        
        console.log('🧪 Testing password verification...');
        
        // Test password verification with correct password
        const correctPasswordTest = await bcrypt.compare(adminPassword, hashedPassword);
        console.log(`✅ Correct password test: ${correctPasswordTest ? 'PASSED' : 'FAILED'}`);
        
        // Test password verification with incorrect password
        const incorrectPasswordTest = await bcrypt.compare('wrongpassword', hashedPassword);
        console.log(`✅ Incorrect password test: ${!incorrectPasswordTest ? 'PASSED' : 'FAILED'}`);
        
        console.log('📋 Admin user details:');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Name: ${adminName}`);
        console.log(`   Role: ${adminRole}`);
        console.log(`   User ID: ${adminUserId}`);
        console.log(`   Provider: credential`);
        console.log(`   Password verification: ${correctPasswordTest ? 'Working' : 'Failed'}`);
        
        console.log('✅ Admin user seeder completed successfully');
        
    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        
        // Rollback: Clean up any partially created records
        try {
            console.log('🔄 Attempting rollback...');
            const adminEmail = 'archanaarchu200604@gmail.com';
            const existingUsers = await db.select().from(user).where(eq(user.email, adminEmail));
            if (existingUsers.length > 0) {
                const existingUserId = existingUsers[0].id;
                await db.delete(account).where(eq(account.userId, existingUserId));
                await db.delete(user).where(eq(user.email, adminEmail));
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