import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
  error?: string;
  recommendations?: string[];
}

interface TestResults {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    overallStatus: 'PASS' | 'FAIL';
  };
  results: TestResult[];
}

export async function POST(request: NextRequest) {
  const results: TestResult[] = [];
  let sessionToken: string | null = null;
  let sessionCookie: string | null = null;
  let userData: any = null;
  let testUserId: string | null = null;

  try {
    // Step 1: Test better-auth signIn.email
    console.log('Starting authentication flow test...');
    results.push({
      step: '1. Starting Authentication Test',
      status: 'PASS',
      message: 'Test initialized successfully'
    });

    try {
      const signInResponse = await auth.signIn.email({
        email: 'archanaarchu200604@gmail.com',
        password: 'archanaarchu2006'
      });

      if (signInResponse.success) {
        sessionToken = signInResponse.data?.session?.token || null;
        sessionCookie = signInResponse.data?.session?.id || null;
        userData = signInResponse.data?.user || null;

        results.push({
          step: '2. Authentication Sign-In',
          status: 'PASS',
          message: 'Successfully authenticated with better-auth',
          details: {
            userId: userData?.id,
            email: userData?.email,
            role: userData?.role,
            hasSessionToken: !!sessionToken,
            hasSessionCookie: !!sessionCookie
          }
        });
      } else {
        results.push({
          step: '2. Authentication Sign-In',
          status: 'FAIL',
          message: 'Authentication failed',
          error: signInResponse.error?.message || 'Unknown authentication error',
          recommendations: [
            'Verify the email and password are correct',
            'Check if the user exists in the database',
            'Ensure better-auth is configured properly',
            'Check database connection and user table'
          ]
        });
        return createTestResponse(results);
      }
    } catch (authError: any) {
      results.push({
        step: '2. Authentication Sign-In',
        status: 'FAIL',
        message: 'Authentication error occurred',
        error: authError.message || 'Authentication system error',
        recommendations: [
          'Check better-auth configuration',
          'Verify auth endpoints are accessible',
          'Check database schema for auth tables',
          'Ensure proper environment variables are set'
        ]
      });
      return createTestResponse(results);
    }

    // Helper function to make authenticated requests
    const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>
      };

      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      if (sessionCookie) {
        headers['Cookie'] = `session=${sessionCookie}`;
      }

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      
      return fetch(`${baseUrl}${url}`, {
        ...options,
        headers
      });
    };

    // Step 3: Test /api/admin/users
    try {
      const usersResponse = await makeAuthenticatedRequest('/api/admin/users');
      const usersData = await usersResponse.json();

      if (usersResponse.ok) {
        results.push({
          step: '3. Test /api/admin/users',
          status: 'PASS',
          message: 'Successfully accessed admin users endpoint',
          details: {
            statusCode: usersResponse.status,
            userCount: Array.isArray(usersData) ? usersData.length : 'Unknown',
            responseType: typeof usersData
          }
        });
      } else {
        results.push({
          step: '3. Test /api/admin/users',
          status: 'FAIL',
          message: 'Failed to access admin users endpoint',
          error: usersData.error || `HTTP ${usersResponse.status}`,
          recommendations: [
            'Check if user has admin role',
            'Verify admin middleware is working',
            'Check session validation in admin routes',
            'Ensure proper authorization headers'
          ]
        });
      }
    } catch (error: any) {
      results.push({
        step: '3. Test /api/admin/users',
        status: 'FAIL',
        message: 'Error accessing admin users endpoint',
        error: error.message,
        recommendations: [
          'Check if /api/admin/users route exists',
          'Verify network connectivity',
          'Check server logs for detailed errors'
        ]
      });
    }

    // Step 4: Test /api/admin/attendance
    try {
      const attendanceResponse = await makeAuthenticatedRequest('/api/admin/attendance');
      const attendanceData = await attendanceResponse.json();

      if (attendanceResponse.ok) {
        results.push({
          step: '4. Test /api/admin/attendance',
          status: 'PASS',
          message: 'Successfully accessed admin attendance endpoint',
          details: {
            statusCode: attendanceResponse.status,
            recordCount: Array.isArray(attendanceData) ? attendanceData.length : 'Unknown',
            responseType: typeof attendanceData
          }
        });
      } else {
        results.push({
          step: '4. Test /api/admin/attendance',
          status: 'FAIL',
          message: 'Failed to access admin attendance endpoint',
          error: attendanceData.error || `HTTP ${attendanceResponse.status}`,
          recommendations: [
            'Check admin role permissions',
            'Verify attendance table exists',
            'Check database connection',
            'Ensure proper session validation'
          ]
        });
      }
    } catch (error: any) {
      results.push({
        step: '4. Test /api/admin/attendance',
        status: 'FAIL',
        message: 'Error accessing admin attendance endpoint',
        error: error.message,
        recommendations: [
          'Check if /api/admin/attendance route exists',
          'Verify server is running',
          'Check route implementation'
        ]
      });
    }

    // Step 5: Test /api/admin/users-crud - GET
    try {
      const crudGetResponse = await makeAuthenticatedRequest('/api/admin/users-crud');
      const crudGetData = await crudGetResponse.json();

      if (crudGetResponse.ok) {
        results.push({
          step: '5. Test /api/admin/users-crud (GET)',
          status: 'PASS',
          message: 'Successfully accessed users-crud GET endpoint',
          details: {
            statusCode: crudGetResponse.status,
            userCount: Array.isArray(crudGetData) ? crudGetData.length : 'Unknown'
          }
        });
      } else {
        results.push({
          step: '5. Test /api/admin/users-crud (GET)',
          status: 'FAIL',
          message: 'Failed to access users-crud GET endpoint',
          error: crudGetData.error || `HTTP ${crudGetResponse.status}`,
          recommendations: [
            'Check admin permissions for CRUD operations',
            'Verify users-crud route exists',
            'Check GET method implementation'
          ]
        });
      }
    } catch (error: any) {
      results.push({
        step: '5. Test /api/admin/users-crud (GET)',
        status: 'FAIL',
        message: 'Error accessing users-crud GET endpoint',
        error: error.message
      });
    }

    // Step 6: Test /api/admin/users-crud - POST (Create test user)
    const testUserData = {
      name: 'Test User',
      email: `test.user.${Date.now()}@example.com`,
      role: 'user',
      emailVerified: true
    };

    try {
      const crudPostResponse = await makeAuthenticatedRequest('/api/admin/users-crud', {
        method: 'POST',
        body: JSON.stringify(testUserData)
      });
      const crudPostData = await crudPostResponse.json();

      if (crudPostResponse.ok && crudPostData.id) {
        testUserId = crudPostData.id;
        results.push({
          step: '6. Test /api/admin/users-crud (POST)',
          status: 'PASS',
          message: 'Successfully created test user',
          details: {
            statusCode: crudPostResponse.status,
            createdUserId: testUserId,
            userData: crudPostData
          }
        });
      } else {
        results.push({
          step: '6. Test /api/admin/users-crud (POST)',
          status: 'FAIL',
          message: 'Failed to create test user',
          error: crudPostData.error || `HTTP ${crudPostResponse.status}`,
          recommendations: [
            'Check POST method implementation',
            'Verify required fields validation',
            'Check database write permissions',
            'Ensure user table schema matches'
          ]
        });
      }
    } catch (error: any) {
      results.push({
        step: '6. Test /api/admin/users-crud (POST)',
        status: 'FAIL',
        message: 'Error creating test user',
        error: error.message
      });
    }

    // Step 7: Test /api/admin/users-crud - PUT (Update test user)
    if (testUserId) {
      const updateData = {
        name: 'Updated Test User',
        role: 'admin'
      };

      try {
        const crudPutResponse = await makeAuthenticatedRequest(`/api/admin/users-crud?id=${testUserId}`, {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });
        const crudPutData = await crudPutResponse.json();

        if (crudPutResponse.ok) {
          results.push({
            step: '7. Test /api/admin/users-crud (PUT)',
            status: 'PASS',
            message: 'Successfully updated test user',
            details: {
              statusCode: crudPutResponse.status,
              updatedUserId: testUserId,
              updatedData: crudPutData
            }
          });
        } else {
          results.push({
            step: '7. Test /api/admin/users-crud (PUT)',
            status: 'FAIL',
            message: 'Failed to update test user',
            error: crudPutData.error || `HTTP ${crudPutResponse.status}`,
            recommendations: [
              'Check PUT method implementation',
              'Verify user exists before update',
              'Check update validation logic',
              'Ensure proper WHERE clause'
            ]
          });
        }
      } catch (error: any) {
        results.push({
          step: '7. Test /api/admin/users-crud (PUT)',
          status: 'FAIL',
          message: 'Error updating test user',
          error: error.message
        });
      }
    } else {
      results.push({
        step: '7. Test /api/admin/users-crud (PUT)',
        status: 'FAIL',
        message: 'Skipped PUT test - no test user ID available',
        recommendations: ['Fix POST operation first to enable PUT testing']
      });
    }

    // Step 8: Test /api/admin/users-crud - DELETE (Delete test user)
    if (testUserId) {
      try {
        const crudDeleteResponse = await makeAuthenticatedRequest(`/api/admin/users-crud?id=${testUserId}`, {
          method: 'DELETE'
        });
        const crudDeleteData = await crudDeleteResponse.json();

        if (crudDeleteResponse.ok) {
          results.push({
            step: '8. Test /api/admin/users-crud (DELETE)',
            status: 'PASS',
            message: 'Successfully deleted test user',
            details: {
              statusCode: crudDeleteResponse.status,
              deletedUserId: testUserId,
              response: crudDeleteData
            }
          });
        } else {
          results.push({
            step: '8. Test /api/admin/users-crud (DELETE)',
            status: 'FAIL',
            message: 'Failed to delete test user',
            error: crudDeleteData.error || `HTTP ${crudDeleteResponse.status}`,
            recommendations: [
              'Check DELETE method implementation',
              'Verify user exists before deletion',
              'Check foreign key constraints',
              'Ensure proper cascade settings'
            ]
          });
        }
      } catch (error: any) {
        results.push({
          step: '8. Test /api/admin/users-crud (DELETE)',
          status: 'FAIL',
          message: 'Error deleting test user',
          error: error.message
        });
      }
    } else {
      results.push({
        step: '8. Test /api/admin/users-crud (DELETE)',
        status: 'FAIL',
        message: 'Skipped DELETE test - no test user ID available',
        recommendations: ['Fix POST operation first to enable DELETE testing']
      });
    }

    // Cleanup - Sign out if possible
    try {
      await auth.signOut();
      results.push({
        step: '9. Cleanup - Sign Out',
        status: 'PASS',
        message: 'Successfully signed out'
      });
    } catch (signOutError: any) {
      results.push({
        step: '9. Cleanup - Sign Out',
        status: 'FAIL',
        message: 'Failed to sign out',
        error: signOutError.message,
        recommendations: ['Check signOut method implementation']
      });
    }

    return createTestResponse(results);

  } catch (error: any) {
    console.error('Authentication flow test error:', error);
    results.push({
      step: 'CRITICAL ERROR',
      status: 'FAIL',
      message: 'Critical error in authentication flow test',
      error: error.message,
      recommendations: [
        'Check server configuration',
        'Verify all dependencies are installed',
        'Check database connectivity',
        'Review better-auth setup'
      ]
    });
    return createTestResponse(results);
  }
}

function createTestResponse(results: TestResult[]): NextResponse {
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  const testResults: TestResults = {
    summary: {
      totalTests: total,
      passed,
      failed,
      overallStatus: failed === 0 ? 'PASS' : 'FAIL'
    },
    results
  };

  console.log('\n=== AUTHENTICATION FLOW TEST RESULTS ===');
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Overall Status: ${testResults.summary.overallStatus}`);
  console.log('\nDetailed Results:');
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.step}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    if (result.details) console.log(`   Details:`, result.details);
    if (result.recommendations) {
      console.log(`   Recommendations:`);
      result.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
  });

  return NextResponse.json(testResults, { 
    status: testResults.summary.overallStatus === 'PASS' ? 200 : 400 
  });
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    error: 'This endpoint only supports POST requests for running authentication flow tests',
    usage: 'Send a POST request to run the comprehensive authentication and admin route tests'
  }, { status: 405 });
}