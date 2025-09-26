import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
    const adminEmail = 'archanaarchu200604@gmail.com';
    const adminPassword = 'archanaarchu2006';
    const adminName = 'Archana';
    const adminRole = 'admin';

    // Generate consistent user ID based on email hash
    const emailHash = adminEmail.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    const userId = `user_${Math.abs(emailHash).toString(16)}`;

    try {
        // Check if user already exists
        const existingUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
        
        if (existingUser.length > 0) {
            console.log('👤 Admin user already exists, updating details...');
            
            // Update existing user
            await db.update(user)
                .set({
                    name: adminName,
                    role: adminRole,
                    emailVerified: true,
                    strikes: 0,
                    updatedAt: new Date(),
                })
                .where(eq(user.email, adminEmail));

            // Check if account exists
            const existingAccount = await db.select().from(account).where(eq(account.userId, existingUser[0].id)).limit(1);
            
            if (existingAccount.length === 0) {
                // Create account if it doesn't exist
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                await db.insert(account).values({
                    id: `account_${userId}`,
                    accountId: adminEmail,
                    providerId: 'credential',
                    userId: existingUser[0].id,
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            } else {
                // Update existing account password
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                await db.update(account)
                    .set({
                        password: hashedPassword,
                        updatedAt: new Date(),
                    })
                    .where(eq(account.userId, existingUser[0].id));
            }
        } else {
            console.log('🆕 Creating new admin user...');
            
            // Hash password with bcryptjs (10 salt rounds - better-auth standard)
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            // Create new user
            await db.insert(user).values({
                id: userId,
                email: adminEmail,
                name: adminName,
                role: adminRole,
                emailVerified: true,
                strikes: 0,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Create credential account
            await db.insert(account).values({
                id: `account_${userId}`,
                accountId: adminEmail,
                providerId: 'credential',
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
            });
        }

        // Verify created records
        const createdUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
        const createdAccount = await db.select().from(account).where(eq(account.userId, createdUser[0].id)).limit(1);

        // Test password hash validation
        const isPasswordValid = await bcrypt.compare(adminPassword, createdAccount[0].password!);

        if (!isPasswordValid) {
            throw new Error('Password hash validation failed');
        }

        console.log('✅ Admin user seeder completed successfully');
        console.log('🔐 Admin credentials for testing:');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
        console.log(`   Role: ${adminRole}`);
        console.log(`   User ID: ${createdUser[0].id}`);
        console.log('✅ Password hash validation passed');

    } catch (error) {
        console.error('❌ Seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Admin user seeder failed:', error);
});