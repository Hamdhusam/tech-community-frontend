import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Complete Admin Authentication Flow Test",
    description: "This endpoint tests the complete admin authentication workflow with better-auth email provider",
    usage: {
      method: "POST",
      endpoint: "/api/test-complete-admin-flow",
      testAccount: {
        email: "archanaarchu200604@gmail.com",
        password: "archanaarchu2006"
      }
    },
    testSteps: [
      "1. Test better-auth signIn.email with admin credentials",
      "2. Extract and validate session information",
      "3. Verify user role is admin", 
      "4. Test admin authorization logic",
      "5. Test all admin routes access",
      "6. Validate session persistence"
    ],
    instructions: "Send a POST request to this endpoint to run the complete authentication and route access test"
  });
}

export async function POST(request: NextRequest) {
  const testResults: TestResult[] = [];
  const testEmail = "archanaarchu200604@gmail.com";
  const testPassword = "archanaarchu2006";

  let finalSuccess = true;
  let sessionData: any = null;
  let sessionToken: string | null = null;

  const addResult = (step: string, success: boolean, data?: any, error?: string) => {
    testResults.push({
      step,
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    });
    if (!success) finalSuccess = false;
  };

  try {
    // Step 1: Test better-auth signIn.email
    try {
      console.log('Step 1: Testing better-auth signIn.email...');
      
      const signInResult = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword
        }
      });

      if (signInResult && signInResult.user) {
        sessionData = signInResult;
        sessionToken = signInResult.session?.token || null;
        
        addResult("Better-auth signIn.email", true, {
          userId: signInResult.user.id,
          email: signInResult.user.email,
          role: signInResult.user.role,
          hasSession: !!signInResult.session,
          sessionId: signInResult.session?.id,
          sessionToken: sessionToken ? 'Present' : 'Missing'
        });
      } else {
        addResult("Better-auth signIn.email", false, null, "Sign-in returned empty result or no user");
      }
    } catch (signInError: any) {
      addResult("Better-auth signIn.email", false, null, `Sign-in failed: ${signInError.message}`);
    }

    // Step 2: Extract and validate session information
    if (sessionToken) {
      try {
        console.log('Step 2: Validating session information...');
        
        const sessionResult = await auth.api.getSession({
          headers: {
            authorization: `Bearer ${sessionToken}`
          }
        });

        if (sessionResult && sessionResult.user && sessionResult.session) {
          addResult("Session validation", true, {
            sessionId: sessionResult.session.id,
            userId: sessionResult.user.id,
            email: sessionResult.user.email,
            role: sessionResult.user.role,
            expiresAt: sessionResult.session.expiresAt,
            sessionValid: new Date(sessionResult.session.expiresAt) > new Date()
          });
        } else {
          addResult("Session validation", false, null, "Session validation returned incomplete data");
        }
      } catch (sessionError: any) {
        addResult("Session validation", false, null, `Session validation failed: ${sessionError.message}`);
      }
    } else {
      addResult("Session validation", false, null, "No session token available from sign-in");
    }

    // Step 3: Verify user role is admin
    if (sessionData && sessionData.user) {
      try {
        console.log('Step 3: Verifying admin role...');
        
        const userRole = sessionData.user.role;
        const isAdmin = userRole === 'admin';
        
        addResult("Admin role verification", isAdmin, {
          userRole: userRole,
          isAdmin: isAdmin,
          expectedRole: 'admin',
          userId: sessionData.user.id,
          email: sessionData.user.email
        }, !isAdmin ? `User role is '${userRole}', expected 'admin'` : undefined);
      } catch (roleError: any) {
        addResult("Admin role verification", false, null, `Role verification failed: ${roleError.message}`);
      }
    } else {
      addResult("Admin role verification", false, null, "No session data available for role verification");
    }

    // Step 4: Test admin authorization logic
    if (sessionData && sessionData.user && sessionData.session) {
      try {
        console.log('Step 4: Testing admin authorization logic...');
        
        const authChecks = {
          hasValidSession: !!sessionData.session,
          hasValidUser: !!sessionData.user,
          userHasAdminRole: sessionData.user.role === 'admin',
          sessionNotExpired: new Date(sessionData.session.expiresAt) > new Date(),
          userEmailVerified: sessionData.user.emailVerified !== false
        };

        const isAuthorized = Object.values(authChecks).every(check => check === true);

        addResult("Admin authorization logic", isAuthorized, {
          authorizationChecks: authChecks,
          overallAuthorization: isAuthorized,
          failedChecks: Object.entries(authChecks).filter(([key, value]) => !value).map(([key]) => key)
        }, !isAuthorized ? "One or more authorization checks failed" : undefined);
      } catch (authError: any) {
        addResult("Admin authorization logic", false, null, `Authorization logic test failed: ${authError.message}`);
      }
    } else {
      addResult("Admin authorization logic", false, null, "Insufficient session data for authorization testing");
    }

    // Step 5: Test all admin routes access
    const adminRoutes = [
      { path: '/api/admin/users', method: 'GET', description: 'Get all users' },
      { path: '/api/admin/attendance', method: 'GET', description: 'Get attendance records' },
      { path: '/api/admin-setup-summary', method: 'GET', description: 'Get admin setup summary' },
      { path: '/api/admin-auth-summary', method: 'GET', description: 'Get auth system summary' }
    ];

    if (sessionToken) {
      console.log('Step 5: Testing all admin routes access...');
      
      const routeResults = [];
      const baseUrl = request.nextUrl.origin;

      for (const route of adminRoutes) {
        try {
          const routeResponse = await fetch(`${baseUrl}${route.path}`, {
            method: route.method,
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
              'Cookie': `better-auth.session_token=${sessionToken}`,
              'Content-Type': 'application/json'
            }
          });

          const responseData = await routeResponse.text();
          let parsedData;
          
          try {
            parsedData = JSON.parse(responseData);
          } catch {
            parsedData = { rawResponse: responseData };
          }

          routeResults.push({
            route: route.path,
            method: route.method,
            description: route.description,
            status: routeResponse.status,
            success: routeResponse.ok,
            response: parsedData,
            accessible: routeResponse.ok
          });

        } catch (routeError) {
          routeResults.push({
            route: route.path,
            method: route.method,
            description: route.description,
            status: 500,
            success: false,
            error: `Route test failed: ${routeError}`,
            accessible: false
          });
        }
      }

      const successfulRoutes = routeResults.filter(r => r.success);
      const failedRoutes = routeResults.filter(r => !r.success);

      addResult("Test all admin routes access", successfulRoutes.length === adminRoutes.length, {
        totalRoutes: adminRoutes.length,
        successfulRoutes: successfulRoutes.length,
        failedRoutes: failedRoutes.length,
        routeResults: routeResults,
        accessibleRoutes: successfulRoutes.map(r => `${r.method} ${r.route}`),
        inaccessibleRoutes: failedRoutes.map(r => `${r.method} ${r.route} (${r.status})`)
      }, failedRoutes.length > 0 ? `${failedRoutes.length} route(s) failed access test` : undefined);

    } else {
      addResult("Test all admin routes access", false, null, "No session token available for route testing");
    }

    // Step 6: Validate session persistence
    if (sessionToken) {
      try {
        console.log('Step 6: Validating session persistence...');
        
        const persistenceResult = await auth.api.getSession({
          headers: {
            authorization: `Bearer ${sessionToken}`
          }
        });

        if (persistenceResult && persistenceResult.session) {
          const sessionStillValid = new Date(persistenceResult.session.expiresAt) > new Date();
          
          addResult("Session persistence validation", sessionStillValid, {
            sessionId: persistenceResult.session.id,
            expiresAt: persistenceResult.session.expiresAt,
            currentTime: new Date().toISOString(),
            isValid: sessionStillValid,
            timeRemaining: sessionStillValid ? 
              Math.round((new Date(persistenceResult.session.expiresAt).getTime() - Date.now()) / (1000 * 60)) + ' minutes' : 
              'Expired'
          }, !sessionStillValid ? "Session has expired" : undefined);
        } else {
          addResult("Session persistence validation", false, null, "Session no longer exists or is invalid");
        }
      } catch (persistenceError: any) {
        addResult("Session persistence validation", false, null, `Session persistence test failed: ${persistenceError.message}`);
      }
    } else {
      addResult("Session persistence validation", false, null, "No session token available for persistence testing");
    }

    // Generate final summary
    const summary = {
      totalSteps: testResults.length,
      passedSteps: testResults.filter(r => r.success).length,
      failedSteps: testResults.filter(r => !r.success).length,
      overallSuccess: finalSuccess,
      successRate: `${Math.round((testResults.filter(r => r.success).length / testResults.length) * 100)}%`
    };

    return NextResponse.json({
      message: "Complete admin authentication flow test completed",
      testCredentials: {
        email: testEmail,
        password: testPassword,
        expectedRole: 'admin'
      },
      summary,
      results: testResults,
      sessionInfo: {
        sessionCreated: !!sessionToken,
        sessionToken: sessionToken ? `${sessionToken.substring(0, 20)}...` : null,
        userData: sessionData?.user ? {
          id: sessionData.user.id,
          email: sessionData.user.email,
          role: sessionData.user.role,
          emailVerified: sessionData.user.emailVerified
        } : null
      },
      recommendations: finalSuccess ? [
        "✅ All authentication tests passed",
        "✅ Better-auth email provider is working correctly", 
        "✅ Admin role authorization is functional",
        "✅ All admin routes are accessible with proper authentication",
        "✅ Session management is working properly"
      ] : [
        "❌ Some authentication tests failed - check results for details",
        "🔍 Verify admin account configuration in database",
        "🔍 Check better-auth configuration and setup",
        "🔍 Ensure admin routes have proper authentication middleware"
      ]
    }, { status: finalSuccess ? 200 : 207 });

  } catch (error: any) {
    console.error('Complete admin flow test error:', error);
    
    return NextResponse.json({
      error: 'Complete admin authentication flow test failed',
      message: `Unexpected error during test execution: ${error.message}`,
      timestamp: new Date().toISOString(),
      partialResults: testResults.length > 0 ? testResults : undefined,
      debugInfo: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        stackTrace: error.stack
      }
    }, { status: 500 });
  }
}