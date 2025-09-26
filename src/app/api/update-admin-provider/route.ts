import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting admin account provider update...');
    
    // Step 1: Find admin user by email
    console.log('Step 1: Finding admin user by email archanaarchu200604@gmail.com');
    const adminUsers = await db.select()
      .from(user)
      .where(eq(user.email, 'archanaarchu200604@gmail.com'))
      .limit(1);

    if (adminUsers.length === 0) {
      console.error('Admin user not found with email: archanaarchu200604@gmail.com');
      return NextResponse.json({ 
        error: 'Admin user not found',
        code: 'ADMIN_USER_NOT_FOUND',
        debugInfo: { email: 'archanaarchu200604@gmail.com' }
      }, { status: 404 });
    }

    const adminUser = adminUsers[0];
    console.log('Admin user found:', { id: adminUser.id, email: adminUser.email, role: adminUser.role });

    // Step 2: Find account record for that user with credential provider
    console.log('Step 2: Finding account record with credential provider');
    const credentialAccounts = await db.select()
      .from(account)
      .where(and(
        eq(account.userId, adminUser.id),
        eq(account.providerId, 'credential')
      ))
      .limit(1);

    if (credentialAccounts.length === 0) {
      console.error('Credential account record not found for admin user:', adminUser.id);
      return NextResponse.json({ 
        error: 'Credential account record not found for admin user',
        code: 'CREDENTIAL_ACCOUNT_NOT_FOUND',
        debugInfo: { userId: adminUser.id, email: adminUser.email }
      }, { status: 404 });
    }

    const currentAccount = credentialAccounts[0];
    console.log('Current credential account found:', { 
      id: currentAccount.id, 
      providerId: currentAccount.providerId,
      userId: currentAccount.userId,
      hasPassword: !!currentAccount.password
    });

    // Step 3: Update providerId from 'credential' to 'email'
    console.log('Step 3: Updating providerId from credential to email');
    const updatedAccounts = await db.update(account)
      .set({
        providerId: 'email',
        updatedAt: new Date()
      })
      .where(and(
        eq(account.id, currentAccount.id),
        eq(account.userId, adminUser.id)
      ))
      .returning();

    if (updatedAccounts.length === 0) {
      console.error('Failed to update account record');
      return NextResponse.json({ 
        error: 'Failed to update account record',
        code: 'UPDATE_FAILED',
        debugInfo: { accountId: currentAccount.id, userId: adminUser.id }
      }, { status: 500 });
    }

    const updatedAccount = updatedAccounts[0];
    console.log('Account updated successfully:', { 
      id: updatedAccount.id, 
      oldProviderId: currentAccount.providerId,
      newProviderId: updatedAccount.providerId,
      passwordPreserved: !!updatedAccount.password,
      passwordHash: updatedAccount.password ? updatedAccount.password.substring(0, 20) + '...' : null
    });

    // Step 4: Verify the update was successful
    console.log('Step 4: Verifying the update');
    const verificationRecords = await db.select()
      .from(account)
      .where(and(
        eq(account.id, updatedAccount.id),
        eq(account.providerId, 'email'),
        eq(account.userId, adminUser.id)
      ))
      .limit(1);

    if (verificationRecords.length === 0) {
      console.error('Verification failed - providerId was not updated correctly');
      return NextResponse.json({ 
        error: 'Update verification failed',
        code: 'VERIFICATION_FAILED',
        debugInfo: { accountId: updatedAccount.id }
      }, { status: 500 });
    }

    const verifiedAccount = verificationRecords[0];
    console.log('Update verification successful');

    // Step 5: Return success confirmation with preserved data
    return NextResponse.json({
      success: true,
      message: 'Admin account provider successfully updated from credential to email',
      data: {
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          emailVerified: adminUser.emailVerified,
          strikes: adminUser.strikes
        },
        account: {
          id: verifiedAccount.id,
          accountId: verifiedAccount.accountId,
          previousProviderId: currentAccount.providerId,
          currentProviderId: verifiedAccount.providerId,
          userId: verifiedAccount.userId,
          passwordPreserved: !!verifiedAccount.password,
          passwordHashLength: verifiedAccount.password?.length || 0,
          updatedAt: verifiedAccount.updatedAt
        },
        verification: {
          verified: true,
          verifiedAt: new Date().toISOString(),
          fieldsPreserved: {
            password: !!verifiedAccount.password,
            accountId: verifiedAccount.accountId === adminUser.email,
            userId: verifiedAccount.userId === adminUser.id
          }
        }
      },
      debugInfo: {
        operation: 'update-admin-provider-to-email',
        steps: [
          { step: 1, status: 'completed', description: 'Found admin user' },
          { step: 2, status: 'completed', description: 'Found credential account record' },
          { step: 3, status: 'completed', description: 'Updated providerId to email' },
          { step: 4, status: 'completed', description: 'Verified update' },
          { step: 5, status: 'completed', description: 'Returned confirmation' }
        ]
      }
    }, { status: 200 });

  } catch (error) {
    console.error('POST error during admin account provider update:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR',
      debugInfo: {
        operation: 'update-admin-provider-to-email',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}