import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

async function main() {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    
    try {
        // Delete existing admin user and account records first
        console.log('🧹 Cleaning up existing admin records...');
        
        // Delete existing account records for this email
        await db.delete(account).where(eq(account.accountId, adminEmail));
        
        // Delete existing user record
        await db.delete(user).where(eq(user.email, adminEmail));
        
        console.log('✅ Existing records cleaned up');
        
        // Hash the password with bcryptjs and 12 salt rounds
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        
        // Verify hash format (should start with $2b$12$)
        console.log(`🔍 Password hash format: ${hashedPassword.substring(0, 7)}... (length: ${hashedPassword.length})`);
        
        if (!hashedPassword.startsWith('$2b$12$')) {
            throw new Error('Password hash format is incorrect');
        }
        
        // Verify hash can authenticate
        const isValidHash = await bcrypt.compare(adminPassword, hashedPassword);
        if (!isValidHash) {
            throw new Error('Password hash verification failed');
        }
        
        console.log('✅ Password hash verified successfully');
        
        // Generate unique ID for admin user
        const adminUserId = randomUUID();
        const accountId = randomUUID();
        const currentTime = new Date();
        
        // Create admin user record
        const adminUserData = {
            id: adminUserId,
            name: 'Admin User',
            email: 'admin@example.com',
            emailVerified: true,
            image: null,
            role: 'admin',
            strikes: 0,
            createdAt: currentTime,
            updatedAt: currentTime,
        };
        
        console.log('👤 Creating admin user...');
        await db.insert(user).values(adminUserData);
        
        // Create account record with hashed password
        const adminAccountData = {
            id: accountId,
            accountId: adminEmail, // Set to email as specified
            providerId: 'credential',
            userId: adminUserId,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            password: hashedPassword, // Store HASHED password
            createdAt: currentTime,
            updatedAt: currentTime,
        };
        
        console.log('🔑 Creating admin account with hashed password...');
        await db.insert(account).values(adminAccountData);
        
        // Final verification
        console.log('🔍 Verifying created records...');
        const createdUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
        const createdAccount = await db.select().from(account).where(eq(account.accountId, adminEmail)).limit(1);
        
        if (createdUser.length === 0 || createdAccount.length === 0) {
            throw new Error('Failed to create admin records');
        }
        
        // Verify password hash in database
        const storedHash = createdAccount[0].password;
        if (!storedHash || !storedHash.startsWith('$2b$12$')) {
            throw new Error('Stored password hash is invalid');
        }
        
        const finalHashCheck = await bcrypt.compare(adminPassword, storedHash);
        if (!finalHashCheck) {
            throw new Error('Final password verification failed');
        }
        
        console.log('✅ Admin user seeder completed successfully');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔐 Password: ${adminPassword}`);
        console.log(`👤 Role: admin`);
        console.log(`🆔 User ID: ${adminUserId}`);
        console.log(`🔗 Account ID: ${accountId}`);
        console.log(`🔒 Hash format verified: ${storedHash.substring(0, 7)}...`);
        
    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});