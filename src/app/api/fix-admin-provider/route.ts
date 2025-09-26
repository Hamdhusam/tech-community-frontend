import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const adminEmail = 'archanaarchu200604@gmail.com';
    console.log('Starting admin account provider fix...');

    // Step 1: Find admin user
    const adminUsers = await db.select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);

    if (adminUsers.length === 0) {
      return NextResponse.json({ 
        error: 'Admin user not found',
        code: 'ADMIN_USER_NOT_FOUND'
      }, { status: 404 });
    }

    const adminUser = adminUsers[0];
    console.log('Admin user found:', adminUser.id);

    // Step 2: Find current account
    const currentAccounts = await db.select()
      .from(account)
      .where(eq(account.userId, adminUser.id))
      .limit(1);

    if (currentAccounts.length === 0) {
      return NextResponse.json({ 
        error: 'Admin account not found',
        code: 'ADMIN_ACCOUNT_NOT_FOUND'
      }, { status: 404 });
    }

    const currentAccount = currentAccounts[0];
    console.log('Current account found with providerId:', currentAccount.providerId);

    // Step 3: Test current provider
    console.log('Testing current provider configuration...');
    try {
      const testResult1 = await auth.api.signInEmail({
        body: {
          email: adminEmail,
          password: 'archanaarchu2006'
        }
      });
      
      if (testResult1 && testResult1.user) {
        return NextResponse.json({
          success: true,
          message: 'Current provider configuration is working',
          currentProvider: currentAccount.providerId,
          testResult: 'Authentication successful',
          noChangesNeeded: true
        });
      }
    } catch (testError: any) {
      console.log('Current provider test failed:', testError.message);
    }

    // Step 4: Try switching to 'credential' provider
    if (currentAccount.providerId !== 'credential') {
      console.log('Switching to credential provider...');
      
      const updatedAccounts = await db.update(account)
        .set({
          providerId: 'credential',
          updatedAt: new Date()
        })
        .where(eq(account.id, currentAccount.id))
        .returning();

      if (updatedAccounts.length > 0) {
        console.log('Updated to credential provider');
        
        // Test with credential provider
        try {
          const testResult2 = await auth.api.signInEmail({
            body: {
              email: adminEmail,
              password: 'archanaarchu2006'
            }
          });
          
          if (testResult2 && testResult2.user) {
            return NextResponse.json({
              success: true,
              message: 'Successfully switched to credential provider',
              previousProvider: currentAccount.providerId,
              currentProvider: 'credential',
              testResult: 'Authentication successful'
            });
          }
        } catch (testError: any) {
          console.log('Credential provider test failed:', testError.message);
        }
      }
    }

    // Step 5: Try switching back to 'email' provider
    console.log('Switching to email provider...');
    
    const revertedAccounts = await db.update(account)
      .set({
        providerId: 'email',
        updatedAt: new Date()
      })
      .where(eq(account.id, currentAccount.id))
      .returning();

    if (revertedAccounts.length > 0) {
      console.log('Reverted to email provider');
      
      // Test with email provider
      try {
        const testResult3 = await auth.api.signInEmail({
          body: {
            email: adminEmail,
            password: 'archanaarchu2006'
          }
        });
        
        if (testResult3 && testResult3.user) {
          return NextResponse.json({
            success: true,
            message: 'Email provider is working after revert',
            currentProvider: 'email',
            testResult: 'Authentication successful'
          });
        }
      } catch (testError: any) {
        console.log('Email provider test failed:', testError.message);
      }
    }

    // Step 6: Check if the issue is with better-auth configuration
    return NextResponse.json({
      success: false,
      message: 'Neither credential nor email provider worked',
      details: {
        userExists: true,
        accountExists: true,
        providerId: revertedAccounts[0]?.providerId,
        hasPassword: !!currentAccount.password,
        possibleIssues: [
          'Better-auth configuration may need adjustment',
          'Password hash format may be incompatible',
          'Database schema may not match better-auth expectations',
          'Provider configuration in better-auth config may be wrong'
        ]
      }
    }, { status: 400 });

  } catch (error) {
    console.error('Provider fix error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}