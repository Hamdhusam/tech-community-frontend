import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';

const TARGET_EMAIL = 'archanaarchu200604@gmail.com';
const TARGET_PASSWORD = 'archanaarchu2006';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'Admin Account Verification',
    description: 'This endpoint verifies the Archana admin account configuration',
    usage: {
      method: 'POST',
      description: 'Performs comprehensive verification of the admin account',
      checks: [
        'User existence with email archanaarchu200604@gmail.com',
        'Admin role verification',
        'Account existence with email provider',
        'Password hash validation with archanaarchu2006',
        'Better-auth compatibility checks'
      ]
    },
    responses: {
      '200': 'Verification completed (check results for issues)',
      '500': 'Server error during verification'
    },
    note: 'This endpoint is for debugging and administrative purposes only'
  });
}

export async function POST(request: NextRequest) {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      targetEmail: TARGET_EMAIL,
      verification: {
        userExists: false,
        hasAdminRole: false,
        accountExists: false,
        passwordValid: false,
        betterAuthCompatible: true
      },
      userDetails: null as any,
      accountDetails: null as any,
      issues: [] as string[],
      recommendations: [] as string[]
    };

    // Step 1: Check if user exists
    console.log('Checking for user with email:', TARGET_EMAIL);
    const userData = await db.select()
      .from(user)
      .where(eq(user.email, TARGET_EMAIL))
      .limit(1);

    if (userData.length === 0) {
      results.issues.push('User with target email does not exist');
      results.recommendations.push('Create user account with the specified email');
    } else {
      results.verification.userExists = true;
      results.userDetails = {
        id: userData[0].id,
        name: userData[0].name,
        email: userData[0].email,
        role: userData[0].role,
        emailVerified: userData[0].emailVerified,
        strikes: userData[0].strikes,
        image: userData[0].image,
        createdAt: userData[0].createdAt,
        updatedAt: userData[0].updatedAt
      };

      // Step 2: Check admin role
      if (userData[0].role === 'admin') {
        results.verification.hasAdminRole = true;
      } else {
        results.issues.push(`User role is '${userData[0].role}', expected 'admin'`);
        results.recommendations.push('Update user role to admin');
      }

      // Step 3: Check for email provider account
      console.log('Checking for email provider account for user:', userData[0].id);
      const accountData = await db.select()
        .from(account)
        .where(and(
          eq(account.userId, userData[0].id),
          eq(account.providerId, 'email')
        ))
        .limit(1);

      if (accountData.length === 0) {
        results.issues.push('No email provider account found for user');
        results.recommendations.push('Create email provider account with password hash');
      } else {
        results.verification.accountExists = true;
        results.accountDetails = {
          id: accountData[0].id,
          accountId: accountData[0].accountId,
          providerId: accountData[0].providerId,
          userId: accountData[0].userId,
          hasPassword: !!accountData[0].password,
          passwordLength: accountData[0].password ? accountData[0].password.length : 0,
          createdAt: accountData[0].createdAt,
          updatedAt: accountData[0].updatedAt
        };

        // Step 4: Test password validation
        if (accountData[0].password) {
          try {
            const isPasswordValid = await bcryptjs.compare(TARGET_PASSWORD, accountData[0].password);
            if (isPasswordValid) {
              results.verification.passwordValid = true;
            } else {
              results.issues.push('Password hash does not match expected password');
              results.recommendations.push('Update password hash to match expected password');
            }
          } catch (error) {
            results.issues.push('Error validating password hash: ' + error);
            results.verification.betterAuthCompatible = false;
            results.recommendations.push('Check password hash format compatibility');
          }
        } else {
          results.issues.push('Account exists but no password hash found');
          results.recommendations.push('Add password hash to email provider account');
        }
      }

      // Step 5: Better-auth compatibility checks
      if (!userData[0].id || typeof userData[0].id !== 'string') {
        results.issues.push('User ID format incompatible with better-auth (should be string)');
        results.verification.betterAuthCompatible = false;
      }

      if (typeof userData[0].emailVerified !== 'boolean') {
        results.issues.push('emailVerified field type incompatible (should be boolean)');
        results.verification.betterAuthCompatible = false;
      }

      // Additional validation checks
      if (userData[0].strikes === null || userData[0].strikes === undefined) {
        results.issues.push('Strikes field is null/undefined');
        results.recommendations.push('Ensure strikes field has default value of 0');
      }

      if (!userData[0].createdAt || !userData[0].updatedAt) {
        results.issues.push('Missing timestamp fields (createdAt/updatedAt)');
        results.verification.betterAuthCompatible = false;
      }
    }

    // Overall status assessment
    const allChecksPass = results.verification.userExists && 
                         results.verification.hasAdminRole && 
                         results.verification.accountExists && 
                         results.verification.passwordValid;

    const response = {
      ...results,
      overallStatus: allChecksPass ? 'PASS' : 'FAIL',
      summary: {
        checksCompleted: 5,
        checksPassed: Object.values(results.verification).filter(Boolean).length,
        issuesFound: results.issues.length,
        recommendationsProvided: results.recommendations.length
      },
      nextSteps: allChecksPass ? 
        ['Admin account is properly configured and ready for use'] : 
        ['Address the issues listed above', 'Re-run verification after fixes']
    };

    console.log('Verification completed:', response.overallStatus);
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during verification: ' + error,
      timestamp: new Date().toISOString(),
      targetEmail: TARGET_EMAIL
    }, { status: 500 });
  }
}