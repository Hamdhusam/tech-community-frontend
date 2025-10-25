import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST: Create student profile during registration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      full_name,
      email,
      phone_number,
      student_id,
      year_of_study,
      section,
      branch
    } = body;

    // 🔒 SECURITY: Verify the user is creating their OWN profile
    const accessToken = request.cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized - no session' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const tempSupabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await tempSupabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // 🔒 SECURITY: Ensure user can only create profile for themselves
    if (user.id !== user_id) {
      console.warn('⚠️ Profile creation attack attempt', {
        authenticated_user: user.id,
        attempted_user_id: user_id,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json({ 
        error: 'Forbidden - can only create profile for yourself' 
      }, { status: 403 });
    }

    // Validate required fields
    if (!user_id || !full_name || !email || !phone_number || !student_id || !year_of_study || !section || !branch) {
      return NextResponse.json({ 
        error: 'All fields are required',
        missing: {
          user_id: !user_id,
          full_name: !full_name,
          email: !email,
          phone_number: !phone_number,
          student_id: !student_id,
          year_of_study: !year_of_study,
          section: !section,
          branch: !branch
        }
      }, { status: 400 });
    }

    // 🔒 SECURITY: Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone_number.replace(/[\s\-\+]/g, ''))) {
      return NextResponse.json({ error: 'Invalid phone number (10-15 digits required)' }, { status: 400 });
    }

    if (full_name.length < 2 || full_name.length > 100) {
      return NextResponse.json({ error: 'Name must be 2-100 characters' }, { status: 400 });
    }

    if (student_id.length < 3 || student_id.length > 50) {
      return NextResponse.json({ error: 'Invalid student ID format' }, { status: 400 });
    }

    if (!['I', 'II', 'III', 'IV'].includes(year_of_study)) {
      return NextResponse.json({ error: 'Invalid year of study' }, { status: 400 });
    }

    if (!['A', 'B', 'C'].includes(section.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    // 🔒 SECURITY: Sanitize inputs
    const sanitizedName = full_name.trim().replace(/<[^>]*>/g, ''); // Remove HTML tags
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPhone = phone_number.replace(/[^0-9\+\-\s]/g, ''); // Only allow digits and formatting
    const sanitizedStudentId = student_id.trim().toUpperCase();

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 500 });
    }

    // Use service role key to bypass RLS for insertion
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if student_id already exists
    const { data: existingStudent } = await supabase
      .from('student_profiles')
      .select('student_id')
      .eq('student_id', sanitizedStudentId)
      .maybeSingle();

    if (existingStudent) {
      return NextResponse.json({ 
        error: 'Student ID already registered. Please contact administrator if this is an error.' 
      }, { status: 409 });
    }

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('student_profiles')
      .select('user_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ 
        error: 'Profile already exists for this user' 
      }, { status: 409 });
    }

    // Insert student profile
    const { data, error } = await supabase
      .from('student_profiles')
      .insert({
        user_id,
        full_name: sanitizedName,
        email: sanitizedEmail,
        phone_number: sanitizedPhone,
        student_id: sanitizedStudentId,
        year_of_study,
        section: section.toUpperCase(),
        branch,
        role: 'participant', // Force participant role - admins set manually
        is_active: true,
        total_strikes: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating student profile:', error);
      return NextResponse.json({ 
        error: error.message || 'Failed to create profile' 
      }, { status: 500 });
    }

    // 🔒 AUDIT LOG: Record profile creation
    console.log('✅ New profile created', {
      user_id,
      email: sanitizedEmail,
      student_id: sanitizedStudentId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      profile: data 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/auth/profile:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// GET: Retrieve student profile
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch profile using service role to bypass RLS if needed
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminSupabase = createClient(supabaseUrl, serviceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: profile, error } = await adminSupabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Error in GET /api/auth/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update student profile
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const body = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Users can only update certain fields
    const allowedFields = ['phone_number', 'section', 'branch'];
    const updates: any = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update profile
    const { data, error } = await supabase
      .from('student_profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data });

  } catch (error) {
    console.error('Error in PATCH /api/auth/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
