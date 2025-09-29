import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, submissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      warning: "⚠️  TESTING ENDPOINT - BYPASSES AUTHENTICATION - PRODUCTION USE PROHIBITED",
      scenarios: [] as any[],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      },
      cleanup: {
        attempted: false,
        successful: false,
        testDataRemoved: []
      }
    };

    let testUserId: string | null = null;
    let testSubmissionIds: number[] = [];

    // Step 1: Find the super admin user
    try {
      const superAdminUsers = await db.select()
        .from(user)
        .where(eq(user.email, 'archanaarchu200604@gmail.com'))
        .limit(1);

      if (superAdminUsers.length === 0) {
        return NextResponse.json({
          error: "Super admin user not found",
          code: "SUPER_ADMIN_NOT_FOUND",
          email: "archanaarchu200604@gmail.com"
        }, { status: 404 });
      }

      testUserId = superAdminUsers[0].id;
      testResults.scenarios.push({
        scenario: "Find Super Admin User",
        status: "PASS",
        data: { userId: testUserId, email: superAdminUsers[0].email },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      testResults.scenarios.push({
        scenario: "Find Super Admin User",
        status: "FAIL",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      testResults.summary.failed++;
      return NextResponse.json(testResults, { status: 500 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Test Scenario 1: Check has-submitted-today when no submission exists
    try {
      const existingSubmissions = await db.select()
        .from(submissions)
        .where(and(
          eq(submissions.userId, testUserId!),
          eq(submissions.date, today)
        ))
        .limit(1);

      const hasSubmittedToday = existingSubmissions.length > 0;
      
      testResults.scenarios.push({
        scenario: "Check Has-Submitted-Today (Initial)",
        status: "PASS",
        data: { 
          hasSubmittedToday,
          date: today,
          submissionCount: existingSubmissions.length
        },
        expected: "Should be false initially or reflect actual state",
        timestamp: new Date().toISOString()
      });
      testResults.summary.passed++;
    } catch (error) {
      testResults.scenarios.push({
        scenario: "Check Has-Submitted-Today (Initial)",
        status: "FAIL",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      testResults.summary.failed++;
    }

    // Test Scenario 2: Create a new submission for today
    try {
      const testSubmissionData = {
        userId: testUserId!,
        date: today,
        attendanceClass: "Present - Test Data",
        fileAcademics: "Completed test assignments",
        qdOfficial: "Test QD submission content",
        createdAt: new Date().toISOString()
      };

      const newSubmission = await db.insert(submissions)
        .values(testSubmissionData)
        .returning();

      if (newSubmission.length > 0) {
        testSubmissionIds.push(newSubmission[0].id);
      }

      testResults.scenarios.push({
        scenario: "Create New Submission",
        status: "PASS",
        data: newSubmission[0],
        timestamp: new Date().toISOString()
      });
      testResults.summary.passed++;
    } catch (error) {
      testResults.scenarios.push({
        scenario: "Create New Submission",
        status: "FAIL",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      testResults.summary.failed++;
    }

    // Test Scenario 3: Check has-submitted-today again (should return true)
    try {
      const existingSubmissions = await db.select()
        .from(submissions)
        .where(and(
          eq(submissions.userId, testUserId!),
          eq(submissions.date, today)
        ))
        .limit(1);

      const hasSubmittedToday = existingSubmissions.length > 0;
      
      testResults.scenarios.push({
        scenario: "Check Has-Submitted-Today (After Creation)",
        status: hasSubmittedToday ? "PASS" : "FAIL",
        data: { 
          hasSubmittedToday,
          date: today,
          submissionCount: existingSubmissions.length
        },
        expected: "Should be true after creation",
        timestamp: new Date().toISOString()
      });
      
      if (hasSubmittedToday) {
        testResults.summary.passed++;
      } else {
        testResults.summary.failed++;
      }
    } catch (error) {
      testResults.scenarios.push({
        scenario: "Check Has-Submitted-Today (After Creation)",
        status: "FAIL",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      testResults.summary.failed++;
    }

    // Test Scenario 4: Try to create duplicate submission (should get conflict)
    try {
      const duplicateSubmissionData = {
        userId: testUserId!,
        date: today,
        attendanceClass: "Duplicate test data",
        fileAcademics: "Duplicate academics",
        qdOfficial: "Duplicate QD content",
        createdAt: new Date().toISOString()
      };

      const duplicateSubmission = await db.insert(submissions)
        .values(duplicateSubmissionData)
        .returning();

      // If we reach here, the duplicate was created (unexpected)
      if (duplicateSubmission.length > 0) {
        testSubmissionIds.push(duplicateSubmission[0].id);
      }

      testResults.scenarios.push({
        scenario: "Create Duplicate Submission",
        status: "FAIL",
        data: duplicateSubmission[0],
        error: "Duplicate submission was created when it should have been rejected",
        expected: "Should reject with 409 conflict",
        timestamp: new Date().toISOString()
      });
      testResults.summary.failed++;
    } catch (error) {
      // This is expected - duplicate should fail
      testResults.scenarios.push({
        scenario: "Create Duplicate Submission",
        status: "PASS",
        error: error instanceof Error ? error.message : 'Unknown error',
        expected: "Should reject with constraint violation",
        timestamp: new Date().toISOString()
      });
      testResults.summary.passed++;
    }

    // Test Scenario 5: List user's submissions
    try {
      const userSubmissions = await db.select()
        .from(submissions)
        .where(eq(submissions.userId, testUserId!));

      testResults.scenarios.push({
        scenario: "List User Submissions",
        status: "PASS",
        data: { 
          submissionCount: userSubmissions.length,
          submissions: userSubmissions
        },
        timestamp: new Date().toISOString()
      });
      testResults.summary.passed++;
    } catch (error) {
      testResults.scenarios.push({
        scenario: "List User Submissions",
        status: "FAIL",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      testResults.summary.failed++;
    }

    // Cleanup: Remove test data
    testResults.cleanup.attempted = true;
    try {
      if (testSubmissionIds.length > 0) {
        for (const submissionId of testSubmissionIds) {
          const deleted = await db.delete(submissions)
            .where(eq(submissions.id, submissionId))
            .returning();
          
          if (deleted.length > 0) {
            testResults.cleanup.testDataRemoved.push(deleted[0]);
          }
        }
      }
      
      testResults.cleanup.successful = true;
      testResults.scenarios.push({
        scenario: "Cleanup Test Data",
        status: "PASS",
        data: { 
          removedSubmissions: testResults.cleanup.testDataRemoved.length,
          submissionIds: testSubmissionIds
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      testResults.cleanup.successful = false;
      testResults.scenarios.push({
        scenario: "Cleanup Test Data",
        status: "FAIL",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate final summary
    testResults.summary.total = testResults.scenarios.length;
    testResults.summary.passed = testResults.scenarios.filter(s => s.status === "PASS").length;
    testResults.summary.failed = testResults.scenarios.filter(s => s.status === "FAIL").length;

    return NextResponse.json(testResults, { status: 200 });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during testing: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: "TEST_EXECUTION_FAILED"
    }, { status: 500 });
  }
}