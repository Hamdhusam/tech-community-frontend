import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function main() {
    const adminEmail = 'admin@example.com';
    const plainPassword = 'admin123';
    
    try {
        // Clean up existing admin@example.com records
        console.log('🧹 Cleaning up existing admin records...');
        
        // Find existing user to get userId for account cleanup
        const existingUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
        
        if (existingUser.length > 0) {
            // Delete account records first (due to foreign key constraint)
            await db.delete(account).where(eq(account.userId, existingUser[0].id));
            // Delete user record
            await db.delete(user).where(eq(user.email, adminEmail));
            console.log('✅ Existing admin records cleaned up');
        }
        
        // Hash password with bcrypt (salt rounds 10 - better-auth standard)
        console.log('🔐 Hashing password with bcrypt...');
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        
        // Verify hash works correctly
        const isValid = await bcrypt.compare(plainPassword, hashedPassword);
        if (!isValid) {
            throw new Error('Password hash verification failed');
        }
        console.log('✅ Password hashing verified');
        
        // Generate UUID for user
        const userId = randomUUID();
        const accountId = randomUUID();
        const now = new Date();
        
        // Create admin user record
        console.log('👤 Creating admin user...');
        await db.insert(user).values({
            id: userId,
            email: adminEmail,
            name: 'Admin User',
            role: 'admin',
            emailVerified: true,
            strikes: 0,
            image: null,
            createdAt: now,
            updatedAt: now,
        });
        
        // Create account record for email provider (better-auth email/password authentication)
        console.log('🔑 Creating email provider account...');
        await db.insert(account).values({
            id: accountId,
            accountId: adminEmail, // Use email as accountId for better-auth email provider
            providerId: 'email', // Must be 'email' for better-auth email provider
            userId: userId, // Must match user.id exactly
            password: hashedPassword, // bcrypt hashed password
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            createdAt: now,
            updatedAt: now,
        });
        
        // Final verification
        console.log('🔍 Verifying admin user creation...');
        const createdUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
        const createdAccount = await db.select().from(account).where(eq(account.userId, userId)).limit(1);
        
        if (createdUser.length === 0 || createdAccount.length === 0) {
            throw new Error('Admin user or account creation verification failed');
        }
        
        // Verify password hash one more time
        const finalHashCheck = await bcrypt.compare(plainPassword, createdAccount[0].password!);
        if (!finalHashCheck) {
            throw new Error('Final password hash verification failed');
        }
        
        console.log('✅ Admin user seeder completed successfully');
        console.log(`📧 Admin email: ${adminEmail}`);
        console.log(`🔑 Admin password: ${plainPassword}`);
        console.log(`👤 User ID: ${userId}`);
        console.log(`🏷️  Role: admin`);
        console.log(`✉️  Email verified: true`);
        console.log(`🚫 Strikes: 0`);
        console.log(`🔐 Provider: email (better-auth compatible)`);
        
    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});