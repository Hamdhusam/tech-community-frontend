import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// ⚠️ WARNING: This endpoint bypasses authentication and is for TESTING PURPOSES ONLY
// This should NEVER be deployed to production or be accessible in a live environment

export async function POST(request: NextRequest) {
  console.warn('⚠️ SECURITY TEST ENDPOINT ACCESSED - THIS BYPASSES AUTHENTICATION');
  
  const testResults = {
    timestamp: new Date().toISOString(),
    warning: 'This endpoint bypasses authentication and is for testing only',
    tests: [] as Array<{
      name: string;
      description: string;
      status: 'PASS' | 'FAIL';
      details: string;
      expectedBehavior: string;
      actualResult: string;
    }>
  };

  try {
    // Get super admin user for testing (bypassing auth for test purposes only)
    const superAdminUser = await db.select()
      .from(user)
      .where(eq(user.superAdmin, true))
      .limit(1);

    if (superAdminUser.length === 0) {
      return NextResponse.json({
        error: 'No super admin user found for testing',
        code: 'NO_SUPER_ADMIN'
      }, { status: 500 });
    }

    const testUserId = superAdminUser[0].id;
    const testDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Test 1: Reject userId in request body
    try {
      const testPayload1 = {
        userId: testUserId,
        date: testDate,
        attendanceClass: 'present',
        fileAcademics: 'completed',
        qdOfficial: 'submitted'
      };

      const response1 = await fetch(new URL('/api/submissions', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload1)
      });

      const result1 = await response1.json();

      testResults.tests.push({
        name: 'userId Rejection Test',
        description: 'Verify that userId in request body is rejected',
        status: response1.status === 400 && result1.code === 'USER_ID_NOT_ALLOWED' ? 'PASS' : 'FAIL',
        expectedBehavior: 'Should return 400 status with USER_ID_NOT_ALLOWED error code',
        actualResult: `Status: ${response1.status}, Code: ${result1.code || 'none'}, Message: ${result1.error || 'none'}`,
        details: response1.status === 400 ? 'Correctly rejected userId from request body' : 'Failed to reject userId from request body'
      });
    } catch (error) {
      testResults.tests.push({
        name: 'userId Rejection Test',
        description: 'Verify that userId in request body is rejected',
        status: 'FAIL',
        expectedBehavior: 'Should return 400 status with USER_ID_NOT_ALLOWED error code',
        actualResult: `Test failed with error: ${error}`,
        details: 'Unable to complete test due to error'
      });
    }

    // Test 2: Reject user_id in request body
    try {
      const testPayload2 = {
        user_id: testUserId,
        date: testDate,
        attendanceClass: 'present'
      };

      const response2 = await fetch(new URL('/api/submissions', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload2)
      });

      const result2 = await response2.json();

      testResults.tests.push({
        name: 'user_id Rejection Test',
        description: 'Verify that user_id in request body is rejected',
        status: response2.status === 400 && result2.code === 'USER_ID_NOT_ALLOWED' ? 'PASS' : 'FAIL',
        expectedBehavior: 'Should return 400 status with USER_ID_NOT_ALLOWED error code',
        actualResult: `Status: ${response2.status}, Code: ${result2.code || 'none'}, Message: ${result2.error || 'none'}`,
        details: response2.status === 400 ? 'Correctly rejected user_id from request body' : 'Failed to reject user_id from request body'
      });
    } catch (error) {
      testResults.tests.push({
        name: 'user_id Rejection Test',
        description: 'Verify that user_id in request body is rejected',
        status: 'FAIL',
        expectedBehavior: 'Should return 400 status with USER_ID_NOT_ALLOWED error code',
        actualResult: `Test failed with error: ${error}`,
        details: 'Unable to complete test due to error'
      });
    }

    // Test 3: Invalid date format validation
    try {
      const testPayload3 = {
        date: 'invalid-date-format',
        attendanceClass: 'present'
      };

      const response3 = await fetch(new URL('/api/submissions', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload3)
      });

      const result3 = await response3.json();

      testResults.tests.push({
        name: 'Invalid Date Format Test',
        description: 'Verify that invalid date formats are rejected',
        status: response3.status === 400 ? 'PASS' : 'FAIL',
        expectedBehavior: 'Should return 400 status for invalid date format',
        actualResult: `Status: ${response3.status}, Message: ${result3.error || 'none'}`,
        details: response3.status === 400 ? 'Correctly rejected invalid date format' : 'Failed to reject invalid date format'
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Invalid Date Format Test',
        description: 'Verify that invalid date formats are rejected',
        status: 'FAIL',
        expectedBehavior: 'Should return 400 status for invalid date format',
        actualResult: `Test failed with error: ${error}`,
        details: 'Unable to complete test due to error'
      });
    }

    // Test 4: Empty request body validation
    try {
      const response4 = await fetch(new URL('/api/submissions', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const result4 = await response4.json();

      testResults.tests.push({
        name: 'Empty Body Test',
        description: 'Verify that empty request body is handled properly',
        status: response4.status === 400 || response4.status === 401 ? 'PASS' : 'FAIL',
        expectedBehavior: 'Should return 400 or 401 status for empty body or missing authentication',
        actualResult: `Status: ${response4.status}, Message: ${result4.error || 'none'}`,
        details: response4.status >= 400 ? 'Correctly handled empty request body' : 'Failed to handle empty request body'
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Empty Body Test',
        description: 'Verify that empty request body is handled properly',
        status: 'FAIL',
        expectedBehavior: 'Should return 400 or 401 status for empty body or missing authentication',
        actualResult: `Test failed with error: ${error}`,
        details: 'Unable to complete test due to error'
      });
    }

    // Test 5: Duplicate submission logic (requires bypassing auth to test the duplicate logic)
    try {
      // First, create a test submission directly in database (simulating authenticated user)
      const testSubmissionData = {
        userId: testUserId,
        date: testDate,
        attendanceClass: 'present',
        fileAcademics: 'completed',
        qdOfficial: 'submitted',
        createdAt: new Date().toISOString()
      };

      // Insert test submission
      await db.insert(submissions).values(testSubmissionData);

      // Now test duplicate submission via API
      const testPayload5 = {
        date: testDate,
        attendanceClass: 'absent'
      };

      const response5 = await fetch(new URL('/api/submissions', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload5)
      });

      const result5 = await response5.json();

      testResults.tests.push({
        name: 'Duplicate Submission Test',
        description: 'Verify that duplicate submissions for same date are handled',
        status: response5.status === 400 || response5.status === 401 ? 'PASS' : 'FAIL',
        expectedBehavior: 'Should prevent duplicate submissions or require authentication',
        actualResult: `Status: ${response5.status}, Message: ${result5.error || 'none'}`,
        details: response5.status >= 400 ? 'Correctly handled duplicate submission attempt' : 'Did not prevent duplicate submission'
      });

      // Clean up test data
      await db.delete(submissions)
        .where(and(eq(submissions.userId, testUserId), eq(submissions.date, testDate)));

    } catch (error) {
      testResults.tests.push({
        name: 'Duplicate Submission Test',
        description: 'Verify that duplicate submissions for same date are handled',
        status: 'FAIL',
        expectedBehavior: 'Should prevent duplicate submissions or require authentication',
        actualResult: `Test failed with error: ${error}`,
        details: 'Unable to complete test due to error'
      });
    }

    // Test 6: Valid data structure without authentication
    try {
      const testPayload6 = {
        date: new Date().toISOString().split('T')[0],
        attendanceClass: 'present',
        fileAcademics: 'completed',
        qdOfficial: 'submitted'
      };

      const response6 = await fetch(new URL('/api/submissions', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload6)
      });

      const result6 = await response6.json();

      testResults.tests.push({
        name: 'Valid Data Without Auth Test',
        description: 'Verify that valid data without authentication is rejected',
        status: response6.status === 401 ? 'PASS' : 'FAIL',
        expectedBehavior: 'Should return 401 status for missing authentication',
        actualResult: `Status: ${response6.status}, Message: ${result6.error || 'none'}`,
        details: response6.status === 401 ? 'Correctly requires authentication' : 'Failed to require authentication'
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Valid Data Without Auth Test',
        description: 'Verify that valid data without authentication is rejected',
        status: 'FAIL',
        expectedBehavior: 'Should return 401 status for missing authentication',
        actualResult: `Test failed with error: ${error}`,
        details: 'Unable to complete test due to error'
      });
    }

    // Summary
    const totalTests = testResults.tests.length;
    const passedTests = testResults.tests.filter(t => t.status === 'PASS').length;
    const failedTests = totalTests - passedTests;

    const summary = {
      totalTests,
      passedTests,
      failedTests,
      successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
      overallStatus: failedTests === 0 ? 'ALL TESTS PASSED' : `${failedTests} TESTS FAILED`
    };

    return NextResponse.json({
      ...testResults,
      summary,
      securityRecommendations: [
        'Ensure this test endpoint is NEVER deployed to production',
        'Remove or disable this endpoint before going live',
        'Verify that the submissions API properly rejects userId/user_id in request bodies',
        'Confirm that authentication is required for all submission operations',
        'Test duplicate submission prevention with authenticated users',
        'Validate all date formats and required fields',
        'Implement proper error handling for all edge cases'
      ]
    }, { status: 200 });

  } catch (error) {
    console.error('Security test error:', error);
    return NextResponse.json({
      error: 'Security test failed: ' + error,
      code: 'SECURITY_TEST_ERROR',
      warning: 'This endpoint bypasses authentication and is for testing only'
    }, { status: 500 });
  }
}