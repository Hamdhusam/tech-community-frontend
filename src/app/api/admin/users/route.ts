import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Helper to verify admin role from student_profiles table
async function verifyAdmin(request: NextRequest) {
  try {
    // Get the access token from cookies
    const accessToken = request.cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return { isAdmin: false, error: 'No access token', userId: null };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return { isAdmin: false, error: 'Supabase not configured', userId: null };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user with the access token
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (userError || !user) {
      return { 
        isAdmin: false, 
        error: 'Invalid or expired token', 
        userId: null 
      };
    }

    const userId = user.id;

    // Query student_profiles table for user's role
    const { data: profile, error } = await supabase
      .from('student_profiles')
      .select('role, full_name, email')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      return { 
        isAdmin: false, 
        error: 'Profile not found or database error', 
        userId 
      };
    }

    // Check if user has administrator role
    if (profile.role !== 'administrator') {
      return { 
        isAdmin: false, 
        error: 'Insufficient permissions', 
        userId,
        userEmail: profile.email,
        userName: profile.full_name 
      };
    }

    return { 
      isAdmin: true, 
      userId,
      userEmail: profile.email,
      userName: profile.full_name
    };
  } catch (error) {
    console.error('Error in verifyAdmin:', error);
    return { isAdmin: false, error: 'Authentication error', userId: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin authentication
    const authResult = await verifyAdmin(request);
    
    if (!authResult.isAdmin) {
      console.warn('⚠️ Unauthorized admin access attempt', {
        error: authResult.error,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        error: 'Unauthorized. Admin access required.' 
      }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all student profiles with default values for strikes and status
    const { data: users, error } = await supabase
      .from('student_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add default values for strikes and status if not present
    const usersWithDefaults = (users || []).map(user => ({
      ...user,
      strikes: user.strikes || 0,
      status: user.status || 'active'
    }));

    // 🔒 AUDIT LOG: Record admin access
    console.log('✅ Admin data access', {
      admin_id: authResult.userId,
      admin_email: authResult.userEmail,
      admin_name: authResult.userName,
      action: 'VIEW_ALL_USERS',
      record_count: usersWithDefaults.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ users: usersWithDefaults });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin authentication
    const authResult = await verifyAdmin(request);
    
    if (!authResult.isAdmin) {
      console.warn('⚠️ Unauthorized admin modification attempt', {
        error: authResult.error,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        error: 'Unauthorized. Admin access required.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, status, strikes } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // 🔒 SECURITY: Validate input
    if (status && !['active', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    if (strikes !== undefined && (typeof strikes !== 'number' || strikes < 0 || strikes > 100)) {
      return NextResponse.json({ error: 'Invalid strikes value (must be 0-100)' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build update object based on what's provided
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (strikes !== undefined) updates.strikes = strikes;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('student_profiles')
      .update(updates)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🔒 AUDIT LOG: Record admin modification
    console.log('✅ Admin user modification', {
      admin_id: authResult.userId,
      admin_email: authResult.userEmail,
      admin_name: authResult.userName,
      target_user_id: user_id,
      action: 'UPDATE_USER',
      changes: updates,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error('Error in PATCH /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}