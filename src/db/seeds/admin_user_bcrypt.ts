import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function main() {
    try {
        // Step 1: Delete existing admin user and associated accounts
        console.log('🗑️ Cleaning up existing admin user...');
        
        const existingUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
        
        if (existingUser.length > 0) {
            const userId = existingUser[0].id;
            
            // Delete associated accounts first (foreign key constraint)
            await db.delete(account).where(eq(account.userId, userId));
            console.log('   Deleted existing account records');
            
            // Delete user
            await db.delete(user).where(eq(user.id, userId));
            console.log('   Deleted existing user record');
        }

        // Step 2: Generate unique user ID and hash password
        const userId = randomUUID();
        const plainPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(plainPassword, 12);
        
        console.log('🔑 Generated user ID:', userId);
        console.log('🔐 Password hashed with bcrypt (12 salt rounds)');

        // Step 3: Create user record
        const userData = {
            id: userId,
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'admin',
            emailVerified: true,
            strikes: 0,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.insert(user).values([userData]);
        console.log('✅ User record created');

        // Step 4: Create account record for credential provider
        const accountData = {
            id: randomUUID(),
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
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.insert(account).values([accountData]);
        console.log('✅ Account record created with credential provider');

        // Step 5: Comprehensive verification
        console.log('\n🔍 Verification Tests:');
        
        // Verify user creation
        const createdUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
        if (createdUser.length > 0) {
            const userRecord = createdUser[0];
            console.log('   ✅ User found:', {
                id: userRecord.id,
                email: userRecord.email,
                name: userRecord.name,
                role: userRecord.role,
                emailVerified: userRecord.emailVerified,
                strikes: userRecord.strikes
            });
        }

        // Verify account creation
        const createdAccount = await db.select().from(account).where(eq(account.userId, userId)).limit(1);
        if (createdAccount.length > 0) {
            const accountRecord = createdAccount[0];
            console.log('   ✅ Account found:', {
                accountId: accountRecord.accountId,
                providerId: accountRecord.providerId,
                userId: accountRecord.userId,
                hasPassword: !!accountRecord.password
            });

            // Test password verification
            if (accountRecord.password) {
                const correctPasswordTest = await bcrypt.compare('admin123', accountRecord.password);
                const incorrectPasswordTest = await bcrypt.compare('wrongpassword', accountRecord.password);
                
                console.log('   🔐 Password Tests:');
                console.log('      Correct password (admin123):', correctPasswordTest ? '✅ PASS' : '❌ FAIL');
                console.log('      Incorrect password (wrongpassword):', incorrectPasswordTest ? '❌ FAIL (should be false)' : '✅ PASS');
                
                if (correctPasswordTest && !incorrectPasswordTest) {
                    console.log('   ✅ Password hashing verification successful');
                } else {
                    throw new Error('Password hashing verification failed');
                }
            }
        }

        console.log('\n🎉 Admin user seeder completed successfully');
        console.log('📧 Email: admin@example.com');
        console.log('🔑 Password: admin123');
        console.log('👤 Role: admin');
        console.log('🔐 Provider: credential (better-auth compatible)');
        
    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});