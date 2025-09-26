import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

async function main() {
    try {
        // Delete existing admin user and associated accounts first
        console.log('🗑️ Cleaning up existing admin user...');
        
        // Find existing admin user
        const existingAdmin = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
        
        if (existingAdmin.length > 0) {
            const adminId = existingAdmin[0].id;
            
            // Delete associated accounts first (due to foreign key constraints)
            await db.delete(account).where(eq(account.userId, adminId));
            console.log('✅ Deleted existing admin accounts');
            
            // Delete the user
            await db.delete(user).where(eq(user.id, adminId));
            console.log('✅ Deleted existing admin user');
        }
        
        // Generate unique ID for the admin user
        const adminUserId = `user_${randomBytes(16).toString('hex')}`;
        const accountId = `acc_${randomBytes(16).toString('hex')}`;
        
        console.log('👤 Creating new admin user...');
        
        // Create admin user
        const adminUserData = {
            id: adminUserId,
            name: 'Admin User',
            email: 'admin@example.com',
            emailVerified: true,
            image: null,
            role: 'admin',
            strikes: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        await db.insert(user).values(adminUserData);
        console.log('✅ Admin user created successfully');
        
        // Create corresponding account record with plain text password
        const adminAccountData = {
            id: accountId,
            accountId: 'admin@example.com',
            providerId: 'credential',
            userId: adminUserId,
            password: 'admin123', // Plain text password for better-auth to handle
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        await db.insert(account).values(adminAccountData);
        console.log('✅ Admin account record created successfully');
        
        // Verification steps
        console.log('🔍 Verifying created records...');
        
        const verifyUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
        const verifyAccount = await db.select().from(account).where(eq(account.userId, adminUserId)).limit(1);
        
        if (verifyUser.length === 1 && verifyAccount.length === 1) {
            console.log('✅ Verification successful:');
            console.log(`   - User ID: ${verifyUser[0].id}`);
            console.log(`   - Email: ${verifyUser[0].email}`);
            console.log(`   - Role: ${verifyUser[0].role}`);
            console.log(`   - Email Verified: ${verifyUser[0].emailVerified}`);
            console.log(`   - Account Provider: ${verifyAccount[0].providerId}`);
            console.log(`   - Password stored as: ${verifyAccount[0].password ? 'PLAIN TEXT' : 'NULL'}`);
        } else {
            throw new Error('Verification failed: Records not found after creation');
        }
        
        console.log('✅ Admin user seeder completed successfully');
        console.log('🔐 Login credentials: admin@example.com / admin123');
        
    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});