import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
 
export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  const { pathname } = request.nextUrl
 
  if(!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Enforce admin-only access for /admin
  if (pathname.startsWith("/admin")) {
    const role = (session.user as any)?.role
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }
 
  return NextResponse.next();
}
 
export const config = {
  runtime: "nodejs",
  matcher: ["/dashboard", "/visualizations", "/admin"], // Apply middleware to specific routes
};