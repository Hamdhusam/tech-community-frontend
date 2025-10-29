import { betterAuth } from "better-auth";

console.log('[Better Auth] Initializing with:', {
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  hasSecret: !!(process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET),
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
});

export const auth = betterAuth({
  database: {
    provider: "postgres",
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "fallback-secret-please-change-in-production",
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
});

console.log('[Better Auth] Initialization complete');
