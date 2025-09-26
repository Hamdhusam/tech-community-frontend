import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL';
  message: string;
  data?: any;
  error?: string;
  recommendation?: string;
}

interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
  overallStatus: 'PASS' | 'FAIL';
}

export async function GET(request: NextRequest) {
  try {
    const instructions = {
      description: "Better-Auth Sign-In Test Route for Archana's Admin Credentials",
      endpoints: {
        GET: {
          url: "/api/test-auth",
          description: "Returns these test instructions and available endpoints"
        },
        POST: {
          url: "/api/test-auth",
          description: "Executes complete sign-in flow test with Archana's credentials",
          testSteps: [
            "1. Sign-in with better-auth using email/password",
            "2. Extract session token and user data from response",
            "3. Validate session using auth.api.getSession",
            "4. Verify user role is 'admin'",
            "5. Test session persistence with second getSession call",
            "6. Simulate admin route authorization logic",
            "7. Return comprehensive test results with recommendations"
          ]
        }
      },
      testCredentials: {
        email: "archanaarchu200604@gmail.com",
        password: "archanaarchu2006",
        expectedRole: "admin"
      },
      usage: "Send POST request to execute the complete authentication test flow"
    };

    return NextResponse.json(instructions, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const results: TestResult[] = [];
  let sessionToken: string | null = null;
  let userData: any = null;

  try {
    // Test Step 1: Sign-in with better-auth
    console.log('Starting authentication test flow...');
    
    try {
      const signInResponse = await auth.api.signInEmail({
        body: {
          email: 'archanaarchu200604@gmail.com',
          password: 'archanaarchu2006'
        }
      });

      if (signInResponse && signInResponse.user) {
        sessionToken = signInResponse.session?.token || null;
        userData = signInResponse.user || null;
        
        results.push({
          step: "1. Sign-In with better-auth",
          status: 'PASS',
          message: "Successfully signed in with email/password",
          data: {
            hasSession: !!signInResponse.session,
            hasUser: !!signInResponse.user,
            userId: userData?.id,
            userEmail: userData?.email,
            sessionToken: sessionToken ? `${sessionToken.substring(0, 20)}...` : null
          }
        });
      } else {
        results.push({
          step: "1. Sign-In with better-auth",
          status: 'FAIL',
          message: "Sign-in failed - no data returned",
          error: "Invalid response structure",
          recommendation: "Check if user exists in database and password is correct"
        });
      }
    } catch (signInError: any) {
      results.push({
        step: "1. Sign-In with better-auth",
        status: 'FAIL',
        message: "Sign-in request failed",
        error: signInError.message || String(signInError),
        recommendation: "Verify user credentials exist in database and better-auth configuration is correct"
      });
    }

    // Test Step 2: Extract session token and user data
    if (sessionToken && userData) {
      results.push({
        step: "2. Extract Session Token & User Data",
        status: 'PASS',
        message: "Successfully extracted session token and user data",
        data: {
          sessionTokenLength: sessionToken.length,
          userFields: Object.keys(userData),
          userId: userData.id,
          userEmail: userData.email,
          userRole: userData.role
        }
      });
    } else {
      results.push({
        step: "2. Extract Session Token & User Data",
        status: 'FAIL',
        message: "Failed to extract session token or user data",
        error: `Missing: ${!sessionToken ? 'session token' : ''} ${!userData ? 'user data' : ''}`,
        recommendation: "Check better-auth session configuration and database session table"
      });
    }

    // Test Step 3: Validate session using auth.api.getSession
    if (sessionToken) {
      try {
        const sessionValidation = await auth.api.getSession({
          headers: {
            authorization: `Bearer ${sessionToken}`,
            cookie: `better-auth.session_token=${sessionToken}`
          }
        });

        if (sessionValidation && sessionValidation.data) {
          results.push({
            step: "3. Validate Session with getSession",
            status: 'PASS',
            message: "Session validation successful",
            data: {
              sessionValid: true,
              sessionId: sessionValidation.data.session?.id,
              userId: sessionValidation.data.user?.id,
              expiresAt: sessionValidation.data.session?.expiresAt
            }
          });
        } else {
          results.push({
            step: "3. Validate Session with getSession",
            status: 'FAIL',
            message: "Session validation returned no data",
            error: "Invalid session response",
            recommendation: "Check session token format and better-auth session middleware"
          });
        }
      } catch (sessionError: any) {
        results.push({
          step: "3. Validate Session with getSession",
          status: 'FAIL',
          message: "Session validation failed",
          error: sessionError.message || String(sessionError),
          recommendation: "Verify session token is valid and not expired"
        });
      }
    } else {
      results.push({
        step: "3. Validate Session with getSession",
        status: 'FAIL',
        message: "Cannot validate session - no token available",
        error: "Missing session token from sign-in step",
        recommendation: "Fix sign-in process to ensure session token is generated"
      });
    }

    // Test Step 4: Verify user role is 'admin'
    if (userData && userData.role) {
      if (userData.role === 'admin') {
        results.push({
          step: "4. Verify User Role is Admin",
          status: 'PASS',
          message: "User has admin role",
          data: {
            userRole: userData.role,
            isAdmin: true
          }
        });
      } else {
        results.push({
          step: "4. Verify User Role is Admin",
          status: 'FAIL',
          message: `User role is '${userData.role}', expected 'admin'`,
          error: "Incorrect user role",
          recommendation: "Update user role to 'admin' in database for this test account"
        });
      }
    } else {
      results.push({
        step: "4. Verify User Role is Admin",
        status: 'FAIL',
        message: "Cannot verify role - user data missing or no role field",
        error: "Missing user role information",
        recommendation: "Ensure user table has role column and user record exists"
      });
    }

    // Test Step 5: Test session persistence
    if (sessionToken) {
      try {
        const persistenceTest = await auth.api.getSession({
          headers: {
            authorization: `Bearer ${sessionToken}`,
            cookie: `better-auth.session_token=${sessionToken}`
          }
        });

        if (persistenceTest && persistenceTest.data) {
          results.push({
            step: "5. Test Session Persistence",
            status: 'PASS',
            message: "Session persists across multiple calls",
            data: {
              secondCallSuccessful: true,
              sameSessionId: persistenceTest.data.session?.id,
              sameUserId: persistenceTest.data.user?.id
            }
          });
        } else {
          results.push({
            step: "5. Test Session Persistence",
            status: 'FAIL',
            message: "Session does not persist on second call",
            error: "Session lost between calls",
            recommendation: "Check session storage and expiration settings"
          });
        }
      } catch (persistenceError: any) {
        results.push({
          step: "5. Test Session Persistence",
          status: 'FAIL',
          message: "Session persistence test failed",
          error: persistenceError.message || String(persistenceError),
          recommendation: "Verify session token remains valid and storage is working"
        });
      }
    } else {
      results.push({
        step: "5. Test Session Persistence",
        status: 'FAIL',
        message: "Cannot test persistence - no session token",
        error: "Missing session token",
        recommendation: "Fix authentication flow to generate valid session"
      });
    }

    // Test Step 6: Simulate admin route authorization
    const hasValidSession = sessionToken !== null;
    const isAdminRole = userData && userData.role === 'admin';
    const adminAuthorized = hasValidSession && isAdminRole;

    if (adminAuthorized) {
      results.push({
        step: "6. Admin Authorization Simulation",
        status: 'PASS',
        message: "Admin route authorization would succeed",
        data: {
          hasValidSession,
          isAdminRole,
          adminAuthorized,
          authorizationLogic: "hasValidSession && user.role === 'admin'"
        }
      });
    } else {
      results.push({
        step: "6. Admin Authorization Simulation",
        status: 'FAIL',
        message: "Admin route authorization would fail",
        error: `Missing requirements: ${!hasValidSession ? 'valid session' : ''} ${!isAdminRole ? 'admin role' : ''}`,
        data: {
          hasValidSession,
          isAdminRole,
          adminAuthorized
        },
        recommendation: hasValidSession 
          ? "Update user role to 'admin' in database"
          : "Fix authentication flow to establish valid session"
      });
    }

    // Test Step 7: Generate comprehensive summary
    const summary: TestSummary = {
      totalTests: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      results,
      overallStatus: results.every(r => r.status === 'PASS') ? 'PASS' : 'FAIL'
    };

    results.push({
      step: "7. Test Summary Generation",
      status: 'PASS',
      message: "Test summary generated successfully",
      data: {
        overallStatus: summary.overallStatus,
        successRate: `${summary.passed}/${summary.totalTests}`,
        readyForProduction: summary.overallStatus === 'PASS'
      }
    });

    return NextResponse.json({
      testName: "Better-Auth Sign-In Flow Test",
      testSubject: "Archana's Admin Credentials",
      timestamp: new Date().toISOString(),
      summary,
      detailedResults: results,
      recommendations: results
        .filter(r => r.recommendation)
        .map(r => ({ step: r.step, recommendation: r.recommendation }))
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    
    results.push({
      step: "Error Handler",
      status: 'FAIL',
      message: "Unexpected error during test execution",
      error: error instanceof Error ? error.message : String(error),
      recommendation: "Check better-auth configuration and database connectivity"
    });

    return NextResponse.json({ 
      error: 'Internal server error during authentication test',
      details: String(error),
      partialResults: results
    }, { status: 500 });
  }
}