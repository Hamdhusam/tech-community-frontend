import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, session, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const testResults = {
    directLogin: false,
    sessionCreation: false,
    userVerification: false,
    passwordVerification: false,
    adminRoleCheck: false,
    sessionValidation: false,
    databaseConnection: false,
    overallSuccess: false,
    details: {} as any,
    errors: [] as string[]
  };

  try {
    // Step 1: Database Connection Test
    try {
      await db.select().from(user).limit(1);
      testResults.databaseConnection = true;
      testResults.details.databaseConnection = 'Connected successfully';
    } catch (error) {
      testResults.errors.push(`Database connection failed: ${error}`);
      testResults.details.databaseConnection = `Failed: ${error}`;
    }

    // Step 2: User Verification in Database
    try {
      const adminUser = await db.select()
        .from(user)
        .where(eq(user.email, 'admin@example.com'))
        .limit(1);

      if (adminUser.length > 0) {
        testResults.userVerification = true;
        testResults.details.userFound = {
          id: adminUser[0].id,
          email: adminUser[0].email,
          role: adminUser[0].role,
          name: adminUser[0].name
        };

        // Step 3: Admin Role Check
        if (adminUser[0].role === 'admin') {
          testResults.adminRoleCheck = true;
          testResults.details.adminRole = 'Confirmed admin role';
        } else {
          testResults.errors.push(`User role is '${adminUser[0].role}', not 'admin'`);
          testResults.details.adminRole = `Role mismatch: ${adminUser[0].role}`;
        }
      } else {
        testResults.errors.push('Admin user not found in database');
        testResults.details.userFound = 'User not found';
      }
    } catch (error) {
      testResults.errors.push(`User verification failed: ${error}`);
      testResults.details.userVerification = `Failed: ${error}`;
    }

    // Step 4: Password Hash Verification
    try {
      const adminUser = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
      
      if (adminUser.length > 0) {
        const accountRecord = await db.select()
          .from(account)
          .where(eq(account.userId, adminUser[0].id))
          .limit(1);

        if (accountRecord.length > 0 && accountRecord[0].password) {
          const passwordMatch = await bcrypt.compare('admin123', accountRecord[0].password);
          if (passwordMatch) {
            testResults.passwordVerification = true;
            testResults.details.passwordVerification = 'Password hash verified successfully';
          } else {
            testResults.errors.push('Password does not match stored hash');
            testResults.details.passwordVerification = 'Password mismatch';
          }
        } else {
          testResults.errors.push('No password hash found in account table');
          testResults.details.passwordVerification = 'No password hash found';
        }
      }
    } catch (error) {
      testResults.errors.push(`Password verification failed: ${error}`);
      testResults.details.passwordVerification = `Failed: ${error}`;
    }

    // Step 5: Direct Login Test using better-auth with proper request format
    try {
      const requestBody = await request.json().catch(() => ({}));
      
      const mockRequest = new Request(request.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123'
        })
      });

      const loginResponse = await auth.api.signIn.email({
        body: requestBody.email && requestBody.password ? requestBody : {
          email: 'admin@example.com',
          password: 'admin123'
        },
        headers: mockRequest.headers
      });

      if (loginResponse && loginResponse.user) {
        testResults.directLogin = true;
        testResults.details.loginResponse = {
          userId: loginResponse.user.id,
          email: loginResponse.user.email,
          role: loginResponse.user.role,
          sessionId: loginResponse.session?.id,
          hasToken: !!loginResponse.session?.token
        };

        // Step 6: Session Creation and Validation
        if (loginResponse.session) {
          testResults.sessionCreation = true;
          testResults.details.sessionCreation = {
            sessionId: loginResponse.session.id,
            hasToken: !!loginResponse.session.token,
            expiresAt: loginResponse.session.expiresAt,
            userId: loginResponse.session.userId
          };

          // Step 7: Session Validation Test
          try {
            const sessionRecord = await db.select()
              .from(session)
              .where(eq(session.id, loginResponse.session.id))
              .limit(1);

            if (sessionRecord.length > 0) {
              const sessionData = sessionRecord[0];
              const now = new Date();
              const expiresAt = new Date(sessionData.expiresAt);

              if (expiresAt > now) {
                testResults.sessionValidation = true;
                testResults.details.sessionValidation = {
                  sessionFound: true,
                  isValid: true,
                  expiresAt: sessionData.expiresAt,
                  userId: sessionData.userId
                };
              } else {
                testResults.errors.push('Session has expired');
                testResults.details.sessionValidation = 'Session expired';
              }
            } else {
              testResults.errors.push('Session not found in database');
              testResults.details.sessionValidation = 'Session not found';
            }
          } catch (error) {
            testResults.errors.push(`Session validation failed: ${error}`);
            testResults.details.sessionValidation = `Failed: ${error}`;
          }
        } else {
          testResults.errors.push('No session returned from login');
          testResults.details.sessionCreation = 'No session in login response';
        }
      } else {
        testResults.errors.push('Login failed - no user returned');
        testResults.details.loginResponse = 'Login failed - check credentials and better-auth config';
      }
    } catch (error) {
      testResults.errors.push(`Direct login test failed: ${error}`);
      testResults.details.directLogin = `Failed: ${error}`;
    }

    // Step 8: Overall Success Calculation
    const requiredTests = [
      testResults.databaseConnection,
      testResults.userVerification,
      testResults.adminRoleCheck,
      testResults.passwordVerification,
      testResults.directLogin,
      testResults.sessionCreation,
      testResults.sessionValidation
    ];

    const passedTests = requiredTests.filter(test => test === true).length;
    const totalTests = requiredTests.length;
    
    testResults.overallSuccess = passedTests === totalTests;
    testResults.details.testSummary = {
      passed: passedTests,
      total: totalTests,
      successRate: `${Math.round((passedTests / totalTests) * 100)}%`
    };

    // Additional debugging information
    testResults.details.debugInfo = {
      timestamp: new Date().toISOString(),
      requestMethod: request.method,
      testEnvironment: process.env.NODE_ENV,
      authConfigured: !!auth,
      databaseConfigured: !!db
    };

    return NextResponse.json({
      success: testResults.overallSuccess,
      message: testResults.overallSuccess 
        ? 'All authentication tests passed successfully' 
        : `${testResults.errors.length} test(s) failed`,
      results: testResults
    }, { 
      status: testResults.overallSuccess ? 200 : 400 
    });

  } catch (error) {
    console.error('Authentication test error:', error);
    testResults.errors.push(`Critical test failure: ${error}`);
    
    return NextResponse.json({
      success: false,
      message: 'Authentication test suite failed',
      results: testResults,
      criticalError: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Authentication Test Endpoint',
    description: 'Use POST method to run comprehensive authentication tests',
    availableTests: [
      'Database Connection Test',
      'User Verification in Database', 
      'Admin Role Check',
      'Password Hash Verification',
      'Direct Login Test with better-auth',
      'Session Creation and Validation',
      'Overall Authentication Flow Test'
    ],
    usage: 'POST /api/test-auth with no body required'
  });
}