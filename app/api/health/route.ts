import { NextResponse } from "next/server";
import { databaseEnvironmentNames, ensureSchema } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = await ensureSchema();
    await sql`SELECT 1`;
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        error: String(error),
        detectedEnvironmentVariables: databaseEnvironmentNames(),
      },
      { status: 503 },
    );
  }
}
