import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Better-Auth Integration Test Endpoint',
    instructions: {
      description: 'This endpoint tests better-auth integration directly using the auth object',
      methods: {
        GET: 'Returns these instructions',
        POST: 'Runs comprehensive authentication tests'
      },
      testFlow: [
        '1. Sign in with admin@example.com / admin123',
        '2. Extract and validate session information',
        '3. Verify user role is admin',
        '4. Test admin route authorization logic',
        '5. Return detailed test results'
      ],
      usage: 'Send a POST request to run the tests'
    }
  });
}

export async function POST(request: NextRequest) {
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: {
      signIn: { success: false, error: null, data: null },
      sessionValidation: { success: false, error: null, data: null },
      roleVerification: { success: false, error: null, role: null },
      adminAuthorization: { success: false, error: null, authorized: false }
    },
    summary: {
      totalTests: 4,
      passed: 0,
      failed: 0,
      errors: []
    }
  };

  try {
    // Test 1: Sign in with admin credentials
    console.log('Starting authentication test flow...');
    
    try {
      const signInResponse = await auth.api.signIn.email({
        body: {
          email: 'admin@example.com',
          password: 'admin123'
        }
      });

      testResults.tests.signIn.success = true;
      testResults.tests.signIn.data = {
        hasSession: !!signInResponse.session,
        hasUser: !!signInResponse.user,
        sessionId: signInResponse.session?.id || null,
        userId: signInResponse.user?.id || null,
        userEmail: signInResponse.user?.email || null
      };
      testResults.summary.passed++;

      console.log('Sign-in successful:', {
        sessionId: signInResponse.session?.id,
        userId: signInResponse.user?.id,
        userEmail: signInResponse.user?.email
      });

      // Test 2: Validate session using auth.api.getSession
      if (signInResponse.session?.token) {
        try {
          const sessionResponse = await auth.api.getSession({
            headers: {
              authorization: `Bearer ${signInResponse.session.token}`
            }
          });

          testResults.tests.sessionValidation.success = true;
          testResults.tests.sessionValidation.data = {
            sessionFound: !!sessionResponse.session,
            userFound: !!sessionResponse.user,
            sessionId: sessionResponse.session?.id || null,
            userId: sessionResponse.user?.id || null,
            userRole: sessionResponse.user?.role || null,
            sessionExpiry: sessionResponse.session?.expiresAt || null
          };
          testResults.summary.passed++;

          console.log('Session validation successful:', {
            sessionId: sessionResponse.session?.id,
            userRole: sessionResponse.user?.role,
            expiresAt: sessionResponse.session?.expiresAt
          });

          // Test 3: Verify user role is admin
          try {
            const userRole = sessionResponse.user?.role;
            const isAdmin = userRole === 'admin';

            testResults.tests.roleVerification.success = true;
            testResults.tests.roleVerification.role = userRole;
            testResults.tests.roleVerification.data = {
              expectedRole: 'admin',
              actualRole: userRole,
              isAdmin: isAdmin,
              roleMatch: isAdmin
            };

            if (isAdmin) {
              testResults.summary.passed++;
              console.log('Role verification passed: User has admin role');
            } else {
              testResults.summary.failed++;
              testResults.summary.errors.push(`Expected admin role, got: ${userRole}`);
              console.log('Role verification failed: Expected admin, got:', userRole);
            }

            // Test 4: Test admin authorization logic
            try {
              const adminAuthTest = {
                hasValidSession: !!sessionResponse.session,
                isAuthenticated: !!sessionResponse.user,
                hasAdminRole: userRole === 'admin',
                sessionNotExpired: sessionResponse.session ? new Date(sessionResponse.session.expiresAt) > new Date() : false
              };

              const isAuthorized = adminAuthTest.hasValidSession && 
                                 adminAuthTest.isAuthenticated && 
                                 adminAuthTest.hasAdminRole && 
                                 adminAuthTest.sessionNotExpired;

              testResults.tests.adminAuthorization.success = true;
              testResults.tests.adminAuthorization.authorized = isAuthorized;
              testResults.tests.adminAuthorization.data = {
                authChecks: adminAuthTest,
                overallAuthorization: isAuthorized,
                authorizationReason: isAuthorized ? 'All checks passed' : 'One or more authorization checks failed'
              };

              if (isAuthorized) {
                testResults.summary.passed++;
                console.log('Admin authorization test passed: User is fully authorized');
              } else {
                testResults.summary.failed++;
                testResults.summary.errors.push('Admin authorization failed - see authChecks for details');
                console.log('Admin authorization test failed:', adminAuthTest);
              }

            } catch (authError) {
              testResults.tests.adminAuthorization.error = authError.message;
              testResults.summary.failed++;
              testResults.summary.errors.push(`Admin authorization test error: ${authError.message}`);
              console.error('Admin authorization test error:', authError);
            }

          } catch (roleError) {
            testResults.tests.roleVerification.error = roleError.message;
            testResults.summary.failed++;
            testResults.summary.errors.push(`Role verification error: ${roleError.message}`);
            console.error('Role verification error:', roleError);
          }

        } catch (sessionError) {
          testResults.tests.sessionValidation.error = sessionError.message;
          testResults.summary.failed++;
          testResults.summary.errors.push(`Session validation error: ${sessionError.message}`);
          console.error('Session validation error:', sessionError);
        }
      } else {
        testResults.tests.sessionValidation.error = 'No session token available from sign-in';
        testResults.summary.failed++;
        testResults.summary.errors.push('Sign-in did not return a session token');
      }

    } catch (signInError) {
      testResults.tests.signIn.error = signInError.message;
      testResults.summary.failed++;
      testResults.summary.errors.push(`Sign-in error: ${signInError.message}`);
      console.error('Sign-in error:', signInError);
    }

    // Calculate final summary
    testResults.summary.failed = testResults.summary.totalTests - testResults.summary.passed;

    // Add debugging information
    const debugInfo = {
      authObjectAvailable: !!auth,
      authApiAvailable: !!auth?.api,
      signInMethodAvailable: !!auth?.api?.signIn?.email,
      getSessionMethodAvailable: !!auth?.api?.getSession,
      testEnvironment: process.env.NODE_ENV || 'unknown'
    };

    console.log('Test completed. Results summary:', {
      passed: testResults.summary.passed,
      failed: testResults.summary.failed,
      totalErrors: testResults.summary.errors.length
    });

    return NextResponse.json({
      status: 'completed',
      results: testResults,
      debug: debugInfo,
      recommendations: testResults.summary.failed > 0 ? [
        'Check if admin@example.com user exists in database with admin role',
        'Verify password is correct (admin123)',
        'Ensure better-auth configuration is properly set up',
        'Check database connection and schema',
        'Verify auth object is properly exported from @/lib/auth'
      ] : [
        'All tests passed! Better-auth integration is working correctly'
      ]
    }, { status: 200 });

  } catch (error) {
    console.error('Test execution error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: 'Failed to execute authentication tests',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      results: testResults,
      debug: {
        authObjectAvailable: !!auth,
        errorType: error.constructor.name,
        errorMessage: error.message
      }
    }, { status: 500 });
  }
}