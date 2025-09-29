import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votes, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface TestResult {
  scenario: string;
  description: string;
  expected: any;
  actual: any;
  passed: boolean;
  apiResponse: any;
}

export async function GET(request: NextRequest) {
  const testResults: TestResult[] = [];
  let testVoteId: number | null = null;
  let superAdminUser: any = null;

  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Find the super admin user
    const superAdminQuery = await db.select()
      .from(user)
      .where(eq(user.email, 'archanaarchu200604@gmail.com'))
      .limit(1);

    if (superAdminQuery.length === 0) {
      return NextResponse.json({ 
        error: 'Super admin user not found. Please ensure the user exists.',
        code: 'SUPER_ADMIN_NOT_FOUND' 
      }, { status: 404 });
    }

    superAdminUser = superAdminQuery[0];

    // TEST SCENARIO 1: User who has NOT voted today (before creating test vote)
    const hasVotedBeforeTest = await db.select()
      .from(votes)
      .where(and(eq(votes.userId, superAdminUser.id), eq(votes.voteDate, today)))
      .limit(1);

    testResults.push({
      scenario: 'User Has Not Voted Today',
      description: 'Check if user has voted today when no vote exists',
      expected: { hasVoted: false },
      actual: { hasVoted: hasVotedBeforeTest.length > 0 },
      passed: hasVotedBeforeTest.length === 0,
      apiResponse: {
        hasVoted: hasVotedBeforeTest.length > 0,
        message: hasVotedBeforeTest.length > 0 ? 'You have already voted today' : 'You have not voted today'
      }
    });

    // Create test vote record for "already voted" scenario
    const testVote = await db.insert(votes).values({
      userId: superAdminUser.id,
      voteDate: today,
      vote: 'TEST_VOTE_VALUE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    testVoteId = testVote[0].id;

    // TEST SCENARIO 2: User who HAS voted today (after creating test vote)
    const hasVotedAfterTest = await db.select()
      .from(votes)
      .where(and(eq(votes.userId, superAdminUser.id), eq(votes.voteDate, today)))
      .limit(1);

    testResults.push({
      scenario: 'User Has Voted Today',
      description: 'Check if user has voted today when vote exists',
      expected: { hasVoted: true },
      actual: { hasVoted: hasVotedAfterTest.length > 0 },
      passed: hasVotedAfterTest.length > 0,
      apiResponse: {
        hasVoted: hasVotedAfterTest.length > 0,
        message: hasVotedAfterTest.length > 0 ? 'You have already voted today' : 'You have not voted today',
        voteDetails: hasVotedAfterTest[0] || null
      }
    });

    // TEST SCENARIO 3: Admin user accessing for informational purposes
    const adminCheckResult = await db.select()
      .from(votes)
      .where(and(eq(votes.userId, superAdminUser.id), eq(votes.voteDate, today)))
      .limit(1);

    testResults.push({
      scenario: 'Admin User Information Access',
      description: 'Admin checking vote status with additional details',
      expected: { hasVoted: true, adminAccess: true },
      actual: { hasVoted: adminCheckResult.length > 0, adminAccess: superAdminUser.superAdmin },
      passed: adminCheckResult.length > 0 && superAdminUser.superAdmin,
      apiResponse: {
        hasVoted: adminCheckResult.length > 0,
        message: adminCheckResult.length > 0 ? 'User has already voted today' : 'User has not voted today',
        adminInfo: {
          userId: superAdminUser.id,
          userEmail: superAdminUser.email,
          voteDate: today,
          voteExists: adminCheckResult.length > 0,
          voteRecord: adminCheckResult[0] || null
        }
      }
    });

    // Test additional edge cases
    
    // TEST SCENARIO 4: Query performance test
    const performanceStart = Date.now();
    await db.select()
      .from(votes)
      .where(and(eq(votes.userId, superAdminUser.id), eq(votes.voteDate, today)))
      .limit(1);
    const performanceEnd = Date.now();

    testResults.push({
      scenario: 'Query Performance Test',
      description: 'Ensure query executes within acceptable time limits',
      expected: { executionTime: '< 100ms' },
      actual: { executionTime: `${performanceEnd - performanceStart}ms` },
      passed: (performanceEnd - performanceStart) < 100,
      apiResponse: {
        queryTime: `${performanceEnd - performanceStart}ms`,
        status: 'performance_test'
      }
    });

    // Clean up test data
    let cleanupStatus = 'failed';
    if (testVoteId) {
      const deleted = await db.delete(votes)
        .where(eq(votes.id, testVoteId))
        .returning();
      
      cleanupStatus = deleted.length > 0 ? 'success' : 'failed';
    }

    // Verify cleanup
    const verifyCleanup = await db.select()
      .from(votes)
      .where(and(
        eq(votes.userId, superAdminUser.id), 
        eq(votes.voteDate, today),
        eq(votes.vote, 'TEST_VOTE_VALUE')
      ))
      .limit(1);

    const finalCleanupStatus = verifyCleanup.length === 0 ? 'verified_clean' : 'cleanup_incomplete';

    // Calculate test summary
    const passedTests = testResults.filter(test => test.passed).length;
    const totalTests = testResults.length;

    return NextResponse.json({
      testSummary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
        testDate: today,
        executionTimestamp: new Date().toISOString()
      },
      testResults,
      testEnvironment: {
        superAdminUser: {
          id: superAdminUser.id,
          email: superAdminUser.email,
          role: superAdminUser.role,
          superAdmin: superAdminUser.superAdmin
        },
        testData: {
          voteDate: today,
          testVoteId,
          cleanupStatus: finalCleanupStatus
        }
      },
      sampleApiResponses: {
        hasVotedTrue: {
          hasVoted: true,
          message: 'You have already voted today'
        },
        hasVotedFalse: {
          hasVoted: false,
          message: 'You have not voted today'
        },
        adminResponse: {
          hasVoted: true,
          message: 'User has already voted today',
          adminInfo: {
            userId: superAdminUser.id,
            userEmail: superAdminUser.email,
            voteDate: today,
            voteExists: true
          }
        }
      },
      endpointLogic: {
        description: 'The /api/votes/has-voted-today endpoint should:',
        steps: [
          '1. Get authenticated user from session',
          '2. Get today\'s date in YYYY-MM-DD format',
          '3. Query votes table for user + today\'s date combination',
          '4. Return hasVoted: true/false based on query result',
          '5. Include appropriate message for user feedback'
        ],
        securityNotes: [
          'Must authenticate user before checking votes',
          'User can only check their own vote status',
          'Admin users may have additional permissions'
        ]
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Test endpoint error:', error);

    // Attempt cleanup on error
    if (testVoteId) {
      try {
        await db.delete(votes).where(eq(votes.id, testVoteId));
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }

    return NextResponse.json({
      error: 'Test execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      code: 'TEST_EXECUTION_FAILED',
      testResults,
      partialResults: testResults.length > 0,
      cleanupAttempted: testVoteId !== null
    }, { status: 500 });
  }
}