import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votes, user } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const results = await db.select({
      id: votes.id,
      userId: votes.userId,
      voteDate: votes.voteDate,
      vote: votes.vote,
      createdAt: votes.createdAt,
      updatedAt: votes.updatedAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
    .from(votes)
    .leftJoin(user, eq(votes.userId, user.id))
    .orderBy(desc(votes.createdAt))
    .limit(limit)
    .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user from better-auth session
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const currentUser = session.user;
    const requestBody = await request.json();
    const { vote } = requestBody;

    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!vote) {
      return NextResponse.json({ 
        error: "Vote is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Generate today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Check if user has already voted today
    const existingVote = await db.select()
      .from(votes)
      .where(and(
        eq(votes.userId, currentUser.id),
        eq(votes.voteDate, today)
      ))
      .limit(1);

    if (existingVote.length > 0) {
      return NextResponse.json({ 
        error: "You have already voted today",
        code: "DUPLICATE_VOTE" 
      }, { status: 409 });
    }

    // Create new vote
    const newVote = await db.insert(votes).values({
      userId: currentUser.id,
      voteDate: today,
      vote: vote.toString().trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    return NextResponse.json(newVote[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get current user from better-auth session
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const currentUser = session.user;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if record exists and belongs to user
    const existingVote = await db.select()
      .from(votes)
      .where(and(
        eq(votes.id, parseInt(id)),
        eq(votes.userId, currentUser.id)
      ))
      .limit(1);

    if (existingVote.length === 0) {
      return NextResponse.json({ 
        error: 'Vote not found' 
      }, { status: 404 });
    }

    // Update vote
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (requestBody.vote !== undefined) {
      updates.vote = requestBody.vote.toString().trim();
    }

    if (requestBody.voteDate !== undefined) {
      updates.voteDate = requestBody.voteDate;
    }

    const updated = await db.update(votes)
      .set(updates)
      .where(and(
        eq(votes.id, parseInt(id)),
        eq(votes.userId, currentUser.id)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Vote not found' 
      }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get current user from better-auth session
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const currentUser = session.user;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists and belongs to user
    const existingVote = await db.select()
      .from(votes)
      .where(and(
        eq(votes.id, parseInt(id)),
        eq(votes.userId, currentUser.id)
      ))
      .limit(1);

    if (existingVote.length === 0) {
      return NextResponse.json({ 
        error: 'Vote not found' 
      }, { status: 404 });
    }

    const deleted = await db.delete(votes)
      .where(and(
        eq(votes.id, parseInt(id)),
        eq(votes.userId, currentUser.id)
      ))
      .returning();

    return NextResponse.json({
      message: 'Vote deleted successfully',
      deletedVote: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}