import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const testResults = {
      authenticationSuccess: false,
      sessionCreated: false,
      userRoleValid: false,
      adminAccessGranted: false,
      sessionToken: null as string | null,
      sessionData: null as any,
      userData: null as any,
      errors: [] as string[],
      steps: [] as string[]
    };

    // Step 1: Attempt sign in with better-auth
    testResults.steps.push('Attempting admin sign-in with better-auth');
    
    let signInResult;
    try {
      signInResult = await auth.api.signInEmail({
        body: {
          email: 'admin@example.com',
          password: 'admin123'
        }
      });
      
      testResults.steps.push('Sign-in API call completed');
      
      if (signInResult) {
        testResults.authenticationSuccess = true;
        testResults.steps.push('Authentication successful');
      } else {
        testResults.errors.push('Sign-in returned null/undefined result');
      }
    } catch (signInError: any) {
      testResults.errors.push(`Sign-in failed: ${signInError.message || signInError}`);
      testResults.steps.push('Sign-in failed with error');
    }

    // Step 2: Verify session creation and retrieve session data
    if (testResults.authenticationSuccess && signInResult) {
      testResults.steps.push('Attempting to retrieve session data');
      
      try {
        // Check if session token exists in the result
        if (signInResult.token) {
          testResults.sessionToken = signInResult.token;
          testResults.sessionCreated = true;
          testResults.steps.push('Session token found in sign-in result');
        } else {
          testResults.errors.push('No session token found in sign-in result');
        }

        // Attempt to get session using better-auth API
        const sessionResult = await auth.api.getSession({
          headers: {
            'cookie': request.headers.get('cookie') || '',
            'authorization': `Bearer ${testResults.sessionToken}`
          }
        });

        if (sessionResult) {
          testResults.sessionData = sessionResult;
          testResults.steps.push('Session data retrieved successfully');
          
          // Extract user data from session
          if (sessionResult.user) {
            testResults.userData = sessionResult.user;
            testResults.steps.push('User data found in session');
          } else {
            testResults.errors.push('No user data found in session');
          }
        } else {
          testResults.errors.push('Failed to retrieve session data');
        }
      } catch (sessionError: any) {
        testResults.errors.push(`Session retrieval failed: ${sessionError.message || sessionError}`);
        testResults.steps.push('Session retrieval failed with error');
      }
    }

    // Step 3: Validate user role
    if (testResults.userData) {
      testResults.steps.push('Validating user role');
      
      if (testResults.userData.role === 'admin') {
        testResults.userRoleValid = true;
        testResults.steps.push('User role validated as admin');
      } else {
        testResults.errors.push(`Invalid user role: expected 'admin', got '${testResults.userData.role}'`);
        testResults.steps.push('User role validation failed');
      }
    } else {
      testResults.errors.push('Cannot validate user role - no user data available');
    }

    // Step 4: Simulate admin route authorization logic
    testResults.steps.push('Simulating admin route access check');
    
    if (testResults.sessionCreated && testResults.userRoleValid && testResults.userData?.role === 'admin') {
      testResults.adminAccessGranted = true;
      testResults.steps.push('Admin access simulation successful');
    } else {
      testResults.errors.push('Admin access would be denied - missing session or invalid role');
      testResults.steps.push('Admin access simulation failed');
    }

    // Step 5: Additional session validation tests
    if (testResults.sessionData) {
      testResults.steps.push('Performing additional session validation');
      
      // Check session expiration
      if (testResults.sessionData.session?.expiresAt) {
        const expiresAt = new Date(testResults.sessionData.session.expiresAt);
        const now = new Date();
        
        if (expiresAt > now) {
          testResults.steps.push('Session expiration validation passed');
        } else {
          testResults.errors.push('Session has expired');
        }
      }

      // Validate session structure
      if (testResults.sessionData.session?.id && testResults.sessionData.session?.userId) {
        testResults.steps.push('Session structure validation passed');
      } else {
        testResults.errors.push('Invalid session structure - missing id or userId');
      }
    }

    // Compile final test summary
    const testSummary = {
      overallSuccess: testResults.authenticationSuccess && 
                     testResults.sessionCreated && 
                     testResults.userRoleValid && 
                     testResults.adminAccessGranted,
      totalSteps: testResults.steps.length,
      totalErrors: testResults.errors.length,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      testSummary,
      testResults,
      debugInfo: {
        signInResultStructure: signInResult ? Object.keys(signInResult) : null,
        sessionDataStructure: testResults.sessionData ? Object.keys(testResults.sessionData) : null,
        userDataFields: testResults.userData ? Object.keys(testResults.userData) : null
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Admin auth test error:', error);
    
    return NextResponse.json({
      error: 'Internal server error during admin auth testing',
      details: error.message || error,
      testResults: {
        authenticationSuccess: false,
        sessionCreated: false,
        userRoleValid: false,
        adminAccessGranted: false,
        errors: [`Critical error: ${error.message || error}`],
        steps: ['Test execution failed due to critical error']
      }
    }, { status: 500 });
  }
}