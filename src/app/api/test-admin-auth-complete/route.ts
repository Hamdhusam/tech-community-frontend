import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  data?: any;
  error?: string;
}

interface TestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: TestResult[];
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    const testInstructions = {
      title: "Admin Authentication Test API",
      description: "Complete test suite for admin authentication workflow",
      testCredentials: {
        email: "admin@example.com",
        password: "admin123"
      },
      availableEndpoints: {
        GET: "/api/admin-test - Show these instructions",
        POST: "/api/admin-test - Run complete authentication test suite"
      },
      testWorkflow: [
        "1. Verify test credentials exist in database",
        "2. Test credential validation via /api/test-argon2-login",
        "3. Test better-auth sign-in functionality",
        "4. Verify session creation and management",
        "5. Test admin role authorization",
        "6. Verify access to protected admin routes"
      ],
      protectedRoutes: [
        "/api/admin/users",
        "/api/admin/attendance"
      ],
      usage: {
        manual: "Use GET to view instructions, POST to run automated tests",
        programmatic: "Send POST request to execute full test suite and receive detailed results"
      }
    };

    return NextResponse.json(testInstructions, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to load test instructions: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const results: TestResult[] = [];
  const testCredentials = {
    email: "admin@example.com",
    password: "admin123"
  };

  try {
    // Step 1: Verify test admin user exists in database
    try {
      const adminUser = await db.select()
        .from(user)
        .where(eq(user.email, testCredentials.email))
        .limit(1);

      if (adminUser.length === 0) {
        results.push({
          step: "Database User Verification",
          status: "FAIL",
          message: "Admin test user not found in database",
          error: "User with email admin@example.com does not exist"
        });
      } else if (adminUser[0].role !== 'admin') {
        results.push({
          step: "Database User Verification",
          status: "FAIL",
          message: "User exists but does not have admin role",
          data: { role: adminUser[0].role, expected: 'admin' }
        });
      } else {
        results.push({
          step: "Database User Verification",
          status: "PASS",
          message: "Admin user found in database with correct role",
          data: { 
            id: adminUser[0].id, 
            email: adminUser[0].email, 
            role: adminUser[0].role 
          }
        });
      }
    } catch (error) {
      results.push({
        step: "Database User Verification",
        status: "FAIL",
        message: "Database query failed",
        error: String(error)
      });
    }

    // Step 2: Test credential validation via existing test endpoint
    try {
      const testResponse = await fetch(`${request.nextUrl.origin}/api/test-argon2-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCredentials)
      });

      const testData = await testResponse.json();

      if (testResponse.ok && testData.success) {
        results.push({
          step: "Credential Validation Test",
          status: "PASS",
          message: "Credentials validated successfully via test endpoint",
          data: { endpoint: "/api/test-argon2-login", response: testData }
        });
      } else {
        results.push({
          step: "Credential Validation Test",
          status: "FAIL",
          message: "Credential validation failed",
          error: testData.error || "Unknown error",
          data: { status: testResponse.status }
        });
      }
    } catch (error) {
      results.push({
        step: "Credential Validation Test",
        status: "FAIL",
        message: "Failed to call credential validation endpoint",
        error: String(error)
      });
    }

    // Step 3: Test better-auth sign-in API
    try {
      const signInResponse = await fetch(`${request.nextUrl.origin}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCredentials)
      });

      const signInData = await signInResponse.json();

      if (signInResponse.ok) {
        results.push({
          step: "Better-Auth Sign-In Test",
          status: "PASS",
          message: "Better-auth sign-in successful",
          data: { 
            endpoint: "/api/auth/sign-in/email",
            status: signInResponse.status,
            hasSession: !!signInData.session
          }
        });
      } else {
        results.push({
          step: "Better-Auth Sign-In Test",
          status: "FAIL",
          message: "Better-auth sign-in failed",
          error: signInData.error || "Sign-in request failed",
          data: { status: signInResponse.status }
        });
      }
    } catch (error) {
      results.push({
        step: "Better-Auth Sign-In Test",
        status: "FAIL",
        message: "Failed to call better-auth sign-in endpoint",
        error: String(error)
      });
    }

    // Step 4: Test session verification
    try {
      const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const sessionData = await sessionResponse.json();

      if (sessionResponse.ok && sessionData.session) {
        results.push({
          step: "Session Verification Test",
          status: "PASS",
          message: "Active session found",
          data: {
            endpoint: "/api/auth/session",
            userId: sessionData.session.userId,
            hasUser: !!sessionData.user
          }
        });
      } else {
        results.push({
          step: "Session Verification Test",
          status: "FAIL",
          message: "No active session found",
          data: { status: sessionResponse.status, response: sessionData }
        });
      }
    } catch (error) {
      results.push({
        step: "Session Verification Test",
        status: "FAIL",
        message: "Failed to verify session",
        error: String(error)
      });
    }

    // Step 5: Test admin route access - Users endpoint
    try {
      const adminUsersResponse = await fetch(`${request.nextUrl.origin}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const adminUsersData = await adminUsersResponse.json();

      if (adminUsersResponse.ok) {
        results.push({
          step: "Admin Users Route Test",
          status: "PASS",
          message: "Successfully accessed admin users endpoint",
          data: {
            endpoint: "/api/admin/users",
            status: adminUsersResponse.status,
            userCount: Array.isArray(adminUsersData) ? adminUsersData.length : 'N/A'
          }
        });
      } else if (adminUsersResponse.status === 401) {
        results.push({
          step: "Admin Users Route Test",
          status: "FAIL",
          message: "Authentication required - no valid session",
          error: "Unauthorized access to admin endpoint",
          data: { status: 401 }
        });
      } else if (adminUsersResponse.status === 403) {
        results.push({
          step: "Admin Users Route Test",
          status: "FAIL",
          message: "Access denied - insufficient permissions",
          error: "User does not have admin role",
          data: { status: 403 }
        });
      } else {
        results.push({
          step: "Admin Users Route Test",
          status: "FAIL",
          message: "Admin users endpoint access failed",
          error: adminUsersData.error || "Unknown error",
          data: { status: adminUsersResponse.status }
        });
      }
    } catch (error) {
      results.push({
        step: "Admin Users Route Test",
        status: "FAIL",
        message: "Failed to call admin users endpoint",
        error: String(error)
      });
    }

    // Step 6: Test admin route access - Attendance endpoint
    try {
      const adminAttendanceResponse = await fetch(`${request.nextUrl.origin}/api/admin/attendance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const adminAttendanceData = await adminAttendanceResponse.json();

      if (adminAttendanceResponse.ok) {
        results.push({
          step: "Admin Attendance Route Test",
          status: "PASS",
          message: "Successfully accessed admin attendance endpoint",
          data: {
            endpoint: "/api/admin/attendance",
            status: adminAttendanceResponse.status,
            recordCount: Array.isArray(adminAttendanceData) ? adminAttendanceData.length : 'N/A'
          }
        });
      } else if (adminAttendanceResponse.status === 401) {
        results.push({
          step: "Admin Attendance Route Test",
          status: "FAIL",
          message: "Authentication required - no valid session",
          error: "Unauthorized access to admin endpoint",
          data: { status: 401 }
        });
      } else if (adminAttendanceResponse.status === 403) {
        results.push({
          step: "Admin Attendance Route Test",
          status: "FAIL",
          message: "Access denied - insufficient permissions",
          error: "User does not have admin role",
          data: { status: 403 }
        });
      } else {
        results.push({
          step: "Admin Attendance Route Test",
          status: "FAIL",
          message: "Admin attendance endpoint access failed",
          error: adminAttendanceData.error || "Unknown error",
          data: { status: adminAttendanceResponse.status }
        });
      }
    } catch (error) {
      results.push({
        step: "Admin Attendance Route Test",
        status: "FAIL",
        message: "Failed to call admin attendance endpoint",
        error: String(error)
      });
    }

    // Generate test summary
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      skipped: results.filter(r => r.status === 'SKIP').length
    };

    const testReport: TestReport = {
      summary,
      results,
      timestamp: new Date().toISOString()
    };

    // Add troubleshooting information for failed tests
    if (summary.failed > 0) {
      testReport.troubleshooting = {
        commonIssues: [
          "Ensure admin user is seeded in database with correct password hash",
          "Verify better-auth configuration is properly set up",
          "Check that session management is working correctly",
          "Confirm admin role-based authorization is implemented",
          "Validate that protected routes have proper authentication middleware"
        ],
        nextSteps: [
          "Check database for admin@example.com user with 'admin' role",
          "Verify password hash matches 'admin123' using Argon2",
          "Test manual sign-in through the application UI",
          "Review better-auth session configuration",
          "Check server logs for authentication errors"
        ]
      };
    }

    const statusCode = summary.failed === 0 ? 200 : 207; // 207 Multi-Status for partial success
    return NextResponse.json(testReport, { status: statusCode });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Test execution failed: ' + error,
      results: results.length > 0 ? results : undefined
    }, { status: 500 });
  }
}