import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateId } from 'lucia';

async function main() {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    const saltRounds = 12;

    try {
        console.log('🧹 Cleaning up existing admin user and accounts...');
        
        // Find existing admin user
        const existingUser = await db.select().from(user).where(eq(user.email, adminEmail)).get();
        
        if (existingUser) {
            console.log(`Found existing user with ID: ${existingUser.id}`);
            
            // Delete associated accounts first (due to foreign key constraints)
            await db.delete(account).where(eq(account.userId, existingUser.id));
            console.log('Deleted existing accounts');
            
            // Delete the user
            await db.delete(user).where(eq(user.id, existingUser.id));
            console.log('Deleted existing admin user');
        }

        console.log('🔑 Generating secure password hash...');
        const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
        console.log('Password hash generated successfully');

        console.log('👤 Creating new admin user...');
        const userId = generateId(25);
        const now = new Date();

        const adminUser = {
            id: userId,
            email: adminEmail,
            name: 'Admin User',
            role: 'admin',
            strikes: 0,
            emailVerified: true,
            image: null,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(user).values(adminUser);
        console.log(`✅ Admin user created with ID: ${userId}`);

        console.log('🔐 Creating credential account...');
        const accountId = generateId(25);
        
        const credentialAccount = {
            id: accountId,
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
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(account).values(credentialAccount);
        console.log(`✅ Credential account created with ID: ${accountId}`);

        console.log('🔍 Performing verification checks...');

        // Verify user exists with admin role
        const verifyUser = await db.select().from(user).where(eq(user.email, adminEmail)).get();
        if (!verifyUser) {
            throw new Error('Admin user not found after creation');
        }
        if (verifyUser.role !== 'admin') {
            throw new Error(`Expected admin role, got: ${verifyUser.role}`);
        }
        if (!verifyUser.emailVerified) {
            throw new Error('Email should be verified');
        }
        if (verifyUser.strikes !== 0) {
            throw new Error(`Expected 0 strikes, got: ${verifyUser.strikes}`);
        }
        console.log('✅ User verification passed');

        // Verify account exists with credential provider
        const verifyAccount = await db.select().from(account).where(eq(account.userId, userId)).get();
        if (!verifyAccount) {
            throw new Error('Credential account not found after creation');
        }
        if (verifyAccount.providerId !== 'credential') {
            throw new Error(`Expected credential provider, got: ${verifyAccount.providerId}`);
        }
        if (verifyAccount.accountId !== adminEmail) {
            throw new Error(`Expected account ID ${adminEmail}, got: ${verifyAccount.accountId}`);
        }
        console.log('✅ Account verification passed');

        // Verify password hash can be validated
        if (!verifyAccount.password) {
            throw new Error('Password hash not found in account');
        }
        
        const passwordValid = await bcrypt.compare(adminPassword, verifyAccount.password);
        if (!passwordValid) {
            throw new Error('Password hash validation failed');
        }
        console.log('✅ Password hash validation passed');

        // Test bcrypt.compare functionality with wrong password
        const wrongPasswordTest = await bcrypt.compare('wrongpassword', verifyAccount.password);
        if (wrongPasswordTest) {
            throw new Error('bcrypt.compare should reject wrong password');
        }
        console.log('✅ bcrypt.compare functionality verified');

        console.log('🎉 Admin user seeder completed successfully');
        console.log('📋 Summary:');
        console.log(`   User ID: ${userId}`);
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Role: admin`);
        console.log(`   Email Verified: true`);
        console.log(`   Strikes: 0`);
        console.log(`   Account ID: ${accountId}`);
        console.log(`   Provider: credential`);
        console.log('   Password: Securely hashed and verified');

    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        
        // Rollback: Clean up any partially created records
        console.log('🔄 Attempting rollback...');
        try {
            const rollbackUser = await db.select().from(user).where(eq(user.email, adminEmail)).get();
            if (rollbackUser) {
                await db.delete(account).where(eq(account.userId, rollbackUser.id));
                await db.delete(user).where(eq(user.id, rollbackUser.id));
                console.log('✅ Rollback completed');
            }
        } catch (rollbackError) {
            console.error('❌ Rollback failed:', rollbackError);
        }
        
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});