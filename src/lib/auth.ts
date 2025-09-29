import { betterAuth } from "better-auth";
import { customSession } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import bcrypt from 'bcryptjs';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "libsql",
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password: string) => {
        return await bcrypt.hash(password, 12);
      },
      verify: async (hashedPassword: string, password: string) => {
        return await bcrypt.compare(password, hashedPassword);
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
        returned: true,
      },
    },
  },
});