import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
    // Delete existing admin user and accounts first
    await db.delete(account).where(eq(account.accountId, 'admin@example.com'));
    await db.delete(user).where(eq(user.email, 'admin@example.com'));

    // Generate unique admin user ID
    const adminUserId = `user_${Math.random().toString(36).substr(2, 25)}`;
    
    // Hash password using bcrypt with salt rounds 10 (better-auth compatible)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const currentTime = new Date();

    // Create admin user
    const adminUser = {
        id: adminUserId,
        email: 'admin@example.com',
        name: 'Admin User',
        emailVerified: true,
        role: 'admin',
        strikes: 0,
        image: null,
        createdAt: currentTime,
        updatedAt: currentTime,
    };

    await db.insert(user).values(adminUser);

    // Create corresponding account record for credential provider
    const adminAccount = {
        id: `account_${Math.random().toString(36).substr(2, 25)}`,
        accountId: 'admin@example.com',
        providerId: 'credential',
        userId: adminUserId,
        password: hashedPassword,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: currentTime,
        updatedAt: currentTime,
    };

    await db.insert(account).values(adminAccount);
    
    console.log('✅ Admin user seeder completed successfully');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: admin');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});