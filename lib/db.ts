import { neon } from "@neondatabase/serverless";

export function database() {
  const url =
    process.env.NEON_URL ||
    process.env.STORAGE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  if (!url)
    throw new Error(
      "NEON_URL, STORAGE_URL, DATABASE_URL or POSTGRES_URL is not configured",
    );
  return neon(url);
}

export async function ensureSchema() {
  const sql = database();
  await sql`
    CREATE TABLE IF NOT EXISTS redbridge_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS redbridge_users (
      username TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS redbridge_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      learner TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  return sql;
}
