import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, session, attendance } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface TestResult {
  operation: string;
  status: 'success' | 'error';
  statusCode?: number;
  data?: any;
  error?: string;
}

export async function POST(request: NextRequest) {
  const testResults: TestResult[] = [];
  let testSessionId: string | null = null;
  let testSessionToken: string | null = null;

  try {
    // Step 1: Find admin user
    testResults.push({ operation: 'Finding admin user', status: 'success' });
    
    const adminUser = await db.select()
      .from(user)
      .where(eq(user.email, 'archanaarchu200604@gmail.com'))
      .limit(1);

    if (adminUser.length === 0) {
      return NextResponse.json({
        error: 'Admin user not found',
        results: testResults
      }, { status: 404 });
    }

    const admin = adminUser[0];
    testResults.push({ 
      operation: 'Admin user found', 
      status: 'success',
      data: { id: admin.id, email: admin.email, role: admin.role }
    });

    // Step 2: Create test session
    testSessionId = crypto.randomUUID();
    testSessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    await db.insert(session).values({
      id: testSessionId,
      token: testSessionToken,
      userId: admin.id,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'Admin Test Session'
    });

    testResults.push({ 
      operation: 'Test session created', 
      status: 'success',
      data: { sessionId: testSessionId, token: testSessionToken }
    });

    // Step 3: Test admin routes
    const baseUrl = request.url.replace('/api/admin-test', '');
    const sessionHeaders = {
      'Cookie': `better-auth.session_token=${testSessionToken}`,
      'Content-Type': 'application/json'
    };

    // Test /api/admin/users
    try {
      const usersResponse = await fetch(`${baseUrl}/api/admin/users`, {
        method: 'GET',
        headers: sessionHeaders
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        testResults.push({
          operation: 'GET /api/admin/users',
          status: 'success',
          statusCode: usersResponse.status,
          data: { count: usersData.length }
        });
      } else {
        const errorData = await usersResponse.json();
        testResults.push({
          operation: 'GET /api/admin/users',
          status: 'error',
          statusCode: usersResponse.status,
          error: errorData.error
        });
      }
    } catch (error) {
      testResults.push({
        operation: 'GET /api/admin/users',
        status: 'error',
        error: `Fetch error: ${error}`
      });
    }

    // Test /api/admin/attendance
    try {
      const attendanceResponse = await fetch(`${baseUrl}/api/admin/attendance`, {
        method: 'GET',
        headers: sessionHeaders
      });
      
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();
        testResults.push({
          operation: 'GET /api/admin/attendance',
          status: 'success',
          statusCode: attendanceResponse.status,
          data: { count: attendanceData.length }
        });
      } else {
        const errorData = await attendanceResponse.json();
        testResults.push({
          operation: 'GET /api/admin/attendance',
          status: 'error',
          statusCode: attendanceResponse.status,
          error: errorData.error
        });
      }
    } catch (error) {
      testResults.push({
        operation: 'GET /api/admin/attendance',
        status: 'error',
        error: `Fetch error: ${error}`
      });
    }

    // Test /api/admin/users-crud - GET (list users)
    try {
      const crudGetResponse = await fetch(`${baseUrl}/api/admin/users-crud`, {
        method: 'GET',
        headers: sessionHeaders
      });
      
      if (crudGetResponse.ok) {
        const crudData = await crudGetResponse.json();
        testResults.push({
          operation: 'GET /api/admin/users-crud (list)',
          status: 'success',
          statusCode: crudGetResponse.status,
          data: { count: crudData.length }
        });
      } else {
        const errorData = await crudGetResponse.json();
        testResults.push({
          operation: 'GET /api/admin/users-crud (list)',
          status: 'error',
          statusCode: crudGetResponse.status,
          error: errorData.error
        });
      }
    } catch (error) {
      testResults.push({
        operation: 'GET /api/admin/users-crud (list)',
        status: 'error',
        error: `Fetch error: ${error}`
      });
    }

    // Test /api/admin/users-crud - POST (create user)
    let testUserId: string | null = null;
    try {
      const createUserData = {
        name: 'Test User',
        email: `test.user.${Date.now()}@example.com`,
        role: 'user'
      };

      const crudPostResponse = await fetch(`${baseUrl}/api/admin/users-crud`, {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify(createUserData)
      });
      
      if (crudPostResponse.ok) {
        const createdUser = await crudPostResponse.json();
        testUserId = createdUser.id;
        testResults.push({
          operation: 'POST /api/admin/users-crud (create)',
          status: 'success',
          statusCode: crudPostResponse.status,
          data: { id: createdUser.id, email: createdUser.email }
        });
      } else {
        const errorData = await crudPostResponse.json();
        testResults.push({
          operation: 'POST /api/admin/users-crud (create)',
          status: 'error',
          statusCode: crudPostResponse.status,
          error: errorData.error
        });
      }
    } catch (error) {
      testResults.push({
        operation: 'POST /api/admin/users-crud (create)',
        status: 'error',
        error: `Fetch error: ${error}`
      });
    }

    // Test /api/admin/users-crud - GET single user (if user was created)
    if (testUserId) {
      try {
        const crudGetSingleResponse = await fetch(`${baseUrl}/api/admin/users-crud?id=${testUserId}`, {
          method: 'GET',
          headers: sessionHeaders
        });
        
        if (crudGetSingleResponse.ok) {
          const userData = await crudGetSingleResponse.json();
          testResults.push({
            operation: 'GET /api/admin/users-crud (single)',
            status: 'success',
            statusCode: crudGetSingleResponse.status,
            data: { id: userData.id, email: userData.email }
          });
        } else {
          const errorData = await crudGetSingleResponse.json();
          testResults.push({
            operation: 'GET /api/admin/users-crud (single)',
            status: 'error',
            statusCode: crudGetSingleResponse.status,
            error: errorData.error
          });
        }
      } catch (error) {
        testResults.push({
          operation: 'GET /api/admin/users-crud (single)',
          status: 'error',
          error: `Fetch error: ${error}`
        });
      }

      // Test /api/admin/users-crud - PUT (update user)
      try {
        const updateUserData = {
          name: 'Updated Test User',
          strikes: 1
        };

        const crudPutResponse = await fetch(`${baseUrl}/api/admin/users-crud?id=${testUserId}`, {
          method: 'PUT',
          headers: sessionHeaders,
          body: JSON.stringify(updateUserData)
        });
        
        if (crudPutResponse.ok) {
          const updatedUser = await crudPutResponse.json();
          testResults.push({
            operation: 'PUT /api/admin/users-crud (update)',
            status: 'success',
            statusCode: crudPutResponse.status,
            data: { id: updatedUser.id, name: updatedUser.name, strikes: updatedUser.strikes }
          });
        } else {
          const errorData = await crudPutResponse.json();
          testResults.push({
            operation: 'PUT /api/admin/users-crud (update)',
            status: 'error',
            statusCode: crudPutResponse.status,
            error: errorData.error
          });
        }
      } catch (error) {
        testResults.push({
          operation: 'PUT /api/admin/users-crud (update)',
          status: 'error',
          error: `Fetch error: ${error}`
        });
      }

      // Test /api/admin/users-crud - DELETE (delete user)
      try {
        const crudDeleteResponse = await fetch(`${baseUrl}/api/admin/users-crud?id=${testUserId}`, {
          method: 'DELETE',
          headers: sessionHeaders
        });
        
        if (crudDeleteResponse.ok) {
          const deleteResult = await crudDeleteResponse.json();
          testResults.push({
            operation: 'DELETE /api/admin/users-crud (delete)',
            status: 'success',
            statusCode: crudDeleteResponse.status,
            data: deleteResult
          });
        } else {
          const errorData = await crudDeleteResponse.json();
          testResults.push({
            operation: 'DELETE /api/admin/users-crud (delete)',
            status: 'error',
            statusCode: crudDeleteResponse.status,
            error: errorData.error
          });
        }
      } catch (error) {
        testResults.push({
          operation: 'DELETE /api/admin/users-crud (delete)',
          status: 'error',
          error: `Fetch error: ${error}`
        });
      }
    }

    // Step 4: Clean up test session
    if (testSessionId) {
      await db.delete(session)
        .where(eq(session.id, testSessionId));
      
      testResults.push({
        operation: 'Test session cleanup',
        status: 'success'
      });
    }

    // Calculate summary
    const successCount = testResults.filter(r => r.status === 'success').length;
    const errorCount = testResults.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: 'Admin routes testing completed',
      summary: {
        total: testResults.length,
        successful: successCount,
        failed: errorCount
      },
      testResults
    }, { status: 200 });

  } catch (error) {
    console.error('Admin test error:', error);
    
    // Cleanup test session if it was created
    if (testSessionId) {
      try {
        await db.delete(session)
          .where(eq(session.id, testSessionId));
        testResults.push({
          operation: 'Emergency session cleanup',
          status: 'success'
        });
      } catch (cleanupError) {
        testResults.push({
          operation: 'Emergency session cleanup',
          status: 'error',
          error: `Cleanup failed: ${cleanupError}`
        });
      }
    }

    return NextResponse.json({ 
      error: 'Internal server error during testing',
      details: error instanceof Error ? error.message : 'Unknown error',
      testResults
    }, { status: 500 });
  }
}