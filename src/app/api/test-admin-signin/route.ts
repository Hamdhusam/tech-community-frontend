import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  return NextResponse.json({
    message: "Better-Auth Admin Sign-In Test API",
    description: "Comprehensive testing endpoint for better-auth admin authentication",
    instructions: {
      usage: "Send POST request with admin credentials to test sign-in flow",
      testCredentials: {
        email: "admin@example.com",
        password: "admin123"
      },
      endpoints: {
        POST: "/api/test-admin-signin - Test admin sign-in with credentials",
        GET: "/api/test-admin-signin - Get instructions and test information"
      }
    },
    testFlow: [
      "1. Validate admin credentials",
      "2. Create session using better-auth",
      "3. Verify session contains user data with admin role",
      "4. Test session token generation",
      "5. Verify session retrieval"
    ],
    expectedResponse: {
      success: "boolean",
      steps: "object with test results for each step",
      sessionInfo: "session details if successful",
      sessionToken: "token for further testing",
      debugInfo: "additional debugging information"
    }
  });
}

export async function POST(request: NextRequest) {
  const testResults = {
    step1_validateCredentials: { success: false, message: "", data: null },
    step2_createSession: { success: false, message: "", data: null },
    step3_verifyUserData: { success: false, message: "", data: null },
    step4_testTokenGeneration: { success: false, message: "", data: null },
    step5_verifySessionRetrieval: { success: false, message: "", data: null }
  };

  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Step 1: Validate credentials format
    testResults.step1_validateCredentials.message = "Validating credential format and expected values";
    
    if (!email || !password) {
      testResults.step1_validateCredentials.message = "Missing email or password";
      return NextResponse.json({
        success: false,
        error: "Email and password are required",
        testResults,
        debugInfo: { receivedBody: body }
      }, { status: 400 });
    }

    if (email !== "admin@example.com" || password !== "admin123") {
      testResults.step1_validateCredentials.message = `Expected admin@example.com/admin123, received ${email}/${password}`;
      return NextResponse.json({
        success: false,
        error: "Please use test credentials: admin@example.com / admin123",
        testResults,
        debugInfo: { expectedEmail: "admin@example.com", receivedEmail: email }
      }, { status: 400 });
    }

    testResults.step1_validateCredentials.success = true;
    testResults.step1_validateCredentials.message = "Credentials format validated successfully";
    testResults.step1_validateCredentials.data = { email, passwordLength: password.length };

    // Step 2: Attempt sign-in using better-auth
    testResults.step2_createSession.message = "Attempting sign-in with better-auth";
    
    const signInResult = await auth.api.signInEmail({
      body: {
        email,
        password,
        rememberMe: true
      }
    });

    if (!signInResult || !signInResult.user) {
      testResults.step2_createSession.message = "Sign-in failed - no result returned from better-auth";
      return NextResponse.json({
        success: false,
        error: "Authentication failed - better-auth returned no result",
        testResults,
        debugInfo: { signInResult }
      }, { status: 401 });
    }

    testResults.step2_createSession.success = true;
    testResults.step2_createSession.message = "Sign-in successful";
    testResults.step2_createSession.data = {
      hasUser: !!signInResult.user,
      hasSession: !!signInResult.session,
      userId: signInResult.user?.id,
      sessionId: signInResult.session?.id
    };

    // Step 3: Verify user data and admin role  
    testResults.step3_verifyUserData.message = "Verifying user data and admin role";
    
    const user = signInResult.user;
    const isAdmin = user.role === 'admin';
    
    testResults.step3_verifyUserData.success = true;
    testResults.step3_verifyUserData.message = `User data verified. Role: ${user.role}, Admin: ${isAdmin}`;
    testResults.step3_verifyUserData.data = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isAdmin,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    };

    // Step 4: Test session token generation
    testResults.step4_testTokenGeneration.message = "Testing session token generation";
    
    if (!signInResult.session) {
      testResults.step4_testTokenGeneration.message = "No session returned from sign-in";
      return NextResponse.json({
        success: false,
        error: "Sign-in successful but no session created",
        testResults,
        debugInfo: { signInResult }
      }, { status: 500 });
    }

    const session = signInResult.session;
    testResults.step4_testTokenGeneration.success = true;
    testResults.step4_testTokenGeneration.message = "Session token generated successfully";
    testResults.step4_testTokenGeneration.data = {
      sessionId: session.id,
      token: session.token,
      expiresAt: session.expiresAt,
      userId: session.userId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent
    };

    // Step 5: Verify session can be retrieved
    testResults.step5_verifySessionRetrieval.message = "Testing session retrieval";
    
    try {
      const retrieveResult = await auth.api.getSession({
        headers: {
          authorization: `Bearer ${session.token}`
        }
      });

      if (retrieveResult && retrieveResult.session) {
        testResults.step5_verifySessionRetrieval.success = true;
        testResults.step5_verifySessionRetrieval.message = "Session retrieved successfully";
        testResults.step5_verifySessionRetrieval.data = {
          sessionId: retrieveResult.session.id,
          userId: retrieveResult.session.userId,
          tokenMatch: retrieveResult.session.token === session.token,
          userMatch: retrieveResult.user?.id === user.id
        };
      } else {
        testResults.step5_verifySessionRetrieval.message = "Session retrieval returned no data";
        testResults.step5_verifySessionRetrieval.data = { retrieveResult };
      }
    } catch (retrieveError) {
      testResults.step5_verifySessionRetrieval.message = `Session retrieval failed: ${retrieveError}`;
      testResults.step5_verifySessionRetrieval.data = { error: String(retrieveError) };
    }

    // Prepare comprehensive response
    const allStepsSuccessful = Object.values(testResults).every(step => step.success);
    
    return NextResponse.json({
      success: allStepsSuccessful,
      message: allStepsSuccessful ? "All authentication tests passed!" : "Some tests failed - check testResults for details",
      testResults,
      sessionInfo: {
        sessionId: session.id,
        userId: user.id,
        role: user.role,
        email: user.email,
        expiresAt: session.expiresAt,
        token: session.token
      },
      sessionToken: session.token,
      debugInfo: {
        timestamp: new Date().toISOString(),
        requestHeaders: Object.fromEntries(request.headers.entries()),
        userAgent: request.headers.get('user-agent'),
        allTestsPassStatus: {
          step1: testResults.step1_validateCredentials.success,
          step2: testResults.step2_createSession.success,
          step3: testResults.step3_verifyUserData.success,
          step4: testResults.step4_testTokenGeneration.success,
          step5: testResults.step5_verifySessionRetrieval.success
        }
      }
    }, { status: allStepsSuccessful ? 200 : 206 });

  } catch (error) {
    console.error('Auth test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Authentication test failed with exception',
      exception: error instanceof Error ? error.message : String(error),
      testResults,
      debugInfo: {
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorStack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}