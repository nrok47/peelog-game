#!/usr/bin/env node
// Simple migration runner that executes SQL file against a Postgres connection.
// Usage: SUPABASE_DB_URL="postgresql://..." node scripts/migrate.js

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const sqlPath = path.resolve(process.cwd(), 'sql', 'supabase_schema.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('SQL file not found:', sqlPath);
  process.exit(1);
}

const connection = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!connection) {
  console.error('Please set SUPABASE_DB_URL or DATABASE_URL to your Postgres connection string');
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

(async function run() {
  const client = new Client({ connectionString: connection });
  try {
    await client.connect();
    console.log('Connected to DB, running migration...');
    await client.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
})();
