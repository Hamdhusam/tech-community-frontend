import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function main() {
    try {
        console.log('🔄 Starting admin user seeder for better-auth...');

        // Step 1: Delete existing admin user if exists
        console.log('🗑️ Removing existing admin user with email: archanaarchu200604@gmail.com');
        
        const existingUser = await db.select().from(user).where(eq(user.email, 'archanaarchu200604@gmail.com')).get();
        if (existingUser) {
            await db.delete(account).where(eq(account.userId, existingUser.id));
            await db.delete(user).where(eq(user.id, existingUser.id));
            console.log('✅ Existing admin user and related accounts deleted');
        } else {
            console.log('ℹ️ No existing admin user found');
        }

        // Step 2: Generate unique IDs
        const userId = uuidv4();
        const accountId = uuidv4();
        console.log('🆔 Generated user ID:', userId);
        console.log('🆔 Generated account ID:', accountId);

        // Step 3: Hash password with bcrypt (10 salt rounds)
        const plainPassword = 'archanaarchu2006';
        console.log('🔒 Hashing password with bcrypt (10 salt rounds)...');
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        console.log('✅ Password hashed successfully');

        // Step 4: Verify password hash works
        console.log('🔍 Verifying password hash...');
        const isValidPassword = await bcrypt.compare(plainPassword, hashedPassword);
        if (!isValidPassword) {
            throw new Error('Password hash verification failed');
        }
        console.log('✅ Password hash verification successful');

        const now = new Date();

        // Step 5: Create admin user
        const adminUser = {
            id: userId,
            name: 'Archana',
            email: 'archanaarchu200604@gmail.com',
            emailVerified: true,
            image: null,
            role: 'admin',
            strikes: 0,
            createdAt: now,
            updatedAt: now,
        };

        console.log('👤 Creating admin user...');
        await db.insert(user).values(adminUser);
        console.log('✅ Admin user created successfully');

        // Step 6: Create credential account for better-auth
        const credentialAccount = {
            id: accountId,
            accountId: 'archanaarchu200604@gmail.com',
            providerId: 'credential',
            userId: userId,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            scope: null,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
        };

        console.log('🔑 Creating credential account...');
        await db.insert(account).values(credentialAccount);
        console.log('✅ Credential account created successfully');

        // Step 7: Verification - Read back the created records
        console.log('🔍 Verifying created records...');
        
        const createdUser = await db.select().from(user).where(eq(user.id, userId)).get();
        const createdAccount = await db.select().from(account).where(eq(account.id, accountId)).get();

        if (!createdUser || !createdAccount) {
            throw new Error('Failed to verify created records');
        }

        console.log('📋 User verification:');
        console.log('   - ID:', createdUser.id);
        console.log('   - Name:', createdUser.name);
        console.log('   - Email:', createdUser.email);
        console.log('   - Role:', createdUser.role);
        console.log('   - Email Verified:', createdUser.emailVerified);
        console.log('   - Strikes:', createdUser.strikes);

        console.log('📋 Account verification:');
        console.log('   - ID:', createdAccount.id);
        console.log('   - Account ID:', createdAccount.accountId);
        console.log('   - Provider ID:', createdAccount.providerId);
        console.log('   - User ID:', createdAccount.userId);
        console.log('   - Password Hash Length:', createdAccount.password?.length);

        // Step 8: Final password verification
        console.log('🔐 Final password verification...');
        const finalPasswordCheck = await bcrypt.compare(plainPassword, createdAccount.password!);
        if (!finalPasswordCheck) {
            throw new Error('Final password verification failed');
        }
        console.log('✅ Final password verification successful');

        console.log('✅ Admin user seeder completed successfully');
        console.log('🎉 Better-auth compatible admin user created:');
        console.log('   📧 Email: archanaarchu200604@gmail.com');
        console.log('   🔑 Password: archanaarchu2006');
        console.log('   👑 Role: admin');
        console.log('   ✉️ Email Verified: true');

    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});