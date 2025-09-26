import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    const saltRounds = 12;
    
    try {
        // Check if admin user already exists
        const existingUser = await db.select().from(user).where(eq(user.email, adminEmail));
        
        let adminUserId: string;
        
        if (existingUser.length > 0) {
            adminUserId = existingUser[0].id;
            
            // Check if role needs to be updated
            if (existingUser[0].role !== 'admin') {
                await db.update(user)
                    .set({ 
                        role: 'admin',
                        updatedAt: new Date()
                    })
                    .where(eq(user.id, adminUserId));
                
                console.log('📝 Updated existing user role to admin');
            } else {
                console.log('✅ Admin user already exists with correct role');
            }
        } else {
            // Generate unique ID for new admin user
            adminUserId = `user_admin_${Date.now()}`;
            
            // Create new admin user
            const newAdminUser = {
                id: adminUserId,
                name: 'Admin User',
                email: adminEmail,
                emailVerified: true,
                image: null,
                role: 'admin',
                strikes: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            await db.insert(user).values(newAdminUser);
            console.log('👤 Created new admin user');
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
        
        // Check if credential account already exists
        const existingAccount = await db.select().from(account)
            .where(and(
                eq(account.userId, adminUserId),
                eq(account.providerId, 'credential')
            ));
        
        if (existingAccount.length > 0) {
            // Update existing account with new password hash
            await db.update(account)
                .set({
                    password: hashedPassword,
                    updatedAt: new Date()
                })
                .where(eq(account.id, existingAccount[0].id));
            
            console.log('🔐 Updated existing account password');
        } else {
            // Clean up any duplicate accounts for this user
            const duplicateAccounts = await db.select().from(account)
                .where(eq(account.accountId, adminEmail));
            
            if (duplicateAccounts.length > 0) {
                await db.delete(account).where(eq(account.accountId, adminEmail));
                console.log('🧹 Cleaned up duplicate accounts');
            }
            
            // Create new credential account
            const newAccount = {
                id: `account_admin_${Date.now()}`,
                accountId: adminEmail,
                providerId: 'credential',
                userId: adminUserId,
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
            console.log('🔑 Created new credential account');
        }
        
        // Verify final state
        const finalUser = await db.select().from(user).where(eq(user.email, adminEmail));
        const finalAccount = await db.select().from(account)
            .where(and(
                eq(account.userId, adminUserId),
                eq(account.providerId, 'credential')
            ));
        
        if (finalUser.length === 1 && 
            finalUser[0].role === 'admin' && 
            finalAccount.length === 1 && 
            finalAccount[0].password) {
            
            // Verify password hash
            const passwordValid = await bcrypt.compare(adminPassword, finalAccount[0].password);
            
            if (passwordValid) {
                console.log('✅ Admin user verification seeder completed successfully');
                console.log(`   📧 Email: ${adminEmail}`);
                console.log(`   👤 Name: ${finalUser[0].name}`);
                console.log(`   🛡️  Role: ${finalUser[0].role}`);
                console.log(`   ✉️  Email Verified: ${finalUser[0].emailVerified}`);
                console.log(`   🔐 Password Hash Valid: ${passwordValid}`);
            } else {
                throw new Error('Password hash validation failed');
            }
        } else {
            throw new Error('Final state verification failed');
        }
        
    } catch (error) {
        console.error('❌ Admin user verification seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});