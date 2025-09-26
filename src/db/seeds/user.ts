import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function main() {
    const now = new Date();
    
    // Clear existing users and their accounts to avoid conflicts
    await db.delete(account).where(eq(account.accountId, 'admin@example.com'));
    await db.delete(account).where(eq(account.accountId, 'user@example.com'));
    await db.delete(user).where(eq(user.email, 'admin@example.com'));
    await db.delete(user).where(eq(user.email, 'user@example.com'));

    // Hash passwords with bcrypt salt rounds 12
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const userPasswordHash = await bcrypt.hash('user123', 12);

    // Generate unique UUIDs for user IDs
    const adminUserId = randomUUID();
    const regularUserId = randomUUID();

    const sampleUsers = [
        {
            id: adminUserId,
            name: 'Admin User',
            email: 'admin@example.com',
            emailVerified: true,
            image: null,
            role: 'admin',
            createdAt: now,
            updatedAt: now,
        },
        {
            id: regularUserId,
            name: 'Regular User',
            email: 'user@example.com',
            emailVerified: true,
            image: null,
            role: 'user',
            createdAt: now,
            updatedAt: now,
        }
    ];

    // Insert users
    await db.insert(user).values(sampleUsers);

    // Create corresponding account records for credential provider
    const sampleAccounts = [
        {
            id: randomUUID(),
            accountId: 'admin@example.com',
            providerId: 'credential',
            userId: adminUserId,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            password: adminPasswordHash,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: randomUUID(),
            accountId: 'user@example.com',
            providerId: 'credential',
            userId: regularUserId,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            password: userPasswordHash,
            createdAt: now,
            updatedAt: now,
        }
    ];

    // Insert accounts
    await db.insert(account).values(sampleAccounts);
    
    console.log('✅ User seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});