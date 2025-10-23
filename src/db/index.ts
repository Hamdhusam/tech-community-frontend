import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@/db/schema';

// NOTE: This expects a Postgres connection string. Common env names:
// - DATABASE_URL (preferred)
// - SUPABASE_DB_URL
// If you only have SUPABASE_ANON_URL (a public anon key), you'll need the DB connection string
// (found in Supabase project settings > Database > Connection string).
const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL or SUPABASE_DB_URL environment variable for Postgres connection');
}

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;