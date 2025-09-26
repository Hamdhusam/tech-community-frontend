import { betterAuth } from "better-auth";
import { customSession } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { hash, verify } from '@node-rs/argon2';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "libsql",
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password: string) => {
        return await hash(password, {
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
          outputLen: 32,
        });
      },
      verify: async (hashedPassword: string, password: string) => {
        return await verify(hashedPassword, password, {
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
          outputLen: 32,
        });
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        returned: true,  // Include role in session response
      },
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      return {
        session,  // Return session object directly (don't spread)
        user: {
          ...user,
          role: user.role || "user",  // Ensure role is included
        },
      };
    }),
  ],
});