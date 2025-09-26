import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const results = {
      adminUserVerification: {
        passed: false,
        details: null as any,
        error: null as string | null
      },
      credentialAuthentication: {
        passed: false,
        details: null as any,
        error: null as string | null
      },
      databaseIntegrity: {
        passed: false,
        details: null as any,
        error: null as string | null
      },
      adminApiAccess: {
        passed: false,
        details: null as any,
        error: null as string | null
      },
      overallStatus: {
        passed: false,
        summary: '',
        passedTests: 0,
        totalTests: 4
      }
    };

    // 1. ADMIN USER VERIFICATION
    try {
      const adminUsers = await db.select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        strikes: user.strikes,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }).from(user).where(eq(user.email, 'admin@example.com')).limit(1);

      if (adminUsers.length === 0) {
        results.adminUserVerification.error = 'Admin user not found with email admin@example.com';
      } else {
        const adminUser = adminUsers[0];
        const roleCheck = adminUser.role === 'admin';
        const strikesCheck = adminUser.strikes === 0;
        const nameCheck = adminUser.name === 'Admin User';

        results.adminUserVerification.details = {
          userFound: true,
          userData: adminUser,
          roleCheck: { expected: 'admin', actual: adminUser.role, passed: roleCheck },
          strikesCheck: { expected: 0, actual: adminUser.strikes, passed: strikesCheck },
          nameCheck: { expected: 'Admin User', actual: adminUser.name, passed: nameCheck }
        };

        if (roleCheck && strikesCheck && nameCheck) {
          results.adminUserVerification.passed = true;
        } else {
          results.adminUserVerification.error = `Validation failed - Role: ${roleCheck}, Strikes: ${strikesCheck}, Name: ${nameCheck}`;
        }
      }
    } catch (error) {
      results.adminUserVerification.error = `Database query failed: ${error}`;
    }

    // 2. CREDENTIAL AUTHENTICATION
    try {
      if (results.adminUserVerification.passed && results.adminUserVerification.details?.userData) {
        const adminUserId = results.adminUserVerification.details.userData.id;
        
        const credentialAccounts = await db.select({
          id: account.id,
          accountId: account.accountId,
          providerId: account.providerId,
          userId: account.userId,
          password: account.password,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt
        }).from(account).where(
          and(
            eq(account.userId, adminUserId),
            eq(account.providerId, 'credential')
          )
        ).limit(1);

        if (credentialAccounts.length === 0) {
          results.credentialAuthentication.error = 'Credential account not found for admin user';
        } else {
          const credentialAccount = credentialAccounts[0];
          const providerCheck = credentialAccount.providerId === 'credential';
          const userIdMatch = credentialAccount.userId === adminUserId;
          
          let passwordCheck = false;
          let passwordError = null;
          
          if (credentialAccount.password) {
            try {
              passwordCheck = await bcrypt.compare('admin123', credentialAccount.password);
            } catch (error) {
              passwordError = `Password verification failed: ${error}`;
            }
          } else {
            passwordError = 'No password hash found in account';
          }

          results.credentialAuthentication.details = {
            accountFound: true,
            accountData: {
              ...credentialAccount,
              password: credentialAccount.password ? '[HASH_PRESENT]' : null
            },
            providerCheck: { expected: 'credential', actual: credentialAccount.providerId, passed: providerCheck },
            userIdMatch: { expected: adminUserId, actual: credentialAccount.userId, passed: userIdMatch },
            passwordCheck: { testPassword: 'admin123', passed: passwordCheck, error: passwordError }
          };

          if (providerCheck && userIdMatch && passwordCheck && !passwordError) {
            results.credentialAuthentication.passed = true;
          } else {
            results.credentialAuthentication.error = `Authentication validation failed - Provider: ${providerCheck}, UserID: ${userIdMatch}, Password: ${passwordCheck}${passwordError ? `, Error: ${passwordError}` : ''}`;
          }
        }
      } else {
        results.credentialAuthentication.error = 'Skipped - Admin user verification failed';
      }
    } catch (error) {
      results.credentialAuthentication.error = `Credential authentication test failed: ${error}`;
    }

    // 3. DATABASE INTEGRITY
    try {
      if (results.adminUserVerification.passed && results.credentialAuthentication.passed) {
        const adminUserId = results.adminUserVerification.details.userData.id;
        
        // Verify foreign key relationship
        const relationshipCheck = await db.select({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          accountId: account.id,
          accountUserId: account.userId,
          providerId: account.providerId
        })
        .from(user)
        .innerJoin(account, eq(user.id, account.userId))
        .where(
          and(
            eq(user.id, adminUserId),
            eq(account.providerId, 'credential')
          )
        )
        .limit(1);

        if (relationshipCheck.length === 0) {
          results.databaseIntegrity.error = 'Foreign key relationship verification failed';
        } else {
          const relationship = relationshipCheck[0];
          const foreignKeyCheck = relationship.userId === relationship.accountUserId;
          
          results.databaseIntegrity.details = {
            relationshipFound: true,
            relationshipData: relationship,
            foreignKeyCheck: { 
              userTableId: relationship.userId, 
              accountTableUserId: relationship.accountUserId, 
              passed: foreignKeyCheck 
            },
            dataConsistency: {
              userExists: true,
              accountExists: true,
              correctProvider: relationship.providerId === 'credential'
            }
          };

          if (foreignKeyCheck && relationship.providerId === 'credential') {
            results.databaseIntegrity.passed = true;
          } else {
            results.databaseIntegrity.error = `Integrity check failed - Foreign key: ${foreignKeyCheck}, Provider: ${relationship.providerId === 'credential'}`;
          }
        }
      } else {
        results.databaseIntegrity.error = 'Skipped - Previous verification steps failed';
      }
    } catch (error) {
      results.databaseIntegrity.error = `Database integrity test failed: ${error}`;
    }

    // 4. ADMIN API ACCESS SIMULATION
    try {
      if (results.adminUserVerification.passed) {
        const adminUser = results.adminUserVerification.details.userData;
        
        // Simulate admin role verification logic used by admin APIs
        const roleVerification = {
          hasAdminRole: adminUser.role === 'admin',
          isNotBanned: adminUser.strikes < 3,
          emailVerified: adminUser.emailVerified,
          accountActive: true
        };

        const permissionsCheck = {
          canAccessAdminRoutes: roleVerification.hasAdminRole,
          canModifyUsers: roleVerification.hasAdminRole && roleVerification.isNotBanned,
          canViewAnalytics: roleVerification.hasAdminRole,
          canManageSystem: roleVerification.hasAdminRole && roleVerification.isNotBanned
        };

        const simulatedApiCheck = roleVerification.hasAdminRole && roleVerification.isNotBanned;

        results.adminApiAccess.details = {
          roleVerification,
          permissionsCheck,
          simulatedApiAccess: {
            wouldPassAdminCheck: simulatedApiCheck,
            adminApiLogic: 'user.role === "admin" && user.strikes < 3'
          },
          testScenarios: {
            adminRouteAccess: simulatedApiCheck,
            userManagement: simulatedApiCheck,
            systemSettings: simulatedApiCheck
          }
        };

        if (simulatedApiCheck) {
          results.adminApiAccess.passed = true;
        } else {
          results.adminApiAccess.error = `Admin API access simulation failed - Role: ${roleVerification.hasAdminRole}, Strikes: ${roleVerification.isNotBanned}`;
        }
      } else {
        results.adminApiAccess.error = 'Skipped - Admin user verification failed';
      }
    } catch (error) {
      results.adminApiAccess.error = `Admin API access simulation failed: ${error}`;
    }

    // CALCULATE OVERALL STATUS
    const testResults = [
      results.adminUserVerification.passed,
      results.credentialAuthentication.passed,
      results.databaseIntegrity.passed,
      results.adminApiAccess.passed
    ];

    results.overallStatus.passedTests = testResults.filter(Boolean).length;
    results.overallStatus.passed = results.overallStatus.passedTests === results.overallStatus.totalTests;

    if (results.overallStatus.passed) {
      results.overallStatus.summary = 'All tests passed! Admin user is ready for use with better-auth and admin APIs.';
    } else {
      const failedTests = [];
      if (!results.adminUserVerification.passed) failedTests.push('Admin User Verification');
      if (!results.credentialAuthentication.passed) failedTests.push('Credential Authentication');
      if (!results.databaseIntegrity.passed) failedTests.push('Database Integrity');
      if (!results.adminApiAccess.passed) failedTests.push('Admin API Access');
      
      results.overallStatus.summary = `Tests failed: ${failedTests.join(', ')}. Please review the detailed error messages.`;
    }

    return NextResponse.json({
      testResults: results,
      timestamp: new Date().toISOString(),
      testConfiguration: {
        adminEmail: 'admin@example.com',
        testPassword: 'admin123',
        expectedRole: 'admin',
        expectedStrikes: 0,
        expectedName: 'Admin User'
      }
    });

  } catch (error) {
    console.error('Admin test route error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during admin verification test',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}