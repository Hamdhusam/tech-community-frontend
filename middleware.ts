import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  const { pathname } = request.nextUrl

  // Allow public auth pages
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/admin/sign-in')) {
    return NextResponse.next();
  }
 
  if(!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Enforce admin-only access for /admin (exclude sign-in)
  if (pathname.startsWith("/admin") && !pathname.startsWith('/admin/sign-in')) {
    if(!session) {
      return NextResponse.redirect(new URL("/admin/sign-in", request.url));
    }
    const role = (session.user as any)?.role
    if (role !== "admin") {
      // Fetch role directly from DB to bypass session limitations
      const dbUser = await db.select({ role: user.role }).from(user).where(eq(user.id, session.user.id)).limit(1);
      const dbRole = dbUser[0]?.role;
      if (dbRole !== "admin") {
        return NextResponse.redirect(new URL("/", request.url))
      }
    }
  }
 
  return NextResponse.next();
}
 
export const config = {
  runtime: "nodejs",
  matcher: ["/admin/:path*"],
};