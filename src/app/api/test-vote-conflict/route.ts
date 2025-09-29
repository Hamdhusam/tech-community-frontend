import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, votes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Find super admin user by email
    const superAdmin = await db.select()
      .from(user)
      .where(eq(user.email, 'archanaarchu200604@gmail.com'))
      .limit(1);

    if (superAdmin.length === 0) {
      return NextResponse.json({ 
        error: 'Super admin user not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    const adminUser = superAdmin[0];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const now = new Date().toISOString();

    const results = {
      adminUserId: adminUser.id,
      testDate: today,
      attempts: [] as any[]
    };

    // First vote insertion attempt (should succeed)
    try {
      const firstVote = await db.insert(votes).values({
        userId: adminUser.id,
        voteDate: today,
        vote: 'test',
        createdAt: now,
        updatedAt: now
      }).returning();

      results.attempts.push({
        attempt: 1,
        status: 'SUCCESS',
        message: 'First vote inserted successfully',
        data: firstVote[0]
      });
    } catch (firstError: any) {
      results.attempts.push({
        attempt: 1,
        status: 'ERROR',
        message: 'Failed to insert first vote',
        error: firstError.message
      });
      
      // If first vote fails, still try second attempt to show the pattern
    }

    // Second vote insertion attempt (should fail with duplicate constraint)
    try {
      const secondVote = await db.insert(votes).values({
        userId: adminUser.id,
        voteDate: today,
        vote: 'test',
        createdAt: now,
        updatedAt: now
      }).returning();

      results.attempts.push({
        attempt: 2,
        status: 'UNEXPECTED_SUCCESS',
        message: 'Second vote unexpectedly succeeded - duplicate constraint may not be enforced',
        data: secondVote[0]
      });
    } catch (secondError: any) {
      const isConstraintError = secondError.message.includes('UNIQUE constraint failed') || 
                               secondError.message.includes('duplicate') ||
                               secondError.message.includes('constraint');

      results.attempts.push({
        attempt: 2,
        status: isConstraintError ? 'CONFLICT' : 'ERROR',
        message: isConstraintError 
          ? 'Duplicate vote prevented - constraint working correctly' 
          : 'Unexpected error on second vote attempt',
        error: secondError.message,
        httpStatus: isConstraintError ? 409 : 500
      });
    }

    // Check existing votes for this user and date
    const existingVotes = await db.select()
      .from(votes)
      .where(and(
        eq(votes.userId, adminUser.id),
        eq(votes.voteDate, today)
      ));

    results.existingVotes = existingVotes;
    results.voteCount = existingVotes.length;

    return NextResponse.json({
      success: true,
      message: 'Vote conflict test completed',
      results
    }, { status: 200 });

  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return information about the test endpoint
    return NextResponse.json({
      endpoint: '/api/test-vote-conflict',
      description: 'Test endpoint to demonstrate vote conflict functionality',
      usage: 'Send POST request to test duplicate vote prevention',
      testScenario: {
        targetUser: 'archanaarchu200604@gmail.com',
        testVote: 'test',
        expectedBehavior: [
          'First vote insertion should succeed',
          'Second vote insertion should fail with 409 conflict',
          'Database constraint should prevent duplicate votes'
        ]
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('GET test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Clean up test votes for the super admin user
    const superAdmin = await db.select()
      .from(user)
      .where(eq(user.email, 'archanaarchu200604@gmail.com'))
      .limit(1);

    if (superAdmin.length === 0) {
      return NextResponse.json({ 
        error: 'Super admin user not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    
    const deletedVotes = await db.delete(votes)
      .where(and(
        eq(votes.userId, superAdmin[0].id),
        eq(votes.voteDate, today),
        eq(votes.vote, 'test')
      ))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Test votes cleaned up successfully',
      deletedCount: deletedVotes.length,
      deletedVotes
    }, { status: 200 });

  } catch (error: any) {
    console.error('DELETE test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}