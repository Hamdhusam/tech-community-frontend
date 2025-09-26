import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function main() {
    try {
        // Check if admin user already exists
        const existingUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
        
        if (existingUser.length > 0) {
            console.log('ℹ️ Admin user already exists, skipping creation');
            return;
        }

        // Hash the password with 12 salt rounds
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        // Generate UUIDs for user and account
        const userId = randomUUID();
        const accountId = randomUUID();
        const currentTimestamp = new Date();

        // Create the admin user
        const adminUser = {
            id: userId,
            name: 'Admin User',
            email: 'admin@example.com',
            emailVerified: true,
            image: null,
            role: 'admin',
            strikes: 0,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        };

        await db.insert(user).values(adminUser);

        // Create the corresponding account record for better-auth credential provider
        const adminAccount = {
            id: accountId,
            accountId: 'admin@example.com',
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

        await db.insert(account).values(adminAccount);

        // Verify the user was created with correct role
        const createdUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
        
        if (createdUser.length > 0 && createdUser[0].role === 'admin') {
            console.log('✅ Admin user seeder completed successfully');
            console.log(`👤 Created admin user: ${createdUser[0].name} (${createdUser[0].email}) with role: ${createdUser[0].role}`);
        } else {
            throw new Error('Admin user verification failed');
        }

    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});