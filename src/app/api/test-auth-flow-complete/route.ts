import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const testResults = {
    testSuite: 'Complete Authentication Flow Test',
    startTime: new Date().toISOString(),
    tests: [] as any[],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [] as string[]
    }
  };

  let sessionToken: string | null = null;
  let sessionData: any = null;

  try {
    // Test 1: Sign in using better-auth signIn.email API
    const test1 = {
      name: 'Sign In with Email',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };

    try {
      const signInResponse = await fetch(`${request.nextUrl.origin}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123'
        })
      });

      const signInData = await signInResponse.text();
      
      test1.details = {
        status: signInResponse.status,
        statusText: signInResponse.statusText,
        headers: Object.fromEntries(signInResponse.headers.entries()),
        response: signInData
      };

      if (signInResponse.ok) {
        // Extract session token from Set-Cookie header
        const cookies = signInResponse.headers.get('set-cookie');
        if (cookies) {
          const sessionMatch = cookies.match(/better-auth\.session_token=([^;]+)/);
          if (sessionMatch) {
            sessionToken = sessionMatch[1];
            test1.status = 'passed';
            test1.details.sessionToken = sessionToken;
            testResults.summary.passed++;
          } else {
            test1.status = 'failed';
            test1.details.error = 'No session token found in cookies';
            testResults.summary.failed++;
          }
        } else {
          test1.status = 'failed';
          test1.details.error = 'No cookies set in response';
          testResults.summary.failed++;
        }
      } else {
        test1.status = 'failed';
        test1.details.error = `Sign in failed with status: ${signInResponse.status}`;
        testResults.summary.failed++;
      }
    } catch (error) {
      test1.status = 'failed';
      test1.details.error = `Sign in request failed: ${error}`;
      testResults.summary.failed++;
      testResults.summary.errors.push(`Test 1 error: ${error}`);
    }

    test1.endTime = new Date().toISOString();
    testResults.tests.push(test1);
    testResults.summary.total++;

    // Test 2: Verify session creation and extract session data
    const test2 = {
      name: 'Session Creation and Data Extraction',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };

    if (sessionToken) {
      try {
        const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/get-session`, {
          method: 'GET',
          headers: {
            'Cookie': `better-auth.session_token=${sessionToken}`
          }
        });

        const sessionResponseData = await sessionResponse.text();
        
        test2.details = {
          status: sessionResponse.status,
          statusText: sessionResponse.statusText,
          response: sessionResponseData
        };

        if (sessionResponse.ok) {
          try {
            sessionData = JSON.parse(sessionResponseData);
            test2.status = 'passed';
            test2.details.sessionData = sessionData;
            testResults.summary.passed++;
          } catch (parseError) {
            test2.status = 'failed';
            test2.details.error = `Failed to parse session response: ${parseError}`;
            testResults.summary.failed++;
          }
        } else {
          test2.status = 'failed';
          test2.details.error = `Session request failed with status: ${sessionResponse.status}`;
          testResults.summary.failed++;
        }
      } catch (error) {
        test2.status = 'failed';
        test2.details.error = `Session request failed: ${error}`;
        testResults.summary.failed++;
        testResults.summary.errors.push(`Test 2 error: ${error}`);
      }
    } else {
      test2.status = 'skipped';
      test2.details.error = 'No session token available from previous test';
      testResults.summary.failed++;
    }

    test2.endTime = new Date().toISOString();
    testResults.tests.push(test2);
    testResults.summary.total++;

    // Test 3: Verify user role is 'admin'
    const test3 = {
      name: 'Admin Role Verification',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };

    if (sessionData && sessionData.user) {
      test3.details.userRole = sessionData.user.role;
      test3.details.userData = sessionData.user;
      
      if (sessionData.user.role === 'admin') {
        test3.status = 'passed';
        test3.details.message = 'User role is correctly set to admin';
        testResults.summary.passed++;
      } else {
        test3.status = 'failed';
        test3.details.error = `Expected role 'admin', but got '${sessionData.user.role}'`;
        testResults.summary.failed++;
      }
    } else {
      test3.status = 'failed';
      test3.details.error = 'No session data or user data available';
      testResults.summary.failed++;
    }

    test3.endTime = new Date().toISOString();
    testResults.tests.push(test3);
    testResults.summary.total++;

    // Test 4: Test session validation using getSession API (already done in Test 2, but verify again)
    const test4 = {
      name: 'Session Validation Test',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };

    if (sessionToken) {
      try {
        const validationResponse = await fetch(`${request.nextUrl.origin}/api/auth/get-session`, {
          method: 'GET',
          headers: {
            'Cookie': `better-auth.session_token=${sessionToken}`
          }
        });

        const validationData = await validationResponse.text();
        
        test4.details = {
          status: validationResponse.status,
          response: validationData,
          isValid: validationResponse.ok
        };

        if (validationResponse.ok) {
          const parsedData = JSON.parse(validationData);
          if (parsedData.session && parsedData.user) {
            test4.status = 'passed';
            test4.details.message = 'Session validation successful';
            test4.details.sessionId = parsedData.session.id;
            test4.details.userId = parsedData.user.id;
            testResults.summary.passed++;
          } else {
            test4.status = 'failed';
            test4.details.error = 'Session validation response missing session or user data';
            testResults.summary.failed++;
          }
        } else {
          test4.status = 'failed';
          test4.details.error = `Session validation failed with status: ${validationResponse.status}`;
          testResults.summary.failed++;
        }
      } catch (error) {
        test4.status = 'failed';
        test4.details.error = `Session validation request failed: ${error}`;
        testResults.summary.failed++;
        testResults.summary.errors.push(`Test 4 error: ${error}`);
      }
    } else {
      test4.status = 'skipped';
      test4.details.error = 'No session token available';
      testResults.summary.failed++;
    }

    test4.endTime = new Date().toISOString();
    testResults.tests.push(test4);
    testResults.summary.total++;

    // Test 5: Test admin route access - /api/admin/users
    const test5 = {
      name: 'Admin Users Route Access Test',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };

    if (sessionToken) {
      try {
        const adminUsersResponse = await fetch(`${request.nextUrl.origin}/api/admin/users`, {
          method: 'GET',
          headers: {
            'Cookie': `better-auth.session_token=${sessionToken}`
          }
        });

        const adminUsersData = await adminUsersResponse.text();
        
        test5.details = {
          status: adminUsersResponse.status,
          statusText: adminUsersResponse.statusText,
          response: adminUsersData
        };

        if (adminUsersResponse.ok) {
          try {
            const parsedUsersData = JSON.parse(adminUsersData);
            test5.status = 'passed';
            test5.details.message = 'Admin users route access successful';
            test5.details.usersData = parsedUsersData;
            test5.details.userCount = Array.isArray(parsedUsersData) ? parsedUsersData.length : 'N/A';
            testResults.summary.passed++;
          } catch (parseError) {
            test5.status = 'passed';
            test5.details.message = 'Admin users route accessible (non-JSON response)';
            testResults.summary.passed++;
          }
        } else {
          test5.status = 'failed';
          test5.details.error = `Admin users route failed with status: ${adminUsersResponse.status}`;
          testResults.summary.failed++;
        }
      } catch (error) {
        test5.status = 'failed';
        test5.details.error = `Admin users route request failed: ${error}`;
        testResults.summary.failed++;
        testResults.summary.errors.push(`Test 5 error: ${error}`);
      }
    } else {
      test5.status = 'skipped';
      test5.details.error = 'No session token available';
      testResults.summary.failed++;
    }

    test5.endTime = new Date().toISOString();
    testResults.tests.push(test5);
    testResults.summary.total++;

    // Test 6: Test admin route access - /api/admin/attendance
    const test6 = {
      name: 'Admin Attendance Route Access Test',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };

    if (sessionToken) {
      try {
        const adminAttendanceResponse = await fetch(`${request.nextUrl.origin}/api/admin/attendance`, {
          method: 'GET',
          headers: {
            'Cookie': `better-auth.session_token=${sessionToken}`
          }
        });

        const adminAttendanceData = await adminAttendanceResponse.text();
        
        test6.details = {
          status: adminAttendanceResponse.status,
          statusText: adminAttendanceResponse.statusText,
          response: adminAttendanceData
        };

        if (adminAttendanceResponse.ok) {
          try {
            const parsedAttendanceData = JSON.parse(adminAttendanceData);
            test6.status = 'passed';
            test6.details.message = 'Admin attendance route access successful';
            test6.details.attendanceData = parsedAttendanceData;
            test6.details.recordCount = Array.isArray(parsedAttendanceData) ? parsedAttendanceData.length : 'N/A';
            testResults.summary.passed++;
          } catch (parseError) {
            test6.status = 'passed';
            test6.details.message = 'Admin attendance route accessible (non-JSON response)';
            testResults.summary.passed++;
          }
        } else {
          test6.status = 'failed';
          test6.details.error = `Admin attendance route failed with status: ${adminAttendanceResponse.status}`;
          testResults.summary.failed++;
        }
      } catch (error) {
        test6.status = 'failed';
        test6.details.error = `Admin attendance route request failed: ${error}`;
        testResults.summary.failed++;
        testResults.summary.errors.push(`Test 6 error: ${error}`);
      }
    } else {
      test6.status = 'skipped';
      test6.details.error = 'No session token available';
      testResults.summary.failed++;
    }

    test6.endTime = new Date().toISOString();
    testResults.tests.push(test6);
    testResults.summary.total++;

    // Test 7: Test role-based authorization logic
    const test7 = {
      name: 'Role-Based Authorization Logic Test',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };

    if (sessionToken && sessionData) {
      // Test with invalid role by attempting to access admin routes without admin role
      // We'll simulate this by testing what we learned from previous tests
      test7.details.roleFromSession = sessionData.user?.role;
      test7.details.adminRouteAccess = {
        usersRoute: testResults.tests[4]?.status === 'passed',
        attendanceRoute: testResults.tests[5]?.status === 'passed'
      };
      
      const isAdmin = sessionData.user?.role === 'admin';
      const hasAdminAccess = test7.details.adminRouteAccess.usersRoute && test7.details.adminRouteAccess.attendanceRoute;
      
      if (isAdmin && hasAdminAccess) {
        test7.status = 'passed';
        test7.details.message = 'Role-based authorization working correctly - admin role grants admin access';
        testResults.summary.passed++;
      } else if (!isAdmin && !hasAdminAccess) {
        test7.status = 'passed';
        test7.details.message = 'Role-based authorization working correctly - non-admin role denied admin access';
        testResults.summary.passed++;
      } else {
        test7.status = 'failed';
        test7.details.error = `Role-based authorization inconsistent - role: ${sessionData.user?.role}, admin access: ${hasAdminAccess}`;
        testResults.summary.failed++;
      }
    } else {
      test7.status = 'failed';
      test7.details.error = 'No session token or session data available for authorization test';
      testResults.summary.failed++;
    }

    test7.endTime = new Date().toISOString();
    testResults.tests.push(test7);
    testResults.summary.total++;

  } catch (error) {
    testResults.summary.errors.push(`Overall test suite error: ${error}`);
    console.error('Authentication flow test error:', error);
  }

  // Calculate final summary
  testResults.endTime = new Date().toISOString();
  testResults.summary.successRate = testResults.summary.total > 0 
    ? (testResults.summary.passed / testResults.summary.total * 100).toFixed(2) + '%'
    : '0%';
  testResults.summary.overallStatus = testResults.summary.failed === 0 ? 'PASSED' : 'FAILED';

  // Add debugging information
  testResults.debugging = {
    sessionToken: sessionToken ? 'Present' : 'Not found',
    sessionData: sessionData ? 'Available' : 'Not available',
    userRole: sessionData?.user?.role || 'Unknown',
    environment: {
      baseUrl: request.nextUrl.origin,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    }
  };

  return NextResponse.json(testResults, { status: 200 });
}