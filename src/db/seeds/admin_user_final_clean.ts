import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateId } from 'lucia';

async function main() {
    // Delete existing admin records first
    await db.delete(account).where(eq(account.accountId, 'admin@example.com'));
    await db.delete(user).where(eq(user.email, 'admin@example.com'));
    
    console.log('🧹 Cleaned existing admin records');

    // Generate unique user ID
    const userId = generateId(15);
    
    // Hash password with 12 salt rounds
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin user
    const adminUser = {
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

    await db.insert(user).values(adminUser);
    console.log('👤 Created admin user');

    // Create admin account with email provider
    const adminAccount = {
        id: generateId(15),
        accountId: 'admin@example.com',
        providerId: 'email',
        userId: userId,
        password: hashedPassword,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await db.insert(account).values(adminAccount);
    console.log('🔐 Created admin account with email provider');

    // Verification: Check user exists
    const createdUser = await db.select().from(user).where(eq(user.email, 'admin@example.com'));
    if (createdUser.length === 1 && createdUser[0].role === 'admin') {
        console.log('✅ User verification: Admin user exists with correct role');
    } else {
        throw new Error('User verification failed');
    }

    // Verification: Check account exists
    const createdAccount = await db.select().from(account).where(eq(account.accountId, 'admin@example.com'));
    if (createdAccount.length === 1 && createdAccount[0].providerId === 'email') {
        console.log('✅ Account verification: Account exists with email provider');
    } else {
        throw new Error('Account verification failed');
    }

    // Verification: Check password hash
    const passwordValid = await bcrypt.compare('admin123', createdAccount[0].password!);
    if (passwordValid) {
        console.log('✅ Password verification: Hash validates correctly');
    } else {
        throw new Error('Password verification failed');
    }

    console.log('📋 Admin Details:');
    console.log(`  Email: ${createdUser[0].email}`);
    console.log(`  Role: ${createdUser[0].role}`);
    console.log(`  Email Verified: ${createdUser[0].emailVerified}`);
    console.log(`  Provider: ${createdAccount[0].providerId}`);
    console.log(`  Account ID: ${createdAccount[0].accountId}`);
    
    console.log('✅ Admin user seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});