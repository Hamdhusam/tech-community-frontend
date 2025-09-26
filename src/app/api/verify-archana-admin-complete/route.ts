import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { randomUUID } from 'crypto';

const TARGET_EMAIL = 'archanaarchu200604@gmail.com';
const TARGET_PASSWORD = 'archanaarchu2006';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting admin verification check for:', TARGET_EMAIL);
    
    const status = {
      userExists: false,
      userHasAdminRole: false,
      accountExists: false,
      passwordValid: false,
      userDetails: null as any,
      accountDetails: null as any,
      errors: [] as string[]
    };

    // Check if user exists
    console.log('1. Checking if user exists...');
    const existingUsers = await db.select()
      .from(user)
      .where(eq(user.email, TARGET_EMAIL))
      .limit(1);

    if (existingUsers.length > 0) {
      status.userExists = true;
      status.userDetails = existingUsers[0];
      console.log('✅ User found:', existingUsers[0].id);
      
      // Check if user has admin role
      if (existingUsers[0].role === 'admin') {
        status.userHasAdminRole = true;
        console.log('✅ User has admin role');
      } else {
        status.errors.push(`User role is '${existingUsers[0].role}', expected 'admin'`);
        console.log('❌ User role is not admin:', existingUsers[0].role);
      }

      // Check if account exists with providerId 'email'
      console.log('2. Checking for email account...');
      const existingAccounts = await db.select()
        .from(account)
        .where(and(
          eq(account.userId, existingUsers[0].id),
          eq(account.providerId, 'email')
        ))
        .limit(1);

      if (existingAccounts.length > 0) {
        status.accountExists = true;
        status.accountDetails = existingAccounts[0];
        console.log('✅ Account found with providerId email');

        // Verify password hash
        if (existingAccounts[0].password) {
          console.log('3. Verifying password...');
          try {
            const isValid = await verify(existingAccounts[0].password, TARGET_PASSWORD, {
              memoryCost: 65536,
              timeCost: 3,
              parallelism: 4,
              outputLen: 32
            });
            
            if (isValid) {
              status.passwordValid = true;
              console.log('✅ Password verification successful');
            } else {
              status.errors.push('Password hash does not match expected password');
              console.log('❌ Password verification failed');
            }
          } catch (error) {
            status.errors.push(`Password verification error: ${error}`);
            console.log('❌ Password verification threw error:', error);
          }
        } else {
          status.errors.push('Account exists but has no password hash');
          console.log('❌ Account has no password');
        }
      } else {
        status.errors.push('No account found with providerId "email"');
        console.log('❌ No email account found');
      }
    } else {
      status.errors.push('User does not exist');
      console.log('❌ User not found');
    }

    console.log('📊 Final status:', status);

    return NextResponse.json({
      success: true,
      email: TARGET_EMAIL,
      status,
      allChecksPass: status.userExists && status.userHasAdminRole && status.accountExists && status.passwordValid,
      nextSteps: status.errors.length > 0 ? 'Run POST method to fix issues' : 'Admin user is properly configured'
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'GET_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting admin user fix process for:', TARGET_EMAIL);
    
    const steps = {
      deletedExistingUser: false,
      deletedExistingAccounts: false,
      createdNewUser: false,
      hashedPassword: false,
      createdNewAccount: false,
      verifiedPasswordHash: false,
      errors: [] as string[]
    };

    // Step 1: Delete existing user and related accounts
    console.log('1. Cleaning up existing records...');
    
    const existingUsers = await db.select()
      .from(user)
      .where(eq(user.email, TARGET_EMAIL))
      .limit(1);

    if (existingUsers.length > 0) {
      const userId = existingUsers[0].id;
      
      // Delete accounts first (foreign key constraint)
      const deletedAccounts = await db.delete(account)
        .where(eq(account.userId, userId))
        .returning();
      
      if (deletedAccounts.length > 0) {
        steps.deletedExistingAccounts = true;
        console.log(`✅ Deleted ${deletedAccounts.length} existing accounts`);
      }

      // Delete user
      const deletedUsers = await db.delete(user)
        .where(eq(user.id, userId))
        .returning();
      
      if (deletedUsers.length > 0) {
        steps.deletedExistingUser = true;
        console.log('✅ Deleted existing user');
      }
    } else {
      console.log('ℹ️ No existing user to delete');
    }

    // Step 2: Create new user
    console.log('2. Creating new user...');
    const newUserId = randomUUID();
    const now = new Date();
    
    const newUserData = {
      id: newUserId,
      name: 'Archana',
      email: TARGET_EMAIL,
      role: 'admin',
      emailVerified: true,
      strikes: 0,
      createdAt: now,
      updatedAt: now
    };

    const createdUsers = await db.insert(user)
      .values(newUserData)
      .returning();

    if (createdUsers.length > 0) {
      steps.createdNewUser = true;
      console.log('✅ Created new user:', createdUsers[0].id);
    } else {
      steps.errors.push('Failed to create new user');
      console.log('❌ Failed to create user');
    }

    // Step 3: Hash password
    console.log('3. Hashing password...');
    let passwordHash: string;
    
    try {
      passwordHash = await hash(TARGET_PASSWORD, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
        outputLen: 32
      });
      
      steps.hashedPassword = true;
      console.log('✅ Password hashed successfully');
    } catch (error) {
      steps.errors.push(`Password hashing failed: ${error}`);
      console.log('❌ Password hashing failed:', error);
      throw error;
    }

    // Step 4: Create account record
    console.log('4. Creating account record...');
    const newAccountData = {
      id: randomUUID(),
      accountId: TARGET_EMAIL,
      providerId: 'email',
      userId: newUserId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now
    };

    const createdAccounts = await db.insert(account)
      .values(newAccountData)
      .returning();

    if (createdAccounts.length > 0) {
      steps.createdNewAccount = true;
      console.log('✅ Created new account:', createdAccounts[0].id);
    } else {
      steps.errors.push('Failed to create new account');
      console.log('❌ Failed to create account');
    }

    // Step 5: Verify the hash can authenticate the password
    console.log('5. Verifying password hash...');
    try {
      const isValid = await verify(passwordHash, TARGET_PASSWORD, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
        outputLen: 32
      });
      
      if (isValid) {
        steps.verifiedPasswordHash = true;
        console.log('✅ Password hash verification successful');
      } else {
        steps.errors.push('Created password hash does not verify against plain password');
        console.log('❌ Password hash verification failed');
      }
    } catch (error) {
      steps.errors.push(`Password hash verification error: ${error}`);
      console.log('❌ Password hash verification threw error:', error);
    }

    const allStepsSuccessful = steps.createdNewUser && 
                              steps.hashedPassword && 
                              steps.createdNewAccount && 
                              steps.verifiedPasswordHash &&
                              steps.errors.length === 0;

    console.log('📊 Fix process completed. Steps:', steps);

    return NextResponse.json({
      success: allStepsSuccessful,
      email: TARGET_EMAIL,
      steps,
      message: allStepsSuccessful 
        ? 'Admin user successfully created and verified' 
        : 'Some steps failed - check errors',
      nextSteps: allStepsSuccessful 
        ? 'Admin user is now ready for authentication'
        : 'Review errors and retry if necessary'
    }, { status: allStepsSuccessful ? 201 : 400 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'POST_ERROR'
    }, { status: 500 });
  }
}