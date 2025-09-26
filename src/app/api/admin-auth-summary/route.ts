import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, session, account, verification } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';

interface AuthStatusResponse {
  overallStatus: 'WORKING' | 'ISSUES' | 'BROKEN';
  adminUserVerification: {
    status: 'PASS' | 'FAIL';
    exists: boolean;
    hasAdminRole: boolean;
    email: string | null;
    message: string;
  };
  passwordHashingVerification: {
    status: 'PASS' | 'FAIL';
    hasPasswordHash: boolean;
    hashFormat: string;
    verificationTest: boolean;
    message: string;
  };
  routeProtectionVerification: {
    status: 'PASS' | 'FAIL';
    authTablesExist: boolean;
    sessionTableValid: boolean;
    message: string;
  };
  workingEndpoints: {
    authentication: string[];
    protected: string[];
    public: string[];
  };
  betterAuthIntegration: {
    status: 'PASS' | 'ISSUES' | 'FAIL';
    schemaCompliance: boolean;
    requiredTables: string[];
    missingTables: string[];
    message: string;
  };
  databaseStats: {
    totalUsers: number;
    totalSessions: number;
    totalAccounts: number;
    adminUsers: number;
  };
  nextSteps: string[];
  recommendations: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const response: AuthStatusResponse = {
      overallStatus: 'WORKING',
      adminUserVerification: {
        status: 'FAIL',
        exists: false,
        hasAdminRole: false,
        email: null,
        message: ''
      },
      passwordHashingVerification: {
        status: 'FAIL',
        hasPasswordHash: false,
        hashFormat: 'unknown',
        verificationTest: false,
        message: ''
      },
      routeProtectionVerification: {
        status: 'FAIL',
        authTablesExist: false,
        sessionTableValid: false,
        message: ''
      },
      workingEndpoints: {
        authentication: [
          '/api/auth/sign-in',
          '/api/auth/sign-up',
          '/api/auth/sign-out',
          '/api/auth/session'
        ],
        protected: [
          '/api/admin/*',
          '/api/attendance/*'
        ],
        public: [
          '/api/auth/status',
          '/api/health'
        ]
      },
      betterAuthIntegration: {
        status: 'FAIL',
        schemaCompliance: false,
        requiredTables: ['user', 'session', 'account', 'verification'],
        missingTables: [],
        message: ''
      },
      databaseStats: {
        totalUsers: 0,
        totalSessions: 0,
        totalAccounts: 0,
        adminUsers: 0
      },
      nextSteps: [],
      recommendations: []
    };

    // Test 1: Database Schema Validation
    try {
      const requiredTables = ['user', 'session', 'account', 'verification'];
      const missingTables: string[] = [];
      
      // Check if tables exist by trying to count records
      await db.select({ count: count() }).from(user);
      await db.select({ count: count() }).from(session);
      await db.select({ count: count() }).from(account);
      await db.select({ count: count() }).from(verification);
      
      response.betterAuthIntegration.schemaCompliance = true;
      response.betterAuthIntegration.status = 'PASS';
      response.betterAuthIntegration.message = 'All required better-auth tables exist and are accessible';
      response.routeProtectionVerification.authTablesExist = true;
      response.routeProtectionVerification.sessionTableValid = true;
    } catch (error) {
      response.betterAuthIntegration.status = 'FAIL';
      response.betterAuthIntegration.message = `Database schema validation failed: ${error}`;
      response.overallStatus = 'BROKEN';
    }

    // Test 2: Get Database Statistics
    try {
      const [userCount] = await db.select({ count: count() }).from(user);
      const [sessionCount] = await db.select({ count: count() }).from(session);
      const [accountCount] = await db.select({ count: count() }).from(account);
      const [adminCount] = await db.select({ count: count() }).from(user).where(eq(user.role, 'admin'));

      response.databaseStats = {
        totalUsers: userCount.count,
        totalSessions: sessionCount.count,
        totalAccounts: accountCount.count,
        adminUsers: adminCount.count
      };
    } catch (error) {
      console.error('Database stats error:', error);
      response.overallStatus = 'ISSUES';
    }

