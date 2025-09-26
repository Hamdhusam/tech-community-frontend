import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

interface TestResult {
  name: string;
  success: boolean;
  data?: any;
  error?: string;
  details?: string;
}

interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

export async function POST(request: NextRequest) {
  const results: TestResult[] = [];
  let sessionToken: string | undefined;
  let sessionCookie: string | undefined;

  try {
    // Test 1: Sign in with email
    console.log('Starting authentication flow test...');
    
    try {
      const signInResult = await auth.api.signInEmail({
        body: {
          email: 'admin@example.com',
          password: 'admin123'
        }
      });

      if (signInResult && signInResult.user) {
        results.push({
          name: 'Email Sign-In',
          success: true,
          data: {
            userId: signInResult.user.id,
            email: signInResult.user.email,
            role: signInResult.user.role,
            hasSession: !!signInResult.session
          },
          details: 'Successfully signed in with email and password'
        });

        // Extract session information
        if (signInResult.session) {
          sessionToken = signInResult.session.token;
          sessionCookie = `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`;
        }
      } else {
        results.push({
          name: 'Email Sign-In',
          success: false,
          error: 'Sign-in returned empty result',
          details: 'Expected user and session data but received empty response'
        });
      }
    } catch (signInError) {
      results.push({
        name: 'Email Sign-In',
        success: false,
        error: `Sign-in failed: ${signInError}`,
        details: 'Could not authenticate with provided credentials'
      });
    }

    // Test 2: Get session information
    if (sessionToken) {
      try {
        const sessionResult = await auth.api.getSession({
          headers: {
            authorization: `Bearer ${sessionToken}`,
            cookie: sessionCookie || ''
          }
        });

        if (sessionResult && sessionResult.user) {
          results.push({
            name: 'Session Validation',
            success: true,
            data: {
              sessionId: sessionResult.session?.id,
              userId: sessionResult.user.id,
              email: sessionResult.user.email,
              role: sessionResult.user.role,
              expiresAt: sessionResult.session?.expiresAt
            },
            details: 'Successfully retrieved and validated session'
          });
        } else {
          results.push({
            name: 'Session Validation',
            success: false,
            error: 'Session validation returned empty result',
            details: 'Expected session and user data but received empty response'
          });
        }
      } catch (sessionError) {
        results.push({
          name: 'Session Validation',
          success: false,
          error: `Session validation failed: ${sessionError}`,
          details: 'Could not retrieve session information with provided token'
        });
      }

      // Test 3: Verify admin role
      try {
        const roleCheckResult = await auth.api.getSession({
          headers: {
            authorization: `Bearer ${sessionToken}`,
            cookie: sessionCookie || ''
          }
        });

        if (roleCheckResult && roleCheckResult.user) {
          const isAdmin = roleCheckResult.user.role === 'admin';
          
          results.push({
            name: 'Admin Role Verification',
            success: isAdmin,
            data: {
              userRole: roleCheckResult.user.role,
              isAdmin: isAdmin,
              expectedRole: 'admin'
            },
            details: isAdmin 
              ? 'User has admin role as expected'
              : `User role is '${roleCheckResult.user.role}', expected 'admin'`
          });
        } else {
          results.push({
            name: 'Admin Role Verification',
            success: false,
            error: 'Could not retrieve user role information',
            details: 'Session validation did not return user data'
          });
        }
      } catch (roleError) {
        results.push({
          name: 'Admin Role Verification',
          success: false,
          error: `Role verification failed: ${roleError}`,
          details: 'Could not check user role'
        });
      }

      // Test 4: Simulate admin authorization logic
      try {
        const authLogicResult = await auth.api.getSession({
          headers: {
            authorization: `Bearer ${sessionToken}`,
            cookie: sessionCookie || ''
          }
        });

        if (authLogicResult && authLogicResult.user) {
          const user = authLogicResult.user;
          const hasValidSession = !!authLogicResult.session;
          const isAdmin = user.role === 'admin';
          const isAuthorized = hasValidSession && isAdmin;

          results.push({
            name: 'Admin Authorization Logic',
            success: isAuthorized,
            data: {
              hasValidSession,
              userRole: user.role,
              isAdmin,
              isAuthorized,
              authorizationSteps: {
                step1_sessionValid: hasValidSession,
                step2_roleCheck: isAdmin,
                step3_finalAuthorization: isAuthorized
              }
            },
            details: isAuthorized 
              ? 'Admin authorization logic passed all checks'
              : 'Admin authorization logic failed - user not authorized for admin routes'
          });
        } else {
          results.push({
            name: 'Admin Authorization Logic',
            success: false,
            error: 'Authorization logic test failed',
            details: 'Could not retrieve session for authorization testing'
          });
        }
      } catch (authError) {
        results.push({
          name: 'Admin Authorization Logic',
          success: false,
          error: `Authorization logic test failed: ${authError}`,
          details: 'Error occurred during authorization logic simulation'
        });
      }

      // Test 5: Test admin route - /api/admin/users
      try {
        const baseUrl = request.url.replace('/api/test-auth', '');
        const usersResponse = await fetch(`${baseUrl}/api/admin/users`, {
          method: 'GET',
          headers: {
            'Cookie': sessionCookie || '',
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json'
          }
        });

        const usersData = await usersResponse.text();
        let parsedUsersData;
        
        try {
          parsedUsersData = JSON.parse(usersData);
        } catch {
          parsedUsersData = { rawResponse: usersData };
        }

        results.push({
          name: 'Admin Users Route Access',
          success: usersResponse.ok,
          data: {
            statusCode: usersResponse.status,
            statusText: usersResponse.statusText,
            headers: Object.fromEntries(usersResponse.headers.entries()),
            response: parsedUsersData
          },
          details: usersResponse.ok 
            ? 'Successfully accessed admin users route'
            : `Admin users route returned ${usersResponse.status}: ${usersResponse.statusText}`
        });
      } catch (usersError) {
        results.push({
          name: 'Admin Users Route Access',
          success: false,
          error: `Admin users route test failed: ${usersError}`,
          details: 'Could not make request to admin users endpoint'
        });
      }

      // Test 6: Test admin route - /api/admin/attendance
      try {
        const baseUrl = request.url.replace('/api/test-auth', '');
        const attendanceResponse = await fetch(`${baseUrl}/api/admin/attendance`, {
          method: 'GET',
          headers: {
            'Cookie': sessionCookie || '',
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json'
          }
        });

        const attendanceData = await attendanceResponse.text();
        let parsedAttendanceData;
        
        try {
          parsedAttendanceData = JSON.parse(attendanceData);
        } catch {
          parsedAttendanceData = { rawResponse: attendanceData };
        }

        results.push({
          name: 'Admin Attendance Route Access',
          success: attendanceResponse.ok,
          data: {
            statusCode: attendanceResponse.status,
            statusText: attendanceResponse.statusText,
            headers: Object.fromEntries(attendanceResponse.headers.entries()),
            response: parsedAttendanceData
          },
          details: attendanceResponse.ok 
            ? 'Successfully accessed admin attendance route'
            : `Admin attendance route returned ${attendanceResponse.status}: ${attendanceResponse.statusText}`
        });
      } catch (attendanceError) {
        results.push({
          name: 'Admin Attendance Route Access',
          success: false,
          error: `Admin attendance route test failed: ${attendanceError}`,
          details: 'Could not make request to admin attendance endpoint'
        });
      }
    } else {
      // Add failed tests for missing session
      const missingSessionTests = [
        'Session Validation',
        'Admin Role Verification', 
        'Admin Authorization Logic',
        'Admin Users Route Access',
        'Admin Attendance Route Access'
      ];

      missingSessionTests.forEach(testName => {
        results.push({
          name: testName,
          success: false,
          error: 'No session token available',
          details: 'Cannot perform test without valid session from sign-in'
        });
      });
    }

    // Calculate summary
    const summary: TestSummary = {
      totalTests: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };

    console.log('Authentication flow test completed:', summary);

    return NextResponse.json({
      message: 'Better-Auth session test completed',
      timestamp: new Date().toISOString(),
      testCredentials: {
        email: 'admin@example.com',
        password: 'admin123',
        expectedRole: 'admin'
      },
      sessionInfo: {
        tokenGenerated: !!sessionToken,
        cookieCreated: !!sessionCookie,
        tokenLength: sessionToken?.length || 0
      },
      summary,
      detailedResults: results,
      debugInfo: {
        requestUrl: request.url,
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Authentication test error:', error);
    
    return NextResponse.json({
      error: 'Authentication test failed',
      message: `Unexpected error during authentication flow test: ${error}`,
      timestamp: new Date().toISOString(),
      partialResults: results.length > 0 ? results : undefined,
      debugInfo: {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}