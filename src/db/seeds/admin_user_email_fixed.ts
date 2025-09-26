import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateId } from 'lucia';

async function main() {
    // First, delete any existing admin@example.com user and account records
    console.log('🧹 Cleaning up existing admin records...');
    
    // Get existing user to find userId for account deletion
    const existingUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
    
    if (existingUser.length > 0) {
        const userId = existingUser[0].id;
        
        // Delete existing account records for this user
        await db.delete(account).where(eq(account.userId, userId));
        console.log('🗑️ Deleted existing account records');
        
        // Delete existing user record
        await db.delete(user).where(eq(user.email, 'admin@example.com'));
        console.log('🗑️ Deleted existing user record');
    }
    
    // Generate new user ID
    const userId = generateId(15);
    
    // Hash the password 'admin123' with 12 salt rounds
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Create new admin user
    const newUser = {
        id: userId,
        name: 'Admin User',
        email: 'admin@example.com',
        emailVerified: true,
        image: null,
        role: 'admin',
        strikes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    
    await db.insert(user).values(newUser);
    console.log('✅ Created admin user with ID:', userId);
    
    // Create account with correct providerId: 'email'
    const newAccount = {
        id: generateId(20),
        accountId: 'admin@example.com',
        providerId: 'email',
        userId: userId,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    
    await db.insert(account).values(newAccount);
    console.log('✅ Created account with providerId: email');
    
    // Verification Steps
    console.log('\n🔍 VERIFICATION STEPS:');
    
    // Query user table to confirm user exists with role admin
    const verifyUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
    if (verifyUser.length > 0) {
        console.log('✅ User verified - Role:', verifyUser[0].role, 'Email:', verifyUser[0].email);
    } else {
        console.log('❌ User verification failed');
    }
    
    // Query account table to confirm account exists with providerId 'email'
    const verifyAccount = await db.select().from(account).where(eq(account.userId, userId)).limit(1);
    if (verifyAccount.length > 0) {
        console.log('✅ Account verified - ProviderId:', verifyAccount[0].providerId, 'AccountId:', verifyAccount[0].accountId);
    } else {
        console.log('❌ Account verification failed');
    }
    
    // Verify password can be validated with bcrypt.compare
    if (verifyAccount.length > 0 && verifyAccount[0].password) {
        const passwordValid = await bcrypt.compare('admin123', verifyAccount[0].password);
        console.log('✅ Password verification:', passwordValid ? 'PASSED' : 'FAILED');
    } else {
        console.log('❌ Password verification failed - no password found');
    }
    
    console.log('\n📊 FINAL DETAILS:');
    console.log('- User ID:', userId);
    console.log('- Email: admin@example.com');
    console.log('- Role: admin');
    console.log('- Provider ID: email (CORRECTED from credential)');
    console.log('- Account ID: admin@example.com');
    console.log('- Password: Hashed with bcrypt (12 rounds)');
    
    console.log('\n✅ Admin user email fixed seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});