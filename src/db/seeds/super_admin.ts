import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateId } from 'better-auth/utils';

async function main() {
    const superAdminEmail = 'archanaarchu200604@gmail.com';
    const plainPassword = 'archanaarchu2006';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Check if user already exists
    const existingUser = await db.select().from(user).where(eq(user.email, superAdminEmail));
    
    let userId: string;
    
    if (existingUser.length > 0) {
        // Update existing user
        userId = existingUser[0].id;
        
        await db.update(user)
            .set({
                name: 'Super Admin',
                role: 'admin',
                superAdmin: true,
                emailVerified: true,
                strikes: 0,
                updatedAt: new Date(),
            })
            .where(eq(user.id, userId));
            
        console.log('✅ Updated existing user to super admin');
    } else {
        // Create new user
        userId = generateId();
        
        await db.insert(user).values({
            id: userId,
            email: superAdminEmail,
            name: 'Super Admin',
            role: 'admin',
            superAdmin: true,
            emailVerified: true,
            strikes: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        
        console.log('✅ Created new super admin user');
    }
    
    // Clean up existing account records for this user
    await db.delete(account).where(eq(account.userId, userId));
    
    // Create new account record with hashed password
    await db.insert(account).values({
        id: generateId(),
        accountId: superAdminEmail,
        providerId: 'email',
        userId: userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    
    console.log('✅ Super admin seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});