import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { readSession } from "../../../../lib/auth";
import { ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await readSession();
  return session?.role === "admin";
}

export async function GET() {
  try {
    if (!(await requireAdmin()))
      return NextResponse.json({ error: "无权查看学员" }, { status: 403 });
    const sql = await ensureSchema();
    const rows = await sql`
      SELECT username, name, created_at
      FROM redbridge_users
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await requireAdmin()))
      return NextResponse.json({ error: "无权删除学员" }, { status: 403 });
    const { username, name = "" } = await request.json();
    if (!username)
      return NextResponse.json({ error: "缺少用户名" }, { status: 400 });
    const sql = await ensureSchema();
    const users = await sql`
      SELECT name FROM redbridge_users
      WHERE username = ${String(username).toLowerCase()}
    `;
    const storedName = users[0]?.name || "";
    const requestedName = String(name).trim();
    await sql`
      DELETE FROM redbridge_attempts
      WHERE learner = ${storedName} OR learner = ${requestedName}
    `;
    await sql`
      DELETE FROM redbridge_attempt_drafts
      WHERE username = ${String(username).toLowerCase()}
         OR learner = ${storedName}
         OR learner = ${requestedName}
    `;
    await sql`
      DELETE FROM redbridge_users
      WHERE username = ${String(username).toLowerCase()}
    `;
    const stateRows =
      await sql`SELECT data FROM redbridge_state WHERE id = 'main'`;
    if (stateRows.length) {
      const data = stateRows[0].data;
      data.learnerRecords = (data.learnerRecords || []).filter(
        (learner: any) =>
          String(learner.email).toLowerCase() !==
            String(username).toLowerCase() &&
          learner.name !== storedName &&
          learner.name !== requestedName,
      );
      await sql`
        UPDATE redbridge_state
        SET data = ${JSON.stringify(data)}::jsonb, updated_at = NOW()
        WHERE id = 'main'
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await requireAdmin()))
      return NextResponse.json({ error: "无权重置密码" }, { status: 403 });
    const sql = await ensureSchema();
    const { username } = await request.json();
    if (!username)
      return NextResponse.json({ error: "缺少用户名" }, { status: 400 });
    const passwordHash = await hash("123456", 12);
    const rows = await sql`
      UPDATE redbridge_users
      SET password_hash = ${passwordHash}
      WHERE username = ${String(username).toLowerCase()}
      RETURNING username
    `;
    if (!rows.length)
      return NextResponse.json({ error: "学员不存在" }, { status: 404 });
    return NextResponse.json({ ok: true, username: rows[0].username });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}
