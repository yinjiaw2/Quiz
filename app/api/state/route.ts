import { NextResponse } from "next/server";
import { ensureSchema } from "../../../lib/db";
import { readSession } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = await ensureSchema();
    const rows = await sql`SELECT data FROM redbridge_state WHERE id = 'main'`;
    const users =
      await sql`SELECT username, name FROM redbridge_users ORDER BY created_at`;
    const data = rows[0]?.data ?? null;
    if (!data) return NextResponse.json(null);
    const existing = data.learnerRecords || [];
    const learnerRecords = [
      ...existing,
      ...users
        .filter(
          (user) =>
            !existing.some((learner: any) => learner.email === user.username),
        )
        .map((user) => ({
          name: user.name,
          email: user.username,
          department: "运营",
          completed: 0,
        })),
    ];
    return NextResponse.json({ ...data, learnerRecords });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await readSession();
    if (session?.role !== "admin")
      return NextResponse.json({ error: "无权修改管理数据" }, { status: 403 });
    const data = await request.json();
    const sql = await ensureSchema();
    await sql`
      INSERT INTO redbridge_state (id, data, updated_at)
      VALUES ('main', ${JSON.stringify(data)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}
