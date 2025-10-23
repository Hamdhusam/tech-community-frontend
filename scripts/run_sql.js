#!/usr/bin/env node
/**
 * Robust runner to execute SQL files against a Postgres connection.
 * - Loads environment from .env
 * - Passes SSL options suitable for Supabase
 * - If IPv6 connection is unreachable, will attempt IPv4 fallback
 *
 * Usage: node scripts/run_sql.js src/db/supabase_create_tables.sql
 */
require('dotenv').config();
const fs = require('fs');
const dns = require('dns').promises;
const { Client } = require('pg');
const { URL } = require('url');

function buildClientConfigFromConnectionString(connectionString, overrideHost) {
  // If overrideHost is provided, replace host in the connection string URL
  if (overrideHost) {
    try {
      const url = new URL(connectionString);
      url.hostname = overrideHost;
      return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } };
    } catch (e) {
      // fallback to raw connection string
    }
  }
  console.log('Using connection string as is.', connectionString);
  return { connectionString, ssl: { rejectUnauthorized: false } };
}

async function tryExecuteSql(clientConfig, sql) {
  const client = new Client(clientConfig);
  try {
    await client.connect();
    console.log('Connected to DB, executing SQL...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ SQL executed successfully');
    return true;
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/run_sql.js <sql-file>');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL or SUPABASE_DB_URL environment variable');
    process.exit(1);
  }

  const sql = fs.readFileSync(file, 'utf8');

  // First attempt: try default client config (with SSL enabled)
  try {
    const clientConfig = buildClientConfigFromConnectionString(connectionString);
    await tryExecuteSql(clientConfig, sql);
    return;
  } catch (err) {
    console.error('❌ Error executing SQL:', err);

    // If the error is network unreachable (IPv6) try IPv4 fallback
    if (err && err.code === 'ENETUNREACH' && err.address) {
      try {
        const parsed = new URL(connectionString);
        const host = parsed.hostname;
        console.log(`Detected network unreachable for ${err.address}. Resolving IPv4 for ${host}...`);
        const addrs = await dns.resolve4(host);
        if (addrs && addrs.length) {
          const ipv4 = addrs[0];
          console.log(`Resolved IPv4: ${ipv4}. Retrying with IPv4 host...`);
          const clientConfig = buildClientConfigFromConnectionString(connectionString, ipv4);
          await tryExecuteSql(clientConfig, sql);
          return;
        }
      } catch (e) {
        console.error('IPv4 fallback failed:', e);
      }
    }

    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
