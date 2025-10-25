import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, accessToken } = body;

    if (!userId || !accessToken) {
      return NextResponse.json({ error: 'Missing parameters', allowed: false }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured', allowed: false }, { status: 500 });
    }

    // Create Supabase client with the user's access token
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get user data
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid user', allowed: false }, { status: 401 });
    }

    const userEmail = user.email?.toLowerCase().trim();

    if (!userEmail) {
      return NextResponse.json({ 
        allowed: false, 
        message: 'No email found in authentication data.' 
      }, { status: 403 });
    }

    // For Flex Academics: All authenticated users are allowed
    // Profile data is stored in student_profiles table
    // No whitelist restriction - open registration
    
    console.log(`User login: ${userEmail}`);
    
    return NextResponse.json({ 
      allowed: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email
      }
    });

  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      allowed: false 
    }, { status: 500 });
  }
}


