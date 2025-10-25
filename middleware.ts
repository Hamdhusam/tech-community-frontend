import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase is not configured, allow access (development mode)
    return NextResponse.next();
  }

  // Create a Supabase client for the middleware
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

  // Get the session token from cookies
  const accessToken = request.cookies.get("sb-access-token")?.value;
  const refreshToken = request.cookies.get("sb-refresh-token")?.value;

  let user = null;

  // Try to get user from access token
  if (accessToken) {
    const { data: { user: tokenUser }, error } = await supabase.auth.getUser(accessToken);
    if (!error && tokenUser) {
      user = tokenUser;
    }
  }

  // If no valid access token but we have refresh token, try to refresh
  if (!user && refreshToken) {
    const { data: { session }, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });
    
    if (!error && session?.user) {
      user = session.user;
      
      // Set new tokens in response
      const response = NextResponse.next();
      response.cookies.set("sb-access-token", session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour
      });
      response.cookies.set("sb-refresh-token", session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      
      return response;
    }
  }

  // If no user, redirect to sign-in
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Enforce admin-only access for /admin
  if (pathname.startsWith("/admin")) {
    // Supabase stores custom roles in app_metadata or user_metadata depending on your setup
    const role = (user as any)?.app_metadata?.role || (user as any)?.user_metadata?.role || (user as any)?.role;
    if (role !== "administrator" && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/dashboard", "/visualizations", "/admin"], // Apply middleware to specific routes
};