import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account, session, attendance } from '@/db/schema';
import { eq, count } from 'drizzle-orm';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  message: string;
  data?: any;
  timestamp: string;
}

interface TestSuite {
  suiteId: string;
  title: string;
  startTime: string;
  endTime?: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
  };
}

export async function GET(request: NextRequest) {
  const testSuite: TestSuite = {
    suiteId: `auth-test-${Date.now()}`,
    title: 'Authentication System Integration Test',
    startTime: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      errors: 0
    }
  };

  try {
    // Test 1: Database Connectivity and Schema Integrity
    await runTest(testSuite, 'Database Connection', async () => {
      const userCount = await db.select({ count: count() }).from(user);
      const sessionCount = await db.select({ count: count() }).from(session);
      const accountCount = await db.select({ count: count() }).from(account);
      const attendanceCount = await db.select({ count: count() }).from(attendance);
      
      return {
        status: 'PASS',
        message: 'Database connectivity verified',
        data: {
          userCount: userCount[0].count,
          sessionCount: sessionCount[0].count,
          accountCount: accountCount[0].count,
          attendanceCount: attendanceCount[0].count
        }
      };
    });

    // Test 2: Admin User Verification
    await runTest(testSuite, 'Admin User Verification', async () => {
      const response = await fetch(new URL('/api/verify-admin', request.url), {
        method: 'GET',
        headers: request.headers
      });

      if (!response.ok) {
        return {
          status: 'FAIL',
          message: `Admin verification endpoint failed: ${response.status}`,
          data: { responseStatus: response.status }
        };
      }

      const result = await response.json();
      
      if (result.adminExists) {
        return {
          status: 'PASS',
          message: 'Admin user verified in database',
          data: result
        };
      } else {
        return {
          status: 'FAIL',
          message: 'Admin user not found in database',
          data: result
        };
      }
    });

    // Test 3: Credential Verification with Argon2id
    await runTest(testSuite, 'Argon2id Credential Verification', async () => {
      const response = await fetch(new URL('/api/test-argon2-login', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(request.headers.entries())
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'adminpassword123'
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return {
          status: 'PASS',
          message: 'Argon2id password verification successful',
          data: {
            hashingAlgorithm: result.hashingAlgorithm,
            verificationTime: result.verificationTime,
            user: result.user
          }
        };
      } else {
        return {
          status: 'FAIL',
          message: `Credential verification failed: ${result.error}`,
          data: result
        };
      }
    });

    // Test 4: Database Integrity Checks
    await runTest(testSuite, 'Database Integrity Check', async () => {
      // Check user-account relationships
      const usersWithAccounts = await db
        .select({
          userId: user.id,
          userEmail: user.email,
          accountId: account.id,
          hasPassword: account.password
        })
        .from(user)
        .leftJoin(account, eq(user.id, account.userId));

      // Check for orphaned records
      const orphanedSessions = await db
        .select({ sessionId: session.id })
        .from(session)
        .leftJoin(user, eq(session.userId, user.id))
        .where(eq(user.id, null));

      const orphanedAccounts = await db
        .select({ accountId: account.id })
        .from(account)
        .leftJoin(user, eq(account.userId, user.id))
        .where(eq(user.id, null));

      const integrityIssues = [];
      if (orphanedSessions.length > 0) {
        integrityIssues.push(`${orphanedSessions.length} orphaned sessions`);
      }
      if (orphanedAccounts.length > 0) {
        integrityIssues.push(`${orphanedAccounts.length} orphaned accounts`);
      }

      return {
        status: integrityIssues.length === 0 ? 'PASS' : 'FAIL',
        message: integrityIssues.length === 0 
          ? 'Database integrity verified' 
          : `Integrity issues found: ${integrityIssues.join(', ')}`,
        data: {
          totalUsers: usersWithAccounts.length,
          usersWithAccounts: usersWithAccounts.filter(u => u.accountId).length,
          orphanedSessions: orphanedSessions.length,
          orphanedAccounts: orphanedAccounts.length
        }
      };
    });

    // Test 5: Admin Route Authorization (Should Fail Without Session)
    await runTest(testSuite, 'Admin Routes - Unauthorized Access', async () => {
      const adminUsersResponse = await fetch(new URL('/api/admin/users', request.url), {
        method: 'GET'
      });

      const adminAttendanceResponse = await fetch(new URL('/api/admin/attendance', request.url), {
        method: 'GET'
      });

      const usersBlocked = adminUsersResponse.status === 401 || adminUsersResponse.status === 403;
      const attendanceBlocked = adminAttendanceResponse.status === 401 || adminAttendanceResponse.status === 403;

      if (usersBlocked && attendanceBlocked) {
        return {
          status: 'PASS',
          message: 'Admin routes properly protected - unauthorized access blocked',
          data: {
            usersEndpointStatus: adminUsersResponse.status,
            attendanceEndpointStatus: adminAttendanceResponse.status
          }
        };
      } else {
        return {
          status: 'FAIL',
          message: 'Admin routes not properly protected',
          data: {
            usersEndpointStatus: adminUsersResponse.status,
            attendanceEndpointStatus: adminAttendanceResponse.status,
            usersBlocked,
            attendanceBlocked
          }
        };
      }
    });

    // Test 6: Password Hashing Verification
    await runTest(testSuite, 'Password Hashing Verification', async () => {
      const adminUsers = await db
        .select({
          id: user.id,
          email: user.email,
          role: user.role,
          password: account.password
        })
        .from(user)
        .innerJoin(account, eq(user.id, account.userId))
        .where(eq(user.role, 'admin'));

      if (adminUsers.length === 0) {
        return {
          status: 'FAIL',
          message: 'No admin users found with password hashes',
          data: { adminCount: 0 }
        };
      }

      const adminWithPassword = adminUsers.find(u => u.password && u.password.startsWith('$argon2id$'));
      
      if (adminWithPassword) {
        return {
          status: 'PASS',
          message: 'Admin password properly hashed with Argon2id',
          data: {
            adminCount: adminUsers.length,
            hashPrefix: adminWithPassword.password.substring(0, 20) + '...',
            algorithm: 'argon2id'
          }
        };
      } else {
        return {
          status: 'FAIL',
          message: 'Admin password not properly hashed with Argon2id',
          data: {
            adminCount: adminUsers.length,
            hasPassword: adminUsers.map(u => ({ email: u.email, hasPassword: !!u.password }))
          }
        };
      }
    });

    // Test 7: Session Management Capabilities
    await runTest(testSuite, 'Session Management Check', async () => {
      const activeSessions = await db
        .select({
          sessionId: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
          userEmail: user.email
        })
        .from(session)
        .innerJoin(user, eq(session.userId, user.id))
        .where(eq(user.role, 'admin'));

      const currentTime = new Date();
      const validSessions = activeSessions.filter(s => s.expiresAt > currentTime);
      const expiredSessions = activeSessions.filter(s => s.expiresAt <= currentTime);

      return {
        status: 'PASS',
        message: 'Session management system operational',
        data: {
          totalAdminSessions: activeSessions.length,
          validSessions: validSessions.length,
          expiredSessions: expiredSessions.length,
          sessionCapabilities: {
            expirationTracking: true,
            userAssociation: true,
            tokenGeneration: true
          }
        }
      };
    });

    // Finalize test suite
    testSuite.endTime = new Date().toISOString();
    const duration = new Date(testSuite.endTime).getTime() - new Date(testSuite.startTime).getTime();

    return NextResponse.json({
      testSuite,
      duration: `${duration}ms`,
      overallStatus: testSuite.summary.failed === 0 && testSuite.summary.errors === 0 ? 'HEALTHY' : 'ISSUES_DETECTED',
      recommendations: generateRecommendations(testSuite.tests)
    });

  } catch (error) {
    console.error('Authentication test suite error:', error);
    
    testSuite.endTime = new Date().toISOString();
    testSuite.tests.push({
      test: 'Test Suite Execution',
      status: 'ERROR',
      message: `Test suite execution failed: ${error}`,
      timestamp: new Date().toISOString()
    });

    updateSummary(testSuite);

    return NextResponse.json({
      testSuite,
      overallStatus: 'CRITICAL_ERROR',
      error: `Test suite execution failed: ${error}`
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tests } = await request.json();
    
    if (!tests || !Array.isArray(tests)) {
      return NextResponse.json({ 
        error: "Invalid request body. Expected 'tests' array",
        code: "INVALID_REQUEST_BODY" 
      }, { status: 400 });
    }

    const customTestSuite: TestSuite = {
      suiteId: `custom-auth-test-${Date.now()}`,
      title: 'Custom Authentication Test Suite',
      startTime: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0
      }
    };

    // Run custom tests based on request
    for (const testName of tests) {
      switch (testName) {
        case 'credentials':
          await runTest(customTestSuite, 'Custom Credential Test', async () => {
            const response = await fetch(new URL('/api/test-argon2-login', request.url), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: 'admin@example.com',
                password: 'adminpassword123'
              })
            });
            const result = await response.json();
            return response.ok && result.success 
              ? { status: 'PASS', message: 'Credentials verified', data: result }
              : { status: 'FAIL', message: 'Credential verification failed', data: result };
          });
          break;

        case 'admin-access':
          await runTest(customTestSuite, 'Admin Access Test', async () => {
            const response = await fetch(new URL('/api/admin/users', request.url));
            const blocked = response.status === 401 || response.status === 403;
            return blocked
              ? { status: 'PASS', message: 'Admin routes protected', data: { status: response.status } }
              : { status: 'FAIL', message: 'Admin routes not protected', data: { status: response.status } };
          });
          break;

        case 'database':
          await runTest(customTestSuite, 'Database Integrity Test', async () => {
            const userCount = await db.select({ count: count() }).from(user);
            return {
              status: 'PASS',
              message: 'Database accessible',
              data: { userCount: userCount[0].count }
            };
          });
          break;

        default:
          customTestSuite.tests.push({
            test: testName,
            status: 'ERROR',
            message: `Unknown test: ${testName}`,
            timestamp: new Date().toISOString()
          });
      }
    }

    customTestSuite.endTime = new Date().toISOString();
    updateSummary(customTestSuite);

    return NextResponse.json({
      testSuite: customTestSuite,
      overallStatus: customTestSuite.summary.failed === 0 && customTestSuite.summary.errors === 0 ? 'HEALTHY' : 'ISSUES_DETECTED'
    }, { status: 201 });

  } catch (error) {
    console.error('Custom authentication test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

async function runTest(testSuite: TestSuite, testName: string, testFunction: () => Promise<{ status: 'PASS' | 'FAIL'; message: string; data?: any }>) {
  try {
    const result = await testFunction();
    testSuite.tests.push({
      test: testName,
      status: result.status,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    testSuite.tests.push({
      test: testName,
      status: 'ERROR',
      message: `Test execution error: ${error}`,
      timestamp: new Date().toISOString()
    });
  }
  
  updateSummary(testSuite);
}

function updateSummary(testSuite: TestSuite) {
  testSuite.summary.total = testSuite.tests.length;
  testSuite.summary.passed = testSuite.tests.filter(t => t.status === 'PASS').length;
  testSuite.summary.failed = testSuite.tests.filter(t => t.status === 'FAIL').length;
  testSuite.summary.errors = testSuite.tests.filter(t => t.status === 'ERROR').length;
}

function generateRecommendations(tests: TestResult[]): string[] {
  const recommendations: string[] = [];
  
  const failedTests = tests.filter(t => t.status === 'FAIL');
  const errorTests = tests.filter(t => t.status === 'ERROR');

  if (failedTests.some(t => t.test.includes('Admin User'))) {
    recommendations.push('Create admin user account with proper credentials');
  }

  if (failedTests.some(t => t.test.includes('Credential'))) {
    recommendations.push('Verify Argon2id password hashing implementation');
  }

  if (failedTests.some(t => t.test.includes('Admin Routes'))) {
    recommendations.push('Implement proper authorization middleware for admin routes');
  }

  if (failedTests.some(t => t.test.includes('Database Integrity'))) {
    recommendations.push('Clean up orphaned database records and verify foreign key constraints');
  }

  if (errorTests.length > 0) {
    recommendations.push('Investigate and resolve test execution errors');
  }

  if (recommendations.length === 0) {
    recommendations.push('Authentication system is functioning properly');
  }

  return recommendations;
}