import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const testResults = {
      signIn: null as any,
      session: null as any,
      adminTest: null as any,
      errors: [] as string[]
    };

    // Step 1: Test sign-in with better-auth
    console.log('Step 1: Testing sign-in...');
    try {
      const signInResult = await auth.api.signInEmail({
        body: {
          email: 'archanaarchu200604@gmail.com',
          password: 'archanaarchu2006'
        }
      });

      testResults.signIn = {
        success: true,
        data: signInResult,
        cookies: signInResult?.headers?.['Set-Cookie'] || null,
        sessionToken: signInResult?.token || null
      };

      console.log('Sign-in successful:', signInResult);
    } catch (signInError: any) {
      const errorMsg = `Sign-in failed: ${signInError.message || signInError}`;
      testResults.errors.push(errorMsg);
      testResults.signIn = {
        success: false,
        error: errorMsg,
        details: signInError
      };
      console.error('Sign-in error:', signInError);
    }

    // Step 2: Test session validation
    console.log('Step 2: Testing session validation...');
    if (testResults.signIn?.success) {
      try {
        // Create a mock request with the session cookie/token
        const mockHeaders = new Headers();
        if (testResults.signIn.cookies) {
          mockHeaders.set('Cookie', Array.isArray(testResults.signIn.cookies) 
            ? testResults.signIn.cookies.join('; ') 
            : testResults.signIn.cookies);
        }

        const sessionResult = await auth.api.getSession({
          headers: mockHeaders
        });

        testResults.session = {
          success: true,
          data: sessionResult,
          user: sessionResult?.user || null,
          session: sessionResult?.session || null
        };

        console.log('Session validation successful:', sessionResult);
      } catch (sessionError: any) {
        const errorMsg = `Session validation failed: ${sessionError.message || sessionError}`;
        testResults.errors.push(errorMsg);
        testResults.session = {
          success: false,
          error: errorMsg,
          details: sessionError
        };
        console.error('Session error:', sessionError);
      }
    } else {
      testResults.session = {
        success: false,
        error: 'Skipped due to sign-in failure'
      };
    }

    // Step 3: Test admin route access with authentication
    console.log('Step 3: Testing admin route access...');
    if (testResults.session?.success) {
      try {
        // Get the base URL for the request
        const baseUrl = new URL(request.url).origin;
        
        // Prepare headers with session information
        const adminRequestHeaders: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        // Add session cookie if available
        if (testResults.signIn.cookies) {
          adminRequestHeaders['Cookie'] = Array.isArray(testResults.signIn.cookies) 
            ? testResults.signIn.cookies.join('; ') 
            : testResults.signIn.cookies;
        }

        // Test multiple admin endpoints
        const adminTests = [];

        // Test 1: Admin user list endpoint (if exists)
        try {
          const userListResponse = await fetch(`${baseUrl}/api/admin/users`, {
            method: 'GET',
            headers: adminRequestHeaders
          });

          adminTests.push({
            endpoint: '/api/admin/users',
            method: 'GET',
            status: userListResponse.status,
            success: userListResponse.ok,
            data: userListResponse.ok ? await userListResponse.json() : await userListResponse.text()
          });
        } catch (error) {
          adminTests.push({
            endpoint: '/api/admin/users',
            method: 'GET',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Test 2: Admin attendance endpoint (if exists)
        try {
          const attendanceResponse = await fetch(`${baseUrl}/api/admin/attendance`, {
            method: 'GET',
            headers: adminRequestHeaders
          });

          adminTests.push({
            endpoint: '/api/admin/attendance',
            method: 'GET',
            status: attendanceResponse.status,
            success: attendanceResponse.ok,
            data: attendanceResponse.ok ? await attendanceResponse.json() : await attendanceResponse.text()
          });
        } catch (error) {
          adminTests.push({
            endpoint: '/api/admin/attendance',
            method: 'GET',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Test 3: Regular attendance endpoint (should work with user auth)
        try {
          const userAttendanceResponse = await fetch(`${baseUrl}/api/attendance`, {
            method: 'GET',
            headers: adminRequestHeaders
          });

          adminTests.push({
            endpoint: '/api/attendance',
            method: 'GET',
            status: userAttendanceResponse.status,
            success: userAttendanceResponse.ok,
            data: userAttendanceResponse.ok ? await userAttendanceResponse.json() : await userAttendanceResponse.text()
          });
        } catch (error) {
          adminTests.push({
            endpoint: '/api/attendance',
            method: 'GET',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        testResults.adminTest = {
          success: true,
          tests: adminTests,
          totalTests: adminTests.length,
          passedTests: adminTests.filter(t => t.success).length
        };

        console.log('Admin tests completed:', adminTests);
      } catch (adminError: any) {
        const errorMsg = `Admin testing failed: ${adminError.message || adminError}`;
        testResults.errors.push(errorMsg);
        testResults.adminTest = {
          success: false,
          error: errorMsg,
          details: adminError
        };
        console.error('Admin test error:', adminError);
      }
    } else {
      testResults.adminTest = {
        success: false,
        error: 'Skipped due to session validation failure'
      };
    }

    // Summary
    const summary = {
      overallSuccess: testResults.errors.length === 0,
      completedSteps: [
        testResults.signIn?.success ? 'Sign-in: ✅' : 'Sign-in: ❌',
        testResults.session?.success ? 'Session: ✅' : 'Session: ❌',
        testResults.adminTest?.success ? 'Admin Tests: ✅' : 'Admin Tests: ❌'
      ],
      totalErrors: testResults.errors.length,
      sessionInfo: testResults.session?.data ? {
        userId: testResults.session.data.user?.id,
        userEmail: testResults.session.data.user?.email,
        userRole: testResults.session.data.user?.role,
        sessionId: testResults.session.data.session?.id,
        sessionExpires: testResults.session.data.session?.expiresAt
      } : null
    };

    return NextResponse.json({
      message: 'Better-auth functionality test completed',
      summary,
      detailedResults: testResults,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('Test route error:', error);
    return NextResponse.json({
      error: 'Test execution failed',
      details: error.message || error,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Simple GET endpoint to check auth status without performing sign-in
    const sessionResult = await auth.api.getSession({
      headers: request.headers
    });

    return NextResponse.json({
      message: 'Auth status check',
      authenticated: !!sessionResult?.user,
      user: sessionResult?.user ? {
        id: sessionResult.user.id,
        email: sessionResult.user.email,
        role: sessionResult.user.role,
        name: sessionResult.user.name
      } : null,
      session: sessionResult?.session ? {
        id: sessionResult.session.id,
        expiresAt: sessionResult.session.expiresAt
      } : null,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('Auth status check error:', error);
    return NextResponse.json({
      message: 'Auth status check failed',
      authenticated: false,
      error: error.message || error,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }
}