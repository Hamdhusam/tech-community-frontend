import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
    const superAdminEmail = 'archanaarchu200604@gmail.com';
    
    console.log('🔍 Checking if super admin user exists...');
    
    // Check if super admin user already exists
    const existingUser = await db.select().from(user).where(eq(user.email, superAdminEmail)).limit(1);
    
    if (existingUser.length > 0) {
        console.log('✅ Super admin user already exists:');
        console.log('📧 Email:', existingUser[0].email);
        console.log('👤 Name:', existingUser[0].name);
        console.log('🔑 Role:', existingUser[0].role);
        console.log('⭐ Super Admin:', existingUser[0].superAdmin);
        console.log('✉️ Email Verified:', existingUser[0].emailVerified);
        console.log('⚠️ Strikes:', existingUser[0].strikes);
        console.log('📅 Created At:', existingUser[0].createdAt);
        return;
    }
    
    console.log('❌ Super admin user not found. Creating new super admin...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('archanaarchu2006', 12);
    console.log('🔐 Password hashed successfully');
    
    // Generate unique ID for the user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Create the super admin user
    const newUser = {
        id: userId,
        email: superAdminEmail,
        name: 'Super Admin',
        role: 'admin',
        superAdmin: true,
        emailVerified: true,
        strikes: 0,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    
    await db.insert(user).values(newUser);
    console.log('✅ Super admin user created successfully');
    console.log('👤 User ID:', userId);
    console.log('📧 Email:', superAdminEmail);
    console.log('🔑 Role: admin');
    console.log('⭐ Super Admin: true');
    
    // Create corresponding account record for better-auth
    const accountId = `account_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const newAccount = {
        id: accountId,
        accountId: userId,
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
    
    await db.insert(account).values(newAccount);
    console.log('✅ Account record created successfully');
    console.log('🆔 Account ID:', accountId);
    console.log('🔐 Password stored securely (hashed)');
    
    console.log('🎉 Super admin setup completed successfully!');
    console.log('📋 Summary:');
    console.log('   - User created with admin role and super admin privileges');
    console.log('   - Email verified automatically');
    console.log('   - Account record created for authentication');
    console.log('   - Password hashed and stored securely');
}

main().catch((error) => {
    console.error('❌ Super admin seeder failed:', error);
});