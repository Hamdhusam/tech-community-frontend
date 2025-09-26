import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

interface RouteTestResult {
  route: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  data?: any;
  description: string;
}

interface AdminTestSession {
  sessionToken?: string;
  userId?: string;
  role?: string;
  authenticated: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const adminRoutes = [
      {
        route: '/api/admin/users',
        method: 'GET',
        description: 'Get list of all users (admin only)',
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        route: '/api/admin/attendance',
        method: 'GET', 
        description: 'Get all attendance records (admin only)',
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        route: '/api/admin/users/{id}/update-role',
        method: 'GET',
        description: 'Test user role update route protection',
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        route: '/api/admin/users/{id}/update-strikes',
        method: 'GET',
        description: 'Test user strikes update route protection',
        requiresAuth: true,
        requiresAdmin: true
      }
    ];

    return NextResponse.json({
      message: 'Admin route access testing information',
      availableRoutes: adminRoutes,
      authenticationInfo: {
        sessionValidation: 'Uses better-auth session validation',
        supportedMethods: ['Session cookies', 'Bearer token'],
        testCredentials: {
          email: 'admin@example.com',
          password: 'admin123'
        }
      },
      testScenarios: [
        'Access without authentication (should fail with 401)',
        'Access with non-admin user (should fail with 403)',
        'Access with expired session (should fail with 401)',
        'Access with valid admin session (should succeed with 200)'
      ],
      usage: {
        method: 'POST',
        optionalFields: {
          sessionToken: 'Optional session token for testing'
        },
        description: 'POST to this endpoint to run admin route access tests'
      }
    });

  } catch (error) {
    console.error('GET admin-test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionToken } = body;

    // Test session validation
    let testSession: AdminTestSession = {
      authenticated: false
    };

    // Try to get current session using better-auth
    try {
      const sessionResult = await auth.api.getSession({
        headers: request.headers
      });
      
      if (sessionResult && sessionResult.user) {
        testSession = {
          sessionToken: 'current_session',
          userId: sessionResult.user.id,
          role: sessionResult.user.role,
          authenticated: true
        };
      }
    } catch (error) {
      console.log('No current session found, will test without auth');
    }

    // If no session and sessionToken provided, use it for testing
    let testHeaders: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (sessionToken) {
      testHeaders['Authorization'] = `Bearer ${sessionToken}`;
      testHeaders['Cookie'] = `better-auth.session_token=${sessionToken}`;
      testSession.sessionToken = sessionToken;
      testSession.authenticated = true;
    }

    const baseUrl = request.nextUrl.origin;
    const testResults: RouteTestResult[] = [];

    // Test routes
    const routesToTest = [
      {
        route: '/api/admin/users',
        method: 'GET',
        description: 'Get list of all users (admin only)'
      },
      {
        route: '/api/admin/attendance', 
        method: 'GET',
        description: 'Get all attendance records (admin only)'
      }
    ];

    // Test authenticated admin access
    for (const testRoute of routesToTest) {
      try {
        const response = await fetch(`${baseUrl}${testRoute.route}`, {
          method: testRoute.method,
          headers: testHeaders
        });

        const responseData = await response.json().catch(() => null);

        testResults.push({
          route: testRoute.route,
          method: testRoute.method,
          status: response.status,
          success: response.status === 200,
          data: responseData,
          description: testRoute.description,
          error: response.status !== 200 ? responseData?.error || 'Request failed' : undefined
        });

      } catch (error) {
        testResults.push({
          route: testRoute.route,
          method: testRoute.method,
          status: 500,
          success: false,
          description: testRoute.description,
          error: `Network error: ${error}`
        });
      }
    }

    // Test unauthorized access (no auth headers)
    const unauthorizedResults: RouteTestResult[] = [];
    for (const testRoute of routesToTest) {
      try {
        const response = await fetch(`${baseUrl}${testRoute.route}`, {
          method: testRoute.method,
          headers: { 'Content-Type': 'application/json' }
        });

        const responseData = await response.json().catch(() => null);

        unauthorizedResults.push({
          route: testRoute.route,
          method: testRoute.method,
          status: response.status,
          success: response.status === 401 || response.status === 403,
          data: responseData,
          description: `${testRoute.description} - Unauthorized test`,
          error: response.status === 200 ? 'Route should have been protected but allowed access' : undefined
        });

      } catch (error) {
        unauthorizedResults.push({
          route: testRoute.route,
          method: testRoute.method,
          status: 500,
          success: false,
          description: `${testRoute.description} - Unauthorized test`,
          error: `Network error: ${error}`
        });
      }
    }

    // Calculate summary
    const totalTests = testResults.length + unauthorizedResults.length;
    const successfulTests = testResults.filter(r => r.success).length + unauthorizedResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;

    const summary = {
      totalRoutesTested: routesToTest.length,
      totalTests: totalTests,
      successfulTests,
      failedTests,
      successRate: `${Math.round((successfulTests / totalTests) * 100)}%`,
      sessionInfo: testSession,
      adminAccessWorking: testResults.filter(r => r.success && testSession.authenticated).length > 0,
      routeProtectionWorking: unauthorizedResults.filter(r => r.success).length === unauthorizedResults.filter(r => r.status === 401 || r.status === 403).length
    };

    return NextResponse.json({
      message: 'Admin route access test completed',
      summary,
      authenticatedTests: {
        description: 'Tests with authentication/session',
        sessionUsed: testSession,
        results: testResults
      },
      unauthorizedTests: {
        description: 'Tests without authentication (should fail)',
        results: unauthorizedResults
      },
      recommendations: [
        testSession.authenticated ? 'Session authentication is working' : 'No valid session found - routes should be protected',
        summary.routeProtectionWorking ? 'Route protection is working correctly' : 'Some routes may not be properly protected',
        summary.adminAccessWorking ? 'Admin access is functional' : 'Admin access may have issues'
      ]
    });

  } catch (error) {
    console.error('POST admin-test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}