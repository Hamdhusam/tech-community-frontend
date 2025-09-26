import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, session, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface TestResults {
  success: boolean;
  results: TestResult[];
  summary: {
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
  };
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Admin Authentication Test Endpoint",
    description: "This endpoint tests the complete admin authentication workflow for better-auth",
    usage: {
      method: "POST",
      endpoint: "/api/admin-auth-test",
      testAccount: {
        email: "archanaarchu200604@gmail.com",
        password: "archanaarchu2006"
      }
    },
    testSteps: [
      "1. Verify admin account exists in database",
      "2. Check account configuration and role",
      "3. Test better-auth authentication flow",
      "4. Extract and validate session information",
      "5. Test admin authorization",
      "6. Simulate admin route access",
      "7. Validate session persistence"
    ],
    instructions: "Send a POST request to this endpoint to run the complete authentication test"
  });
}

export async function POST(request: NextRequest) {
  const testResults: TestResult[] = [];
  const testEmail = "archanaarchu200604@gmail.com";
  const testPassword = "archanaarchu2006";

  let finalSuccess = true;

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
    // Step 1: Verify admin account exists
    try {
      const adminUser = await db.select()
        .from(user)
        .where(eq(user.email, testEmail))
        .limit(1);

      if (adminUser.length === 0) {
        addResult("Verify admin account exists", false, null, "Admin account not found in database");
      } else {
        addResult("Verify admin account exists", true, {
          userId: adminUser[0].id,
          name: adminUser[0].name,
          email: adminUser[0].email,
          role: adminUser[0].role,
          emailVerified: adminUser[0].emailVerified,
          createdAt: adminUser[0].createdAt
        });
      }
    } catch (error) {
      addResult("Verify admin account exists", false, null, `Database error: ${error}`);
    }

    // Step 2: Check account configuration and credentials
    try {
      const accountRecord = await db.select()
        .from(account)
        .where(eq(account.accountId, testEmail))
        .limit(1);

      if (accountRecord.length === 0) {
        addResult("Check account configuration", false, null, "Account credentials not found");
      } else {
        addResult("Check account configuration", true, {
          accountId: accountRecord[0].accountId,
          providerId: accountRecord[0].providerId,
          hasPassword: !!accountRecord[0].password,
          createdAt: accountRecord[0].createdAt
        });
      }
    } catch (error) {
      addResult("Check account configuration", false, null, `Account lookup error: ${error}`);
    }

    // Step 3: Test better-auth authentication
    let authResponse: any = null;
    let sessionCookies: string[] = [];
    
    try {
      // Create a mock request for better-auth sign in
      const signInRequest = new Request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });

      // Use better-auth to handle sign in
      authResponse = await auth.handler(signInRequest);
      
      if (authResponse.status === 200) {
        const responseData = await authResponse.json();
        
        // Extract session cookies
        const setCookieHeaders = authResponse.headers.getSetCookie();
        sessionCookies = setCookieHeaders || [];
        
        addResult("Better-auth authentication", true, {
          status: authResponse.status,
          sessionData: responseData,
          cookiesSet: sessionCookies.length > 0,
          cookieCount: sessionCookies.length
        });
      } else {
        const errorData = await authResponse.text();
        addResult("Better-auth authentication", false, {
          status: authResponse.status,
          response: errorData
        }, "Authentication failed");
      }
    } catch (error) {
      addResult("Better-auth authentication", false, null, `Auth error: ${error}`);
    }

    // Step 4: Extract and validate session information
    let sessionData: any = null;
    try {
      if (sessionCookies.length > 0) {
        // Parse session token from cookies
        const sessionCookie = sessionCookies.find(cookie => 
          cookie.includes('better-auth.session_token') || 
          cookie.includes('session-token')
        );
        
        if (sessionCookie) {
          const tokenMatch = sessionCookie.match(/=([^;]+)/);
          const sessionToken = tokenMatch ? tokenMatch[1] : null;
          
          if (sessionToken) {
            const sessionRecord = await db.select()
              .from(session)
              .where(eq(session.token, sessionToken))
              .limit(1);

            if (sessionRecord.length > 0) {
              sessionData = sessionRecord[0];
              addResult("Extract session information", true, {
                sessionId: sessionData.id,
                userId: sessionData.userId,
                expiresAt: sessionData.expiresAt,
                token: sessionData.token.substring(0, 10) + '...',
                ipAddress: sessionData.ipAddress,
                userAgent: sessionData.userAgent
              });
            } else {
              addResult("Extract session information", false, null, "Session not found in database");
            }
          } else {
            addResult("Extract session information", false, null, "Could not extract session token from cookie");
          }
        } else {
          addResult("Extract session information", false, null, "Session cookie not found");
        }
      } else {
        addResult("Extract session information", false, null, "No cookies returned from authentication");
      }
    } catch (error) {
      addResult("Extract session information", false, null, `Session extraction error: ${error}`);
    }

    // Step 5: Test admin authorization
    try {
      if (sessionData) {
        const sessionUser = await db.select()
          .from(user)
          .where(eq(user.id, sessionData.userId))
          .limit(1);

        if (sessionUser.length > 0) {
          const userRole = sessionUser[0].role;
          const isAdmin = userRole === 'admin';
          const sessionValid = new Date(sessionData.expiresAt) > new Date();

          addResult("Test admin authorization", isAdmin && sessionValid, {
            userId: sessionUser[0].id,
            userRole: userRole,
            isAdmin: isAdmin,
            sessionValid: sessionValid,
            expiresAt: sessionData.expiresAt,
            currentTime: new Date().toISOString()
          }, !isAdmin ? "User does not have admin role" : !sessionValid ? "Session expired" : undefined);
        } else {
          addResult("Test admin authorization", false, null, "User not found for session");
        }
      } else {
        addResult("Test admin authorization", false, null, "No session data available for authorization test");
      }
    } catch (error) {
      addResult("Test admin authorization", false, null, `Authorization test error: ${error}`);
    }

    // Step 6: Simulate admin route access
    try {
      if (sessionData) {
        // Create a mock request with session cookie
        const mockAdminRequest = new Request('http://localhost:3000/api/admin/users', {
          method: 'GET',
          headers: {
            'Cookie': sessionCookies.join('; ')
          }
        });

        // Simulate getCurrentUser function behavior
        const currentUser = await db.select()
          .from(user)
          .where(eq(user.id, sessionData.userId))
          .limit(1);

        if (currentUser.length > 0 && currentUser[0].role === 'admin') {
          addResult("Simulate admin route access", true, {
            routeAccess: "Granted",
            userId: currentUser[0].id,
            userRole: currentUser[0].role,
            requestHeaders: {
              hasCookies: mockAdminRequest.headers.get('Cookie') !== null
            }
          });
        } else {
          addResult("Simulate admin route access", false, null, "Access denied - insufficient privileges");
        }
      } else {
        addResult("Simulate admin route access", false, null, "No session available for route access test");
      }
    } catch (error) {
      addResult("Simulate admin route access", false, null, `Route access simulation error: ${error}`);
    }

    // Step 7: Validate session persistence
    try {
      if (sessionData) {
        // Check if session still exists and is valid
        const persistentSession = await db.select()
          .from(session)
          .where(and(
            eq(session.id, sessionData.id),
            eq(session.userId, sessionData.userId)
          ))
          .limit(1);

        if (persistentSession.length > 0) {
          const isValid = new Date(persistentSession[0].expiresAt) > new Date();
          addResult("Validate session persistence", isValid, {
            sessionExists: true,
            sessionId: persistentSession[0].id,
            expiresAt: persistentSession[0].expiresAt,
            isValid: isValid,
            timeRemaining: isValid ? 
              Math.round((new Date(persistentSession[0].expiresAt).getTime() - Date.now()) / (1000 * 60)) + ' minutes' : 
              'Expired'
          }, !isValid ? "Session has expired" : undefined);
        } else {
          addResult("Validate session persistence", false, null, "Session no longer exists in database");
        }
      } else {
        addResult("Validate session persistence", false, null, "No session data to validate");
      }
    } catch (error) {
      addResult("Validate session persistence", false, null, `Session persistence validation error: ${error}`);
    }

  } catch (error) {
    console.error('Admin auth test error:', error);
    addResult("Global error handler", false, null, `Unexpected error: ${error}`);
  }

  const passedSteps = testResults.filter(r => r.success).length;
  const failedSteps = testResults.filter(r => !r.success).length;

  const response: TestResults = {
    success: finalSuccess,
    results: testResults,
    summary: {
      totalSteps: testResults.length,
      passedSteps: passedSteps,
      failedSteps: failedSteps
    }
  };

  return NextResponse.json(response, { 
    status: finalSuccess ? 200 : 207 // 207 Multi-Status for partial success
  });
}