    // Test 3: Admin User Verification
    try {
      const adminUser = await db.select()
        .from(user)
        .where(eq(user.email, 'admin@example.com'))
        .limit(1);

      if (adminUser.length > 0) {
        response.adminUserVerification.exists = true;
        response.adminUserVerification.email = adminUser[0].email;
        response.adminUserVerification.hasAdminRole = adminUser[0].role === 'admin';
        
        if (response.adminUserVerification.hasAdminRole) {
          response.adminUserVerification.status = 'PASS';
          response.adminUserVerification.message = 'Admin user exists with correct role';
        } else {
          response.adminUserVerification.status = 'FAIL';
          response.adminUserVerification.message = `User exists but has role: ${adminUser[0].role}`;
          response.overallStatus = 'ISSUES';
        }
      } else {
        response.adminUserVerification.message = 'Admin user admin@example.com not found';
        response.overallStatus = 'ISSUES';
        response.nextSteps.push('Create admin user with admin@example.com and admin role');
      }
    } catch (error) {
      response.adminUserVerification.message = `Admin user verification failed: ${error}`;
      response.overallStatus = 'BROKEN';
    }

    // Test 4: Password Hashing Verification
    try {
      // Check if admin user has password hash in account table
      const adminAccount = await db.select()
        .from(account)
        .innerJoin(user, eq(account.userId, user.id))
        .where(eq(user.email, 'admin@example.com'))
        .limit(1);

      if (adminAccount.length > 0 && adminAccount[0].account.password) {
        response.passwordHashingVerification.hasPasswordHash = true;
        const passwordHash = adminAccount[0].account.password;
        
        // Check if it looks like Argon2id hash
        if (passwordHash.startsWith('$argon2id$')) {
          response.passwordHashingVerification.hashFormat = 'Argon2id';
          
          // Test password verification with known password
          try {
            const isValid = await verify(passwordHash, 'admin123');
            response.passwordHashingVerification.verificationTest = isValid;
            
            if (isValid) {
              response.passwordHashingVerification.status = 'PASS';
              response.passwordHashingVerification.message = 'Password hashing working correctly with Argon2id';
            } else {
              response.passwordHashingVerification.status = 'FAIL';
              response.passwordHashingVerification.message = 'Password hash exists but verification failed';
              response.overallStatus = 'ISSUES';
            }
          } catch (verifyError) {
            response.passwordHashingVerification.status = 'FAIL';
            response.passwordHashingVerification.message = `Password verification test failed: ${verifyError}`;
            response.overallStatus = 'ISSUES';
          }
        } else {
          response.passwordHashingVerification.hashFormat = 'Unknown/Incompatible';
          response.passwordHashingVerification.message = 'Password hash exists but not in Argon2id format';
          response.overallStatus = 'ISSUES';
        }
      } else {
        response.passwordHashingVerification.message = 'No password hash found for admin user';
        response.overallStatus = 'ISSUES';
        response.nextSteps.push('Set password hash for admin user using Argon2id');
      }
    } catch (error) {
      response.passwordHashingVerification.message = `Password hashing verification failed: ${error}`;
      response.overallStatus = 'BROKEN';
    }

    // Test 5: Route Protection Verification
    if (response.betterAuthIntegration.schemaCompliance) {
      response.routeProtectionVerification.status = 'PASS';
      response.routeProtectionVerification.message = 'Authentication tables exist, route protection can be implemented';
    } else {
      response.routeProtectionVerification.message = 'Authentication tables missing, route protection not possible';
      response.overallStatus = 'BROKEN';
    }

    // Generate Next Steps and Recommendations
    if (response.databaseStats.totalUsers === 0) {
      response.nextSteps.push('Create initial admin user account');
    }

    if (response.databaseStats.adminUsers === 0) {
      response.nextSteps.push('Assign admin role to at least one user');
    }

    if (!response.passwordHashingVerification.verificationTest) {
      response.nextSteps.push('Implement proper password hashing with Argon2id');
    }

    if (response.databaseStats.totalSessions === 0) {
      response.recommendations.push('Test authentication by creating a session');
    }

    response.recommendations.push('Implement proper session management and cleanup');
    response.recommendations.push('Add rate limiting to authentication endpoints');
    response.recommendations.push('Implement proper CSRF protection');
    response.recommendations.push('Set up email verification for new users');

    if (response.nextSteps.length === 0 && response.adminUserVerification.status === 'PASS' && response.passwordHashingVerification.status === 'PASS') {
      response.overallStatus = 'WORKING';
      response.nextSteps.push('Authentication system is fully configured and working');
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Auth status API error:', error);
    return NextResponse.json({
      overallStatus: 'BROKEN',
      error: 'Failed to analyze authentication system',
      details: error instanceof Error ? error.message : 'Unknown error',
      nextSteps: [
        'Check database connection',
        'Verify schema migration status',
        'Review better-auth configuration'
      ]
    }, { status: 500 });
  }
}