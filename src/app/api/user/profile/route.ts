import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    console.log('[Profile API] Starting request...');
    
    // Get the access token from cookies
    const accessToken = req.cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      console.log('[Profile API] No access token found in cookies');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user with the access token
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (userError || !user) {
      console.log('[Profile API] Invalid or expired token:', userError?.message);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    console.log('[Profile API] Querying student_profiles for user:', userId);

    // Fetch user's role from student_profiles table
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .select("role, full_name, email, student_id")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("[Profile API] Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch user profile", details: error.message },
        { status: 500 }
      );
    }

    if (!profile) {
      console.log('[Profile API] No profile found for user:', userId);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    console.log('[Profile API] Success! Returning profile for:', profile.email);

    return NextResponse.json({
      role: profile.role,
      full_name: profile.full_name,
      email: profile.email,
      student_id: profile.student_id,
    });
  } catch (error) {
    console.error("[Profile API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
