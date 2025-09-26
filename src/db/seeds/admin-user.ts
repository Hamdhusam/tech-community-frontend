import { db } from '@/db';
import { user, account } from '@/db/schema';
import { hash, verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function main() {
    const adminEmail = 'archanaarchu200604@gmail.com';
    const adminName = 'Archana';
    const adminPassword = 'archanaarchu2006';
    
    console.log('🚀 Starting admin user seeder...');
    
    try {
        // Step 1: Clean up existing records
        console.log('🧹 Cleaning up existing records...');
        
        const existingUser = await db.select().from(user).where(eq(user.email, adminEmail)).get();
        
        if (existingUser) {
            // Delete related account records first
            await db.delete(account).where(eq(account.userId, existingUser.id));
            console.log('   ✓ Deleted existing account records');
            
            // Delete user record
            await db.delete(user).where(eq(user.id, existingUser.id));
            console.log('   ✓ Deleted existing user record');
        } else {
            console.log('   ✓ No existing records found');
        }
        
        // Step 2: Hash the password with argon2id
        console.log('🔒 Hashing password...');
        const hashedPassword = await hash(adminPassword, {
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 4,
            outputLen: 32,
        });
        console.log('   ✓ Password hashed successfully');
        
        // Step 3: Generate UUIDs
        const userId = randomUUID();
        const accountId = randomUUID();
        const now = new Date();
        
        console.log('🆔 Generated UUIDs:');
        console.log(`   User ID: ${userId}`);
        console.log(`   Account ID: ${accountId}`);
        
        // Step 4: Create user record
        console.log('👤 Creating user record...');
        await db.insert(user).values({
            id: userId,
            email: adminEmail,
            name: adminName,
            role: 'admin',
            emailVerified: true,
            strikes: 0,
            createdAt: now,
            updatedAt: now,
        });
        console.log('   ✓ User record created successfully');
        
        // Step 5: Create account record for better-auth compatibility
        console.log('🔐 Creating account record...');
        await db.insert(account).values({
            id: accountId,
            accountId: adminEmail,
            providerId: 'email',
            userId: userId,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
        });
        console.log('   ✓ Account record created successfully');
        
        // Step 6: Verify password hash works
        console.log('🔍 Testing password verification...');
        
        // Test with correct password
        const correctVerification = await verify(hashedPassword, adminPassword);
        if (correctVerification) {
            console.log('   ✅ Correct password verification: PASSED');
        } else {
            throw new Error('Correct password verification failed');
        }
        
        // Test with incorrect password
        const incorrectVerification = await verify(hashedPassword, 'wrongpassword');
        if (!incorrectVerification) {
            console.log('   ✅ Incorrect password verification: CORRECTLY REJECTED');
        } else {
            throw new Error('Incorrect password verification should have failed');
        }
        
        // Step 7: Final verification - retrieve created records
        console.log('📋 Verifying created records...');
        const createdUser = await db.select().from(user).where(eq(user.email, adminEmail)).get();
        const createdAccount = await db.select().from(account).where(eq(account.userId, userId)).get();
        
        if (createdUser && createdAccount) {
            console.log('   ✓ User record verified in database');
            console.log('   ✓ Account record verified in database');
            console.log('📊 Admin User Details:');
            console.log(`   Email: ${createdUser.email}`);
            console.log(`   Name: ${createdUser.name}`);
            console.log(`   Role: ${createdUser.role}`);
            console.log(`   Email Verified: ${createdUser.emailVerified}`);
            console.log(`   Strikes: ${createdUser.strikes}`);
            console.log(`   Created At: ${createdUser.createdAt}`);
        } else {
            throw new Error('Failed to verify created records');
        }
        
        console.log('✅ Admin user seeder completed successfully');
        
    } catch (error) {
        console.error('❌ Admin user seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});