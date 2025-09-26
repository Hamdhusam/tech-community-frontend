import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ 
        error: "Email and password are required",
        code: "MISSING_CREDENTIALS" 
      }, { status: 400 });
    }

    const testResults = {
      signIn: { success: false, error: null, data: null },
      sessionCreation: { success: false, error: null, token: null },
      sessionValidation: { success: false, error: null, session: null },
      adminRoleCheck: { success: false, error: null, isAdmin: false },
      adminRouteAccess: { success: false, error: null, accessGranted: false },
      overall: { success: false, completedSteps: 0, totalSteps: 5 }
    };

    // Step 1: Test sign-in using better-auth
    try {
      const signInResult = await auth.api.signIn.email({
        body: {
          email,
          password,
        },
      });

      if (signInResult.error) {
        testResults.signIn.error = signInResult.error.message;
        return NextResponse.json({
          message: "Authentication test failed at sign-in step",
          results: testResults
        }, { status: 200 });
      }

      testResults.signIn.success = true;
      testResults.signIn.data = {
        userId: signInResult.data?.user?.id,
        userEmail: signInResult.data?.user?.email,
        userRole: signInResult.data?.user?.role,
        sessionToken: signInResult.data?.session?.token
      };
      testResults.overall.completedSteps++;

      const sessionToken = signInResult.data?.session?.token;
      if (!sessionToken) {
        testResults.sessionCreation.error = "No session token received from sign-in";
        return NextResponse.json({
          message: "Authentication test failed - no session token created",
          results: testResults
        }, { status: 200 });
      }

      testResults.sessionCreation.success = true;
      testResults.sessionCreation.token = sessionToken;
      testResults.overall.completedSteps++;

    } catch (error) {
      testResults.signIn.error = error instanceof Error ? error.message : "Unknown sign-in error";
      return NextResponse.json({
        message: "Authentication test failed during sign-in",
        results: testResults
      }, { status: 200 });
    }

    // Step 2: Test session validation using the token
    try {
      const sessionResult = await auth.api.getSession({
        headers: {
          authorization: `Bearer ${testResults.sessionCreation.token}`,
        },
      });

      if (sessionResult.error) {
        testResults.sessionValidation.error = sessionResult.error.message;
        return NextResponse.json({
          message: "Authentication test failed at session validation step",
          results: testResults
        }, { status: 200 });
      }

      if (!sessionResult.data?.session || !sessionResult.data?.user) {
        testResults.sessionValidation.error = "Session validation returned no session/user data";
        return NextResponse.json({
          message: "Authentication test failed - session validation returned no data",
          results: testResults
        }, { status: 200 });
      }

      testResults.sessionValidation.success = true;
      testResults.sessionValidation.session = {
        sessionId: sessionResult.data.session.id,
        userId: sessionResult.data.session.userId,
        expiresAt: sessionResult.data.session.expiresAt,
        user: {
          id: sessionResult.data.user.id,
          email: sessionResult.data.user.email,
          role: sessionResult.data.user.role,
          name: sessionResult.data.user.name
        }
      };
      testResults.overall.completedSteps++;

      // Step 3: Test admin role verification
      const userRole = sessionResult.data.user.role;
      if (userRole === 'admin') {
        testResults.adminRoleCheck.success = true;
        testResults.adminRoleCheck.isAdmin = true;
        testResults.overall.completedSteps++;

        // Step 4: Simulate admin route access logic
        try {
          // Simulate the logic that would be used in admin route protection
          const adminAccessCheck = {
            hasValidSession: !!sessionResult.data.session,
            hasAdminRole: userRole === 'admin',
            sessionNotExpired: new Date(sessionResult.data.session.expiresAt) > new Date(),
            userExists: !!sessionResult.data.user
          };

          const accessGranted = Object.values(adminAccessCheck).every(check => check === true);

          if (accessGranted) {
            testResults.adminRouteAccess.success = true;
            testResults.adminRouteAccess.accessGranted = true;
            testResults.overall.completedSteps++;
            testResults.overall.success = true;
          } else {
            testResults.adminRouteAccess.error = `Admin access denied: ${JSON.stringify(adminAccessCheck)}`;
          }

        } catch (error) {
          testResults.adminRouteAccess.error = error instanceof Error ? error.message : "Unknown admin access error";
        }

      } else {
        testResults.adminRoleCheck.error = `User role is '${userRole}', expected 'admin'`;
        testResults.adminRouteAccess.error = "Access denied - user does not have admin role";
      }

    } catch (error) {
      testResults.sessionValidation.error = error instanceof Error ? error.message : "Unknown session validation error";
      return NextResponse.json({
        message: "Authentication test failed during session validation",
        results: testResults
      }, { status: 200 });
    }

    // Return comprehensive test results
    const message = testResults.overall.success 
      ? "Complete better-auth admin session flow test passed successfully"
      : `Authentication test completed with ${testResults.overall.completedSteps}/${testResults.overall.totalSteps} steps successful`;

    return NextResponse.json({
      message,
      results: testResults,
      summary: {
        totalSteps: testResults.overall.totalSteps,
        completedSteps: testResults.overall.completedSteps,
        overallSuccess: testResults.overall.success,
        failedAt: testResults.overall.success ? null : getFailedStep(testResults)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Admin auth test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during authentication test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getFailedStep(results: any): string {
  if (!results.signIn.success) return "Sign-in";
  if (!results.sessionCreation.success) return "Session Creation";
  if (!results.sessionValidation.success) return "Session Validation";
  if (!results.adminRoleCheck.success) return "Admin Role Check";
  if (!results.adminRouteAccess.success) return "Admin Route Access";
  return "Unknown";
}