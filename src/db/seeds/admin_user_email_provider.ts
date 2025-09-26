import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { generateId } from 'better-auth';

async function main() {
    const adminEmail = 'admin@example.com';
    const plainPassword = 'admin123';
    
    // Step 1: Clean up existing admin@example.com records
    console.log('🧹 Cleaning up existing admin records...');
    
    // Find existing user
    const existingUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
    
    if (existingUser.length > 0) {
        const userId = existingUser[0].id;
        
        // Delete associated accounts first (foreign key constraint)
        await db.delete(account).where(eq(account.userId, userId));
        
        // Delete user
        await db.delete(user).where(eq(user.id, userId));
        
        console.log('🗑️ Removed existing admin user and accounts');
    }
    
    // Step 2: Hash password with Argon2id using better-auth default parameters
    console.log('🔐 Hashing password...');
    const hashedPassword = await hash(plainPassword, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
        outputLen: 32,
    });
    
    // Step 3: Generate unique user ID
    const userId = generateId();
    const accountId = generateId();
    const currentTime = new Date();
    
    // Step 4: Create user record with admin role
    console.log('👤 Creating admin user...');
    await db.insert(user).values({
        id: userId,
        name: 'Admin User',
        email: adminEmail,
        emailVerified: true,
        image: null,
        role: 'admin',
        strikes: 0,
        createdAt: currentTime,
        updatedAt: currentTime,
    });
    
    // Step 5: Create account record with providerId: 'email'
    console.log('🔑 Creating email account...');
    await db.insert(account).values({
        id: accountId,
        accountId: adminEmail,
        providerId: 'email',
        userId: userId,
        password: hashedPassword,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: currentTime,
        updatedAt: currentTime,
    });
    
    // Step 6: Verify the setup
    console.log('✅ Verifying admin user setup...');
    const createdUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
    const createdAccount = await db.select().from(account).where(and(
        eq(account.userId, userId),
        eq(account.providerId, 'email')
    )).limit(1);
    
    if (createdUser.length === 0 || createdAccount.length === 0) {
        throw new Error('Failed to verify admin user creation');
    }
    
    console.log('✅ Admin user seeder completed successfully');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${plainPassword}`);
    console.log(`👤 Role: ${createdUser[0].role}`);
    console.log(`🆔 User ID: ${userId}`);
}

main().catch((error) => {
    console.error('❌ Admin user seeder failed:', error);
    process.exit(1);
});