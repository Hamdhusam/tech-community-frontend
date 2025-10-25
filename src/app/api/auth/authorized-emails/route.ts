import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/db';

// GET: Retrieve all authorized emails (admin only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const supabase = createSupabaseServerClient();
    
    // Verify user and check admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const role = user.app_metadata?.role || user.user_metadata?.role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Fetch authorized emails
    const { data, error } = await supabase
      .from('authorized_emails')
      .select('*')
      .order('added_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching authorized emails:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ emails: data });
    
  } catch (error) {
    console.error('Error in GET /api/auth/authorized-emails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Add a new authorized email (admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const supabase = createSupabaseServerClient();
    
    // Verify user and check admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const role = user.app_metadata?.role || user.user_metadata?.role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { email, notes } = body;
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    
    // Insert new authorized email
    const { data, error } = await supabase
      .from('authorized_emails')
      .insert({
        email: email.toLowerCase().trim(),
        added_by: user.id,
        notes: notes || null,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'Email already authorized' }, { status: 409 });
      }
      console.error('Error adding authorized email:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ email: data }, { status: 201 });
    
  } catch (error) {
    console.error('Error in POST /api/auth/authorized-emails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove an authorized email (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const supabase = createSupabaseServerClient();
    
    // Verify user and check admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const role = user.app_metadata?.role || user.user_metadata?.role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }
    
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('authorized_emails')
      .update({ is_active: false })
      .eq('email', email.toLowerCase().trim());
    
    if (error) {
      console.error('Error removing authorized email:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error in DELETE /api/auth/authorized-emails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
