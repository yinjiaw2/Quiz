import { neon } from "@neondatabase/serverless";

export function database() {
  const knownUrl =
    process.env.NEON_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.NEON_POSTGRES_URL ||
    process.env.STORAGE_URL ||
    process.env.STORAGE_DATABASE_URL ||
    process.env.STORAGE_POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  const discoveredUrl = Object.entries(process.env).find(
    ([key, value]) =>
      /(NEON|STORAGE|DATABASE|POSTGRES).*URL/i.test(key) &&
      typeof value === "string" &&
      /^(postgres|postgresql):\/\//i.test(value),
  )?.[1];
  const url = knownUrl || discoveredUrl;
  if (!url)
    throw new Error(
      "No PostgreSQL connection URL is available in this deployment",
    );
  return neon(url);
}

export function databaseEnvironmentNames() {
  return Object.keys(process.env)
    .filter((key) => /(NEON|STORAGE|DATABASE|POSTGRES).*URL/i.test(key))
    .sort();
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
