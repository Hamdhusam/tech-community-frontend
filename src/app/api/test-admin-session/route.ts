import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { user, attendance } from '@/db/schema';

export async function POST(request: NextRequest) {
  try {
    const testResults = {
      loginTest: null as any,
      sessionTest: null as any,
      adminUsersTest: null as any,
      adminAttendanceTest: null as any,
      errors: [] as string[]
    };

    // Step 1: Test login flow
    try {
      console.log('Testing login flow...');
      
      const loginResult = await auth.api.signIn.email({
        body: {
          email: 'admin@example.com',
          password: 'admin123'
        },
        headers: request.headers
      });

      testResults.loginTest = {
        success: true,
        message: 'Login successful',
        sessionToken: loginResult?.token || 'No token returned'
      };

      console.log('Login test passed:', testResults.loginTest);

    } catch (loginError: any) {
      testResults.loginTest = {
        success: false,
        error: loginError.message || 'Login failed',
        details: loginError
      };
      testResults.errors.push(`Login failed: ${loginError.message}`);
      console.error('Login test failed:', loginError);
    }

    // Step 2: Test session verification
    try {
      console.log('Testing session verification...');
      
      const sessionResult = await auth.api.getSession({
        headers: request.headers
      });

      if (sessionResult?.user) {
        testResults.sessionTest = {
          success: true,
          sessionId: sessionResult.session?.id,
          userId: sessionResult.user.id,
          userEmail: sessionResult.user.email,
          userRole: sessionResult.user.role,
          isAdmin: sessionResult.user.role === 'admin',
          sessionValid: true
        };
        console.log('Session test passed:', testResults.sessionTest);
      } else {
        testResults.sessionTest = {
          success: false,
          error: 'No session or user found',
          sessionValid: false
        };
        testResults.errors.push('Session verification failed: No active session');
      }

    } catch (sessionError: any) {
      testResults.sessionTest = {
        success: false,
        error: sessionError.message || 'Session verification failed',
        details: sessionError
      };
      testResults.errors.push(`Session verification failed: ${sessionError.message}`);
      console.error('Session test failed:', sessionError);
    }

    // Step 3: Test admin users API access
    try {
      console.log('Testing admin users API...');
      
      const baseUrl = process.env.NEXTAUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      const usersResponse = await fetch(`${baseUrl}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
          'Authorization': request.headers.get('authorization') || ''
        }
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        testResults.adminUsersTest = {
          success: true,
          statusCode: usersResponse.status,
          dataCount: Array.isArray(usersData) ? usersData.length : 'Not an array',
          sampleData: Array.isArray(usersData) ? usersData.slice(0, 2) : usersData
        };
        console.log('Admin users test passed:', testResults.adminUsersTest);
      } else {
        const errorText = await usersResponse.text();
        testResults.adminUsersTest = {
          success: false,
          statusCode: usersResponse.status,
          error: errorText || 'Admin users API failed'
        };
        testResults.errors.push(`Admin users API failed: ${usersResponse.status} - ${errorText}`);
      }

    } catch (usersError: any) {
      testResults.adminUsersTest = {
        success: false,
        error: usersError.message || 'Admin users API request failed',
        details: usersError
      };
      testResults.errors.push(`Admin users API error: ${usersError.message}`);
      console.error('Admin users test failed:', usersError);
    }

    // Step 4: Test admin attendance API access
    try {
      console.log('Testing admin attendance API...');
      
      const baseUrl = process.env.NEXTAUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      const attendanceResponse = await fetch(`${baseUrl}/api/admin/attendance`, {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
          'Authorization': request.headers.get('authorization') || ''
        }
      });

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();
        testResults.adminAttendanceTest = {
          success: true,
          statusCode: attendanceResponse.status,
          dataCount: Array.isArray(attendanceData) ? attendanceData.length : 'Not an array',
          sampleData: Array.isArray(attendanceData) ? attendanceData.slice(0, 2) : attendanceData
        };
        console.log('Admin attendance test passed:', testResults.adminAttendanceTest);
      } else {
        const errorText = await attendanceResponse.text();
        testResults.adminAttendanceTest = {
          success: false,
          statusCode: attendanceResponse.status,
          error: errorText || 'Admin attendance API failed'
        };
        testResults.errors.push(`Admin attendance API failed: ${attendanceResponse.status} - ${errorText}`);
      }

    } catch (attendanceError: any) {
      testResults.adminAttendanceTest = {
        success: false,
        error: attendanceError.message || 'Admin attendance API request failed',
        details: attendanceError
      };
      testResults.errors.push(`Admin attendance API error: ${attendanceError.message}`);
      console.error('Admin attendance test failed:', attendanceError);
    }

    // Step 5: Additional database verification
    let dbStats = null;
    try {
      const userCount = await db.select().from(user);
      const attendanceCount = await db.select().from(attendance);
      
      dbStats = {
        totalUsers: userCount.length,
        totalAttendance: attendanceCount.length,
        adminUsers: userCount.filter(u => u.role === 'admin').length
      };
    } catch (dbError: any) {
      testResults.errors.push(`Database stats error: ${dbError.message}`);
    }

    // Comprehensive test summary
    const summary = {
      overallSuccess: testResults.errors.length === 0,
      testsRun: 4,
      testsPassed: [
        testResults.loginTest?.success,
        testResults.sessionTest?.success,
        testResults.adminUsersTest?.success,
        testResults.adminAttendanceTest?.success
      ].filter(Boolean).length,
      testsFailed: testResults.errors.length,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      summary,
      testResults,
      databaseStats: dbStats,
      errors: testResults.errors,
      message: testResults.errors.length === 0 
        ? 'All better-auth integration tests passed successfully'
        : `${testResults.errors.length} test(s) failed. Check errors for details.`
    }, { 
      status: testResults.errors.length === 0 ? 200 : 207 // 207 Multi-Status for partial success
    });

  } catch (error: any) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      error: 'Test execution failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Better-auth integration test endpoint',
    usage: 'Send POST request to run comprehensive authentication tests',
    tests: [
      'Login flow with better-auth signIn.email',
      'Session verification and user role check',
      'Admin users API access test',
      'Admin attendance API access test'
    ],
    requiredCredentials: {
      email: 'admin@example.com',
      password: 'admin123'
    }
  });
}