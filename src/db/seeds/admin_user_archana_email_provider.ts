import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
    const adminEmail = 'archanaarchu200604@gmail.com';
    const adminPassword = 'archanaarchu2006';
    const adminName = 'Archana';
    
    try {
        // Check if user already exists
        const existingUser = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
        
        let userId: string;
        
        if (existingUser.length > 0) {
            userId = existingUser[0].id;
            console.log('✅ User already exists, using existing ID:', userId);
            
            // Update user details if needed
            await db.update(user).set({
                name: adminName,
                role: 'admin',
                emailVerified: true,
                strikes: 0,
                updatedAt: new Date(),
            }).where(eq(user.id, userId));
        } else {
            // Generate better-auth compatible user ID
            userId = `user_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
            
            // Create new user
            await db.insert(user).values({
                id: userId,
                name: adminName,
                email: adminEmail,
                emailVerified: true,
                role: 'admin',
                strikes: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            
            console.log('✅ Created new admin user with ID:', userId);
        }
        
        // Clean up existing credential provider accounts for this user
        await db.delete(account).where(
            and(
                eq(account.userId, userId),
                eq(account.providerId, 'credential')
            )
        );
        
        // Hash password with bcryptjs
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        // Check if email provider account already exists
        const existingEmailAccount = await db.select().from(account).where(
            and(
                eq(account.userId, userId),
                eq(account.providerId, 'email')
            )
        ).limit(1);
        
        if (existingEmailAccount.length > 0) {
            // Update existing email provider account
            await db.update(account).set({
                password: hashedPassword,
                updatedAt: new Date(),
            }).where(eq(account.id, existingEmailAccount[0].id));
            
            console.log('✅ Updated existing email provider account');
        } else {
            // Create new email provider account
            const accountId = `acc_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
            
            await db.insert(account).values({
                id: accountId,
                accountId: adminEmail,
                providerId: 'email',
                userId: userId,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            
            console.log('✅ Created new email provider account');
        }
        
        // Verify the created records
        const verifyUser = await db.select().from(user).where(eq(user.id, userId)).limit(1);
        const verifyAccount = await db.select().from(account).where(
            and(
                eq(account.userId, userId),
                eq(account.providerId, 'email')
            )
        ).limit(1);
        
        if (verifyUser.length > 0 && verifyAccount.length > 0) {
            console.log('✅ User verification successful:', {
                id: verifyUser[0].id,
                email: verifyUser[0].email,
                name: verifyUser[0].name,
                role: verifyUser[0].role,
                emailVerified: verifyUser[0].emailVerified,
                strikes: verifyUser[0].strikes,
            });
            
            // Test password hash validation
            const isPasswordValid = await bcrypt.compare(adminPassword, verifyAccount[0].password!);
            console.log('✅ Password hash validation:', isPasswordValid ? 'PASSED' : 'FAILED');
            
            if (!isPasswordValid) {
                throw new Error('Password hash validation failed');
            }
        } else {
            throw new Error('User or account verification failed');
        }
        
        console.log('✅ Admin user seeder completed successfully');
        console.log('✅ Admin can now sign in with email provider at /api/auth/sign-in/email');
        
    } catch (error) {
        console.error('❌ Seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});